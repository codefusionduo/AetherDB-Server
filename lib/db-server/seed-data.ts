import { DatabaseData } from './types';

// Initial databases with official aetherdb database ready and seeded
export const INITIAL_DATABASES: Record<string, DatabaseData> = {
  aetherdb: {
    name: 'aetherdb',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    sizeBytes: 1024 * 128,
    createdAt: new Date().toISOString(),
    tables: {
      users: {
        schema: {
          name: 'users',
          createdAt: new Date().toISOString(),
          indexes: ['idx_users_email', 'idx_users_role'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: false },
            { name: 'email', type: 'VARCHAR', nullable: false, unique: true },
            { name: 'role', type: 'VARCHAR', nullable: false, defaultValue: 'member' },
            { name: 'status', type: 'VARCHAR', nullable: false, defaultValue: 'ACTIVE' },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 3,
        rows: [
          {
            id: 1,
            name: 'Abhishek (Super Administrator)',
            email: 'yabhi9435@gmail.com',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            created_at: '2026-10-03 12:00:00'
          },
          {
            id: 2,
            name: 'CodeFusion Duo (Super Administrator)',
            email: 'codefusionduo@gmail.com',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            created_at: '2026-10-03 12:00:00'
          }
        ]
      },
      projects: {
        schema: {
          name: 'projects',
          createdAt: new Date().toISOString(),
          indexes: ['idx_projects_slug', 'idx_projects_owner'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: false },
            { name: 'slug', type: 'VARCHAR', nullable: false, unique: true },
            { name: 'environment', type: 'VARCHAR', nullable: false, defaultValue: 'production' },
            { name: 'region', type: 'VARCHAR', nullable: false, defaultValue: 'asia-southeast1' },
            { name: 'owner_id', type: 'INTEGER', nullable: false, references: { table: 'users', column: 'id' } },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 3,
        rows: [
          {
            id: 1,
            name: 'AetherDB Cloud Engine',
            slug: 'aetherdb-cloud-prod',
            environment: 'production',
            region: 'asia-southeast1',
            owner_id: 1,
            created_at: '2026-10-03 12:00:00'
          },
          {
            id: 2,
            name: 'Auth Gateway Studio',
            slug: 'auth-gateway',
            environment: 'production',
            region: 'asia-southeast1',
            owner_id: 1,
            created_at: '2026-10-03 12:05:00'
          }
        ]
      },
      api_keys: {
        schema: {
          name: 'api_keys',
          createdAt: new Date().toISOString(),
          indexes: ['idx_api_keys_prefix'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: false },
            { name: 'prefix', type: 'VARCHAR', nullable: false },
            { name: 'scope', type: 'VARCHAR', nullable: false, defaultValue: 'read,write' },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 3,
        rows: [
          {
            id: 1,
            name: 'Primary Service Key',
            prefix: 'aeth_live_8f3a291',
            scope: 'read,write,admin',
            created_at: '2026-10-03 12:00:00'
          },
          {
            id: 2,
            name: 'Public Anon Client Key',
            prefix: 'aeth_anon_4c1e902',
            scope: 'read:public',
            created_at: '2026-10-03 12:00:00'
          }
        ]
      },
      database_clusters: {
        schema: {
          name: 'database_clusters',
          createdAt: new Date().toISOString(),
          indexes: ['idx_clusters_name'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'cluster_name', type: 'VARCHAR', nullable: false },
            { name: 'engine', type: 'VARCHAR', nullable: false },
            { name: 'status', type: 'VARCHAR', nullable: false, defaultValue: 'ONLINE' },
            { name: 'port', type: 'INTEGER', nullable: false, defaultValue: 5432 },
            { name: 'host', type: 'VARCHAR', nullable: false, defaultValue: 'aetherdb.ryzn.pro' },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 2,
        rows: [
          {
            id: 1,
            cluster_name: 'aetherdb-primary-node',
            engine: 'AetherDB Engine v2.4 (Ultra-Fast)',
            status: 'ONLINE',
            port: 5432,
            host: 'aetherdb.ryzn.pro',
            created_at: '2026-10-03 12:00:00'
          }
        ]
      },
      audit_logs: {
        schema: {
          name: 'audit_logs',
          createdAt: new Date().toISOString(),
          indexes: ['idx_audit_logs_action'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'action', type: 'VARCHAR', nullable: false },
            { name: 'actor', type: 'VARCHAR', nullable: false },
            { name: 'status', type: 'VARCHAR', nullable: false, defaultValue: 'SUCCESS' },
            { name: 'ip_address', type: 'VARCHAR', nullable: false, defaultValue: '127.0.0.1' },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 3,
        rows: [
          {
            id: 1,
            action: 'DATABASE_INITIALIZATION',
            actor: 'system:init',
            status: 'SUCCESS',
            ip_address: '127.0.0.1',
            created_at: '2026-10-03 12:00:00'
          },
          {
            id: 2,
            action: 'AUTH_GATEWAY_ACTIVATION',
            actor: 'yabhi9435@gmail.com',
            status: 'SUCCESS',
            ip_address: '127.0.0.1',
            created_at: '2026-10-03 12:05:00'
          }
        ]
      },
      posts: {
        schema: {
          name: 'posts',
          createdAt: new Date().toISOString(),
          indexes: ['idx_posts_user_id'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'user_id', type: 'INTEGER', nullable: false, references: { table: 'users', column: 'id' } },
            { name: 'title', type: 'VARCHAR', nullable: false },
            { name: 'content', type: 'VARCHAR', nullable: true },
            { name: 'published', type: 'BOOLEAN', nullable: false, defaultValue: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 2,
        rows: [
          {
            id: 1,
            user_id: 1,
            title: 'Welcome to AetherDB Cloud Database',
            content: 'Ultra-fast SQL + NoSQL + Auth Engine connected to aetherdb.ryzn.pro',
            published: true,
            created_at: '2026-10-03 12:00:00'
          }
        ]
      }
    }
  },
  main_db: {
    name: 'main_db',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    sizeBytes: 1024 * 64,
    createdAt: new Date().toISOString(),
    tables: {
      users: {
        schema: {
          name: 'users',
          createdAt: new Date().toISOString(),
          indexes: ['idx_users_email'],
          columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: false },
            { name: 'email', type: 'VARCHAR', nullable: false, unique: true },
            { name: 'role', type: 'VARCHAR', nullable: false, defaultValue: 'member' },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ]
        },
        autoIncrementCurrent: 1,
        rows: []
      }
    }
  },
  suku_chat_db: {
    name: 'suku_chat_db',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    sizeBytes: 1024 * 64,
    createdAt: new Date().toISOString(),
    tables: {
      chat_history: {
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
      }
    }
  }
};

export const SAMPLE_DEMO_DATABASES: Record<string, DatabaseData> = {};
