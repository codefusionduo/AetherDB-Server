'use client';

import React from 'react';
import {
  Terminal,
  TableProperties,
  Network,
  Activity,
  Layers,
  Code2,
  Users,
  HardDrive,
  Plus,
  Table as TableIcon,
  FileJson,
  ShieldCheck,
  FolderArchive,
  Radio,
  Mail
} from 'lucide-react';
import { ThreeLogo } from '@/components/ui/three-logo';

export type ActiveTab =
  | 'console'
  | 'studio'
  | 'schema'
  | 'diagram'
  | 'mongo'
  | 'auth'
  | 'storage'
  | 'realtime'
  | 'email'
  | 'metrics'
  | 'apihub'
  | 'users'
  | 'backup';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  tables: { name: string; rowCount: number }[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  onOpenCreateTable: () => void;
  currentDb: string;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  tables,
  selectedTable,
  onSelectTable,
  onOpenCreateTable,
  currentDb
}: SidebarProps) {
  const sqlNav = [
    { id: 'console' as ActiveTab, label: 'SQL Console', icon: Terminal, color: 'text-emerald-400' },
    { id: 'studio' as ActiveTab, label: 'Table Data Studio', icon: TableProperties, color: 'text-emerald-400' },
    { id: 'diagram' as ActiveTab, label: 'Visual ER Diagram', icon: Network, color: 'text-emerald-400' },
  ];

  const baasNav = [
    { id: 'mongo' as ActiveTab, label: '🍃 AetherDoc Store', icon: FileJson, color: 'text-emerald-400', badge: 'JSON' },
    { id: 'auth' as ActiveTab, label: '🛡️ AetherAuth & RLS', icon: ShieldCheck, color: 'text-amber-400', badge: 'Auth' },
    { id: 'email' as ActiveTab, label: '📧 Email & OTP Studio', icon: Mail, color: 'text-rose-400', badge: 'Gmail' },
    { id: 'storage' as ActiveTab, label: '📦 AetherVault Storage', icon: FolderArchive, color: 'text-cyan-400', badge: 'Buckets' },
    { id: 'realtime' as ActiveTab, label: '⚡ AetherLive Stream', icon: Radio, color: 'text-emerald-400', badge: 'Live' },
  ];

  const opsNav = [
    { id: 'metrics' as ActiveTab, label: 'Server Telemetry', icon: Activity, color: 'text-purple-400' },
    { id: 'apihub' as ActiveTab, label: 'Client API Hub', icon: Code2, color: 'text-blue-400' },
    { id: 'users' as ActiveTab, label: 'Roles & API Keys', icon: Users, color: 'text-zinc-400' },
    { id: 'backup' as ActiveTab, label: 'Snapshots & Dumps', icon: HardDrive, color: 'text-zinc-400' },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 select-none text-zinc-300">
      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Section 1: SQL & Relational */}
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 px-2">
            🐘 AetherSQL Relational Engine
          </div>
          <nav className="space-y-0.5">
            {sqlNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? item.color : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Cloud Engine Services */}
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 px-2 flex items-center justify-between">
            <span>⚡ Aether Cloud Services</span>
          </div>
          <nav className="space-y-0.5">
            {baasNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`h-4 w-4 ${isActive ? item.color : 'text-zinc-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 font-sans border border-zinc-800">
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 3: Tables Explorer */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Tables in {currentDb} ({tables.length})
            </div>
            <button
              onClick={onOpenCreateTable}
              title="Create new table"
              className="flex items-center gap-0.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <Plus className="h-3 w-3" />
              <span>Table</span>
            </button>
          </div>

          <div className="space-y-0.5">
            {tables.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-zinc-400 italic">No tables yet</div>
            ) : (
              tables.map((t) => {
                const isSelected = activeTab === 'studio' && selectedTable === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => {
                      onSelectTable(t.name);
                      setActiveTab('studio');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors text-left ${
                      isSelected
                        ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TableIcon className={`h-3 w-3 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <span className="truncate">{t.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-sans">{t.rowCount}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Section 4: Operations & Telemetry */}
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 px-2">
            Operations & APIs
          </div>
          <nav className="space-y-0.5">
            {opsNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? item.color : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3D Core Cluster Badge */}
      <div className="p-3 border-t border-zinc-850/80 bg-zinc-950/70">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/30 transition-all">
          <ThreeLogo size="xs" interactive={true} glow={true} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-200">3D AetherCore</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400">v2.4</span>
            </div>
            <p className="text-[10px] text-zinc-500 truncate">Three.js Engine Synced</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
