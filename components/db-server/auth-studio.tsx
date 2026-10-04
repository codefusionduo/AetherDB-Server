'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Key,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Check,
  Copy,
  Mail,
  RefreshCw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Database,
  Search,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { AuthAccount, RlsPolicy } from '@/lib/db-server/types';
import { safeFetchJson } from '@/lib/utils';

export function AuthStudio() {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'rls'>('users');
  const [users, setUsers] = useState<AuthAccount[]>([]);
  const [policies, setPolicies] = useState<RlsPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('authenticated');
  const [newUserProvider, setNewUserProvider] = useState<'email' | 'google' | 'github'>('email');

  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyTarget, setNewPolicyTarget] = useState('users');
  const [newPolicyCommand, setNewPolicyCommand] = useState<'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'>('SELECT');
  const [newPolicyRole, setNewPolicyRole] = useState('anon');
  const [newPolicyExpr, setNewPolicyExpr] = useState('true');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson('/api/db/auth');
      if (data?.success) {
        setUsers(data.users || []);
        setPolicies(data.policies || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    safeFetchJson('/api/db/auth').then((data) => {
      if (!isCancelled && data?.success) {
        setUsers(data.users || []);
        setPolicies(data.policies || []);
      }
    });

    return () => { isCancelled = true; };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    try {
      const res = await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          email: newUserEmail.trim(),
          role: newUserRole,
          provider: newUserProvider
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddUserModal(false);
        setNewUserEmail('');
        fetchData();
      }
    } catch (err) {
      alert('Failed to create user');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status', id })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setDeletingUserId(id);
    try {
      setUsers(prev => prev.filter(u => u.id !== id));
      const res = await fetch(`/api/db/auth?type=user&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to delete user');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete user', err);
      fetchData();
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleGenerateToken = async (id: string) => {
    try {
      const res = await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_token', id })
      });
      const data = await res.json();
      if (data.success && data.token) {
        navigator.clipboard.writeText(`Bearer ${data.token}`);
        setCopiedToken(id);
        setTimeout(() => setCopiedToken(null), 3000);
      }
    } catch (err) {
      alert('Token generation failed');
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;
    try {
      const res = await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_policy',
          policy: {
            name: newPolicyName.trim(),
            target: newPolicyTarget.trim(),
            command: newPolicyCommand,
            role: newPolicyRole,
            usingExpression: newPolicyExpr.trim(),
            enabled: true
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddPolicyModal(false);
        setNewPolicyName('');
        fetchData();
      }
    } catch (err) {
      alert('Failed to create policy');
    }
  };

  const handleTogglePolicy = async (id: string) => {
    try {
      await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_policy', id })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      setPolicies(prev => prev.filter(p => p.id !== id));
      await fetch(`/api/db/auth?type=policy&id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    return u.email.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <span>AetherAuth & Row Level Security (RLS) Engine</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage user identity, authentication providers, JWT tokens, and Row Level Security rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Tab switcher */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs">
            <button
              onClick={() => setActiveSubTab('users')}
              className={`px-3 py-1 rounded transition-colors ${
                activeSubTab === 'users' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveSubTab('rls')}
              className={`px-3 py-1 rounded transition-colors ${
                activeSubTab === 'rls' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              RLS Policies ({policies.length})
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeSubTab === 'users' ? (
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add User</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddPolicyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {activeSubTab === 'users' ? (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search users by email or UID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="text-xs text-zinc-500 font-mono">
                Showing {filteredUsers.length} user account(s)
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900">
                      <th className="px-3 py-2.5">User UID</th>
                      <th className="px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5">Provider</th>
                      <th className="px-3 py-2.5">Role</th>
                      <th className="px-3 py-2.5">Created</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-zinc-850/50 transition-colors">
                          <td className="px-3 py-2.5 text-zinc-400 truncate max-w-[130px]">
                            {user.id}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-200 font-medium">
                            {user.email}
                          </td>
                          <td className="px-3 py-2.5 font-sans">
                            <span className="capitalize px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[11px]">
                              {user.provider}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-cyan-300">
                            {user.role}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-500 font-sans text-[11px]">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${
                                user.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleGenerateToken(user.id)}
                                title="Generate JWT Token"
                                className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded text-[11px] font-sans transition-colors"
                              >
                                {copiedToken === user.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Key className="h-3 w-3 text-amber-400" />
                                    <span>Copy JWT</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleToggleStatus(user.id)}
                                title={user.status === 'ACTIVE' ? 'Suspend user' : 'Activate user'}
                                className="p-1 text-zinc-400 hover:text-zinc-200"
                              >
                                {user.status === 'ACTIVE' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>

                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deletingUserId === user.id}
                                title="Delete user"
                                className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50"
                              >
                                {deletingUserId === user.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* RLS Policies View */
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span>Row Level Security (RLS) Engine</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  RLS enforces granular authorization rules directly on table operations without custom backend middleware.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] rounded">
                RLS: ENFORCED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map(p => (
                <div
                  key={p.id}
                  className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">{p.name}</span>
                      <button
                        onClick={() => handleTogglePolicy(p.id)}
                        className="text-xs font-medium"
                      >
                        {p.enabled ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ToggleRight className="h-5 w-5" /> Active
                          </span>
                        ) : (
                          <span className="text-zinc-500 flex items-center gap-1">
                            <ToggleLeft className="h-5 w-5" /> Disabled
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-850">
                      <div>Target: <span className="text-zinc-200">{p.target}</span></div>
                      <div>Command: <span className="text-cyan-300">{p.command}</span></div>
                      <div>Role: <span className="text-amber-300">{p.role}</span></div>
                    </div>

                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-md font-mono text-xs text-emerald-300">
                      USING ({p.usingExpression})
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-mono text-[10px]">{p.id}</span>
                    <button
                      onClick={() => handleDeletePolicy(p.id)}
                      className="text-zinc-500 hover:text-rose-400 text-xs"
                    >
                      Delete Policy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Create AetherAuth User Account</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Add new account to AetherAuth identity provider.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">User Email</label>
                <input
                  type="email"
                  required
                  placeholder="developer@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Authentication Provider</label>
                <select
                  value={newUserProvider}
                  onChange={(e) => setNewUserProvider(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="email">Email / Password</option>
                  <option value="google">Google OAuth</option>
                  <option value="github">GitHub OAuth</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Role Privileges</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="authenticated">authenticated (Standard User)</option>
                  <option value="admin">admin (Full Access)</option>
                  <option value="service_role">service_role (Server-side bypass)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Policy Modal */}
      {showAddPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Create RLS Security Policy</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Specify access rules for SELECT, INSERT, UPDATE, or DELETE operations.
            </p>

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Public can read active items"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Target Table / Collection</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. posts, user_profiles"
                    value={newPolicyTarget}
                    onChange={(e) => setNewPolicyTarget(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Allowed Operation</label>
                  <select
                    value={newPolicyCommand}
                    onChange={(e) => setNewPolicyCommand(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                  >
                    <option value="SELECT">SELECT (Read)</option>
                    <option value="INSERT">INSERT (Create)</option>
                    <option value="UPDATE">UPDATE (Modify)</option>
                    <option value="DELETE">DELETE (Remove)</option>
                    <option value="ALL">ALL (Full CRUD)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Target Role</label>
                <select
                  value={newPolicyRole}
                  onChange={(e) => setNewPolicyRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="anon">anon (Unauthenticated / Public)</option>
                  <option value="authenticated">authenticated (Logged-in Users)</option>
                  <option value="admin">admin (Admins only)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">USING Expression (Boolean SQL/Auth check)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. auth.uid() = user_id or is_published = true"
                  value={newPolicyExpr}
                  onChange={(e) => setNewPolicyExpr(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddPolicyModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold"
                >
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
