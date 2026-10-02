import { DatabaseData } from './types';

// Clean initial databases with tables ready, but empty rows
export const INITIAL_DATABASES: Record<string, DatabaseData> = {
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
        autoIncrementCurrent: 1,
        rows: []
      }
    }
  }
};

export const SAMPLE_DEMO_DATABASES: Record<string, DatabaseData> = {};

