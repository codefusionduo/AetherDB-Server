export type DataType = 'INTEGER' | 'VARCHAR' | 'DECIMAL' | 'BOOLEAN' | 'TIMESTAMP' | 'JSON';

export interface ColumnDefinition {
  name: string;
  type: DataType;
  primaryKey?: boolean;
  nullable?: boolean;
  defaultValue?: any;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  createdAt: string;
  indexes?: string[];
}

export interface TableData {
  schema: TableSchema;
  rows: Record<string, any>[];
  autoIncrementCurrent: number;
}

export interface DatabaseData {
  name: string;
  charset: string;
  collation: string;
  sizeBytes: number;
  tables: Record<string, TableData>;
  createdAt: string;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  command: string;
  message?: string;
  error?: string;
  plan?: ExecutionPlanNode;
}

export interface ExecutionPlanNode {
  operation: string;
  details: string;
  estimatedRows: number;
  actualRows: number;
  costEstimate: number;
  actualTimeMs: number;
  children?: ExecutionPlanNode[];
}

export interface ServerMetrics {
  serverName: string;
  version: string;
  status: 'ONLINE' | 'DEGRADED' | 'MAINTENANCE';
  port: number;
  httpPort: number;
  uptimeSeconds: number;
  activeConnections: number;
  maxConnections: number;
  totalQueriesProcessed: number;
  qps: number;
  avgLatencyMs: number;
  cacheHitRatio: number;
  bufferPoolUsedMb: number;
  bufferPoolTotalMb: number;
  diskUsageMb: number;
  slowQueriesCount: number;
}

export interface QueryLogEntry {
  id: string;
  timestamp: string;
  database: string;
  sql: string;
  executionTimeMs: number;
  rowsAffected: number;
  status: 'SUCCESS' | 'ERROR';
  clientIp: string;
}

export interface DatabaseUser {
  id: string;
  username: string;
  role: 'SUPERUSER' | 'READ_WRITE' | 'READ_ONLY';
  databaseAccess: string[];
  createdAt: string;
  apiKey: string;
  lastLogin?: string;
}

// -------------------------------------------------------------
// AetherDoc NoSQL Document Store Types
// -------------------------------------------------------------
export interface MongoDocument {
  _id: string;
  [key: string]: any;
}

export interface MongoCollection {
  name: string;
  createdAt: string;
  indexes: string[];
  documents: MongoDocument[];
}

// -------------------------------------------------------------
// AetherAuth & Access Control (RLS) Types
// -------------------------------------------------------------
export interface AuthAccount {
  id: string;
  email: string;
  provider: 'email' | 'google' | 'github' | 'phone';
  role: string;
  createdAt: string;
  lastSignIn: string;
  status: 'ACTIVE' | 'SUSPENDED';
  emailConfirmed: boolean;
  rawUserMetaData?: Record<string, any>;
}

export interface RlsPolicy {
  id: string;
  name: string;
  target: string;
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  role: string;
  usingExpression: string;
  enabled: boolean;
}

// -------------------------------------------------------------
// AetherVault Storage Buckets Types
// -------------------------------------------------------------
export interface StorageBucket {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  fileCount?: number;
  sizeBytes?: number;
}

export interface StorageFile {
  id: string;
  bucketId: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Realtime Live Subscription Event Types
// -------------------------------------------------------------
export interface RealtimeEvent {
  id: string;
  timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  entityType: 'SQL_TABLE' | 'MONGO_COLLECTION' | 'AUTH_USER' | 'STORAGE';
  entityName: string;
  payload: any;
  clientOrigin?: string;
}
