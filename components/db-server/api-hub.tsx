'use client';

import React, { useState, useEffect } from 'react';
import {
  Code2,
  Copy,
  Check,
  Send,
  Terminal,
  Globe,
  Database,
  ArrowRight,
  Sparkles,
  Bot,
  KeyRound,
  Table,
  Layers,
  CheckCircle2,
  Info,
  SlidersHorizontal
} from 'lucide-react';

import { DatabaseUser, isSuperAdmin } from '@/lib/db-server/types';

interface ApiHubProps {
  currentDb: string;
  databases?: string[];
  tables?: { name: string; rowCount: number }[];
  onSelectDb?: (db: string) => void;
  currentUserEmail?: string;
  databaseOwners?: Record<string, string>;
}

export function ApiHub({
  currentDb,
  databases = ['suku_chat_db', 'aetherdb', 'main_db'],
  tables = [],
  onSelectDb,
  currentUserEmail = 'yabhi9435@gmail.com',
  databaseOwners = {}
}: ApiHubProps) {
  const [selectedLang, setSelectedLang] = useState<'python' | 'node' | 'curl' | 'suku_ai' | 'aether_sdk' | 'aether_doc' | 'aether_live'>('suku_ai');
  const [copied, setCopied] = useState<string | null>(null);

  const isSuper = isSuperAdmin(currentUserEmail);

  // Filter databases: Super Admins see all, regular users only see their own created databases or public defaults
  const userDatabases = isSuper
    ? databases
    : databases.filter(db => {
        const owner = databaseOwners[db];
        return !owner || owner === currentUserEmail || owner === 'system' || db === 'main_db';
      });

  // Selected table inside current database
  const availableTables = tables && tables.length > 0 ? tables.map(t => t.name) : (currentDb === 'suku_chat_db' ? ['chat_history'] : ['users']);
  const [selectedTable, setSelectedTable] = useState<string>(availableTables[0] || 'chat_history');

  useEffect(() => {
    if (availableTables.length > 0 && !availableTables.includes(selectedTable)) {
      setSelectedTable(availableTables[0]);
    }
  }, [currentDb, availableTables, selectedTable]);

  // Suku test state
  const [sukuUserMsg, setSukuUserMsg] = useState('AetherDB se Suku AI connect ho gaya!');
  const [sukuAiMsg, setSukuAiMsg] = useState('Haan! Ab aapke saare chats securely AetherDB me save ho rahe hain.');
  const [sukuSessionId, setSukuSessionId] = useState('suku_session_001');
  const [sukuTesting, setSukuTesting] = useState(false);
  const [sukuResponse, setSukuResponse] = useState<any>(null);

  // Interactive Tester state
  const isSukuDb = currentDb === 'suku_chat_db';
  const defaultEndpoint = isSukuDb ? '/api/v1/suku/chat' : '/api/v1/query';
  const [testEndpoint, setTestEndpoint] = useState<string>(defaultEndpoint);
  const [testMethod, setTestMethod] = useState<'POST' | 'GET'>('POST');
  const [testPayload, setTestPayload] = useState<string>(
    isSukuDb
      ? JSON.stringify({ user_msg: 'Hello Suku!', ai_msg: 'Hello! I am connected to AetherDB.', session_id: 'suku_session_default' }, null, 2)
      : JSON.stringify({ database: currentDb, sql: `SELECT * FROM ${selectedTable} LIMIT 10;` }, null, 2)
  );
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const ep = currentDb === 'suku_chat_db' ? '/api/v1/suku/chat' : '/api/v1/query';
    setTestEndpoint(ep);
    if (currentDb === 'suku_chat_db') {
      setTestPayload(JSON.stringify({ user_msg: 'Hello Suku!', ai_msg: 'Hello! I am connected to AetherDB.', session_id: 'suku_session_default' }, null, 2));
    } else {
      setTestPayload(JSON.stringify({ database: currentDb, sql: `SELECT * FROM ${selectedTable} LIMIT 10;` }, null, 2));
    }
  }, [currentDb, selectedTable]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aetherdb.ryzn.pro';
  const API_ENDPOINT = isSukuDb ? `${originUrl}/api/v1/suku/chat` : `${originUrl}/api/v1/query`;
  const SQL_ENDPOINT = `${originUrl}/api/v1/query`;
  const API_KEY = 'aeth_sk_suku_live_9f83ac42e1';

  const handleSendSukuTest = async () => {
    setSukuTesting(true);
    setSukuResponse(null);
    try {
      const res = await fetch('/api/v1/suku/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          session_id: sukuSessionId,
          user_msg: sukuUserMsg,
          ai_msg: sukuAiMsg
        })
      });
      const data = await res.json();
      setSukuResponse(data);
    } catch (err: any) {
      setSukuResponse({ error: err.message || 'Connection failed' });
    } finally {
      setSukuTesting(false);
    }
  };

  const codeSnippets: Record<string, string> = {
    suku_ai: `# 🤖 Suku AI Integration for Database: "${currentDb}"
import requests

AETHER_ENDPOINT = "${API_ENDPOINT}"
API_KEY = "${API_KEY}"
DATABASE_NAME = "${currentDb}"
TABLE_NAME = "${selectedTable}"

def save_chat_to_aetherdb(user_msg: str, ai_msg: str, session_id: str = "default_session"):
    """
    Saves message directly into AetherDB (${currentDb}.${selectedTable})
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    payload = {
        "database": DATABASE_NAME,
        "table": TABLE_NAME,
        "session_id": session_id,
        "user_msg": user_msg,
        "ai_msg": ai_msg
    }
    response = requests.post(AETHER_ENDPOINT, json=payload, headers=headers)
    return response.json()

# Example: Save Suku AI response
result = save_chat_to_aetherdb(
    user_msg="${sukuUserMsg}",
    ai_msg="${sukuAiMsg}",
    session_id="${sukuSessionId}"
)
print("Saved to ${currentDb}:", result)`,

    python: `# 🐍 Python Generic SQL Query Client for Database: "${currentDb}"
import requests

AETHER_URL = "${SQL_ENDPOINT}"
API_KEY = "${API_KEY}"

def run_query(sql_query: str):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    payload = {
        "database": "${currentDb}",
        "sql": sql_query
    }
    response = requests.post(AETHER_URL, json=payload, headers=headers)
    return response.json()

# Query '${selectedTable}' in '${currentDb}'
data = run_query("SELECT * FROM ${selectedTable} LIMIT 10")
print("Rows returned:", data.get("rows", []))`,

    node: `// ⚡ Node.js / TypeScript Client for Database: "${currentDb}"
const AETHER_ENDPOINT = '${API_ENDPOINT}';
const API_KEY = '${API_KEY}';

async function executeDatabaseRequest() {
  const response = await fetch(AETHER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify({
      database: '${currentDb}',
      table: '${selectedTable}',
      sql: 'SELECT * FROM ${selectedTable} LIMIT 10'
    })
  });
  const data = await response.json();
  console.log('Result from ${currentDb}:', data);
}

executeDatabaseRequest();`,

    curl: `# 🌐 cURL Request for Database: "${currentDb}"
curl -X POST "${API_ENDPOINT}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${API_KEY}" \\
  -d '{
    "database": "${currentDb}",
    "table": "${selectedTable}",
    "sql": "SELECT * FROM ${selectedTable} LIMIT 10;"
  }'`,

    aether_sdk: `// 🚀 Aether SDK Client for Database: "${currentDb}"
import { createClient } from '@aetherdb/client';

const aether = createClient('${originUrl}/api/db', '${API_KEY}');

// Query '${selectedTable}' from database '${currentDb}'
const { data, error } = await aether
  .from('${selectedTable}')
  .select('*')
  .limit(10);

console.log('Data:', data);`,

    aether_doc: `// 📄 AetherDoc NoSQL Collection for Database: "${currentDb}"
import { AetherDocClient } from '@aetherdb/doc';

const client = new AetherDocClient('${originUrl}');

async function run() {
  await client.connect();
  const db = client.db('${currentDb}');
  const collection = db.collection('${selectedTable}');

  // Insert or Query JSON document in '${currentDb}'
  const results = await collection.find({}).limit(10).toArray();
  console.log('Documents in ${currentDb}.${selectedTable}:', results);
}
run();`,

    aether_live: `// 📡 AetherLive Realtime Channel for Database: "${currentDb}"
import { AetherClient } from '@aetherdb/client';

const aether = new AetherClient({
  apiKey: '${API_KEY}',
  endpoint: '${originUrl}'
});

// Listen to changes in ${currentDb}:${selectedTable} in real-time
aether.channel('${currentDb}:${selectedTable}')
  .on('INSERT', (payload) => {
    console.log('Live insert in ${currentDb}.${selectedTable}:', payload.new);
  })
  .subscribe();`
  };

  const handleSendTestRequest = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      const options: RequestInit = {
        method: testMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      };

      if (testMethod === 'POST' && testPayload.trim()) {
        options.body = testPayload;
      }

      const res = await fetch(testEndpoint, options);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setTestResponse(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setTestResponse(text || `HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err?.message || 'Request failed' }, null, 2));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
          <Code2 className="h-4 w-4 text-emerald-400" />
          <span>Client Connection & REST API Hub</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Connect Suku AI, Python backend, Node.js microservices, or CLI bots dynamically to any database.
        </p>
      </div>

      {/* 🤖 DYNAMIC INTEGRATION CONFIG BOX (Updates for EVERY Database) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-900/90 border border-purple-500/30 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Database Connection Parameters & Credentials</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  LIVE DYNAMIC CONFIG
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ye 4 parameters har database ke liye dynamically update hote hain:
              </p>
            </div>
          </div>

          {/* Database & Table Live Switcher Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1.5 px-2 text-xs text-zinc-400">
              <SlidersHorizontal className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[11px] font-medium text-zinc-300">Your Databases:</span>
            </div>
            <select
              value={currentDb}
              onChange={(e) => onSelectDb && onSelectDb(e.target.value)}
              className="bg-zinc-900 border border-purple-500/40 hover:border-purple-400 text-purple-200 font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              {userDatabases.map((db) => {
                const owner = databaseOwners[db];
                const isOwner = owner === currentUserEmail;
                return (
                  <option key={db} value={db}>
                    📁 {db} {db === 'suku_chat_db' ? '(Suku AI)' : isOwner ? '(Created by You)' : isSuper && owner ? `(${owner})` : ''}
                  </option>
                );
              })}
            </select>

            <span className="text-zinc-600">/</span>

            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-zinc-200 font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              {availableTables.map((t) => (
                <option key={t} value={t}>
                  📊 {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Database Notice Info & Privacy Protection */}
        <div className="px-3.5 py-2 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200/90 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-semibold text-white">🔒 Private Creator Isolation: </span>
            <span>
              Ye database aur iska data sirf iske creator (<strong>{databaseOwners[currentDb] || (currentDb === 'suku_chat_db' ? 'Suku AI' : currentUserEmail)}</strong>) aur Super Admins ko hi dikhta hai. Kisi bhi unauthorized user ko doosre users ka database show nahi hoga.
            </span>
          </div>
        </div>

        {/* The 4 Credentials Grid (Dynamically updated for currentDb & selectedTable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. API Endpoint */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1.5 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-purple-400" />
                1. API Endpoint / Connection URL
              </span>
              <button
                onClick={() => copyToClipboard(API_ENDPOINT, 'endpoint')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'endpoint' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'endpoint' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-emerald-400 truncate">
              {API_ENDPOINT}
            </div>
            <p className="text-[11px] text-zinc-400">
              {isSukuDb ? 'Suku AI Chat REST endpoint' : `Generic SQL / REST query endpoint for database "${currentDb}"`}
            </p>
          </div>

          {/* 2. API Key */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1.5 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                2. API Key / Access Token
              </span>
              <button
                onClick={() => copyToClipboard(API_KEY, 'key')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'key' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'key' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-amber-300 truncate">
              {API_KEY}
            </div>
            <p className="text-[11px] text-zinc-400">
              Header me <code className="text-zinc-300 font-mono">Authorization: Bearer {API_KEY}</code> bhejein.
            </p>
          </div>

          {/* 3. Database Name (Project ID) */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1.5 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                3. Database Name (Project ID)
              </span>
              <button
                onClick={() => copyToClipboard(currentDb, 'dbname')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'dbname' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'dbname' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-cyan-300 flex items-center justify-between">
              <span>{currentDb}</span>
              <span className="text-[10px] text-cyan-400/80 font-sans">Active Target</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Har database ka apna unique naam hota hai jise aap request me pass karte hain.
            </p>
          </div>

          {/* 4. Table Name */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1.5 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <Table className="h-3.5 w-3.5 text-emerald-400" />
                4. Table / Collection Name
              </span>
              <button
                onClick={() => copyToClipboard(selectedTable, 'table')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'table' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'table' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-emerald-300 flex items-center justify-between">
              <span>{selectedTable}</span>
              <span className="text-[10px] text-zinc-400 font-sans">({currentDb}.{selectedTable})</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {isSukuDb ? 'Fields: id, session_id, user_msg, ai_msg, timestamp' : `Selected table in database "${currentDb}"`}
            </p>
          </div>
        </div>

        {/* Live Test Console */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Live Test: Send a Message / Query to Database &quot;{currentDb}&quot;</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Target: {currentDb}.{selectedTable}</span>
          </div>

          {isSukuDb ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Session ID:</label>
                <input
                  type="text"
                  value={sukuSessionId}
                  onChange={(e) => setSukuSessionId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">user_msg (User ka message):</label>
                <input
                  type="text"
                  value={sukuUserMsg}
                  onChange={(e) => setSukuUserMsg(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">ai_msg (Suku ka reply):</label>
                <input
                  type="text"
                  value={sukuAiMsg}
                  onChange={(e) => setSukuAiMsg(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">SQL Query for {currentDb}:</label>
              <input
                type="text"
                value={`SELECT * FROM ${selectedTable} LIMIT 10`}
                readOnly
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={isSukuDb ? handleSendSukuTest : handleSendTestRequest}
              disabled={sukuTesting || testing}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Send className={`h-3.5 w-3.5 ${sukuTesting || testing ? 'animate-spin' : ''}`} />
              <span>{sukuTesting || testing ? 'Executing...' : `Execute Request on ${currentDb}`}</span>
            </button>

            {sukuResponse && (
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Saved successfully in {currentDb}.{selectedTable}!</span>
              </div>
            )}
          </div>

          {(sukuResponse || testResponse) && (
            <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-36">
              {JSON.stringify(sukuResponse || JSON.parse(testResponse || '{}'), null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Code Snippets Section (Dynamic for currentDb & selectedTable) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedLang('suku_ai')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'suku_ai'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🤖 Suku AI (Python)
            </button>
            <button
              onClick={() => setSelectedLang('python')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'python'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Python Client
            </button>
            <button
              onClick={() => setSelectedLang('node')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'node'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Node.js / JS
            </button>
            <button
              onClick={() => setSelectedLang('curl')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'curl'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              cURL Request
            </button>
            <button
              onClick={() => setSelectedLang('aether_sdk')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'aether_sdk'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              REST Client
            </button>
            <button
              onClick={() => setSelectedLang('aether_doc')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'aether_doc'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              AetherDoc NoSQL
            </button>
            <button
              onClick={() => setSelectedLang('aether_live')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'aether_live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Realtime Stream
            </button>
          </div>

          <button
            onClick={() => copyToClipboard(codeSnippets[selectedLang], 'snippet')}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-xs border border-zinc-800 transition-colors"
          >
            {copied === 'snippet' ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Code ({currentDb})</span>
              </>
            )}
          </button>
        </div>

        {/* Code View */}
        <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-x-auto">
          <pre className="font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre">
            {codeSnippets[selectedLang]}
          </pre>
        </div>
      </div>

      {/* Generic API Tester */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4">
        <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <span>Interactive REST API Sandbox</span>
        </h3>

        <div className="flex gap-2">
          <select
            value={testMethod}
            onChange={(e) => setTestMethod(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>

          <input
            type="text"
            value={testEndpoint}
            onChange={(e) => setTestEndpoint(e.target.value)}
            placeholder="/api/v1/query"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={handleSendTestRequest}
            disabled={testing}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{testing ? 'Sending...' : 'Execute'}</span>
          </button>
        </div>

        {testMethod === 'POST' && (
          <div>
            <label className="text-[11px] text-zinc-400 mb-1 block">Request JSON Body:</label>
            <textarea
              rows={3}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            />
          </div>
        )}

        {testResponse && (
          <div>
            <label className="text-[11px] text-zinc-400 mb-1 block">Server Response:</label>
            <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-emerald-400 overflow-x-auto max-h-48">
              {testResponse}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
