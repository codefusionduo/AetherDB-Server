'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Clock,
  Download,
  Terminal,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Search,
  FileCode2,
  Trash2
} from 'lucide-react';
import { QueryResult } from '@/lib/db-server/types';

interface SQLConsoleProps {
  currentDb: string;
  onExecuteQuery: (sql: string) => Promise<QueryResult>;
  tables: { name: string; rowCount: number }[];
}

export function SQLConsole({ currentDb, onExecuteQuery, tables }: SQLConsoleProps) {
  const getInitialQuery = () => {
    if (currentDb === 'ecommerce_prod') {
      return 'SELECT customers.full_name, customers.country, orders.order_number, orders.total_amount\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nORDER BY orders.total_amount DESC;';
    } else if (currentDb === 'analytics_logs') {
      return 'SELECT endpoint, http_method, status_code, latency_ms\nFROM request_events\nWHERE status_code = 200\nORDER BY latency_ms DESC\nLIMIT 10;';
    } else if (tables.length > 0) {
      return `SELECT * FROM ${tables[0].name} LIMIT 10;`;
    }
    return 'SHOW TABLES;';
  };

  const [query, setQuery] = useState<string>(getInitialQuery);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [resultTab, setResultTab] = useState<'results' | 'plan' | 'history'>('results');
  const [history, setHistory] = useState<{ sql: string; timestamp: string; duration: number; success: boolean; rows: number }[]>([]);
  const [filterText, setFilterText] = useState('');

  const handleRun = async (sqlToRun?: string, isExplain = false) => {
    let targetSql = sqlToRun || query;
    if (isExplain && !targetSql.toUpperCase().startsWith('EXPLAIN')) {
      targetSql = `EXPLAIN ANALYZE ${targetSql}`;
    }

    setIsRunning(true);
    try {
      const res = await onExecuteQuery(targetSql);
      setResult(res);
      setHistory(prev => [
        {
          sql: targetSql,
          timestamp: new Date().toLocaleTimeString(),
          duration: res.executionTimeMs,
          success: res.success,
          rows: res.rowCount
        },
        ...prev.slice(0, 19)
      ]);
      if (res.plan) {
        setResultTab('plan');
      } else {
        setResultTab('results');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const presets = [
    {
      name: 'Customer & Orders Join',
      sql: `SELECT customers.full_name, customers.country, orders.order_number, orders.total_amount, orders.status\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nORDER BY orders.total_amount DESC;`
    },
    {
      name: 'Product Inventory & Value',
      sql: `SELECT category, COUNT(*) AS total_items, SUM(stock_quantity) AS total_stock, AVG(price) AS avg_price\nFROM products\nGROUP BY category\nORDER BY total_stock DESC;`
    },
    {
      name: 'Order Items Detailed',
      sql: `SELECT order_items.id, products.name, order_items.quantity, order_items.unit_price\nFROM order_items\nJOIN products ON order_items.product_id = products.id;`
    },
    {
      name: 'Explain Execution Plan',
      sql: `EXPLAIN ANALYZE SELECT * FROM customers WHERE balance > 1000 ORDER BY balance DESC;`
    },
    {
      name: 'Show All Tables',
      sql: `SHOW TABLES;`
    }
  ];

  const exportCSV = () => {
    if (!result || result.rows.length === 0) return;
    const cols = result.columns;
    const header = cols.join(',');
    const rows = result.rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = result?.rows.filter(r => {
    if (!filterText) return true;
    return Object.values(r).some(v => String(v).toLowerCase().includes(filterText.toLowerCase()));
  }) || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Top Presets Bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-medium text-zinc-300">Query Presets:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(p.sql);
                handleRun(p.sql);
              }}
              className="px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 hover:border-zinc-700 text-zinc-300 rounded text-xs whitespace-nowrap transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* SQL Editor Area */}
      <div className="p-4 border-b border-zinc-800 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 tracking-wide">
              SQL QUERY EDITOR
            </span>
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
              (Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Enter</kbd> to run)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRun(undefined, true)}
              disabled={isRunning || !query.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Explain Plan</span>
            </button>

            <button
              onClick={() => handleRun()}
              disabled={isRunning || !query.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 fill-current ${isRunning ? 'animate-pulse' : ''}`} />
              <span>{isRunning ? 'Executing...' : 'Run Query'}</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative rounded-md border border-zinc-800 bg-zinc-900 focus-within:border-emerald-500/50 transition-colors">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="Write SQL query here... e.g. SELECT * FROM customers;"
            className="w-full bg-transparent p-3 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-y selection:bg-emerald-500/30"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Result Section */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
        {/* Results Tab Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/40 px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
            <button
              onClick={() => setResultTab('results')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                resultTab === 'results' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Result Grid ({result?.rowCount || 0})
            </button>
            <button
              onClick={() => setResultTab('plan')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                resultTab === 'plan' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Execution Plan
            </button>
            <button
              onClick={() => setResultTab('history')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                resultTab === 'history' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Query History ({history.length})
            </button>
          </div>

          {result && (
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              {result.success ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Success</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Error</span>
                </div>
              )}
              <span>·</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-mono">{result.executionTimeMs.toFixed(2)} ms</span>
              </div>
              <span>·</span>
              <span className="font-mono">{result.rowCount} row(s)</span>

              {result.rows.length > 0 && resultTab === 'results' && (
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1 text-zinc-300 hover:text-white bg-zinc-850 hover:bg-zinc-800 px-2 py-1 rounded border border-zinc-750 transition-colors ml-2"
                >
                  <Download className="h-3 w-3" />
                  <span>CSV</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-4">
          {resultTab === 'results' && (
            <div>
              {result?.error ? (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Query Execution Error</h4>
                    <p className="font-mono text-xs mt-1 text-rose-200/90 whitespace-pre-wrap">{result.error}</p>
                    <p className="text-xs text-zinc-400 mt-2">
                      Please check table names and syntax. You can run <code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">SHOW TABLES;</code> or <code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">DESCRIBE table_name;</code> to verify schemas.
                    </p>
                  </div>
                </div>
              ) : result && result.columns.length > 0 ? (
                <div className="space-y-3">
                  {/* Results filter */}
                  {result.rows.length > 5 && (
                    <div className="flex items-center gap-2 max-w-sm">
                      <div className="relative w-full">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Filter results..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                      {filterText && (
                        <button
                          onClick={() => setFilterText('')}
                          className="text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {/* Data Table */}
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900 text-zinc-400">
                            <th className="px-3 py-2 text-zinc-400 w-10 text-center font-normal">#</th>
                            {result.columns.map((col) => (
                              <th key={col} className="px-3 py-2 font-medium text-zinc-300 border-r border-zinc-800/60 last:border-r-0">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan={result.columns.length + 1} className="px-4 py-8 text-center text-zinc-400">
                                No records matched.
                              </td>
                            </tr>
                          ) : (
                            filteredRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-zinc-850/60 transition-colors">
                                <td className="px-3 py-2 text-center text-zinc-400 bg-zinc-900/40 select-none">
                                  {rIdx + 1}
                                </td>
                                {result.columns.map((col) => {
                                  const val = row[col];
                                  const isNull = val === null || val === undefined;
                                  return (
                                    <td key={col} className="px-3 py-2 text-zinc-200 border-r border-zinc-850/60 last:border-r-0 max-w-[320px] truncate">
                                      {isNull ? (
                                        <span className="text-zinc-400 italic font-sans text-[11px]">NULL</span>
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
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-800 rounded-lg p-6">
                  <Terminal className="h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-sm font-medium text-zinc-400">No Query Results</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                    Execute a SQL statement above or click one of the preset queries to inspect tables and data.
                  </p>
                </div>
              )}
            </div>
          )}

          {resultTab === 'plan' && (
            <div className="space-y-4">
              {result?.plan ? (
                <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-900/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200">Query Execution Engine Plan</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{result.plan.details}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-mono">Actual: {result.plan.actualTimeMs}ms</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-cyan-400 font-mono">Rows: {result.plan.actualRows}</span>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-md">
                      <div className="text-emerald-400 font-semibold flex items-center gap-2">
                        <span>→ {result.plan.operation}</span>
                      </div>
                      <div className="text-zinc-400 text-[11px] mt-1">
                        Cost Estimate: {result.plan.costEstimate} | Estimated Rows: {result.plan.estimatedRows} | Actual Rows: {result.plan.actualRows}
                      </div>
                    </div>

                    {result.plan.children?.map((child, idx) => (
                      <div key={idx} className="ml-6 p-3 bg-zinc-900/80 border-l-2 border-emerald-500/50 border-zinc-800 rounded-r-md">
                        <div className="text-cyan-300 font-semibold flex items-center gap-2">
                          <span>↳ {child.operation}</span>
                        </div>
                        <div className="text-zinc-300 text-xs mt-1">{child.details}</div>
                        <div className="text-zinc-400 text-[11px] mt-1">
                          Execution: {child.actualTimeMs}ms | Actual Rows: {child.actualRows}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-800 rounded-lg p-6">
                  <Zap className="h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-sm font-medium text-zinc-400">No Execution Plan Generated</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Click &quot;Explain Plan&quot; above to analyze the execution pipeline and buffer scans for your query.
                  </p>
                </div>
              )}
            </div>
          )}

          {resultTab === 'history' && (
            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-800 rounded-lg p-6">
                  <Clock className="h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-sm font-medium text-zinc-400">No Query History</p>
                  <p className="text-xs text-zinc-400 mt-1">Queries you execute will appear here.</p>
                </div>
              ) : (
                history.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setQuery(h.sql);
                      handleRun(h.sql);
                    }}
                    className="p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer transition-colors flex items-start justify-between gap-4 group"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        {h.success ? (
                          <span className="text-[10px] text-emerald-400 font-medium font-mono">OK</span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-medium font-mono">ERR</span>
                        )}
                        <span className="text-[11px] text-zinc-400 font-mono">{h.timestamp}</span>
                        <span className="text-[11px] text-zinc-400">·</span>
                        <span className="text-[11px] text-zinc-400 font-mono">{h.duration.toFixed(2)}ms</span>
                        <span className="text-[11px] text-zinc-400">·</span>
                        <span className="text-[11px] text-zinc-400 font-mono">{h.rows} rows</span>
                      </div>
                      <p className="text-xs font-mono text-zinc-300 truncate max-w-xl group-hover:text-emerald-300">
                        {h.sql}
                      </p>
                    </div>

                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300 shrink-0">
                      Rerun →
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
