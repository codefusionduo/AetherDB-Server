'use client';

import React, { useState } from 'react';
import { Table, Plus, Trash2, X, Key } from 'lucide-react';
import { ColumnDefinition, DataType } from '@/lib/db-server/types';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDb: string;
  onCreate: (tableName: string, columns: ColumnDefinition[]) => Promise<void>;
}

export function CreateTableModal({ isOpen, onClose, currentDb, onCreate }: CreateTableModalProps) {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
    { name: 'title', type: 'VARCHAR', nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddColumn = () => {
    setColumns(prev => [
      ...prev,
      {
        name: `column_${prev.length + 1}`,
        type: 'VARCHAR',
        nullable: true
      }
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns(prev => prev.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, updates: Partial<ColumnDefinition>) => {
    setColumns(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanName) return;

    if (columns.length === 0) {
      setError('At least one column is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onCreate(cleanName, columns);
      setTableName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Create Table in {currentDb}</h3>
              <p className="text-[11px] text-zinc-400">Design table schema and columns.</p>
            </div>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          <div className="space-y-1">
            <label className="text-zinc-300 font-medium">Table Name</label>
            <input
              type="text"
              required
              placeholder="e.g. invoices, subscriptions, tickets"
              value={tableName}
              onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium">Columns & Types</label>
              <button
                type="button"
                onClick={handleAddColumn}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>Add Column</span>
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 p-2.5 bg-zinc-950 border border-zinc-800 rounded-md"
                >
                  <input
                    type="text"
                    required
                    placeholder="column_name"
                    value={col.name}
                    onChange={(e) => handleColumnChange(idx, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    className="flex-1 min-w-[120px] bg-zinc-900 border border-zinc-800 rounded p-1.5 font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />

                  <select
                    value={col.type}
                    onChange={(e) => handleColumnChange(idx, { type: e.target.value as DataType })}
                    className="w-28 bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none"
                  >
                    <option value="INTEGER">INTEGER</option>
                    <option value="VARCHAR">VARCHAR</option>
                    <option value="DECIMAL">DECIMAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="TIMESTAMP">TIMESTAMP</option>
                    <option value="JSON">JSON</option>
                  </select>

                  <label className="flex items-center gap-1 text-[11px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.primaryKey || false}
                      onChange={(e) => handleColumnChange(idx, { primaryKey: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500"
                    />
                    <span>PK</span>
                  </label>

                  <label className="flex items-center gap-1 text-[11px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.nullable !== false}
                      onChange={(e) => handleColumnChange(idx, { nullable: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500"
                    />
                    <span>Null</span>
                  </label>

                  <label className="flex items-center gap-1 text-[11px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.unique || false}
                      onChange={(e) => handleColumnChange(idx, { unique: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500"
                    />
                    <span>Unique</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(idx)}
                    disabled={columns.length <= 1}
                    className="text-zinc-500 hover:text-rose-400 p-1 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
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
              disabled={loading || !tableName.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
