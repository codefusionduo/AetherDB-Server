'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
  Search,
  Code2,
  Check,
  X,
  RefreshCw,
  Download,
  Terminal,
  Layers,
  FileJson,
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';
import { MongoCollection, MongoDocument } from '@/lib/db-server/types';
import { safeFetchJson } from '@/lib/utils';

export function MongoStudio() {
  const [collections, setCollections] = useState<{ name: string; documentCount: number; createdAt: string; indexes: string[] }[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>('user_profiles');
  const [documents, setDocuments] = useState<MongoDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mongoFilter, setMongoFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'json'>('cards');

  // Modals
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColName, setNewColName] = useState('');

  const [showInsertModal, setShowInsertModal] = useState(false);
  const [newDocJson, setNewDocJson] = useState('{\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "tags": ["developer", "vip"],\n  "profile": {\n    "plan": "pro",\n    "credits": 250\n  }\n}');
  const [insertError, setInsertError] = useState<string | null>(null);

  // Edit modal
  const [editingDoc, setEditingDoc] = useState<MongoDocument | null>(null);
  const [editJson, setEditJson] = useState('');

  // Initial load
  useEffect(() => {
    let isCancelled = false;
    safeFetchJson('/api/db/mongo').then((data) => {
      if (!isCancelled && data?.success && data.collections) {
        setCollections(data.collections);
        if (data.collections.length > 0 && !activeCollection) {
          setActiveCollection(data.collections[0].name);
        }
      }
    });

    return () => { isCancelled = true; };
  }, [activeCollection]);

  // Load documents when activeCollection or filter changes
  useEffect(() => {
    if (!activeCollection) return;
    let isCancelled = false;

    let url = `/api/db/mongo?collection=${activeCollection}`;
    if (mongoFilter.trim()) {
      try {
        JSON.parse(mongoFilter);
        url += `&filter=${encodeURIComponent(mongoFilter.trim())}`;
      } catch {
        // Not valid JSON filter, ignore
      }
    }

    safeFetchJson(url).then((data) => {
      if (!isCancelled && data?.success) {
        setDocuments(data.documents || []);
      }
    }).finally(() => {
      if (!isCancelled) setLoading(false);
    });

    return () => { isCancelled = true; };
  }, [activeCollection, mongoFilter]);

  const refreshCollections = async () => {
    const data = await safeFetchJson('/api/db/mongo');
    if (data?.success && data.collections) {
      setCollections(data.collections);
    }
  };

  const refreshDocuments = async () => {
    if (!activeCollection) return;
    setLoading(true);
    try {
      const data = await safeFetchJson(`/api/db/mongo?collection=${activeCollection}`);
      if (data?.success) {
        setDocuments(data.documents || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    try {
      const res = await fetch('/api/db/mongo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_collection', name: newColName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateColModal(false);
        setActiveCollection(newColName.trim());
        setNewColName('');
        await refreshCollections();
      } else {
        alert(data.error || 'Failed to create collection');
      }
    } catch (err: any) {
      alert(err.message || 'Request failed');
    }
  };

  const handleDropCollection = async (name: string) => {
    try {
      const res = await fetch(`/api/db/mongo?collection=${name}&drop=true`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await refreshCollections();
        if (activeCollection === name) {
          setActiveCollection(collections.find(c => c.name !== name)?.name || '');
        }
      }
    } catch (err) {
      console.error('Failed to drop collection', err);
    }
  };

  const handleInsertDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setInsertError(null);
    try {
      const parsed = JSON.parse(newDocJson);
      const res = await fetch('/api/db/mongo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          collection: activeCollection,
          document: parsed
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowInsertModal(false);
        await refreshDocuments();
        await refreshCollections();
      } else {
        setInsertError(data.error || 'Insert failed');
      }
    } catch (err: any) {
      setInsertError(`Invalid JSON format: ${err.message}`);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/db/mongo?collection=${activeCollection}&id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await refreshDocuments();
        await refreshCollections();
      }
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    try {
      const parsed = JSON.parse(editJson);
      const res = await fetch('/api/db/mongo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: activeCollection,
          id: editingDoc._id,
          updates: parsed
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingDoc(null);
        await refreshDocuments();
      } else {
        alert(data.error || 'Update failed');
      }
    } catch (err: any) {
      alert(`Invalid JSON format: ${err.message}`);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(documents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeCollection}_documents.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredDocs = documents.filter(doc => {
    if (!searchQuery) return true;
    const str = JSON.stringify(doc).toLowerCase();
    return str.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex h-full bg-zinc-950 overflow-hidden">
      {/* Left Sub-Sidebar: Collections */}
      <div className="w-56 border-r border-zinc-800 bg-zinc-900/60 flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-zinc-200 tracking-wide">AETHERDOC COLLECTIONS</span>
          </div>
          <button
            onClick={() => setShowCreateColModal(true)}
            title="Create collection"
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {collections.map(col => {
            const isActive = activeCollection === col.name;
            return (
              <div
                key={col.name}
                onClick={() => setActiveCollection(col.name)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileJson className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span className="truncate">{col.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 font-sans">
                    {col.documentCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDropCollection(col.name);
                    }}
                    title="Drop collection"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Toolbar */}
        <div className="border-b border-zinc-800 bg-zinc-900/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-sm text-zinc-100">db.{activeCollection}</span>
              <span className="text-[11px] text-zinc-400">
                ({documents.length} JSON documents)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Query */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter fields, values..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-zinc-700 w-44"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === 'cards' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === 'json' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Raw JSON
              </button>
            </div>

            <button
              onClick={refreshDocuments}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {documents.length > 0 && (
              <button
                onClick={exportJson}
                className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
            )}

            <button
              onClick={() => {
                setInsertError(null);
                setShowInsertModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Insert Document</span>
            </button>
          </div>
        </div>

        {/* AetherDoc Document Query Engine */}
        <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono text-zinc-400 shrink-0">doc.{activeCollection}.find(</span>
          <input
            type="text"
            placeholder='{ "profile.plan": "pro" } or { "credits": { "$gt": 100 } }'
            value={mongoFilter}
            onChange={(e) => setMongoFilter(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
          />
          <span className="text-xs font-mono text-zinc-400 shrink-0">)</span>
          {mongoFilter && (
            <button
              onClick={() => setMongoFilter('')}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Documents Grid / View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {documents.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
              <FileJson className="h-10 w-10 text-zinc-700 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">Collection is Empty</p>
              <p className="text-xs text-zinc-500 mt-1">
                Insert your first JSON document into <code className="text-emerald-400 font-mono">{activeCollection}</code>
              </p>
              <button
                onClick={() => setShowInsertModal(true)}
                className="mt-3 text-xs text-emerald-400 hover:underline"
              >
                + Insert JSON Document
              </button>
            </div>
          ) : viewMode === 'json' ? (
            <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/60 font-mono text-xs text-emerald-300 overflow-x-auto">
              <pre>{JSON.stringify(filteredDocs, null, 2)}</pre>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDocs.map(doc => (
                <div
                  key={doc._id}
                  className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 shadow-sm flex flex-col justify-between group transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-amber-400 truncate">
                        <span className="text-[10px] text-zinc-500 font-sans">_id:</span>
                        <span className="truncate">{doc._id}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setEditingDoc(doc);
                            setEditJson(JSON.stringify(doc, null, 2));
                          }}
                          className="text-zinc-400 hover:text-emerald-400 p-1 rounded"
                          title="Edit document"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc._id)}
                          className="text-zinc-400 hover:text-rose-400 p-1 rounded"
                          title="Delete document"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="font-mono text-xs text-zinc-300 max-h-48 overflow-y-auto space-y-1 pr-1">
                      {Object.keys(doc).map(k => {
                        if (k === '_id' || k === '_createdAt' || k === '_updatedAt') return null;
                        const val = doc[k];
                        return (
                          <div key={k} className="flex items-start gap-2">
                            <span className="text-zinc-400 text-[11px] shrink-0 font-medium">{k}:</span>
                            <span className="text-zinc-200 truncate">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-850/60 flex items-center justify-between text-[10px] text-zinc-500 font-sans">
                    <span>{doc._createdAt ? new Date(doc._createdAt).toLocaleDateString() : 'Active'}</span>
                    <span className="font-mono">{Object.keys(doc).length} fields</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateColModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Create AetherDoc Collection</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Collections in AetherDoc are schema-less containers for flexible JSON documents.
            </p>

            <form onSubmit={handleCreateCollection} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. notifications, user_sessions"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateColModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Insert Document Modal */}
      {showInsertModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Insert Document into <code className="text-emerald-400 font-mono">db.{activeCollection}</code>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Enter any flexible JSON structure.</p>
              </div>
              <button
                onClick={() => setShowInsertModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {insertError && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-xs font-mono">
                {insertError}
              </div>
            )}

            <form onSubmit={handleInsertDocument} className="flex-1 flex flex-col space-y-3">
              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                  <span>Document JSON Payload</span>
                  <span className="text-[10px] text-zinc-500">Auto generates _id if omitted</span>
                </label>
                <textarea
                  value={newDocJson}
                  onChange={(e) => setNewDocJson(e.target.value)}
                  rows={9}
                  className="w-full flex-1 bg-zinc-950 border border-zinc-800 rounded-md p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-zinc-850 flex justify-end gap-2">
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
                  Insert Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Edit Document <code className="text-amber-400 font-mono">{editingDoc._id}</code>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Modify fields and press save.</p>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col space-y-3">
              <textarea
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                rows={10}
                className="w-full flex-1 bg-zinc-950 border border-zinc-800 rounded-md p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
              />

              <div className="pt-2 border-t border-zinc-850 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
