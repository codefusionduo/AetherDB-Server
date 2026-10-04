import { NextRequest, NextResponse } from 'next/server';
import { getEngine, logQuery, persistState } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sql, database = 'aetherdb' } = body;

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json(
        { success: false, error: 'SQL query string is required' },
        { status: 400 }
      );
    }

    const engine = getEngine();
    const result = engine.executeSQL(sql, database);

    // If query mutated schema or rows, persist to disk
    if (result.success && ['INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE', 'DROP TABLE', 'TRUNCATE', 'CREATE DATABASE', 'DROP DATABASE'].includes(result.command)) {
      persistState();
    }

    // Audit log
    logQuery({
      timestamp: new Date().toLocaleTimeString(),
      database,
      sql: sql.trim().length > 150 ? sql.trim().substring(0, 150) + '...' : sql.trim(),
      executionTimeMs: parseFloat(result.executionTimeMs.toFixed(2)),
      rowsAffected: result.rowCount,
      status: result.success ? 'SUCCESS' : 'ERROR',
      clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1:client'
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        command: 'ERROR',
        error: error.message || 'Internal Database Server Error'
      },
      { status: 500 }
    );
  }
}
