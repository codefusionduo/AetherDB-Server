'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderPlus,
  Upload,
  File,
  FileImage,
  FileText,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  Plus,
  X,
  Globe,
  Lock
} from 'lucide-react';
import { StorageBucket, StorageFile } from '@/lib/db-server/types';
import { safeFetchJson } from '@/lib/utils';

export function StorageStudio() {
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [activeBucket, setActiveBucket] = useState<string>('bkt_avatars');
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateBucketModal, setShowCreateBucketModal] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketPublic, setNewBucketPublic] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileMime, setNewFileMime] = useState('image/png');
  const [newFileSizeKb, setNewFileSizeKb] = useState(128);

  const fetchBuckets = async () => {
    const data = await safeFetchJson('/api/db/storage');
    if (data?.success && data.buckets) {
      setBuckets(data.buckets);
      if (data.buckets.length > 0 && !activeBucket) {
        setActiveBucket(data.buckets[0].id);
      }
    }
  };

  const fetchFiles = async (bucketId: string) => {
    if (!bucketId) return;
    setLoading(true);
    try {
      const data = await safeFetchJson(`/api/db/storage?bucket=${bucketId}`);
      if (data?.success) {
        setFiles(data.files || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    safeFetchJson('/api/db/storage').then((data) => {
      if (!isCancelled && data?.success && data.buckets) {
        setBuckets(data.buckets);
        if (data.buckets.length > 0 && !activeBucket) {
          setActiveBucket(data.buckets[0].id);
        }
      }
    });

    return () => { isCancelled = true; };
  }, [activeBucket]);

  useEffect(() => {
    if (!activeBucket) return;
    let isCancelled = false;
    safeFetchJson(`/api/db/storage?bucket=${activeBucket}`).then((data) => {
      if (!isCancelled && data?.success) {
        setFiles(data.files || []);
      }
    });

    return () => { isCancelled = true; };
  }, [activeBucket]);

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    try {
      const res = await fetch('/api/db/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_bucket',
          name: newBucketName.trim(),
          isPublic: newBucketPublic
        })
      });
      const data = await res.json();
      if (data.success && data.bucket) {
        setShowCreateBucketModal(false);
        setNewBucketName('');
        setActiveBucket(data.bucket.id);
        await fetchBuckets();
      }
    } catch (err) {
      alert('Failed to create bucket');
    }
  };

  const handleDeleteBucket = async (id: string) => {
    try {
      await fetch(`/api/db/storage?bucket=${id}`, { method: 'DELETE' });
      await fetchBuckets();
      const remaining = buckets.filter(b => b.id !== id);
      if (remaining.length > 0) {
        setActiveBucket(remaining[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      const res = await fetch('/api/db/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_file',
          bucketId: activeBucket,
          name: newFileName.trim(),
          sizeBytes: newFileSizeKb * 1024,
          mimeType: newFileMime
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        setNewFileName('');
        fetchFiles(activeBucket);
        fetchBuckets();
      }
    } catch (err) {
      alert('Failed to upload file');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fetch(`/api/db/storage?bucket=${activeBucket}&fileId=${fileId}`, { method: 'DELETE' });
      fetchFiles(activeBucket);
      fetchBuckets();
    } catch (err) {
      console.error(err);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const activeBucketObj = buckets.find(b => b.id === activeBucket);

  const filteredFiles = files.filter(f => {
    if (!search) return true;
    return f.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex-1 flex h-full bg-zinc-950 overflow-hidden">
      {/* Left Sub-Sidebar: Buckets */}
      <div className="w-56 border-r border-zinc-800 bg-zinc-900/60 flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-semibold text-zinc-200 tracking-wide">AETHERVAULT BUCKETS</span>
          </div>
          <button
            onClick={() => setShowCreateBucketModal(true)}
            title="Create bucket"
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 rounded transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {buckets.map(bkt => {
            const isActive = activeBucket === bkt.id;
            return (
              <div
                key={bkt.id}
                onClick={() => setActiveBucket(bkt.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-cyan-600/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {bkt.isPublic ? (
                    <Globe className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  )}
                  <span className="truncate">{bkt.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 font-sans">
                    {bkt.fileCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBucket(bkt.id);
                    }}
                    title="Delete bucket"
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
        {/* Top Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/40 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-sm text-zinc-100">{activeBucketObj?.name || 'bucket'}</span>
              <span className="text-[11px] text-zinc-400">
                ({files.length} files · {activeBucketObj?.isPublic ? 'Public CDN' : 'Private Access'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-zinc-700 w-44"
              />
            </div>

            <button
              onClick={() => fetchFiles(activeBucket)}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload File</span>
            </button>
          </div>
        </div>

        {/* Files Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {files.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
              <HardDrive className="h-10 w-10 text-zinc-700 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">Bucket is Empty</p>
              <p className="text-xs text-zinc-500 mt-1">
                Upload files, images, or assets to this storage bucket.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-3 text-xs text-cyan-400 hover:underline"
              >
                + Upload your first file
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map(file => {
                const isImg = file.mimeType.startsWith('image/');
                return (
                  <div
                    key={file.id}
                    className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between group transition-colors"
                  >
                    {/* Preview Area */}
                    <div className="h-28 bg-zinc-950 flex items-center justify-center p-3 relative border-b border-zinc-850">
                      {isImg ? (
                        <FileImage className="h-10 w-10 text-cyan-400/80" />
                      ) : (
                        <FileText className="h-10 w-10 text-zinc-500" />
                      )}
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-zinc-400">
                        {(file.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="p-3 space-y-2">
                      <div className="font-mono text-xs font-semibold text-zinc-200 truncate" title={file.name}>
                        {file.name}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{file.mimeType}</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="pt-2 border-t border-zinc-850 flex items-center justify-between gap-2">
                        <button
                          onClick={() => copyUrl(file.url)}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-sans"
                        >
                          {copiedUrl === file.url ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedUrl === file.url ? 'Copied' : 'Copy URL'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Bucket Modal */}
      {showCreateBucketModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Create AetherVault Bucket</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Object containers for files, assets, media, and CDN distribution.
            </p>

            <form onSubmit={handleCreateBucket} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Bucket Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user_uploads, receipts"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publicToggle"
                  checked={newBucketPublic}
                  onChange={(e) => setNewBucketPublic(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-cyan-500"
                />
                <label htmlFor="publicToggle" className="text-zinc-300 font-medium cursor-pointer">
                  Public Bucket (Anyone can read files via CDN URL)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateBucketModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-semibold"
                >
                  Create Bucket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              Upload File to <code className="text-cyan-400 font-mono">{activeBucketObj?.name}</code>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Simulate file and image uploads.</p>

            <form onSubmit={handleUploadFile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hero_banner.png, resume.pdf"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">MIME Content Type</label>
                <select
                  value={newFileMime}
                  onChange={(e) => setNewFileMime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="image/png">image/png</option>
                  <option value="image/jpeg">image/jpeg</option>
                  <option value="image/webp">image/webp</option>
                  <option value="application/pdf">application/pdf</option>
                  <option value="application/json">application/json</option>
                  <option value="text/csv">text/csv</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Simulated Size (KB)</label>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={newFileSizeKb}
                  onChange={(e) => setNewFileSizeKb(parseInt(e.target.value, 10) || 10)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-semibold"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
