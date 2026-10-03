'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/db-server/header';
import { Sidebar, ActiveTab } from '@/components/db-server/sidebar';
import { SQLConsole } from '@/components/db-server/sql-console';
import { TableStudio } from '@/components/db-server/table-studio';
import { SchemaDiagram } from '@/components/db-server/schema-diagram';
import { MetricsView } from '@/components/db-server/metrics-view';
import { ApiHub } from '@/components/db-server/api-hub';
import { UserAccess } from '@/components/db-server/user-access';
import { BackupView } from '@/components/db-server/backup-view';
import { MongoStudio } from '@/components/db-server/mongo-studio';
import { AuthStudio } from '@/components/db-server/auth-studio';
import { StorageStudio } from '@/components/db-server/storage-studio';
import { RealtimeStudio } from '@/components/db-server/realtime-studio';
import { EmailStudio } from '@/components/db-server/email-studio';
import { CreateDbModal } from '@/components/db-server/create-db-modal';
import { CreateTableModal } from '@/components/db-server/create-table-modal';
import { LoginGate } from '@/components/auth/login-gate';
import { ServerMetrics, QueryLogEntry, DatabaseUser, ColumnDefinition, QueryResult } from '@/lib/db-server/types';

export default function DatabaseServerApp() {
  const [currentUser, setCurrentUser] = useState<{ email: string; token: string; id: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSession = localStorage.getItem('aether_user_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.email) return parsed;
        }
      } catch (e) {
        console.error('Failed to parse session', e);
      }
    }
    return null;
  });

  const [currentDb, setCurrentDb] = useState<string>('main_db');
  const [databases, setDatabases] = useState<string[]>(['main_db']);
  const [tables, setTables] = useState<{ name: string; rowCount: number }[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('console');

  // Server state & telemetry
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<QueryLogEntry[]>([]);
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);

  // Modals
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);

  const handleSuccessLogin = (user: { email: string; token: string; id: string }) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aether_user_session', JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aether_user_session');
    }
  };

  // Initial load
  useEffect(() => {
    let isCancelled = false;

    fetch('/api/db/databases')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.success && data.databases) {
          const names = data.databases.map((d: any) => d.name);
          setDatabases(names);
          if (!names.includes(currentDb) && names.length > 0) {
            setCurrentDb(names[0]);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) console.error('Failed to load databases', err);
      });

    fetch('/api/db/metrics')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.success) {
          setMetrics(data.metrics);
          setAuditLogs(data.auditLogs);
          setUsers(data.users);
        }
      })
      .catch((err) => {
        if (!isCancelled) console.error('Failed to fetch metrics', err);
      });

    // Poll metrics every 10 seconds to keep telemetry live
    const interval = setInterval(() => {
      fetch('/api/db/metrics')
        .then((res) => res.json())
        .then((data) => {
          if (!isCancelled && data.success) {
            setMetrics(data.metrics);
            setAuditLogs(data.auditLogs);
            setUsers(data.users);
          }
        })
        .catch(console.error);
    }, 10000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [currentDb]);

  // When currentDb changes, reload tables
  useEffect(() => {
    let isCancelled = false;
    fetch(`/api/db/tables?database=${currentDb}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.success && data.tables) {
          const loadedTables = data.tables.map((t: any) => ({ name: t.name, rowCount: t.rowCount }));
          setTables(loadedTables);
          if (loadedTables.length > 0) {
            setSelectedTable((prev) => {
              if (!prev || !loadedTables.some((t: any) => t.name === prev)) {
                return loadedTables[0].name;
              }
              return prev;
            });
          } else {
            setSelectedTable(null);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) console.error('Failed to load tables', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentDb]);

  const loadDatabases = async () => {
    try {
      const res = await fetch('/api/db/databases');
      const data = await res.json();
      if (data.success && data.databases) {
        const names = data.databases.map((d: any) => d.name);
        setDatabases(names);
        if (!names.includes(currentDb) && names.length > 0) {
          setCurrentDb(names[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load databases', err);
    }
  };

  const loadTables = async (dbName: string) => {
    try {
      const res = await fetch(`/api/db/tables?database=${dbName}`);
      const data = await res.json();
      if (data.success && data.tables) {
        const loadedTables = data.tables.map((t: any) => ({ name: t.name, rowCount: t.rowCount }));
        setTables(loadedTables);
        if (loadedTables.length > 0) {
          setSelectedTable((prev) => {
            if (!prev || !loadedTables.some((t: any) => t.name === prev)) {
              return loadedTables[0].name;
            }
            return prev;
          });
        } else {
          setSelectedTable(null);
        }
      }
    } catch (err) {
      console.error('Failed to load tables', err);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/db/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setAuditLogs(data.auditLogs);
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    }
  };

  const handleExecuteQuery = async (sql: string): Promise<QueryResult> => {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, database: currentDb })
      });
      const data: QueryResult = await res.json();

      // If query was DDL or mutation, refresh tables and metrics
      const upper = sql.trim().toUpperCase();
      if (
        upper.startsWith('CREATE') ||
        upper.startsWith('DROP') ||
        upper.startsWith('INSERT') ||
        upper.startsWith('UPDATE') ||
        upper.startsWith('DELETE') ||
        upper.startsWith('TRUNCATE')
      ) {
        loadTables(currentDb);
        loadDatabases();
      }
      loadMetrics();

      return data;
    } catch (err: any) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        command: 'ERROR',
        error: err.message || 'Request failed'
      };
    }
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    try {
      const res = await fetch('/api/db/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'benchmark' })
      });
      const data = await res.json();
      if (data.success) {
        setBenchmarkResult(data.benchmark);
        loadMetrics();
        if (activeTab !== 'metrics') {
          setActiveTab('metrics');
        }
      }
    } catch (err) {
      alert('Benchmark failed');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleExportDump = () => {
    window.location.href = `/api/db/backup?database=${currentDb}&format=sql`;
  };

  const handleResetSeed = async () => {
    if (!confirm('Reset all databases and tables to clean empty defaults?')) return;
    try {
      const res = await fetch('/api/db/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_default' })
      });
      const data = await res.json();
      if (data.success) {
        await loadDatabases();
        setCurrentDb('main_db');
        await loadTables('main_db');
        await loadMetrics();
      }
    } catch {
      alert('Reset failed');
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all data rows across all tables? Table structures will remain.')) return;
    try {
      const res = await fetch('/api/db/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_data' })
      });
      const data = await res.json();
      if (data.success) {
        await loadTables(currentDb);
        await loadMetrics();
      }
    } catch {
      alert('Failed to clear data');
    }
  };

  const handleLoadDemo = async () => {
    try {
      const res = await fetch('/api/db/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load_demo' })
      });
      const data = await res.json();
      if (data.success) {
        await loadDatabases();
        await loadTables(currentDb);
        await loadMetrics();
      }
    } catch {
      alert('Failed to load demo data');
    }
  };

  const handleCreateDatabase = async (name: string) => {
    const res = await fetch('/api/db/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create database');
    }
    await loadDatabases();
    setCurrentDb(name);
  };

  const handleCreateTable = async (tableName: string, columns: ColumnDefinition[]) => {
    const res = await fetch('/api/db/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        database: currentDb,
        name: tableName,
        columns
      })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create table');
    }
    await loadTables(currentDb);
    setSelectedTable(tableName);
    setActiveTab('studio');
  };

  const handleAddUser = async (username: string, role: any, databaseAccess: string[]) => {
    const res = await fetch('/api/db/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addUser',
        username,
        role,
        databaseAccess
      })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to add user');
    }
    loadMetrics();
  };

  if (!currentUser) {
    return <LoginGate onSuccessLogin={handleSuccessLogin} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Top Header */}
      <Header
        currentDb={currentDb}
        databases={databases}
        onSelectDb={(db) => setCurrentDb(db)}
        onOpenCreateDb={() => setShowCreateDbModal(true)}
        metrics={metrics}
        onRunBenchmark={handleRunBenchmark}
        onExportDump={handleExportDump}
        onResetSeed={handleResetSeed}
        onClearData={handleClearData}
        isBenchmarking={isBenchmarking}
        userEmail={currentUser.email}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tables={tables}
          selectedTable={selectedTable}
          onSelectTable={(t) => setSelectedTable(t)}
          onOpenCreateTable={() => setShowCreateTableModal(true)}
          currentDb={currentDb}
        />

        {/* Primary View Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {activeTab === 'console' && (
            <SQLConsole
              key={currentDb}
              currentDb={currentDb}
              onExecuteQuery={handleExecuteQuery}
              tables={tables}
            />
          )}

          {activeTab === 'studio' && (
            <TableStudio
              key={`${currentDb}_${selectedTable}`}
              currentDb={currentDb}
              tableName={selectedTable}
              onRefreshTables={() => loadTables(currentDb)}
            />
          )}

          {activeTab === 'schema' && (
            <SchemaDiagram
              key={currentDb}
              currentDb={currentDb}
              onOpenCreateTable={() => setShowCreateTableModal(true)}
              onSelectTable={(t) => {
                setSelectedTable(t);
                setActiveTab('studio');
              }}
            />
          )}

          {activeTab === 'diagram' && (
            <SchemaDiagram
              key={`diag_${currentDb}`}
              currentDb={currentDb}
              onOpenCreateTable={() => setShowCreateTableModal(true)}
              onSelectTable={(t) => {
                setSelectedTable(t);
                setActiveTab('studio');
              }}
            />
          )}

          {activeTab === 'mongo' && (
            <MongoStudio />
          )}

          {activeTab === 'auth' && (
            <AuthStudio />
          )}

          {activeTab === 'storage' && (
            <StorageStudio />
          )}

          {activeTab === 'realtime' && (
            <RealtimeStudio />
          )}

          {activeTab === 'email' && (
            <EmailStudio />
          )}

          {activeTab === 'metrics' && (
            <MetricsView
              metrics={metrics}
              auditLogs={auditLogs}
              onRefresh={loadMetrics}
              onRunBenchmark={handleRunBenchmark}
              isBenchmarking={isBenchmarking}
              benchmarkResult={benchmarkResult}
            />
          )}

          {activeTab === 'apihub' && (
            <ApiHub currentDb={currentDb} />
          )}

          {activeTab === 'users' && (
            <UserAccess
              users={users}
              onAddUser={handleAddUser}
              databases={databases}
            />
          )}

          {activeTab === 'backup' && (
            <BackupView
              currentDb={currentDb}
              onResetSeed={handleResetSeed}
              onExportDump={handleExportDump}
              onClearData={handleClearData}
              onLoadDemo={handleLoadDemo}
            />
          )}
        </main>
      </div>

      {/* Create Database Modal */}
      <CreateDbModal
        isOpen={showCreateDbModal}
        onClose={() => setShowCreateDbModal(false)}
        onCreate={handleCreateDatabase}
      />

      {/* Create Table Modal */}
      <CreateTableModal
        isOpen={showCreateTableModal}
        onClose={() => setShowCreateTableModal(false)}
        currentDb={currentDb}
        onCreate={handleCreateTable}
      />
    </div>
  );
}
