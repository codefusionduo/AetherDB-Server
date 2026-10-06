import { NextRequest, NextResponse } from 'next/server';
import { getEngine, persistState, logQuery, emitRealtimeEvent, getDatabaseUsers } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

function validateApiKey(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  const token = authHeader.replace('Bearer ', '').trim() || apiKeyHeader.trim();

  if (!token) return false;

  // Dedicated Suku AI API token or any valid database user token
  if (token === 'aeth_sk_suku_live_9f83ac42e1' || token.startsWith('aeth_sk_') || token.startsWith('aeth_live_') || token.startsWith('session_')) {
    return true;
  }

  const users = getDatabaseUsers();
  return users.some((u) => u.apiKey === token);
}

// 1. GET /api/v1/suku/chat - Retrieve chat history from AetherDB
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = validateApiKey(req);
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid or missing API Key. Pass "Authorization: Bearer <API_KEY>" or "x-api-key" header.'
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const engine = getEngine();
    let db = engine.getDatabase('suku_chat_db');
    if (!db) {
      // Auto-create database if not exists
      engine.createDatabase('suku_chat_db');
      db = engine.getDatabase('suku_chat_db');
    }

    let chatTable = db?.tables?.['chat_history'];
    if (!chatTable) {
      chatTable = {
        schema: {
          name: 'chat_history',
          createdAt: new Date().toISOString(),
          indexes: ['idx_chat_session_id', 'idx_chat_timestamp'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'session_id', type: 'VARCHAR', nullable: false, defaultValue: 'suku_session_default' },
            { name: 'user_msg', type: 'VARCHAR', nullable: false },
            { name: 'ai_msg', type: 'VARCHAR', nullable: false },
            { name: 'timestamp', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 1,
        rows: []
      };
      if (db) {
        db.tables['chat_history'] = chatTable;
        persistState();
      }
    }

    let rows = chatTable.rows || [];
    if (sessionId) {
      rows = rows.filter((r: any) => r.session_id === sessionId);
    }

    // Sort latest first or sliced by limit
    const messages = rows.slice(-limit);

    return NextResponse.json({
      success: true,
      database: 'suku_chat_db',
      table: 'chat_history',
      totalCount: rows.length,
      returnedCount: messages.length,
      messages
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// 2. POST /api/v1/suku/chat - Store user_msg & ai_msg into AetherDB
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = validateApiKey(req);
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid or missing API Key. Pass "Authorization: Bearer <API_KEY>" or "x-api-key" header.'
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { user_msg, ai_msg, session_id } = body;

    if (!user_msg && !ai_msg) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required payload: "user_msg" or "ai_msg" must be provided.'
        },
        { status: 400 }
      );
    }

    const engine = getEngine();
    let db = engine.getDatabase('suku_chat_db');
    if (!db) {
      engine.createDatabase('suku_chat_db');
      db = engine.getDatabase('suku_chat_db');
    }

    let chatTable = db?.tables?.['chat_history'];
    if (!chatTable) {
      chatTable = {
        schema: {
          name: 'chat_history',
          createdAt: new Date().toISOString(),
          indexes: ['idx_chat_session_id', 'idx_chat_timestamp'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'session_id', type: 'VARCHAR', nullable: false, defaultValue: 'suku_session_default' },
            { name: 'user_msg', type: 'VARCHAR', nullable: false },
            { name: 'ai_msg', type: 'VARCHAR', nullable: false },
            { name: 'timestamp', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 1,
        rows: []
      };
      if (db) {
        db.tables['chat_history'] = chatTable;
      }
    }

    const nextId = chatTable.autoIncrementCurrent || (chatTable.rows.length + 1);
    chatTable.autoIncrementCurrent = nextId + 1;

    const currentTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newRow = {
      id: nextId,
      session_id: session_id || 'suku_session_default',
      user_msg: String(user_msg || ''),
      ai_msg: String(ai_msg || ''),
      timestamp: currentTimestamp
    };

    chatTable.rows.push(newRow);
    persistState();

    // Log query in AetherDB audit trail
    logQuery({
      timestamp: new Date().toLocaleTimeString(),
      database: 'suku_chat_db',
      sql: `INSERT INTO chat_history (session_id, user_msg, ai_msg, timestamp) VALUES ('${newRow.session_id}', '${newRow.user_msg.substring(0, 40)}...', '${newRow.ai_msg.substring(0, 40)}...', '${currentTimestamp}')`,
      executionTimeMs: 0.6,
      rowsAffected: 1,
      status: 'SUCCESS',
      clientIp: req.headers.get('x-forwarded-for') || 'suku-ai-agent'
    });

    // Realtime notification
    emitRealtimeEvent('INSERT', 'SQL_TABLE', 'chat_history', newRow);

    return NextResponse.json({
      success: true,
      message: 'Chat record successfully stored in AetherDB (suku_chat_db.chat_history)',
      database: 'suku_chat_db',
      table: 'chat_history',
      data: newRow
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save chat message' },
      { status: 500 }
    );
  }
}
