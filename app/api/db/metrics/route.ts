import { NextRequest, NextResponse } from 'next/server';
import { getServerMetrics, getAuditLogs, getDatabaseUsers, addDatabaseUser, deleteDatabaseUser, logQuery, getEngine } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = getServerMetrics();
    const auditLogs = getAuditLogs();
    const users = getDatabaseUsers();

    return NextResponse.json({
      success: true,
      metrics,
      auditLogs,
      users
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Benchmark traffic spike
    if (action === 'benchmark') {
      const engine = getEngine();
      const queries = [
        'SELECT * FROM customers WHERE balance > 1000',
        'SELECT category, COUNT(*), AVG(price) FROM products GROUP BY category',
        'SELECT * FROM orders WHERE status = \'DELIVERED\'',
        'SELECT id, sku, stock_quantity FROM products ORDER BY stock_quantity ASC LIMIT 3',
        'SELECT COUNT(*) FROM order_items'
      ];

      const start = performance.now();
      const count = 50;
      for (let i = 0; i < count; i++) {
        const q = queries[i % queries.length];
        engine.executeSQL(q, 'ecommerce_prod');
      }
      const totalTime = performance.now() - start;

      logQuery({
        timestamp: new Date().toLocaleTimeString(),
        database: 'ecommerce_prod',
        sql: `BENCHMARK TEST: Ran 50 sequential queries in ${totalTime.toFixed(1)}ms (${((count / (totalTime / 1000))).toFixed(0)} QPS)`,
        executionTimeMs: parseFloat(totalTime.toFixed(2)),
        rowsAffected: count,
        status: 'SUCCESS',
        clientIp: 'benchmark-runner:local'
      });

      return NextResponse.json({
        success: true,
        benchmark: {
          queriesExecuted: count,
          totalDurationMs: parseFloat(totalTime.toFixed(2)),
          calculatedQps: parseFloat(((count / (totalTime / 1000))).toFixed(1)),
          avgLatencyMs: parseFloat((totalTime / count).toFixed(3)),
          status: 'EXCELLENT_HEALTH'
        }
      });
    }

    // Action 2: Add database user
    if (action === 'addUser') {
      const { username, role, databaseAccess } = body;
      if (!username || !role) {
        return NextResponse.json({ success: false, error: 'Username and role required' }, { status: 400 });
      }
      const user = addDatabaseUser({
        username,
        role,
        databaseAccess: databaseAccess || ['*']
      });
      return NextResponse.json({ success: true, user });
    }

    // Action 3: Delete database user
    if (action === 'deleteUser') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
      }
      const ok = deleteDatabaseUser(userId);
      return NextResponse.json({ success: ok, message: ok ? 'User deleted' : 'User not found' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
