'use client';

import React, { useState } from 'react';
import { Database, X } from 'lucide-react';

interface CreateDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateDbModal({ isOpen, onClose, onCreate }: CreateDbModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(name.trim());
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create database');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Create New Database</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-zinc-300 font-medium">Database Name</label>
            <input
              type="text"
              required
              placeholder="e.g. staging_db or user_vault"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-zinc-500">
              Only alphanumeric characters and underscores allowed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-zinc-400">
            <div>
              <label className="text-zinc-400 block mb-1">Default Charset</label>
              <div className="bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-300 font-mono">
                utf8mb4
              </div>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Collation</label>
              <div className="bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-300 font-mono">
                utf8mb4_unicode_ci
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-850 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
