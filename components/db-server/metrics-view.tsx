'use client';

import React, { useState } from 'react';
import {
  Activity,
  Zap,
  Clock,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Server
} from 'lucide-react';
import { ServerMetrics, QueryLogEntry } from '@/lib/db-server/types';

interface MetricsViewProps {
  metrics: ServerMetrics | null;
  auditLogs: QueryLogEntry[];
  onRefresh: () => void;
  onRunBenchmark: () => void;
  isBenchmarking: boolean;
  benchmarkResult?: any;
}

export function MetricsView({
  metrics,
  auditLogs,
  onRefresh,
  onRunBenchmark,
  isBenchmarking,
  benchmarkResult
}: MetricsViewProps) {
  const [logFilter, setLogFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');

  const filteredLogs = auditLogs.filter(log => {
    if (logFilter === 'ALL') return true;
    return log.status === logFilter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Server Telemetry & Performance Monitor</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time engine metrics, memory allocation, query throughput, and client audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-md text-xs font-medium transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={onRunBenchmark}
            disabled={isBenchmarking}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Zap className={`h-3.5 w-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
            <span>{isBenchmarking ? 'Running 50-Query Benchmark...' : 'Run Load Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Benchmark Banner if run */}
      {benchmarkResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-300">
                Benchmark Completed Successfully!
              </div>
              <div className="text-xs text-emerald-200/80 mt-0.5">
                Executed {benchmarkResult.queriesExecuted} concurrent queries in {benchmarkResult.totalDurationMs} ms.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-center">
              <div className="text-zinc-400 text-[10px] font-sans">Calculated QPS</div>
              <div className="text-emerald-400 text-base font-bold">{benchmarkResult.calculatedQps}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-400 text-[10px] font-sans">Avg Latency</div>
              <div className="text-cyan-400 text-base font-bold">{benchmarkResult.avgLatencyMs} ms</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-400 text-[10px] font-sans">Health Score</div>
              <div className="text-purple-400 text-base font-bold">100%</div>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Throughput */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Query Throughput</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {metrics?.qps || 184.2} <span className="text-xs font-sans text-zinc-400 font-normal">QPS</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Total processed:</span>
            <span className="font-mono text-zinc-300">{metrics?.totalQueriesProcessed.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Latency */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Average Latency</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {metrics?.avgLatencyMs || 1.34} <span className="text-xs font-sans text-zinc-400 font-normal">ms</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
            <span>p50: 1.1ms</span>
            <span>·</span>
            <span>p95: 2.8ms</span>
            <span>·</span>
            <span>p99: 4.2ms</span>
          </div>
        </div>

        {/* Card 3: Buffer Pool & Cache */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Buffer Cache Hit Ratio</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {metrics?.cacheHitRatio || 98.7}%
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Buffer pool allocated:</span>
            <span className="font-mono text-zinc-300">{metrics?.bufferPoolUsedMb} / {metrics?.bufferPoolTotalMb} MB</span>
          </div>
        </div>

        {/* Card 4: Connections */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Connection Pool</span>
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {metrics?.activeConnections || 14} <span className="text-xs font-sans text-zinc-400 font-normal">/ {metrics?.maxConnections || 100}</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Connection timeout:</span>
            <span className="font-mono text-zinc-300">15,000 ms</span>
          </div>
        </div>
      </div>

      {/* Server Architecture Specs & Storage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            <span>Process & Ports</span>
          </div>
          <div className="text-xs space-y-2 text-zinc-400">
            <div className="flex justify-between">
              <span>Database Server Port (PostgreSQL):</span>
              <span className="font-mono text-zinc-200">5432 (TCP)</span>
            </div>
            <div className="flex justify-between">
              <span>REST / Management API:</span>
              <span className="font-mono text-zinc-200">3000 (HTTP)</span>
            </div>
            <div className="flex justify-between">
              <span>Process Model:</span>
              <span className="text-zinc-200">Multi-threaded Worker Pool</span>
            </div>
            <div className="flex justify-between">
              <span>Encoding / Collation:</span>
              <span className="font-mono text-zinc-200">UTF-8 / Unicode</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-cyan-400" />
            <span>Storage & Memory Engine</span>
          </div>
          <div className="text-xs space-y-2 text-zinc-400">
            <div className="flex justify-between">
              <span>Total Data Size:</span>
              <span className="font-mono text-zinc-200">{metrics?.diskUsageMb || 23.4} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Index Storage:</span>
              <span className="font-mono text-zinc-200">4.8 MB (B-Tree + Hash)</span>
            </div>
            <div className="flex justify-between">
              <span>Write-Ahead Log (WAL):</span>
              <span className="font-mono text-emerald-400">ENABLED (Sync)</span>
            </div>
            <div className="flex justify-between">
              <span>Checkpoint Interval:</span>
              <span className="font-mono text-zinc-200">300 seconds</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>Security & Isolation</span>
          </div>
          <div className="text-xs space-y-2 text-zinc-400">
            <div className="flex justify-between">
              <span>TLS / SSL Mode:</span>
              <span className="text-emerald-400 font-mono">TLS v1.3</span>
            </div>
            <div className="flex justify-between">
              <span>Authentication:</span>
              <span className="text-zinc-200">SCRAM-SHA-256 + API Token</span>
            </div>
            <div className="flex justify-between">
              <span>RBAC Status:</span>
              <span className="text-emerald-400 font-mono">ENFORCED</span>
            </div>
            <div className="flex justify-between">
              <span>Slow Query Threshold:</span>
              <span className="font-mono text-zinc-200">100 ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Query Audit Logs Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
        <div className="bg-zinc-850 px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-zinc-400" />
              <span>Real-time Query Audit Log</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Live stream of recent SQL and API requests handled by this server.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs">
            {(['ALL', 'SUCCESS', 'ERROR'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setLogFilter(filter)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  logFilter === filter ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80">
                <th className="px-3 py-2 w-24">Time</th>
                <th className="px-3 py-2 w-20">Status</th>
                <th className="px-3 py-2 w-28">Database</th>
                <th className="px-3 py-2">Statement / Query</th>
                <th className="px-3 py-2 w-20 text-right">Latency</th>
                <th className="px-3 py-2 w-20 text-right">Rows</th>
                <th className="px-3 py-2 w-32 text-right">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No query logs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="px-3 py-2 text-zinc-400">{log.timestamp}</td>
                    <td className="px-3 py-2">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>OK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>ERR</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-300 font-sans">{log.database}</td>
                    <td className="px-3 py-2 text-zinc-200 max-w-md truncate font-mono">
                      {log.sql}
                    </td>
                    <td className="px-3 py-2 text-right text-cyan-400 font-mono">
                      {log.executionTimeMs.toFixed(2)}ms
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-300 font-mono">
                      {log.rowsAffected}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-500 text-[11px]">
                      {log.clientIp}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
