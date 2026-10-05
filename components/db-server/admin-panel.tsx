'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Database,
  HardDrive,
  Activity,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Trash2,
  Edit2,
  Key,
  RefreshCw,
  Power,
  Flame,
  Download,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  UserCheck,
  Server
} from 'lucide-react';
import { AetherPlatformUser, AetherAdminOverview, QueryLogEntry, isSuperAdmin, SUPER_ADMIN_EMAILS } from '@/lib/db-server/types';
import { safeFetchJson } from '@/lib/utils';

interface AdminPanelProps {
  currentUserEmail: string;
  onRefreshAllData: () => void;
  onSwitchToTableStudio: (tableName: string) => void;
}

export function AdminPanel({
  currentUserEmail,
  onRefreshAllData,
  onSwitchToTableStudio
}: AdminPanelProps) {
  const isAuthorized = isSuperAdmin(currentUserEmail);

  const [overview, setOverview] = useState<AetherAdminOverview | null>(null);
  const [users, setUsers] = useState<AetherPlatformUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<QueryLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'core_db' | 'audit' | 'controls'>('users');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AetherPlatformUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'DEVELOPER' | 'MEMBER'>('MEMBER');
  const [newUserPlan, setNewUserPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [newUserQuota, setNewUserQuota] = useState(5120);

  // Edit User Form State
  const [editRole, setEditRole] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');
  const [editPlan, setEditPlan] = useState<string>('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJson<{
        success: boolean;
        overview: AetherAdminOverview;
        users: AetherPlatformUser[];
        auditLogs: QueryLogEntry[];
        error?: string;
      }>('/api/db/admin');

      if (res && res.success) {
        setOverview(res.overview);
        setUsers(res.users);
        setAuditLogs(res.auditLogs);
      } else {
        showNotice('error', res?.error || 'Failed to load admin telemetry');
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showNotice('error', 'Name and email are required');
      return;
    }

    try {
      setActionLoading(true);
      const res = await safeFetchJson<{ success: boolean; user?: AetherPlatformUser; error?: string }>('/api/db/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          plan: newUserPlan,
          storageQuotaMb: newUserQuota
        })
      });

      if (res && res.success) {
        showNotice('success', `User ${newUserEmail} registered in Aether database!`);
        setIsAddUserOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        fetchAdminData();
        onRefreshAllData();
      } else {
        showNotice('error', res?.error || 'Failed to create user');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      const res = await safeFetchJson<{ success: boolean; error?: string }>('/api/db/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          userId: selectedUser.id,
          role: editRole,
          status: editStatus,
          plan: editPlan
        })
      });

      if (res && res.success) {
        showNotice('success', `Updated permissions for ${selectedUser.email}`);
        setIsEditUserOpen(false);
        fetchAdminData();
        onRefreshAllData();
      } else {
        showNotice('error', res?.error || 'Update failed');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: AetherPlatformUser) => {
    if (!confirm(`Are you sure you want to permanently delete user "${user.name}" (${user.email}) from AetherDB?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await safeFetchJson<{ success: boolean; error?: string }>('/api/db/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_user',
          userId: user.id
        })
      });

      if (res && res.success) {
        showNotice('success', `User ${user.email} removed from Aether platform`);
        fetchAdminData();
        onRefreshAllData();
      } else {
        showNotice('error', res?.error || 'Deletion failed');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!overview) return;
    const newTarget = !overview.maintenanceMode;
    try {
      setActionLoading(true);
      const res = await safeFetchJson<{ success: boolean; maintenanceMode: boolean; error?: string }>('/api/db/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_maintenance',
          maintenanceEnabled: newTarget
        })
      });

      if (res && res.success) {
        showNotice('success', `Maintenance mode is now ${res.maintenanceMode ? 'ENABLED' : 'DISABLED'}`);
        fetchAdminData();
      } else {
        showNotice('error', res?.error || 'Failed to toggle maintenance');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVacuumStorage = async () => {
    try {
      setActionLoading(true);
      const res = await safeFetchJson<{ success: boolean; message: string; error?: string }>('/api/db/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vacuum_db' })
      });

      if (res && res.success) {
        showNotice('success', res.message);
        fetchAdminData();
      } else {
        showNotice('error', res?.error || 'Vacuum failed');
      }
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 text-center select-none h-full">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4 animate-pulse">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">403 Forbidden: Super Admin Access Only</h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-md">
          The Aether Master Admin Console is strictly restricted to designated Super Administrators:
        </p>
        <div className="mt-3 flex flex-col gap-1.5 text-xs font-mono text-amber-300 bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 shadow-lg">
          <div className="flex items-center gap-2 justify-center">
            <span>👑</span>
            <span className="font-semibold text-white">codefusionduo@gmail.com</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span>👑</span>
            <span className="font-semibold text-white">yabhi9435@gmail.com</span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-4">
          Current logged-in account: <span className="font-mono text-rose-400 font-semibold">{currentUserEmail || 'Anonymous'}</span> (Access Denied)
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">Aether Admin Console</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                  SUPER ADMIN
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Platform Database
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Centralized control plane: platform users, multi-tenant accounts, resource quotas, and system database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Telemetry</span>
            </button>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register User</span>
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {notification && (
          <div
            className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold text-zinc-200">Real Platform Users</span>
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
              <span>{overview?.totalUsers || users.length}</span>
              <span className="text-xs font-normal text-zinc-400 font-sans">registered</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center justify-between font-medium">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {overview?.activeUsersToday || users.filter((u) => u.status === 'ACTIVE').length} active online
              </span>
              <span className="text-[10px] text-amber-300 font-mono font-semibold">2 Super Admins</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Databases Hosted</span>
              <Database className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {overview?.totalDatabases || 2}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              <span>{overview?.totalTables || 8} tables across tenants</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Total Rows Stored</span>
              <Layers className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {overview?.totalRowsStored?.toLocaleString() || '142'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              <span>Indexed relational records</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Queries Executed</span>
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {overview?.totalQueriesProcessed?.toLocaleString() || '1,842'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              <span>~184.2 Queries/sec</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Storage Allocated</span>
              <HardDrive className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {overview?.storageUsedMb || 0.13} <span className="text-sm font-normal text-zinc-400">MB</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              <span>Limit: 10,240 MB</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="border-b border-zinc-800 flex items-center justify-between gap-4">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveSubTab('users')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'users'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Aether Registered Users ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('core_db')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'core_db'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>Internal Core Tables</span>
            </button>

            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'audit'
                  ? 'border-purple-400 text-purple-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Security & Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveSubTab('controls')}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'controls'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>Engine Controls</span>
            </button>
          </nav>
        </div>

        {/* TAB 1: USERS DIRECTORY */}
        {activeSubTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search user by name, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-zinc-400">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-200 text-xs focus:outline-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="MEMBER">MEMBER</option>
                </select>

                <span className="text-zinc-400 ml-2">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-200 text-xs focus:outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-4 font-mono">User ID</th>
                      <th className="py-2.5 px-4">Name & Email</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Plan</th>
                      <th className="py-2.5 px-4 font-mono">API Key</th>
                      <th className="py-2.5 px-4">Quota / Usage</th>
                      <th className="py-2.5 px-4">Created</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-zinc-400 italic">
                          No users match the search criteria. Click &quot;Register User&quot; to add one.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSuper = u.role === 'SUPER_ADMIN';
                        const isAdmin = u.role === 'ADMIN';
                        const isDev = u.role === 'DEVELOPER';

                        return (
                          <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                              {u.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.email === currentUserEmail && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono">{u.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                                  isSuper
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : isAdmin
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : isDev
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1 w-fit border ${
                                  u.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    u.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`}
                                />
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-semibold text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700">
                                {u.plan}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-400 truncate max-w-[100px]">
                                  {u.apiKey.substring(0, 10)}...
                                </span>
                                <button
                                  onClick={() => copyToClipboard(u.apiKey, u.id)}
                                  title="Copy full API Key"
                                  className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                                >
                                  {copiedKeyId === u.id ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-zinc-300">
                              <div>{u.storageQuotaMb} MB max</div>
                              <div className="text-[10px] text-zinc-400">{u.queryCount} queries executed</div>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-zinc-400">
                              {u.createdAt ? u.createdAt.substring(0, 10) : '2026-10-03'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setEditRole(u.role);
                                    setEditStatus(u.status);
                                    setEditPlan(u.plan);
                                    setIsEditUserOpen(true);
                                  }}
                                  title="Edit User Role & Status"
                                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={u.email === currentUserEmail}
                                  title={u.email === currentUserEmail ? 'Cannot delete yourself' : 'Delete user'}
                                  className={`p-1.5 rounded transition-colors ${
                                    u.email === currentUserEmail
                                      ? 'text-zinc-600 cursor-not-allowed'
                                      : 'hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400'
                                  }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERNAL CORE DATABASE EXPLORER */}
        {activeSubTab === 'core_db' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  Aether Core Database Schema & System Tables
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Internal relational tables hosted inside database &apos;aetherdb&apos;. All user account registrations are live in the &apos;users&apos; table.
                </p>
              </div>
              <button
                onClick={() => onSwitchToTableStudio('users')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                <span>Open in Table Studio</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-emerald-400">users</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{users.length} rows</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Stores registered platform accounts, roles, API tokens, plans, and storage quotas.
                </p>
                <div className="text-[11px] font-mono text-zinc-400 space-y-1 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
                  <div>id: INTEGER (PK)</div>
                  <div>name: VARCHAR(255)</div>
                  <div>email: VARCHAR(255) UNIQUE</div>
                  <div>role: VARCHAR(50)</div>
                  <div>status: VARCHAR(50)</div>
                  <div>api_key: VARCHAR(255)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">projects</span>
                  <span className="text-[10px] text-zinc-400 font-mono">2 rows</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Multi-tenant projects and databases assigned to Aether user IDs.
                </p>
                <div className="text-[11px] font-mono text-zinc-400 space-y-1 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
                  <div>id: INTEGER (PK)</div>
                  <div>name: VARCHAR(255)</div>
                  <div>slug: VARCHAR(255) UNIQUE</div>
                  <div>owner_id: INTEGER (FK users.id)</div>
                  <div>region: VARCHAR(50)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-amber-400">audit_logs</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{auditLogs.length} entries</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Global chronological audit trail of all SQL mutations, user logins, and admin actions.
                </p>
                <div className="text-[11px] font-mono text-zinc-400 space-y-1 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
                  <div>id: VARCHAR(50) (PK)</div>
                  <div>database: VARCHAR(100)</div>
                  <div>sql: TEXT</div>
                  <div>executionTimeMs: DECIMAL</div>
                  <div>status: VARCHAR(20)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeSubTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-semibold text-white">Live Query & System Audit Log</span>
                <span className="text-[10px] text-zinc-400">({auditLogs.length} recent operations)</span>
              </div>
              <button
                onClick={fetchAdminData}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh Log</span>
              </button>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Database</th>
                    <th className="py-2.5 px-4">Operation / SQL Statement</th>
                    <th className="py-2.5 px-4">Client IP / Actor</th>
                    <th className="py-2.5 px-4">Latency</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-500 italic">
                        No recent audit records.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-850/50">
                        <td className="py-2.5 px-4 text-zinc-400 text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-4 text-cyan-400 text-[11px]">
                          {log.database}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-200 font-sans text-xs max-w-[400px] truncate">
                          {log.sql}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-400 text-[11px]">
                          {log.clientIp}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-400 text-[11px]">
                          {log.executionTimeMs} ms
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ENGINE CONTROLS */}
        {activeSubTab === 'controls' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Power className="h-4 w-4 text-amber-400" />
                    Maintenance Mode
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    When enabled, client connections receive HTTP 503 Maintenance and read-only flags are locked.
                  </p>
                </div>
                <button
                  onClick={handleToggleMaintenance}
                  disabled={actionLoading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    overview?.maintenanceMode
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {overview?.maintenanceMode ? 'ENABLED (OFFLINE)' : 'DISABLED (ONLINE)'}
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-cyan-400" />
                    Storage Vacuum & Flush
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Clean orphaned cache files, re-index active JSON structures, and sync to persistent storage.
                  </p>
                </div>
                <button
                  onClick={handleVacuumStorage}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  Vacuum Storage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: REGISTER NEW USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Register Aether Platform User</h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="vikram@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">System Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e: any) => setNewUserRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="DEVELOPER">DEVELOPER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Account Plan</label>
                  <select
                    value={newUserPlan}
                    onChange={(e: any) => setNewUserPlan(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FREE">FREE (512 MB)</option>
                    <option value="PRO">PRO (5,120 MB)</option>
                    <option value="ENTERPRISE">ENTERPRISE (10,240 MB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Storage Quota (MB)</label>
                <input
                  type="number"
                  value={newUserQuota}
                  onChange={(e) => setNewUserQuota(parseInt(e.target.value, 10))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400">
                ⚡ Creating this user will immediately insert a record into the <code className="text-emerald-400 font-mono">aetherdb.users</code> relational table and provision live API keys.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                >
                  {actionLoading ? 'Saving...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER ROLE & STATUS */}
      {isEditUserOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Edit User Permissions</h3>
              <button
                onClick={() => setIsEditUserOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-400">User:</span>{' '}
                <span className="font-semibold text-white">{selectedUser.name}</span> ({selectedUser.email})
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE">ACTIVE (Normal Access)</option>
                  <option value="SUSPENDED">SUSPENDED (Locked)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Subscription Plan</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateUser}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                >
                  {actionLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
