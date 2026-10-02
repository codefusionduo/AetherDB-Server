import { NextRequest, NextResponse } from 'next/server';
import { getEngine, persistState } from '@/lib/db-server/server-state';
import { INITIAL_DATABASES } from '@/lib/db-server/seed-data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const database = searchParams.get('database') || 'main_db';
    const format = searchParams.get('format') || 'sql'; // 'sql' or 'json'

    const engine = getEngine();
    const db = engine.getDatabase(database);
    if (!db) {
      return NextResponse.json({ success: false, error: `Database '${database}' not found` }, { status: 404 });
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        dump: db
      });
    }

    // Generate readable SQL dump
    let sqlDump = `-- ==========================================================\n`;
    sqlDump += `-- AetherDB Server SQL Dump\n`;
    sqlDump += `-- Database: ${database}\n`;
    sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
    sqlDump += `-- Charset: ${db.charset} Collation: ${db.collation}\n`;
    sqlDump += `-- ==========================================================\n\n`;
    sqlDump += `CREATE DATABASE IF NOT EXISTS \`${database}\`;\n`;
    sqlDump += `USE \`${database}\`;\n\n`;

    for (const tableName of Object.keys(db.tables)) {
      const table = db.tables[tableName];
      sqlDump += `-- Table structure for table \`${tableName}\`\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlDump += `CREATE TABLE \`${tableName}\` (\n`;

      const colDefs = table.schema.columns.map(col => {
        let def = `  \`${col.name}\` ${col.type}`;
        if (!col.nullable) def += ` NOT NULL`;
        if (col.primaryKey) def += ` PRIMARY KEY`;
        if (col.unique && !col.primaryKey) def += ` UNIQUE`;
        if (col.defaultValue !== undefined) def += ` DEFAULT '${col.defaultValue}'`;
        return def;
      });

      sqlDump += colDefs.join(',\n');
      sqlDump += `\n);\n\n`;

      if (table.rows.length > 0) {
        sqlDump += `-- Dumping data for table \`${tableName}\` (${table.rows.length} rows)\n`;
        const colNames = table.schema.columns.map(c => `\`${c.name}\``).join(', ');
        for (const row of table.rows) {
          const vals = table.schema.columns.map(col => {
            const val = row[col.name];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');
          sqlDump += `INSERT INTO \`${tableName}\` (${colNames}) VALUES (${vals});\n`;
        }
        sqlDump += `\n`;
      }
    }

    return new NextResponse(sqlDump, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${database}_dump_${new Date().toISOString().substring(0, 10)}.sql"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'clear_data') {
      const engine = getEngine();
      const allDbs = engine.getAllDatabases();
      for (const dbName in allDbs) {
        for (const tableName in allDbs[dbName].tables) {
          allDbs[dbName].tables[tableName].rows = [];
          allDbs[dbName].tables[tableName].autoIncrementCurrent = 1;
        }
      }
      persistState();
      return NextResponse.json({ success: true, message: 'All demo data successfully cleared' });
    }

    if (action === 'load_demo') {
      return NextResponse.json({ success: true, message: 'Demo data mode disabled' });
    }

    if (action === 'reset_default') {
      const engine = getEngine();
      const currentKeys = engine.getDatabases();
      for (const k of currentKeys) {
        engine.dropDatabase(k);
      }
      for (const k of Object.keys(INITIAL_DATABASES)) {
        const dbCopy = JSON.parse(JSON.stringify(INITIAL_DATABASES[k]));
        (engine as any).databases[k] = dbCopy;
      }
      persistState();
      return NextResponse.json({ success: true, message: 'Database server reset to clean empty tables' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
