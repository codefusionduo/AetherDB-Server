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
      createdAt: '2026-10-03 12:00:00',
      apiKey: 'aeth_sk_live_yabhi9435_admin_key',
      lastLogin: 'Active now'
    },
    {
      id: 'usr_codefusion',
      username: 'codefusionduo@gmail.com',
      role: 'SUPERUSER',
      databaseAccess: ['*'],
      createdAt: '2026-10-03 12:00:00',
      apiKey: 'aeth_sk_live_codefusionduo_admin_key',
      lastLogin: 'Active now'
    }
  ];
}

export function getEngine(): DatabaseEngine {
  if (!global._databaseEngineInstance) {
    const loaded = loadPersistedData();
    global._databaseEngineInstance = new DatabaseEngine(loaded || INITIAL_DATABASES);
  }

  // Ensure suku_chat_db is always mounted and ready for Suku AI
  if (!global._databaseEngineInstance.getDatabase('suku_chat_db')) {
    global._databaseEngineInstance.createDatabase('suku_chat_db');
  }
  const sukuDb = global._databaseEngineInstance.getDatabase('suku_chat_db');
  if (sukuDb && !sukuDb.tables['chat_history']) {
    sukuDb.tables['chat_history'] = {
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
      autoIncrementCurrent: 3,
      rows: [
        {
          id: 1,
          session_id: 'suku_session_default',
          user_msg: 'Hello Suku! Can you help me manage my AetherDB database?',
          ai_msg: 'Hello! I am Suku AI. I can definitely help you execute queries, monitor telemetry, and store your chat logs directly in AetherDB.',
          timestamp: '2026-10-05 10:30:00'
        },
        {
          id: 2,
          session_id: 'suku_session_default',
          user_msg: 'AetherDB connected successfully!',
          ai_msg: 'Awesome! All our conversations are now safely stored in the suku_chat_db.chat_history table.',
          timestamp: '2026-10-05 10:30:15'
        }
      ]
    };
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

export function deleteDatabaseUser(userId: string): boolean {
  if (!global._databaseUsersList) return false;
  const idx = global._databaseUsersList.findIndex((u) => u.id === userId || u.username === userId);
  if (idx !== -1) {
    global._databaseUsersList.splice(idx, 1);
    return true;
  }
  return false;
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
    status: global._maintenanceMode ? 'MAINTENANCE' : 'ONLINE',
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

// -------------------------------------------------------------
// Aether Internal Database & Master Admin Functions
// -------------------------------------------------------------
declare global {
  var _maintenanceMode: boolean | undefined;
}

export function isMaintenanceMode(): boolean {
  return !!global._maintenanceMode;
}

export function setMaintenanceMode(enabled: boolean): boolean {
  global._maintenanceMode = enabled;
  logQuery({
    timestamp: new Date().toLocaleTimeString(),
    database: 'aetherdb',
    sql: `ADMIN SET MAINTENANCE_MODE = ${enabled ? 'ON' : 'OFF'}`,
    executionTimeMs: 0.2,
    rowsAffected: 1,
    status: 'SUCCESS',
    clientIp: 'admin:internal'
  });
  return global._maintenanceMode;
}

export function getAetherPlatformUsers() {
  const engine = getEngine();
  const aetherDb = engine.getDatabase('aetherdb');
  const userTable = aetherDb?.tables?.['users'];
  
  if (!userTable || !userTable.rows) {
    return [];
  }

  // Ensure default super admins and authentic platform users exist in table
  const superAdmins = [
    {
      id: 1,
      name: "Abhishek (Super Administrator)",
      email: "yabhi9435@gmail.com",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      plan: "ENTERPRISE",
      api_key: "aeth_live_super_yabhi9435_key",
      storage_quota_mb: 10240,
      storage_used_mb: 128.4,
      queries_count: 1842,
      last_login_at: "Active now",
      created_at: "2026-10-03 12:00:00"
    },
    {
      id: 5,
      name: "CodeFusion Duo (Super Administrator)",
      email: "codefusionduo@gmail.com",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      plan: "ENTERPRISE",
      api_key: "aeth_live_super_codefusionduo_key",
      storage_quota_mb: 10240,
      storage_used_mb: 145.8,
      queries_count: 2450,
      last_login_at: "Active now",
      created_at: "2026-10-03 12:00:00"
    }
  ];

  for (const sa of superAdmins) {
    const exists = userTable.rows.some((r: any) => r.email?.toLowerCase() === sa.email.toLowerCase());
    if (!exists) {
      userTable.rows.push(sa);
    }
  }

  return userTable.rows.map((r: any) => ({
    id: `usr_${r.id}`,
    numericId: r.id,
    name: r.name || 'Unnamed User',
    email: r.email,
    role: (r.role || 'MEMBER').toUpperCase(),
    status: (r.status || 'ACTIVE').toUpperCase(),
    plan: (r.plan || 'PRO').toUpperCase(),
    apiKey: r.api_key || `aeth_live_${r.id}_${Math.random().toString(36).substring(2, 8)}`,
    storageUsedMb: r.storage_used_mb || 45.2,
    storageQuotaMb: r.storage_quota_mb || 5120,
    queryCount: r.queries_count || 120,
    createdAt: r.created_at || new Date().toISOString(),
    lastLoginAt: r.last_login_at || 'Recently active',
    twoFactorEnabled: r.two_factor_enabled ?? true
  }));
}

export function createAetherPlatformUser(data: {
  name: string;
  email: string;
  role?: string;
  plan?: string;
  storageQuotaMb?: number;
}) {
  const engine = getEngine();
  const aetherDb = engine.getDatabase('aetherdb');
  if (!aetherDb || !aetherDb.tables?.['users']) {
    throw new Error('aetherdb.users table not found');
  }

  const userTable = aetherDb.tables['users'];
  // Check if email already exists
  const existing = userTable.rows.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase());
  if (existing) {
    throw new Error(`User with email "${data.email}" already exists`);
  }

  const nextId = (userTable.autoIncrementCurrent || userTable.rows.length + 1);
  userTable.autoIncrementCurrent = nextId + 1;

  const newUserRow = {
    id: nextId,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: (data.role || 'MEMBER').toUpperCase(),
    status: 'ACTIVE',
    plan: (data.plan || 'PRO').toUpperCase(),
    api_key: `aeth_live_${nextId}_${Math.random().toString(36).substring(2, 10)}`,
    storage_used_mb: 0,
    storage_quota_mb: data.storageQuotaMb || (data.plan === 'ENTERPRISE' ? 10240 : 5120),
    queries_count: 0,
    last_login_at: 'Just registered',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    two_factor_enabled: false
  };

  userTable.rows.push(newUserRow);
  persistState();

  // Also add to BaaS Auth for cross-engine sync
  try {
    getBaasEngine().createAuthUser(newUserRow.email, newUserRow.role.toLowerCase(), 'email');
  } catch {}

  logQuery({
    timestamp: new Date().toLocaleTimeString(),
    database: 'aetherdb',
    sql: `INSERT INTO users (name, email, role, plan) VALUES ('${newUserRow.name}', '${newUserRow.email}', '${newUserRow.role}', '${newUserRow.plan}')`,
    executionTimeMs: 0.8,
    rowsAffected: 1,
    status: 'SUCCESS',
    clientIp: 'admin:portal'
  });

  return {
    ...newUserRow,
    id: `usr_${newUserRow.id}`,
    numericId: newUserRow.id
  };
}

export function updateAetherPlatformUser(userId: string | number, updates: Partial<{
  name: string;
  role: string;
  status: string;
  plan: string;
  storageQuotaMb: number;
}>) {
  const engine = getEngine();
  const aetherDb = engine.getDatabase('aetherdb');
  const userTable = aetherDb?.tables?.['users'];
  if (!userTable) throw new Error('aetherdb.users table not found');

  const numericId = typeof userId === 'string' ? parseInt(userId.replace('usr_', ''), 10) : userId;
  const userRow = userTable.rows.find((u: any) => u.id === numericId);
  if (!userRow) throw new Error(`User with ID ${userId} not found`);

  if (updates.name !== undefined) userRow.name = updates.name.trim();
  if (updates.role !== undefined) userRow.role = updates.role.toUpperCase();
  if (updates.status !== undefined) userRow.status = updates.status.toUpperCase();
  if (updates.plan !== undefined) userRow.plan = updates.plan.toUpperCase();
  if (updates.storageQuotaMb !== undefined) userRow.storage_quota_mb = updates.storageQuotaMb;

  persistState();

  logQuery({
    timestamp: new Date().toLocaleTimeString(),
    database: 'aetherdb',
    sql: `UPDATE users SET role='${userRow.role}', status='${userRow.status}', plan='${userRow.plan}' WHERE id=${numericId}`,
    executionTimeMs: 0.6,
    rowsAffected: 1,
    status: 'SUCCESS',
    clientIp: 'admin:portal'
  });

  return userRow;
}

export function deleteAetherPlatformUser(userId: string | number) {
  const engine = getEngine();
  const aetherDb = engine.getDatabase('aetherdb');
  const userTable = aetherDb?.tables?.['users'];
  if (!userTable) throw new Error('aetherdb.users table not found');

  const numericId = typeof userId === 'string' ? parseInt(userId.replace('usr_', ''), 10) : userId;
  const index = userTable.rows.findIndex((u: any) => u.id === numericId);
  if (index === -1) throw new Error(`User with ID ${userId} not found`);

  const deletedUser = userTable.rows.splice(index, 1)[0];
  persistState();

  logQuery({
    timestamp: new Date().toLocaleTimeString(),
    database: 'aetherdb',
    sql: `DELETE FROM users WHERE id=${numericId}`,
    executionTimeMs: 0.7,
    rowsAffected: 1,
    status: 'SUCCESS',
    clientIp: 'admin:portal'
  });

  return deletedUser;
}

export function getAetherAdminOverview() {
  const engine = getEngine();
  const allDbs = engine.getAllDatabases();
  const users = getAetherPlatformUsers();
  
  let totalTables = 0;
  let totalRows = 0;
  let totalBytes = 0;

  for (const dbName in allDbs) {
    totalBytes += allDbs[dbName].sizeBytes;
    for (const tName in allDbs[dbName].tables) {
      totalTables++;
      const rowCount = allDbs[dbName].tables[tName].rows.length;
      totalRows += rowCount;
      totalBytes += rowCount * 1024 * 1.5;
    }
  }

  const diskUsageMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));

  return {
    totalUsers: users.length,
    activeUsersToday: users.filter((u) => u.status === 'ACTIVE').length,
    totalDatabases: Object.keys(allDbs).length,
    totalTables,
    totalRowsStored: totalRows,
    totalQueriesProcessed: global._totalQueriesCount || 0,
    storageUsedMb: diskUsageMb,
    systemHealth: global._maintenanceMode ? 'MAINTENANCE' : 'OPTIMAL',
    maintenanceMode: !!global._maintenanceMode
  };
}
