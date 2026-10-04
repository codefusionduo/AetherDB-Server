import { NextRequest, NextResponse } from 'next/server';
import { getEngine, logQuery, persistState, emitRealtimeEvent } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const database = searchParams.get('database') || 'ecommerce_prod';
    const table = searchParams.get('table');
    const search = searchParams.get('search')?.toLowerCase() || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!table) {
      return NextResponse.json({ success: false, error: 'Table parameter required' }, { status: 400 });
    }

    const engine = getEngine();
    const tableData = engine.getTable(database, table);
    if (!tableData) {
      return NextResponse.json({ success: false, error: `Table '${table}' not found` }, { status: 404 });
    }

    let rows = [...tableData.rows];
    if (search) {
      rows = rows.filter(r =>
        Object.values(r).some(val => String(val).toLowerCase().includes(search))
      );
    }

    const totalCount = rows.length;
    const startIndex = (page - 1) * limit;
    const paginatedRows = rows.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      schema: tableData.schema,
      rows: paginatedRows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { database = 'ecommerce_prod', table, row } = body;

    if (!table || !row) {
      return NextResponse.json({ success: false, error: 'Table and row data required' }, { status: 400 });
    }

    const engine = getEngine();
    const inserted = engine.insertRow(database, table, row);
    persistState();
    emitRealtimeEvent('INSERT', 'SQL_TABLE', `${database}.${table}`, inserted);

    logQuery({
      timestamp: new Date().toLocaleTimeString(),
      database,
      sql: `REST API INSERT INTO ${table} (${Object.keys(row).join(', ')})`,
      executionTimeMs: 1.1,
      rowsAffected: 1,
      status: 'SUCCESS',
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1:rest'
    });

    return NextResponse.json({ success: true, row: inserted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { database = 'ecommerce_prod', table, id, updates } = body;

    if (!table || id === undefined || !updates) {
      return NextResponse.json({ success: false, error: 'Table, id and updates required' }, { status: 400 });
    }

    const engine = getEngine();
    const updated = engine.updateRow(database, table, id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: `Row with id ${id} not found` }, { status: 404 });
    }
    persistState();
    emitRealtimeEvent('UPDATE', 'SQL_TABLE', `${database}.${table}`, { id, ...updates });

    logQuery({
      timestamp: new Date().toLocaleTimeString(),
      database,
      sql: `REST API UPDATE ${table} SET [keys: ${Object.keys(updates).join(', ')}] WHERE id = ${id}`,
      executionTimeMs: 1.3,
      rowsAffected: 1,
      status: 'SUCCESS',
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1:rest'
    });

    return NextResponse.json({ success: true, message: 'Row updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const database = searchParams.get('database') || 'ecommerce_prod';
    const table = searchParams.get('table');
    const id = searchParams.get('id');

    if (!table || !id) {
      return NextResponse.json({ success: false, error: 'Table and id required' }, { status: 400 });
    }

    const engine = getEngine();
    const deleted = engine.deleteRow(database, table, id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: `Row with id ${id} not found` }, { status: 404 });
    }
    persistState();
    emitRealtimeEvent('DELETE', 'SQL_TABLE', `${database}.${table}`, { id });

    logQuery({
      timestamp: new Date().toLocaleTimeString(),
      database,
      sql: `REST API DELETE FROM ${table} WHERE id = ${id}`,
      executionTimeMs: 1.0,
      rowsAffected: 1,
      status: 'SUCCESS',
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1:rest'
    });

    return NextResponse.json({ success: true, message: 'Row deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
