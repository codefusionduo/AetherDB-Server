'use client';

import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Send,
  Terminal,
  Globe,
  Database,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ApiHubProps {
  currentDb: string;
}

export function ApiHub({ currentDb }: ApiHubProps) {
  const [selectedLang, setSelectedLang] = useState<'aether_sdk' | 'aether_doc' | 'aether_live' | 'curl' | 'node' | 'python'>('aether_sdk');
  const [copied, setCopied] = useState<string | null>(null);

  // Interactive Tester state
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/db/query');
  const [testMethod, setTestMethod] = useState<'POST' | 'GET'>('POST');
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify({ sql: `SELECT * FROM users LIMIT 10;`, database: currentDb }, null, 2)
  );
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const pgConnStr = `postgresql://admin:aeth_secret@localhost:5432/${currentDb}?sslmode=disable`;

  const codeSnippets: Record<string, string> = {
    aether_sdk: `// Connect to AetherDB using @aetherdb/client or standard REST client
import { createClient } from '@aetherdb/client';

const aether = createClient('http://localhost:3000/api/db', 'aeth_sk_live_99f2e301b4c91a');

// 1. Query rows with filtering
const { data: users, error } = await aether
  .from('users')
  .select('id, name, email, role');

// 2. Insert new row
const { data, error: insertErr } = await aether
  .from('users')
  .insert([{ name: 'Alex Rivera', email: 'alex@example.com', role: 'developer' }]);

// 3. User Authentication
const { data: authData, error: authErr } = await aether.auth.signUp({
  email: 'newuser@example.com',
  password: 'SecurePassword123'
});`,

    aether_doc: `// Connect to AetherDoc NoSQL Document Store using AetherDoc SDK
import { AetherDocClient } from '@aetherdb/doc';

const client = new AetherDocClient('http://localhost:3000');

async function run() {
  await client.connect();
  const db = client.db('${currentDb}');
  const collection = db.collection('user_profiles');

  // 1. Insert flexible JSON document
  await collection.insertOne({
    username: 'developer_42',
    tier: 'pro',
    preferences: { theme: 'dark', notifications: true },
    tags: ['ai', 'fullstack']
  });

  // 2. Find documents matching criteria
  const results = await collection.find({ tier: 'pro' }).toArray();
  console.log('AetherDoc Documents:', results);
}
run();`,

    aether_live: `// Connect to AetherAuth & AetherLive Subscriptions
import { AetherClient } from '@aetherdb/client';

const aether = new AetherClient({
  apiKey: 'aeth_sk_live_99f2e301b4c91a',
  endpoint: 'http://localhost:3000',
  storageBucket: 'avatars'
});

// 1. Sign in user with AetherAuth
const session = await aether.auth.signInWithPassword('admin@aetherdb.local', 'password');
console.log('User UID:', session.user.id);

// 2. Listen to AetherLive Stream (Realtime Subscriptions)
const eventSource = new EventSource('http://localhost:3000/api/db/realtime');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Realtime change detected:', data.eventType, data.entityName);
};`,

    curl: `# 1. AetherSQL REST Query
curl -X POST "http://localhost:3000/api/db/query" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer aeth_sk_live_99f2e301b4c91a" \\
  -d '{
    "database": "${currentDb}",
    "sql": "SELECT * FROM customers LIMIT 5;"
  }'

# 2. AetherDoc JSON Document Insert
curl -X POST "http://localhost:3000/api/db/mongo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "insert",
    "collection": "user_profiles",
    "document": { "name": "Sarah", "status": "active" }
  }'

# 3. AetherAuth User Creation
curl -X POST "http://localhost:3000/api/db/auth" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "create_user",
    "email": "sarah@acme.com",
    "role": "authenticated"
  }'`,

    node: `// Direct Node.js fetch for any Database or Collection
const response = await fetch('http://localhost:3000/api/db/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    database: '${currentDb}',
    sql: 'SELECT * FROM users ORDER BY id DESC'
  })
});
const data = await response.json();
console.log(data.rows);`,

    python: `# Python Client: Connect to AetherDB via Requests
import requests

# 1. Query AetherSQL Relational Database
res = requests.post(
    "http://localhost:3000/api/db/query",
    json={"database": "${currentDb}", "sql": "SELECT * FROM users"}
)
print("SQL Rows:", res.json()["rows"])

# 2. Query AetherDoc JSON Collections
doc_res = requests.get("http://localhost:3000/api/db/mongo?collection=user_profiles")
print("AetherDoc Documents:", doc_res.json()["documents"])`
  };

  const handleSendTestRequest = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      const options: RequestInit = {
        method: testMethod,
        headers: { 'Content-Type': 'application/json' }
      };

      if (testMethod === 'POST' && testPayload.trim()) {
        options.body = testPayload;
      }

      const res = await fetch(testEndpoint, options);
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
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
          Connect your web applications, backends, microservices, or CLI tools directly to this database server.
        </p>
      </div>

      {/* Connection Parameters Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PostgreSQL Wire Protocol */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Native PostgreSQL Protocol (Port 5432)</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">v14 / v15 Compatible</span>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-between font-mono text-xs text-zinc-200">
            <span className="truncate mr-2">{pgConnStr}</span>
            <button
              onClick={() => copyToClipboard(pgConnStr, 'pg')}
              className="p-1 text-zinc-400 hover:text-zinc-100 shrink-0"
            >
              {copied === 'pg' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <div>Host: <span className="font-mono text-zinc-200">localhost</span></div>
            <div>Port: <span className="font-mono text-zinc-200">5432</span></div>
            <div>User: <span className="font-mono text-zinc-200">admin</span></div>
            <div>Database: <span className="font-mono text-zinc-200">{currentDb}</span></div>
          </div>
        </div>

        {/* HTTP REST Endpoints */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
              <span>HTTP / REST Server API (Port 3000)</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">JSON Endpoints</span>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-between font-mono text-xs text-zinc-200">
            <span>http://localhost:3000/api/db/query</span>
            <button
              onClick={() => copyToClipboard('http://localhost:3000/api/db/query', 'rest')}
              className="p-1 text-zinc-400 hover:text-zinc-100 shrink-0"
            >
              {copied === 'rest' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="text-xs text-zinc-400 space-y-1">
            <div><code className="text-zinc-200">POST /api/db/query</code> - Execute raw SQL query</div>
            <div><code className="text-zinc-200">GET  /api/db/data</code> - Query table rows with filters</div>
            <div><code className="text-zinc-200">GET  /api/db/metrics</code> - Health & telemetry</div>
          </div>
        </div>
      </div>

      {/* Code Snippets Accordion / Tabs */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
        <div className="bg-zinc-850 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto">
            {([
              { id: 'aether_sdk' as const, label: '⚡ AetherDB Client' },
              { id: 'aether_doc' as const, label: '🍃 AetherDoc Driver' },
              { id: 'aether_live' as const, label: '🛡️ AetherAuth & Live' },
              { id: 'curl' as const, label: 'cURL' },
              { id: 'node' as const, label: 'Node.js' },
              { id: 'python' as const, label: 'Python' }
            ]).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedLang(item.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedLang === item.id ? 'bg-zinc-900 text-white border border-zinc-750' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => copyToClipboard(codeSnippets[selectedLang], 'snippet')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded border border-zinc-800 transition-colors"
          >
            {copied === 'snippet' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>Copy Code</span>
          </button>
        </div>

        <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto">
          <pre>{codeSnippets[selectedLang]}</pre>
        </div>
      </div>

      {/* Live Interactive API Tester */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
        <div className="bg-zinc-850 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-emerald-400" />
              <span>Interactive Server API Tester</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Send direct HTTP requests to the database server endpoints in real-time.
            </p>
          </div>

          <button
            onClick={handleSendTestRequest}
            disabled={testing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Sending...' : 'Send Request'}</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Method and Endpoint */}
          <div className="flex items-center gap-2">
            <select
              value={testMethod}
              onChange={(e) => setTestMethod(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-mono text-emerald-400 font-bold focus:outline-none"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>

            <select
              value={testEndpoint}
              onChange={(e) => {
                const ep = e.target.value;
                setTestEndpoint(ep);
                if (ep === '/api/db/query') {
                  setTestMethod('POST');
                  setTestPayload(JSON.stringify({ sql: `SELECT * FROM customers LIMIT 3;`, database: currentDb }, null, 2));
                } else if (ep === '/api/db/databases') {
                  setTestMethod('GET');
                  setTestPayload('');
                } else if (ep === '/api/db/metrics') {
                  setTestMethod('GET');
                  setTestPayload('');
                } else if (ep.includes('/api/db/data')) {
                  setTestMethod('GET');
                  setTestPayload('');
                }
              }}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none"
            >
              <option value="/api/db/query">/api/db/query (Execute SQL Query)</option>
              <option value="/api/db/databases">/api/db/databases (List All Databases)</option>
              <option value="/api/db/metrics">/api/db/metrics (Server Health & Telemetry)</option>
              <option value={`/api/db/data?database=${currentDb}&table=customers&limit=5`}>
                {`/api/db/data?database=${currentDb}&table=customers&limit=5`} (Query Rows)
              </option>
            </select>
          </div>

          {/* Request Payload */}
          {testMethod === 'POST' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Request Body (JSON)</label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Response Inspector */}
          {testResponse && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-semibold text-emerald-400">Response (200 OK)</span>
                <button
                  onClick={() => copyToClipboard(testResponse, 'resp')}
                  className="hover:text-zinc-200"
                >
                  {copied === 'resp' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-md font-mono text-xs text-zinc-300 max-h-60 overflow-y-auto">
                {testResponse}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
