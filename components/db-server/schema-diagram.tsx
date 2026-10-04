'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Link as LinkIcon,
  Layers,
  Database,
  ArrowRight,
  Plus,
  RefreshCw,
  Hash,
  Type,
  ToggleLeft,
  Calendar
} from 'lucide-react';
import { TableSchema, DataType } from '@/lib/db-server/types';
import { safeFetchJson } from '@/lib/utils';

interface SchemaDiagramProps {
  currentDb: string;
  onOpenCreateTable: () => void;
  onSelectTable: (table: string) => void;
}

export function SchemaDiagram({ currentDb, onOpenCreateTable, onSelectTable }: SchemaDiagramProps) {
  const [tables, setTables] = useState<{ name: string; schema: TableSchema; rowCount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'diagram' | 'dictionary'>('diagram');

  const fetchTables = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson(`/api/db/tables?database=${currentDb}`);
      if (data?.success) {
        setTables(data.tables || []);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDb]);

  useEffect(() => {
    let isCancelled = false;
    safeFetchJson(`/api/db/tables?database=${currentDb}`).then((data) => {
      if (!isCancelled && data?.success) {
        setTables(data.tables || []);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentDb]);

  const getColIcon = (type: DataType) => {
    switch (type) {
      case 'INTEGER':
      case 'DECIMAL':
        return <Hash className="h-3 w-3 text-cyan-400" />;
      case 'VARCHAR':
        return <Type className="h-3 w-3 text-emerald-400" />;
      case 'BOOLEAN':
        return <ToggleLeft className="h-3 w-3 text-amber-400" />;
      case 'TIMESTAMP':
        return <Calendar className="h-3 w-3 text-purple-400" />;
      default:
        return <Database className="h-3 w-3 text-zinc-400" />;
    }
  };

  // Find all foreign key relationships
  const relationships: { fromTable: string; fromCol: string; toTable: string; toCol: string }[] = [];
  for (const t of tables) {
    for (const c of t.schema.columns) {
      if (c.references) {
        relationships.push({
          fromTable: t.name,
          fromCol: c.name,
          toTable: c.references.table,
          toCol: c.references.column
        });
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Header bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-zinc-200">Database Schema & Relationships</span>
            <span className="text-xs text-zinc-400">· {tables.length} tables · {relationships.length} foreign keys</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('diagram')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'diagram' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Visual Cards
            </button>
            <button
              onClick={() => setViewMode('dictionary')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'dictionary' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Data Dictionary
            </button>
          </div>

          <button
            onClick={fetchTables}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenCreateTable}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Table</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {tables.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
            <Layers className="h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">No Tables in Database</p>
            <p className="text-xs text-zinc-500 mt-1">Create tables or switch databases.</p>
          </div>
        ) : viewMode === 'diagram' ? (
          <div className="space-y-6">
            {/* Active Foreign Key Connectors Summary */}
            {relationships.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Configured Foreign Key Constraints & Relations</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-md text-xs font-mono"
                    >
                      <span className="text-emerald-300">{rel.fromTable}.{rel.fromCol}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-500" />
                      <span className="text-amber-300">{rel.toTable}.{rel.toCol}</span>
                      <span className="text-[10px] text-zinc-400 font-sans ml-1">(1:N)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden shadow-lg flex flex-col transition-all group"
                >
                  {/* Card Header */}
                  <div className="bg-zinc-850 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-mono font-semibold text-xs text-zinc-100">{table.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {table.rowCount} rows
                    </span>
                  </div>

                  {/* Columns List */}
                  <div className="p-3 divide-y divide-zinc-850/60 flex-1">
                    {table.schema.columns.map((col) => (
                      <div
                        key={col.name}
                        className="py-1.5 flex items-center justify-between text-xs font-mono group-hover:text-zinc-200"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {col.primaryKey ? (
                            <Key className="h-3 w-3 text-amber-400 shrink-0" />
                          ) : col.references ? (
                            <LinkIcon className="h-3 w-3 text-emerald-400 shrink-0" />
                          ) : (
                            getColIcon(col.type)
                          )}
                          <span className={`truncate ${col.primaryKey ? 'text-amber-300 font-bold' : 'text-zinc-300'}`}>
                            {col.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] text-zinc-400 font-sans">{col.type}</span>
                          {col.primaryKey && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded font-sans">
                              PK
                            </span>
                          )}
                          {col.references && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-sans">
                              FK
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer */}
                  <div className="p-2.5 bg-zinc-950/60 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
                    <button
                      onClick={() => onSelectTable(table.name)}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Open in Studio →
                    </button>
                    <span>{table.schema.columns.length} columns</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Data Dictionary View */
          <div className="space-y-6">
            {tables.map((table) => (
              <div key={table.name} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40">
                <div className="bg-zinc-850 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                  <div className="font-mono text-xs font-bold text-zinc-200 flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{table.name}</span>
                    <span className="text-zinc-400 font-normal font-sans">· {table.rowCount} records</span>
                  </div>
                  <button
                    onClick={() => onSelectTable(table.name)}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    View Data
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900">
                        <th className="px-3 py-2">Column</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Nullable</th>
                        <th className="px-3 py-2">Key Constraint</th>
                        <th className="px-3 py-2">Default</th>
                        <th className="px-3 py-2">Foreign Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {table.schema.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-zinc-850/40">
                          <td className="px-3 py-2 text-zinc-200 font-medium">{col.name}</td>
                          <td className="px-3 py-2 text-cyan-300">{col.type}</td>
                          <td className="px-3 py-2 text-zinc-400">{col.nullable !== false ? 'YES' : 'NO'}</td>
                          <td className="px-3 py-2">
                            {col.primaryKey ? (
                              <span className="text-amber-400 font-semibold">PRIMARY KEY</span>
                            ) : col.unique ? (
                              <span className="text-purple-400">UNIQUE</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-2 text-zinc-400">
                            {col.defaultValue !== undefined ? String(col.defaultValue) : 'NULL'}
                          </td>
                          <td className="px-3 py-2 text-emerald-400">
                            {col.references ? `${col.references.table}.${col.references.column}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
