'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Key,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  Lock,
  Database
} from 'lucide-react';
import { DatabaseUser } from '@/lib/db-server/types';

interface UserAccessProps {
  users: DatabaseUser[];
  onAddUser: (username: string, role: 'SUPERUSER' | 'READ_WRITE' | 'READ_ONLY', dbScope: string[]) => Promise<void>;
  databases: string[];
}

export function UserAccess({ users, onAddUser, databases }: UserAccessProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'SUPERUSER' | 'READ_WRITE' | 'READ_ONLY'>('READ_WRITE');
  const [selectedDb, setSelectedDb] = useState<string>('*');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    await onAddUser(username.trim(), role, selectedDb === '*' ? ['*'] : [selectedDb]);
    setShowAddModal(false);
    setUsername('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <span>Database Roles & Access Control (RBAC)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage database server accounts, permission roles, and client secret API tokens.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Roles Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>SUPERUSER</span>
          </div>
          <p className="text-xs text-zinc-400">
            Unrestricted access. Can create/drop databases, alter schemas, and manage permissions.
          </p>
        </div>

        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>READ_WRITE</span>
          </div>
          <p className="text-xs text-zinc-400">
            Full DML access (SELECT, INSERT, UPDATE, DELETE). Cannot alter table schemas or drop databases.
          </p>
        </div>

        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Lock className="h-3.5 w-3.5 text-cyan-400" />
            <span>READ_ONLY</span>
          </div>
          <p className="text-xs text-zinc-400">
            Strict read access (SELECT only). Suitable for BI analysts, reporting tools, and dashboards.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
        <div className="bg-zinc-850 px-4 py-3 border-b border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-100">
            Configured Accounts ({users.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80">
                <th className="px-3 py-2.5">Username</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Database Scope</th>
                <th className="px-3 py-2.5">API Secret Key</th>
                <th className="px-3 py-2.5">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-850/50">
                  <td className="px-3 py-2.5 font-bold text-zinc-200 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{u.username}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-sans font-medium border ${
                        u.role === 'SUPERUSER'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : u.role === 'READ_WRITE'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    {u.databaseAccess.join(', ')}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-mono text-[11px] truncate max-w-[160px]">
                        {u.apiKey}
                      </span>
                      <button
                        onClick={() => copyKey(u.apiKey)}
                        className="p-1 text-zinc-400 hover:text-zinc-200"
                        title="Copy API Key"
                      >
                        {copiedKey === u.apiKey ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 font-sans">{u.lastLogin || 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Create Database User Account</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Provision credentials and allocate database role permissions.
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. reporting_service"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Role Privileges</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="READ_WRITE">READ_WRITE (Query and Mutate Data)</option>
                  <option value="READ_ONLY">READ_ONLY (SELECT only)</option>
                  <option value="SUPERUSER">SUPERUSER (Full Database Admin)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Database Scope</label>
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="*">All Databases (*)</option>
                  {databases.map((db) => (
                    <option key={db} value={db}>
                      {db}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
