'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Radio,
  RefreshCw,
  Trash2,
  Send,
  Database,
  Users,
  FileJson,
  HardDrive,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { RealtimeEvent } from '@/lib/db-server/types';

export function RealtimeStudio() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/db/realtime');
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    fetch('/api/db/realtime')
      .then(res => res.json())
      .then(data => {
        if (!isCancelled && data.success && data.events) {
          setEvents(data.events);
        }
      })
      .catch(console.error);

    // Poll every 2 seconds for live changes
    const interval = setInterval(() => {
      fetch('/api/db/realtime')
        .then(res => res.json())
        .then(data => {
          if (!isCancelled && data.success && data.events) {
            setEvents(data.events);
          }
        })
        .catch(console.error);
    }, 2000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleSimulateBroadcast = async () => {
    try {
      const types = ['SQL_TABLE', 'MONGO_COLLECTION', 'AUTH_USER', 'STORAGE'] as const;
      const actions = ['INSERT', 'UPDATE', 'DELETE'] as const;
      const pickedType = types[Math.floor(Math.random() * types.length)];
      const pickedAction = actions[Math.floor(Math.random() * actions.length)];

      await fetch('/api/db/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'emit',
          eventType: pickedAction,
          entityType: pickedType,
          entityName: pickedType === 'SQL_TABLE' ? 'ecommerce_prod.customers' : pickedType === 'MONGO_COLLECTION' ? 'user_profiles' : pickedType === 'AUTH_USER' ? 'auth.users' : 'storage.avatars',
          payload: {
            mutationId: `sim_${Date.now()}`,
            triggeredBy: 'client:websocket_stream',
            data: { status: 'synchronized', latencyMs: (Math.random() * 2 + 0.4).toFixed(2) }
          }
        })
      });
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearEvents = async () => {
    try {
      await fetch('/api/db/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      setEvents([]);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEvents = events.filter(e => {
    if (filterType === 'ALL') return true;
    return e.entityType === filterType;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Header Toolbar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <Radio className="h-4 w-4 text-emerald-400 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">AetherLive Realtime Broadcast Engine</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LIVE BROADCAST ACTIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Listen to instantaneous database inserts, updates, and deletes across SQL tables, Document collections, Auth users, and Storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateBroadcast}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-md text-xs font-bold transition-colors"
          >
            <Send className="h-3 w-3" />
            <span>Simulate Live Event</span>
          </button>

          <button
            onClick={handleClearEvents}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 rounded-md transition-colors"
            title="Clear stream"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-6 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Channels' },
            { id: 'SQL_TABLE', label: '🐘 AetherSQL' },
            { id: 'MONGO_COLLECTION', label: '🍃 AetherDoc' },
            { id: 'AUTH_USER', label: '🛡️ AetherAuth' },
            { id: 'STORAGE', label: '📦 AetherVault' }
          ].map(ch => (
            <button
              key={ch.id}
              onClick={() => setFilterType(ch.id)}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                filterType === ch.id ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
          Buffer: {filteredEvents.length} events
        </span>
      </div>

      {/* Realtime Stream List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
            <Radio className="h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">Listening to WebSocket Broadcasts...</p>
            <p className="text-xs text-zinc-500 mt-1">
              Mutate any row, document, or click &quot;Simulate Live Event&quot; above to watch changes stream live.
            </p>
          </div>
        ) : (
          filteredEvents.map(ev => {
            const isExpanded = expandedId === ev.id;
            return (
              <div
                key={ev.id}
                onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 rounded-xl p-3 cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    {/* Action badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        ev.eventType === 'INSERT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : ev.eventType === 'UPDATE'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {ev.eventType}
                    </span>

                    {/* Entity Type & Name */}
                    <span className="font-mono text-zinc-200 font-semibold truncate">
                      {ev.entityName}
                    </span>

                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-sans hidden md:inline">
                      {ev.entityType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono shrink-0">
                    <span>{ev.timestamp}</span>
                    <span className="text-emerald-400">&lt;1ms</span>
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </div>
                </div>

                {/* Expanded Payload Inspector */}
                {isExpanded && (
                  <div className="pt-2 border-t border-zinc-850 mt-2 font-mono text-xs text-emerald-300 bg-zinc-950 p-3 rounded-lg overflow-x-auto">
                    <pre>{JSON.stringify(ev.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
