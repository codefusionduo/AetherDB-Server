'use client';

import React, { useState } from 'react';
import { Database, Server, Copy, Check, Terminal, Download, RefreshCw, Zap, Trash2, LogOut, UserCheck, ShieldAlert } from 'lucide-react';
import { ServerMetrics, isSuperAdmin } from '@/lib/db-server/types';
import { ThreeLogo } from '@/components/ui/three-logo';

interface HeaderProps {
  currentDb: string;
  databases: string[];
  onSelectDb: (db: string) => void;
  onOpenCreateDb: () => void;
  metrics: ServerMetrics | null;
  onRunBenchmark: () => void;
  onExportDump: () => void;
  onResetSeed: () => void;
  onClearData: () => void;
  isBenchmarking: boolean;
  userEmail?: string;
  onLogout?: () => void;
  onOpenAdminPanel?: () => void;
  onSwitchUser?: (email: string) => void;
}

export function Header({
  currentDb,
  databases,
  onSelectDb,
  onOpenCreateDb,
  metrics,
  onRunBenchmark,
  onExportDump,
  onResetSeed,
  onClearData,
  isBenchmarking,
  userEmail,
  onLogout,
  onOpenAdminPanel,
  onSwitchUser
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const connectionUri = `postgresql://admin:aeth_secret@localhost:${metrics?.port || 5432}/${currentDb}`;

  const copyConnectionUri = () => {
    navigator.clipboard.writeText(connectionUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
      {/* Brand & Instance Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <ThreeLogo size="sm" interactive={true} glow={true} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">AetherDB Server</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span>Engine v2.4</span>
              <span>·</span>
              <span>TCP :5432</span>
              <span>·</span>
              <span>HTTP :3000</span>
              <span>·</span>
              <span>Uptime {metrics ? `${Math.floor(metrics.uptimeSeconds / 60)}m` : '0m'}</span>
            </div>
          </div>
        </div>

        {/* Database Switcher */}
        <div className="h-5 w-[1px] bg-zinc-800 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1">
            <Database className="h-3.5 w-3.5 text-zinc-400 mr-2" />
            <select
              value={currentDb}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  onOpenCreateDb();
                } else {
                  onSelectDb(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-medium text-zinc-200 focus:outline-none cursor-pointer pr-1"
            >
              {databases.map((db) => (
                <option key={db} value={db} className="bg-zinc-900 text-zinc-200">
                  {db}
                </option>
              ))}
              <option value="__NEW__" className="bg-zinc-900 text-emerald-400 font-medium">
                + Create New Database...
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Connection URI & Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Connection String */}
        <button
          onClick={copyConnectionUri}
          title="Click to copy connection URI"
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors"
        >
          <Terminal className="h-3 w-3 text-zinc-400" />
          <span className="text-[11px] text-zinc-400 hidden md:inline">URI:</span>
          <span className="text-[11px] text-zinc-200 truncate max-w-[200px] sm:max-w-[240px]">
            {connectionUri}
          </span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-200 shrink-0" />
          )}
        </button>

        {/* Benchmark Button */}
        <button
          onClick={onRunBenchmark}
          disabled={isBenchmarking}
          className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Zap className={`h-3.5 w-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
          <span>{isBenchmarking ? 'Stressing...' : 'Benchmark'}</span>
        </button>

        {/* Master Admin Console Shortcut (Restricted to Super Admins) */}
        {onOpenAdminPanel && isSuperAdmin(userEmail) && (
          <button
            onClick={onOpenAdminPanel}
            title="Open Master Super Admin Panel"
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 text-amber-300 border border-amber-500/40 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm shadow-amber-950"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        )}

        {/* SQL Dump */}
        <button
          onClick={onExportDump}
          title="Download SQL Schema & Data Dump"
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Export .SQL</span>
        </button>

        {/* Clear Data */}
        <button
          onClick={onClearData}
          title="Clear all data rows across all tables (0 rows)"
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Clear Data</span>
        </button>

        {/* Reset seeds */}
        <button
          onClick={onResetSeed}
          title="Reset database to clean tables"
          className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-2 py-1.5 rounded-md text-xs transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Logged in user info & Super Admin Badge */}
        {userEmail && (
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono border ${
              isSuperAdmin(userEmail)
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}>
              {isSuperAdmin(userEmail) ? (
                <ShieldAlert className="h-3 w-3 text-amber-400 shrink-0" />
              ) : (
                <UserCheck className="h-3 w-3 text-zinc-400 shrink-0" />
              )}
              <span className="truncate max-w-[140px]">{userEmail}</span>
              {isSuperAdmin(userEmail) && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-bold">
                  SUPER
                </span>
              )}
            </div>

            {/* Quick Switcher for testing Super Admin restrictions */}
            {onSwitchUser && (
              <select
                value={userEmail}
                onChange={(e) => onSwitchUser(e.target.value)}
                title="Switch active user to test Super Admin permission restrictions"
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none cursor-pointer"
              >
                <optgroup label="👑 Super Admins (Admin Access)">
                  <option value="yabhi9435@gmail.com">yabhi9435@gmail.com (Super Admin)</option>
                  <option value="codefusionduo@gmail.com">codefusionduo@gmail.com (Super Admin)</option>
                </optgroup>
                <optgroup label="👤 Regular Users (No Admin Access)">
                  <option value="devin@aetherdb.ryzn.pro">devin@aetherdb.ryzn.pro (Developer)</option>
                  <option value="priya.sharma@techcorp.in">priya.sharma@techcorp.in (Admin)</option>
                  <option value="rahul.verma@startup.dev">rahul.verma@startup.dev (Member)</option>
                </optgroup>
              </select>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out & Return to Login Screen"
                className="p-1.5 bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 rounded-md transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
