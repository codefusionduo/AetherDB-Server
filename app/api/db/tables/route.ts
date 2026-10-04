import { NextRequest, NextResponse } from 'next/server';
import { getEngine, persistState } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const database = searchParams.get('database') || 'ecommerce_prod';

    const engine = getEngine();
    const db = engine.getDatabase(database);
    if (!db) {
      return NextResponse.json({ success: false, error: `Database '${database}' not found` }, { status: 404 });
    }

    const tables = Object.keys(db.tables).map(tName => {
      const t = db.tables[tName];
      return {
        name: tName,
        schema: t.schema,
        rowCount: t.rows.length,
        autoIncrementCurrent: t.autoIncrementCurrent
      };
    });

    return NextResponse.json({ success: true, database, tables });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { database = 'ecommerce_prod', name, columns } = body;

    if (!name || !columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Table name and columns array are required' },
        { status: 400 }
      );
    }

    const engine = getEngine();
    const db = engine.getDatabase(database);
    if (!db) {
      return NextResponse.json({ success: false, error: `Database '${database}' not found` }, { status: 404 });
    }

    if (db.tables[name]) {
      return NextResponse.json({ success: false, error: `Table '${name}' already exists` }, { status: 400 });
    }

    db.tables[name] = {
      schema: {
        name,
        createdAt: new Date().toISOString(),
        columns,
        indexes: columns.filter((c: any) => c.primaryKey || c.unique).map((c: any) => `idx_${name}_${c.name}`)
      },
      rows: [],
      autoIncrementCurrent: 1
    };
    persistState();

    return NextResponse.json({ success: true, message: `Table '${name}' created successfully` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const database = searchParams.get('database') || 'ecommerce_prod';
    const table = searchParams.get('table');

    if (!table) {
      return NextResponse.json({ success: false, error: 'Table parameter is required' }, { status: 400 });
    }

    const engine = getEngine();
    const db = engine.getDatabase(database);
    if (!db) {
      return NextResponse.json({ success: false, error: `Database '${database}' not found` }, { status: 404 });
    }

    if (!db.tables[table]) {
      return NextResponse.json({ success: false, error: `Table '${table}' not found` }, { status: 404 });
    }

    delete db.tables[table];
    persistState();
    return NextResponse.json({ success: true, message: `Table '${table}' dropped` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
