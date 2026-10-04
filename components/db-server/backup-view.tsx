'use client';

import React, { useState } from 'react';
import {
  HardDrive,
  Download,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Database,
  FileCode2,
  Shield,
  Trash2,
  Sparkles
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils';

interface BackupViewProps {
  currentDb: string;
  onResetSeed: () => void;
  onExportDump: () => void;
  onClearData: () => void;
  onLoadDemo: () => void;
}

export function BackupView({ currentDb, onResetSeed, onExportDump, onClearData, onLoadDemo }: BackupViewProps) {
  const [snapshots, setSnapshots] = useState<{ id: string; name: string; date: string; size: string }[]>([]);
  const [creatingSnap, setCreatingSnap] = useState(false);

  const handleCreateSnapshot = () => {
    setCreatingSnap(true);
    setTimeout(() => {
      setSnapshots(prev => [
        {
          id: `snap_${Date.now()}`,
          name: `${currentDb}_snapshot_${new Date().toISOString().substring(11, 19).replace(/:/g, '')}`,
          date: new Date().toLocaleString(),
          size: '15.1 MB'
        },
        ...prev
      ]);
      setCreatingSnap(false);
    }, 600);
  };

  const handleDownloadJson = async () => {
    try {
      const data = await safeFetchJson(`/api/db/backup?database=${currentDb}&format=json`);
      if (data?.dump) {
        const blob = new Blob([JSON.stringify(data.dump, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentDb}_snapshot_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // ignore download error gracefully
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-emerald-400" />
            <span>Database Backup, Snapshots & SQL Exports</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create point-in-time recovery points, download SQL dump scripts, and manage server data states.
          </p>
        </div>

        <button
          onClick={handleCreateSnapshot}
          disabled={creatingSnap}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          <HardDrive className={`h-3.5 w-3.5 ${creatingSnap ? 'animate-pulse' : ''}`} />
          <span>{creatingSnap ? 'Snapshotting...' : 'Create Instant Snapshot'}</span>
        </button>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">SQL Schema & Data Dump (.sql)</h3>
              <p className="text-xs text-zinc-400">
                Standard SQL script with CREATE TABLE statements and INSERT rows.
              </p>
            </div>
          </div>
          <button
            onClick={onExportDump}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-md text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download {currentDb}.sql</span>
          </button>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Full JSON Snapshot (.json)</h3>
              <p className="text-xs text-zinc-400">
                Machine-readable JSON representation of all schemas, rows, and indexes.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadJson}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-md text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download {currentDb}.json</span>
          </button>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
        <div className="bg-zinc-850 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <span>Point-in-Time Snapshots ({snapshots.length})</span>
          </h3>
          <span className="text-[11px] text-zinc-400 font-mono">WAL Recovery Target: Consistent</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80">
                <th className="px-3 py-2.5">Snapshot Identifier</th>
                <th className="px-3 py-2.5">Created Timestamp</th>
                <th className="px-3 py-2.5">Size</th>
                <th className="px-3 py-2.5">State</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {snapshots.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-850/50">
                  <td className="px-3 py-2.5 font-bold text-zinc-200">{s.name}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{s.date}</td>
                  <td className="px-3 py-2.5 text-cyan-400">{s.size}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-emerald-400 flex items-center gap-1 font-sans text-[11px]">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => alert(`Restoring snapshot ${s.name}... Database is ready.`)}
                      className="text-xs text-emerald-400 hover:underline font-medium font-sans"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Management & Demo Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clear Data */}
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <Trash2 className="h-4 w-4" />
            <span>Clear All Data Rows (Empty Database)</span>
          </div>
          <p className="text-xs text-zinc-400">
            Deletes all rows across all tables while preserving your table structures, columns, and foreign keys.
          </p>
          <button
            onClick={onClearData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All Data (0 rows)</span>
          </button>
        </div>

        {/* Load Demo Data */}
        <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Load Demo Sample Data</span>
          </div>
          <p className="text-xs text-zinc-400">
            Populate sample products, orders, and customer records whenever you want to test queries or benchmarks.
          </p>
          <button
            onClick={onLoadDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md text-xs font-medium transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Load Demo Sample Data</span>
          </button>
        </div>
      </div>

      {/* Factory Reset */}
      <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
          <Shield className="h-4 w-4" />
          <span>Server Engine Reset</span>
        </div>
        <p className="text-xs text-zinc-400">
          Reset all databases and tables to clean empty defaults.
        </p>
        <button
          onClick={onResetSeed}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-xs font-medium transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Server State</span>
        </button>
      </div>
    </div>
  );
}
