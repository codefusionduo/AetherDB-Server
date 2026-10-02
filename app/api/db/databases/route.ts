import { NextRequest, NextResponse } from 'next/server';
import { getEngine, persistState } from '@/lib/db-server/server-state';

export async function GET() {
  try {
    const engine = getEngine();
    const dbs = engine.getAllDatabases();

    const result = Object.values(dbs).map(db => {
      const tableNames = Object.keys(db.tables);
      const totalRows = tableNames.reduce((acc, t) => acc + (db.tables[t]?.rows.length || 0), 0);
      return {
        name: db.name,
        charset: db.charset,
        collation: db.collation,
        sizeBytes: db.sizeBytes,
        tableCount: tableNames.length,
        totalRows,
        createdAt: db.createdAt,
        tables: tableNames
      };
    });

    return NextResponse.json({ success: true, databases: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Database name is required' }, { status: 400 });
    }

    const engine = getEngine();
    const created = engine.createDatabase(name);
    if (!created) {
      return NextResponse.json({ success: false, error: `Database '${name}' already exists or invalid name` }, { status: 400 });
    }
    persistState();

    return NextResponse.json({ success: true, message: `Database '${name}' created successfully` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    if (!name) {
      return NextResponse.json({ success: false, error: 'Database name parameter is required' }, { status: 400 });
    }

    const engine = getEngine();
    const dropped = engine.dropDatabase(name);
    if (!dropped) {
      return NextResponse.json({ success: false, error: `Database '${name}' not found` }, { status: 404 });
    }
    persistState();

    return NextResponse.json({ success: true, message: `Database '${name}' dropped` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
