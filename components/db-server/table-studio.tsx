'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  Key,
  Calendar,
  Hash,
  Type,
  ToggleLeft
} from 'lucide-react';
import { TableSchema, DataType } from '@/lib/db-server/types';
import { safeFetchJson } from '@/lib/utils';

interface TableStudioProps {
  currentDb: string;
  tableName: string | null;
  onRefreshTables: () => void;
}

export function TableStudio({ currentDb, tableName, onRefreshTables }: TableStudioProps) {
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Editing state
  const [editingId, setEditingId] = useState<any>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  // Insert modal state
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Record<string, any>>({});
  const [insertError, setInsertError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    if (!tableName) return;
    const url = `/api/db/data?database=${currentDb}&table=${tableName}&search=${encodeURIComponent(
      search
    )}&page=${page}&limit=25`;

    safeFetchJson(url)
      .then((data) => {
        if (!isCancelled && data?.success) {
          setSchema(data.schema);
          setRows(data.rows);
          setTotalPages(data.totalPages);
          setTotalCount(data.totalCount);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentDb, tableName, search, page]);

  const fetchTableData = () => {
    if (!tableName) return;
    setLoading(true);
    const url = `/api/db/data?database=${currentDb}&table=${tableName}&search=${encodeURIComponent(
      search
    )}&page=${page}&limit=25`;

    safeFetchJson(url)
      .then((data) => {
        if (data?.success) {
          setSchema(data.schema);
          setRows(data.rows);
          setTotalPages(data.totalPages);
          setTotalCount(data.totalCount);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleStartEdit = (row: Record<string, any>) => {
    const pk = schema?.columns.find(c => c.primaryKey)?.name || 'id';
    setEditingId(row[pk]);
    setEditValues({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSaveEdit = async () => {
    if (!schema || !tableName) return;
    const pk = schema.columns.find(c => c.primaryKey)?.name || 'id';
    try {
      const res = await fetch('/api/db/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: currentDb,
          table: tableName,
          id: editingId,
          updates: editValues
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchTableData();
      } else {
        alert(data.error || 'Failed to update row');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving changes');
    }
  };

  const handleDeleteRow = async (id: any) => {
    try {
      setRows(prev => prev.filter(r => r.id !== id && r._id !== id));
      const res = await fetch(`/api/db/data?database=${currentDb}&table=${tableName}&id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchTableData();
        onRefreshTables();
      } else {
        console.error(data.error || 'Failed to delete row');
        fetchTableData();
      }
    } catch (err: any) {
      console.error(err.message || 'Error deleting row');
      fetchTableData();
    }
  };

  const handleOpenInsert = () => {
    if (!schema) return;
    const init: Record<string, any> = {};
    for (const col of schema.columns) {
      if (col.primaryKey) continue;
      if (col.defaultValue !== undefined) {
        init[col.name] = col.defaultValue;
      } else if (col.type === 'BOOLEAN') {
        init[col.name] = true;
      } else if (col.type === 'INTEGER' || col.type === 'DECIMAL') {
        init[col.name] = 0;
      } else if (col.type === 'TIMESTAMP') {
        init[col.name] = new Date().toISOString().replace('T', ' ').substring(0, 19);
      } else {
        init[col.name] = '';
      }
    }
    setNewRowValues(init);
    setInsertError(null);
    setShowInsertModal(true);
  };

  const handleConfirmInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName) return;
    try {
      const res = await fetch('/api/db/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: currentDb,
          table: tableName,
          row: newRowValues
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowInsertModal(false);
        fetchTableData();
        onRefreshTables();
      } else {
        setInsertError(data.error || 'Failed to insert row');
      }
    } catch (err: any) {
      setInsertError(err.message || 'Insert request failed');
    }
  };

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

  if (!tableName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950 text-zinc-400">
        <Database className="h-10 w-10 text-zinc-700 mb-3" />
        <h3 className="text-base font-semibold text-zinc-300">Select a Table to View Records</h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          Choose a table from the left sidebar to inspect rows, perform inline updates, and insert records.
        </p>
      </div>
    );
  }

  const pkCol = schema?.columns.find(c => c.primaryKey)?.name || 'id';

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Studio Header Toolbar */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100 font-mono">{tableName}</span>
              <span className="text-[11px] text-zinc-400 font-mono">
                ({totalCount} records)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder={`Search ${tableName}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-zinc-700 w-44 sm:w-60"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchTableData}
            title="Refresh table data"
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Insert Row Button */}
          <button
            onClick={handleOpenInsert}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Insert Row</span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto p-4">
        {schema ? (
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900 text-zinc-400">
                    <th className="px-3 py-2.5 w-16 text-center font-normal text-zinc-400">Actions</th>
                    {schema.columns.map((col) => (
                      <th key={col.name} className="px-3 py-2.5 font-medium text-zinc-300 border-r border-zinc-800/60 last:border-r-0">
                        <div className="flex items-center gap-1.5">
                          {col.primaryKey && <Key className="h-3 w-3 text-amber-400" />}
                          {getColIcon(col.type)}
                          <span className={col.primaryKey ? 'text-amber-300 font-bold' : ''}>
                            {col.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-normal font-sans">
                            {col.type}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={schema.columns.length + 1} className="px-4 py-12 text-center text-zinc-400">
                        {search ? 'No rows match your filter.' : 'Table is empty.'}
                        <button
                          onClick={handleOpenInsert}
                          className="mt-2 text-emerald-400 hover:underline block mx-auto text-xs"
                        >
                          + Insert first row
                        </button>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const rowId = row[pkCol];
                      const isEditing = editingId === rowId;

                      return (
                        <tr
                          key={rowId}
                          className={`hover:bg-zinc-850/50 transition-colors ${
                            isEditing ? 'bg-zinc-850/90 ring-1 ring-emerald-500/50' : ''
                          }`}
                        >
                          {/* Row Action Buttons */}
                          <td className="px-3 py-2 text-center bg-zinc-900/40 select-none whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={handleSaveEdit}
                                  title="Save changes"
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  title="Cancel"
                                  className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100">
                                <button
                                  onClick={() => handleStartEdit(row)}
                                  title="Edit row"
                                  className="text-zinc-400 hover:text-emerald-400 p-0.5"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(rowId)}
                                  title="Delete row"
                                  className="text-zinc-400 hover:text-rose-400 p-0.5"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Data cells */}
                          {schema.columns.map((col) => {
                            const val = isEditing ? editValues[col.name] : row[col.name];
                            const isPk = col.primaryKey;

                            if (isEditing && !isPk) {
                              return (
                                <td key={col.name} className="px-2 py-1 border-r border-zinc-850">
                                  {col.type === 'BOOLEAN' ? (
                                    <select
                                      value={String(val)}
                                      onChange={(e) =>
                                        setEditValues({
                                          ...editValues,
                                          [col.name]: e.target.value === 'true'
                                        })
                                      }
                                      className="bg-zinc-900 text-zinc-200 border border-zinc-700 rounded px-2 py-1 text-xs w-full focus:outline-none"
                                    >
                                      <option value="true">true</option>
                                      <option value="false">false</option>
                                    </select>
                                  ) : (
                                    <input
                                      type={col.type === 'INTEGER' || col.type === 'DECIMAL' ? 'number' : 'text'}
                                      step={col.type === 'DECIMAL' ? '0.01' : '1'}
                                      value={val ?? ''}
                                      onChange={(e) =>
                                        setEditValues({
                                          ...editValues,
                                          [col.name]:
                                            col.type === 'INTEGER'
                                              ? parseInt(e.target.value, 10) || 0
                                              : col.type === 'DECIMAL'
                                              ? parseFloat(e.target.value) || 0.0
                                              : e.target.value
                                        })
                                      }
                                      className="bg-zinc-900 text-zinc-100 border border-zinc-700 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-emerald-500"
                                    />
                                  )}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={col.name}
                                onDoubleClick={() => !isEditing && handleStartEdit(row)}
                                title="Double click to edit"
                                className="px-3 py-2 text-zinc-200 border-r border-zinc-850/60 last:border-r-0 max-w-[280px] truncate"
                              >
                                {val === null || val === undefined ? (
                                  <span className="text-zinc-400 italic text-[11px] font-sans">NULL</span>
                                ) : typeof val === 'boolean' ? (
                                  <span className={val ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                                    {String(val)}
                                  </span>
                                ) : typeof val === 'number' ? (
                                  <span className="text-cyan-300">{val}</span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-zinc-400">
            <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="border-t border-zinc-800 bg-zinc-900/50 px-4 py-2 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div>
            Showing Page <span className="text-zinc-200 font-semibold">{page}</span> of{' '}
            <span className="text-zinc-200 font-semibold">{totalPages}</span> ({totalCount} rows)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Insert Row Modal */}
      {showInsertModal && schema && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Insert Record into <code className="text-emerald-400 font-mono">{tableName}</code>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Database: {currentDb}</p>
              </div>
              <button
                onClick={() => setShowInsertModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {insertError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-xs">
                {insertError}
              </div>
            )}

            <form onSubmit={handleConfirmInsert} className="flex-1 overflow-y-auto space-y-3 pr-1">
              {schema.columns.map((col) => {
                if (col.primaryKey) {
                  return (
                    <div key={col.name} className="opacity-60 bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono text-zinc-300 font-medium">{col.name} (Primary Key)</span>
                        <span className="text-[10px] text-zinc-400">Auto Increment</span>
                      </div>
                      <div className="text-xs text-zinc-400 italic">Automatically generated by server engine</div>
                    </div>
                  );
                }

                return (
                  <div key={col.name} className="space-y-1">
                    <label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {getColIcon(col.type)}
                        {col.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans">
                        {col.type} {!col.nullable && '· required'}
                      </span>
                    </label>

                    {col.type === 'BOOLEAN' ? (
                      <select
                        value={String(newRowValues[col.name])}
                        onChange={(e) =>
                          setNewRowValues({
                            ...newRowValues,
                            [col.name]: e.target.value === 'true'
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type={col.type === 'INTEGER' || col.type === 'DECIMAL' ? 'number' : 'text'}
                        step={col.type === 'DECIMAL' ? '0.01' : '1'}
                        value={newRowValues[col.name] ?? ''}
                        required={!col.nullable && col.defaultValue === undefined}
                        onChange={(e) =>
                          setNewRowValues({
                            ...newRowValues,
                            [col.name]:
                              col.type === 'INTEGER'
                                ? parseInt(e.target.value, 10) || 0
                                : col.type === 'DECIMAL'
                                ? parseFloat(e.target.value) || 0.0
                                : e.target.value
                          })
                        }
                        placeholder={`Enter ${col.name}...`}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    )}
                  </div>
                );
              })}

              <div className="pt-4 border-t border-zinc-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInsertModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold"
                >
                  Insert Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
