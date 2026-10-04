import fs from 'fs';
import path from 'path';
import { DatabaseEngine } from './engine';
import { BaasEngine } from './baas-engine';
import { ServerMetrics, QueryLogEntry, DatabaseUser, DatabaseData } from './types';
import { INITIAL_DATABASES, SAMPLE_DEMO_DATABASES } from './seed-data';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'aetherdb_storage.json');

function ensureStorageDir() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // Ignore if exists or read-only
    }
  }
}

function loadPersistedData(): Record<string, DatabaseData> | null {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      if (content.trim()) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.error('Failed to load persisted database storage:', err);
  }
  return null;
}

export function persistState() {
  try {
    ensureStorageDir();
    if (global._databaseEngineInstance) {
      const data = global._databaseEngineInstance.getAllDatabases();
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to write database to disk:', err);
  }
}

// Global singleton declaration to preserve state across HMR / Next.js server invocations
declare global {
  var _databaseEngineInstance: DatabaseEngine | undefined;
  var _baasEngineInstance: BaasEngine | undefined;
  var _serverStartTime: number | undefined;
  var _queryAuditLogs: QueryLogEntry[] | undefined;
  var _totalQueriesCount: number | undefined;
  var _databaseUsersList: DatabaseUser[] | undefined;
}

if (!global._serverStartTime) {
  global._serverStartTime = Date.now() - 1000 * 60 * 60 * 14;
}

if (!global._databaseEngineInstance) {
  const loaded = loadPersistedData();
  global._databaseEngineInstance = new DatabaseEngine(loaded || INITIAL_DATABASES);
}

if (!global._baasEngineInstance) {
  global._baasEngineInstance = new BaasEngine();
}

if (!global._queryAuditLogs) {
  global._queryAuditLogs = [
    {
      id: 'qlog_init',
      timestamp: new Date().toLocaleTimeString(),
      database: 'aetherdb',
      sql: 'AETHERDB ENGINE STARTED -- Database mounted (aetherdb)',
      executionTimeMs: 0.5,
      rowsAffected: 0,
      status: 'SUCCESS',
      clientIp: 'system:init'
    }
  ];
}

if (!global._totalQueriesCount) {
  global._totalQueriesCount = 1;
}

if (!global._databaseUsersList) {
  global._databaseUsersList = [
    {
      id: 'usr_yabhi',
      username: 'yabhi9435@gmail.com',
      role: 'SUPERUSER',
      databaseAccess: ['*'],
      createdAt: new Date().toISOString(),
      apiKey: 'aeth_sk_live_yabhi9435_admin_key',
      lastLogin: 'Active now'
    },
    {
      id: 'usr_root',
      username: 'admin',
      role: 'SUPERUSER',
      databaseAccess: ['*'],
      createdAt: new Date().toISOString(),
      apiKey: 'aeth_sk_live_99f2e301b4c91a',
      lastLogin: 'Active now'
    }
  ];
}

export function getEngine(): DatabaseEngine {
  if (!global._databaseEngineInstance) {
    const loaded = loadPersistedData();
    global._databaseEngineInstance = new DatabaseEngine(loaded || INITIAL_DATABASES);
  }
  return global._databaseEngineInstance;
}

export function getBaasEngine(): BaasEngine {
  if (!global._baasEngineInstance) {
    global._baasEngineInstance = new BaasEngine();
  }
  return global._baasEngineInstance;
}

export function emitRealtimeEvent(
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  entityType: 'SQL_TABLE' | 'MONGO_COLLECTION' | 'AUTH_USER' | 'STORAGE',
  entityName: string,
  payload: any
) {
  return getBaasEngine().emitRealtimeEvent(eventType, entityType, entityName, payload);
}

export function clearAllDatabaseData(): void {
  const engine = getEngine();
  const allDbs = engine.getAllDatabases();
  for (const dbName in allDbs) {
    for (const tableName in allDbs[dbName].tables) {
      allDbs[dbName].tables[tableName].rows = [];
      allDbs[dbName].tables[tableName].autoIncrementCurrent = 1;
    }
  }
  persistState();
}

export function loadDemoSampleData(): void {
  const engine = getEngine();
  for (const dbName in SAMPLE_DEMO_DATABASES) {
    (engine as any).databases[dbName] = JSON.parse(JSON.stringify(SAMPLE_DEMO_DATABASES[dbName]));
  }
  persistState();
}

export function logQuery(entry: Omit<QueryLogEntry, 'id'>) {
  const newEntry: QueryLogEntry = {
    ...entry,
    id: `qlog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  };
  global._totalQueriesCount = (global._totalQueriesCount || 0) + 1;
  global._queryAuditLogs?.unshift(newEntry);
  if (global._queryAuditLogs && global._queryAuditLogs.length > 50) {
    global._queryAuditLogs.pop();
  }
}

export function getAuditLogs(): QueryLogEntry[] {
  return global._queryAuditLogs || [];
}

export function getDatabaseUsers(): DatabaseUser[] {
  return global._databaseUsersList || [];
}

export function addDatabaseUser(user: Omit<DatabaseUser, 'id' | 'createdAt' | 'apiKey'>): DatabaseUser {
  const newUser: DatabaseUser = {
    ...user,
    id: `usr_${Date.now()}`,
    createdAt: new Date().toISOString(),
    apiKey: `aeth_sk_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 8)}`,
    lastLogin: 'Never'
  };
  global._databaseUsersList?.push(newUser);
  return newUser;
}

export function getServerMetrics(): ServerMetrics {
  const engine = getEngine();
  const uptimeSeconds = Math.floor((Date.now() - (global._serverStartTime || Date.now())) / 1000);
  const allDbs = engine.getAllDatabases();

  let totalSizeBytes = 0;
  for (const dbName in allDbs) {
    totalSizeBytes += allDbs[dbName].sizeBytes;
    for (const tName in allDbs[dbName].tables) {
      totalSizeBytes += allDbs[dbName].tables[tName].rows.length * 1024 * 1.5;
    }
  }

  const diskUsageMb = parseFloat((totalSizeBytes / (1024 * 1024)).toFixed(2));
  const activeConnections = 14;

  return {
    serverName: 'AetherDB Server Engine v2.4 (Enterprise)',
    version: '2.4.12-rel',
    status: 'ONLINE',
    port: 5432,
    httpPort: 3000,
    uptimeSeconds,
    activeConnections,
    maxConnections: 100,
    totalQueriesProcessed: global._totalQueriesCount || 0,
    qps: 184.2,
    avgLatencyMs: 1.34,
    cacheHitRatio: 98.7,
    bufferPoolUsedMb: 64.2,
    bufferPoolTotalMb: 256.0,
    diskUsageMb,
    slowQueriesCount: 3
  };
}
