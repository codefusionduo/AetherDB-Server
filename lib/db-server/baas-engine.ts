import {
  MongoCollection,
  MongoDocument,
  AuthAccount,
  RlsPolicy,
  StorageBucket,
  StorageFile,
  RealtimeEvent
} from './types';

export class BaasEngine {
  private collections: Record<string, MongoCollection> = {};
  private authAccounts: AuthAccount[] = [];
  private rlsPolicies: RlsPolicy[] = [];
  private buckets: Record<string, StorageBucket> = {};
  private files: Record<string, StorageFile[]> = {};
  private realtimeEvents: RealtimeEvent[] = [];

  constructor() {
    this.initDefaultData();
  }

  private initDefaultData() {
    // 1. Initial AetherDoc Collections (Clean, empty or ready)
    this.collections = {
      user_profiles: {
        name: 'user_profiles',
        createdAt: new Date().toISOString(),
        indexes: ['_id', 'user_id', 'username'],
        documents: []
      },
      audit_events: {
        name: 'audit_events',
        createdAt: new Date().toISOString(),
        indexes: ['_id', 'timestamp'],
        documents: []
      }
    };

    // 2. Initial Auth Accounts
    this.authAccounts = [
      {
        id: 'usr_auth_super',
        email: 'admin@aetherdb.local',
        provider: 'email',
        role: 'authenticated',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        lastSignIn: new Date().toISOString(),
        status: 'ACTIVE',
        emailConfirmed: true,
        rawUserMetaData: { displayName: 'System Administrator', role: 'admin' }
      }
    ];

    // 3. Initial Row Level Security Policies
    this.rlsPolicies = [
      {
        id: 'rls_1',
        name: 'Allow public read-access for published records',
        target: 'posts',
        command: 'SELECT',
        role: 'anon',
        usingExpression: 'published = true',
        enabled: true
      },
      {
        id: 'rls_2',
        name: 'Users can only mutate their own records',
        target: 'user_profiles',
        command: 'ALL',
        role: 'authenticated',
        usingExpression: 'auth.uid() = user_id',
        enabled: true
      }
    ];

    // 4. Initial AetherVault Storage Buckets
    this.buckets = {
      avatars: {
        id: 'bkt_avatars',
        name: 'avatars',
        isPublic: true,
        createdAt: new Date().toISOString(),
        fileCount: 0,
        sizeBytes: 0
      },
      documents: {
        id: 'bkt_documents',
        name: 'documents',
        isPublic: false,
        createdAt: new Date().toISOString(),
        fileCount: 0,
        sizeBytes: 0
      }
    };

    this.files = {
      bkt_avatars: [],
      bkt_documents: []
    };

    // 5. Initial Realtime Broadcast event
    this.emitRealtimeEvent('INSERT', 'AUTH_USER', 'auth.users', {
      user: 'admin@aetherdb.local',
      role: 'admin',
      message: 'AetherDB Engine initialized'
    });
  }

  // =========================================================================
  // REALTIME EVENT SYSTEM
  // =========================================================================
  public emitRealtimeEvent(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    entityType: 'SQL_TABLE' | 'MONGO_COLLECTION' | 'AUTH_USER' | 'STORAGE',
    entityName: string,
    payload: any
  ) {
    const event: RealtimeEvent = {
      id: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      eventType,
      entityType,
      entityName,
      payload,
      clientOrigin: 'client:websocket'
    };

    this.realtimeEvents.unshift(event);
    if (this.realtimeEvents.length > 80) {
      this.realtimeEvents.pop();
    }
    return event;
  }

  public getRealtimeEvents(): RealtimeEvent[] {
    return this.realtimeEvents;
  }

  public clearRealtimeEvents(): void {
    this.realtimeEvents = [];
  }

  // =========================================================================
  // AETHERDOC / NOSQL DOCUMENT OPERATIONS
  // =========================================================================
  public getCollections(): { name: string; documentCount: number; createdAt: string; indexes: string[] }[] {
    return Object.values(this.collections).map(c => ({
      name: c.name,
      documentCount: c.documents.length,
      createdAt: c.createdAt,
      indexes: c.indexes
    }));
  }

  public createCollection(name: string): boolean {
    const clean = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!clean || this.collections[clean]) return false;
    this.collections[clean] = {
      name: clean,
      createdAt: new Date().toISOString(),
      indexes: ['_id'],
      documents: []
    };
    this.emitRealtimeEvent('INSERT', 'MONGO_COLLECTION', clean, { action: 'COLLECTION_CREATED' });
    return true;
  }

  public dropCollection(name: string): boolean {
    if (!this.collections[name]) return false;
    delete this.collections[name];
    this.emitRealtimeEvent('DELETE', 'MONGO_COLLECTION', name, { action: 'COLLECTION_DROPPED' });
    return true;
  }

  public getDocuments(collectionName: string): MongoDocument[] {
    const col = this.collections[collectionName];
    if (!col) return [];
    return col.documents;
  }

  public insertDocument(collectionName: string, docData: Record<string, any>): MongoDocument {
    let col = this.collections[collectionName];
    if (!col) {
      this.createCollection(collectionName);
      col = this.collections[collectionName];
    }

    const doc: MongoDocument = {
      _id: docData._id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...docData,
      _createdAt: docData._createdAt || new Date().toISOString()
    };

    col.documents.unshift(doc);
    this.emitRealtimeEvent('INSERT', 'MONGO_COLLECTION', collectionName, doc);
    return doc;
  }

  public updateDocument(collectionName: string, id: string, updates: Record<string, any>): boolean {
    const col = this.collections[collectionName];
    if (!col) return false;

    const idx = col.documents.findIndex(d => d._id === id);
    if (idx === -1) return false;

    col.documents[idx] = {
      ...col.documents[idx],
      ...updates,
      _updatedAt: new Date().toISOString()
    };

    this.emitRealtimeEvent('UPDATE', 'MONGO_COLLECTION', collectionName, col.documents[idx]);
    return true;
  }

  public deleteDocument(collectionName: string, id: string): boolean {
    const col = this.collections[collectionName];
    if (!col) return false;

    const initialLen = col.documents.length;
    col.documents = col.documents.filter(d => d._id !== id);
    const deleted = col.documents.length < initialLen;
    if (deleted) {
      this.emitRealtimeEvent('DELETE', 'MONGO_COLLECTION', collectionName, { _id: id });
    }
    return deleted;
  }

  public findDocuments(collectionName: string, filterObj: Record<string, any>): MongoDocument[] {
    const col = this.collections[collectionName];
    if (!col) return [];

    if (!filterObj || Object.keys(filterObj).length === 0) {
      return col.documents;
    }

    return col.documents.filter(doc => {
      for (const key in filterObj) {
        const expected = filterObj[key];
        const actual = doc[key];

        if (typeof expected === 'object' && expected !== null) {
          if (expected.$gt !== undefined && !(actual > expected.$gt)) return false;
          if (expected.$lt !== undefined && !(actual < expected.$lt)) return false;
          if (expected.$gte !== undefined && !(actual >= expected.$gte)) return false;
          if (expected.$lte !== undefined && !(actual <= expected.$lte)) return false;
          if (expected.$in && Array.isArray(expected.$in) && !expected.$in.includes(actual)) return false;
          if (expected.$regex) {
            const regex = new RegExp(expected.$regex, 'i');
            if (!regex.test(String(actual))) return false;
          }
        } else if (String(actual).toLowerCase() !== String(expected).toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }

  // =========================================================================
  // AETHERAUTH IDENTITY & USER MANAGEMENT
  // =========================================================================
  public getAuthUsers(): AuthAccount[] {
    return this.authAccounts;
  }

  public createAuthUser(email: string, role: string = 'authenticated', provider: 'email' | 'google' | 'github' | 'phone' = 'email'): AuthAccount {
    const newUser: AuthAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      provider,
      role,
      createdAt: new Date().toISOString(),
      lastSignIn: 'Never',
      status: 'ACTIVE',
      emailConfirmed: true,
      rawUserMetaData: { registeredVia: 'AetherDB Console' }
    };
    this.authAccounts.unshift(newUser);
    this.emitRealtimeEvent('INSERT', 'AUTH_USER', 'auth.users', newUser);
    return newUser;
  }

  public deleteAuthUser(id: string): boolean {
    const initialLen = this.authAccounts.length;
    this.authAccounts = this.authAccounts.filter(u => u.id !== id);
    const deleted = this.authAccounts.length < initialLen;
    if (deleted) {
      this.emitRealtimeEvent('DELETE', 'AUTH_USER', 'auth.users', { id });
    }
    return deleted;
  }

  public toggleAuthUserStatus(id: string): AuthAccount | null {
    const user = this.authAccounts.find(u => u.id === id);
    if (!user) return null;
    user.status = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.emitRealtimeEvent('UPDATE', 'AUTH_USER', 'auth.users', user);
    return user;
  }

  public generateJwtToken(user: AuthAccount): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      iss: 'aetherdb-auth-service'
    }));
    const signature = btoa(`sig_${user.id}_${Date.now()}`).substring(0, 32);
    return `${header}.${payload}.${signature}`;
  }

  // =========================================================================
  // ROW LEVEL SECURITY (RLS) POLICIES
  // =========================================================================
  public getRlsPolicies(): RlsPolicy[] {
    return this.rlsPolicies;
  }

  public addRlsPolicy(policy: Omit<RlsPolicy, 'id'>): RlsPolicy {
    const newPolicy: RlsPolicy = {
      ...policy,
      id: `rls_${Date.now()}`
    };
    this.rlsPolicies.push(newPolicy);
    return newPolicy;
  }

  public toggleRlsPolicy(id: string): boolean {
    const p = this.rlsPolicies.find(item => item.id === id);
    if (!p) return false;
    p.enabled = !p.enabled;
    return true;
  }

  public deleteRlsPolicy(id: string): boolean {
    const initialLen = this.rlsPolicies.length;
    this.rlsPolicies = this.rlsPolicies.filter(p => p.id !== id);
    return this.rlsPolicies.length < initialLen;
  }

  // =========================================================================
  // STORAGE BUCKETS & FILES
  // =========================================================================
  public getBuckets(): StorageBucket[] {
    return Object.values(this.buckets).map(b => {
      const bucketFiles = this.files[b.id] || [];
      const totalSize = bucketFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
      return {
        ...b,
        fileCount: bucketFiles.length,
        sizeBytes: totalSize
      };
    });
  }

  public createBucket(name: string, isPublic: boolean): StorageBucket {
    const id = `bkt_${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    const newBucket: StorageBucket = {
      id,
      name,
      isPublic,
      createdAt: new Date().toISOString(),
      fileCount: 0,
      sizeBytes: 0
    };
    this.buckets[id] = newBucket;
    this.files[id] = [];
    this.emitRealtimeEvent('INSERT', 'STORAGE', `storage.buckets.${name}`, newBucket);
    return newBucket;
  }

  public deleteBucket(bucketId: string): boolean {
    if (!this.buckets[bucketId]) return false;
    const name = this.buckets[bucketId].name;
    delete this.buckets[bucketId];
    delete this.files[bucketId];
    this.emitRealtimeEvent('DELETE', 'STORAGE', `storage.buckets.${name}`, { id: bucketId });
    return true;
  }

  public getFiles(bucketId: string): StorageFile[] {
    return this.files[bucketId] || [];
  }

  public uploadFile(bucketId: string, name: string, sizeBytes: number, mimeType: string, customUrl?: string): StorageFile {
    if (!this.files[bucketId]) {
      this.files[bucketId] = [];
    }

    const file: StorageFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bucketId,
      name,
      sizeBytes,
      mimeType,
      url: customUrl || `http://localhost:3000/api/db/storage?bucket=${bucketId}&file=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString()
    };

    this.files[bucketId].unshift(file);
    this.emitRealtimeEvent('INSERT', 'STORAGE', `storage.${bucketId}.${name}`, file);
    return file;
  }

  public deleteFile(bucketId: string, fileId: string): boolean {
    const list = this.files[bucketId];
    if (!list) return false;
    const initialLen = list.length;
    this.files[bucketId] = list.filter(f => f.id !== fileId);
    const deleted = this.files[bucketId].length < initialLen;
    if (deleted) {
      this.emitRealtimeEvent('DELETE', 'STORAGE', `storage.${bucketId}.${fileId}`, { id: fileId });
    }
    return deleted;
  }
}
