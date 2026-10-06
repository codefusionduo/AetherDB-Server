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
  Sparkles,
  Bot,
  KeyRound,
  Table,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface ApiHubProps {
  currentDb: string;
}

export function ApiHub({ currentDb }: ApiHubProps) {
  const [selectedLang, setSelectedLang] = useState<'suku_ai' | 'node' | 'curl' | 'python' | 'aether_sdk' | 'aether_doc' | 'aether_live'>('suku_ai');
  const [copied, setCopied] = useState<string | null>(null);

  // Suku test state
  const [sukuUserMsg, setSukuUserMsg] = useState('AetherDB se Suku AI connect ho gaya!');
  const [sukuAiMsg, setSukuAiMsg] = useState('Haan! Ab aapke saare chats securely AetherDB me save ho rahe hain.');
  const [sukuSessionId, setSukuSessionId] = useState('suku_session_001');
  const [sukuTesting, setSukuTesting] = useState(false);
  const [sukuResponse, setSukuResponse] = useState<any>(null);

  // Interactive Tester state
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/v1/suku/chat');
  const [testMethod, setTestMethod] = useState<'POST' | 'GET'>('POST');
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify({ user_msg: 'Hello Suku!', ai_msg: 'Hello! I am connected to AetherDB.', session_id: 'suku_session_default' }, null, 2)
  );
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const SUKU_API_ENDPOINT = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/suku/chat` : 'https://aetherdb.ryzn.pro/api/v1/suku/chat';
  const SUKU_SQL_ENDPOINT = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/query` : 'https://aetherdb.ryzn.pro/api/v1/query';
  const SUKU_API_KEY = 'aeth_sk_suku_live_9f83ac42e1';
  const SUKU_DB_NAME = 'suku_chat_db';
  const SUKU_TABLE_NAME = 'chat_history';

  const handleSendSukuTest = async () => {
    setSukuTesting(true);
    setSukuResponse(null);
    try {
      const res = await fetch('/api/v1/suku/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUKU_API_KEY}`
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
    suku_ai: `# 🤖 Suku AI Backend Integration (Python)
import requests

AETHER_ENDPOINT = "${SUKU_API_ENDPOINT}"
API_KEY = "${SUKU_API_KEY}"

def save_chat_to_aetherdb(user_msg: str, ai_msg: str, session_id: str = "default_session"):
    """
    Saves user and AI response directly into AetherDB suku_chat_db.chat_history table.
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    payload = {
        "session_id": session_id,
        "user_msg": user_msg,
        "ai_msg": ai_msg
    }
    response = requests.post(AETHER_ENDPOINT, json=payload, headers=headers)
    return response.json()

# Example: Save message after Suku AI responds
res = save_chat_to_aetherdb(
    user_msg="${sukuUserMsg}",
    ai_msg="${sukuAiMsg}",
    session_id="${sukuSessionId}"
)
print("Saved to AetherDB:", res)`,

    node: `// 🤖 Suku AI Integration in Node.js / TypeScript
const AETHER_ENDPOINT = '${SUKU_API_ENDPOINT}';
const API_KEY = '${SUKU_API_KEY}';

async function saveSukuChat(userMsg, aiMsg, sessionId = 'default_session') {
  const response = await fetch(AETHER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify({
      session_id: sessionId,
      user_msg: userMsg,
      ai_msg: aiMsg
    })
  });
  return await response.json();
}

// Example usage:
saveSukuChat('Namaste Suku!', 'Namaste! Kaise madad kar sakta hu?', 'session_101')
  .then(console.log);`,

    curl: `# 🤖 Suku AI Direct cURL Test
curl -X POST "${SUKU_API_ENDPOINT}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${SUKU_API_KEY}" \\
  -d '{
    "session_id": "${sukuSessionId}",
    "user_msg": "${sukuUserMsg}",
    "ai_msg": "${sukuAiMsg}"
  }'`,

    python: `# Python Raw SQL Query Client
import requests

res = requests.post(
    "${SUKU_SQL_ENDPOINT}",
    headers={"Authorization": "Bearer ${SUKU_API_KEY}"},
    json={"database": "suku_chat_db", "sql": "SELECT * FROM chat_history ORDER BY id DESC LIMIT 10"}
)
print("Chat History:", res.json())`,

    aether_sdk: `// Connect to AetherDB using standard REST client
const res = await fetch('${SUKU_API_ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${SUKU_API_KEY}'
  },
  body: JSON.stringify({
    session_id: 'session_001',
    user_msg: 'Hello Suku!',
    ai_msg: 'Hello! How can I help?'
  })
});
const result = await res.json();
console.log(result);`,

    aether_doc: `// Connect to AetherDoc NoSQL Document Store
import { AetherDocClient } from '@aetherdb/doc';

const client = new AetherDocClient('https://aetherdb.ryzn.pro');

async function run() {
  await client.connect();
  const db = client.db('suku_chat_db');
  const collection = db.collection('chat_logs');

  await collection.insertOne({
    session_id: 'suku_session_001',
    user_msg: 'Hello Suku!',
    ai_msg: 'Hello! Stored as JSON document in AetherDB.',
    timestamp: new Date().toISOString()
  });
}
run();`,

    aether_live: `// Connect to AetherLive Stream (Realtime Chat Events)
import { AetherClient } from '@aetherdb/client';

const aether = new AetherClient({
  apiKey: '${SUKU_API_KEY}',
  endpoint: 'https://aetherdb.ryzn.pro'
});

// Listen to incoming chat history inserts in real-time
aether.channel('suku_chat_db:chat_history')
  .on('INSERT', (payload) => {
    console.log('New Suku AI message saved:', payload.new);
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
          'Authorization': `Bearer ${SUKU_API_KEY}`
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
          Connect Suku AI, web applications, microservices, or CLI bots directly to AetherDB.
        </p>
      </div>

      {/* 🤖 FEATURED: Suku AI Integration Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-900/90 border border-purple-500/30 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Suku AI &lt;-&gt; AetherDB Connection Config</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  READY TO CONNECT
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ye 4 parameters use karke aap Suku AI ke code se messages ko directly AetherDB me save aur query kar sakte hain:
              </p>
            </div>
          </div>
        </div>

        {/* The 4 Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. API Endpoint */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1.5 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-purple-400" />
                1. API Endpoint / Connection URL
              </span>
              <button
                onClick={() => copyToClipboard(SUKU_API_ENDPOINT, 'endpoint')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'endpoint' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'endpoint' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-emerald-400 truncate">
              {SUKU_API_ENDPOINT}
            </div>
            <p className="text-[11px] text-zinc-400">
              Suku AI ka backend is URL par POST request bhejkar messages save karega.
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
                onClick={() => copyToClipboard(SUKU_API_KEY, 'key')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'key' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'key' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-amber-300 truncate">
              {SUKU_API_KEY}
            </div>
            <p className="text-[11px] text-zinc-400">
              Header me <code className="text-zinc-300 font-mono">Authorization: Bearer {SUKU_API_KEY}</code> bhejein.
            </p>
          </div>

          {/* 3. Database Name */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1.5 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                3. Database Name (Project ID)
              </span>
              <button
                onClick={() => copyToClipboard(SUKU_DB_NAME, 'dbname')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'dbname' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'dbname' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-cyan-300">
              {SUKU_DB_NAME}
            </div>
            <p className="text-[11px] text-zinc-400">
              AetherDB me Suku AI ke liye dedicated database banaya gaya hai.
            </p>
          </div>

          {/* 4. Table Name */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1.5 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <Table className="h-3.5 w-3.5 text-emerald-400" />
                4. Table Name & Fields
              </span>
              <button
                onClick={() => copyToClipboard(SUKU_TABLE_NAME, 'table')}
                className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded transition-colors"
              >
                {copied === 'table' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied === 'table' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-xs text-emerald-300 flex items-center justify-between">
              <span>{SUKU_TABLE_NAME}</span>
              <span className="text-[10px] text-zinc-400">(user_msg, ai_msg, timestamp)</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Table schema: <code className="text-zinc-300 font-mono">id, session_id, user_msg, ai_msg, timestamp</code>
            </p>
          </div>
        </div>

        {/* Live Test Console for Suku AI */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Live Test: Send a Message from Suku AI to AetherDB</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">POST /api/v1/suku/chat</span>
          </div>

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
              <label className="text-[11px] text-zinc-400 mb-1 block">user_msg (Aapka message):</label>
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

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSendSukuTest}
              disabled={sukuTesting}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Send className={`h-3.5 w-3.5 ${sukuTesting ? 'animate-spin' : ''}`} />
              <span>{sukuTesting ? 'Saving to AetherDB...' : 'Send Test Chat Record'}</span>
            </button>

            {sukuResponse && (
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Saved successfully (Row ID: {sukuResponse?.data?.id || 'OK'})</span>
              </div>
            )}
          </div>

          {sukuResponse && (
            <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-36">
              {JSON.stringify(sukuResponse, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Code Snippets Section */}
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
              onClick={() => setSelectedLang('python')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLang === 'python'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Raw SQL (Python)
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
                <span>Copy Code</span>
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
            placeholder="/api/v1/suku/chat"
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
