'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Settings,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Code2,
  Server,
  Zap,
  Sparkles,
  Search
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils';

export function EmailStudio() {
  const [activeTab, setActiveTab] = useState<'outbox' | 'templates' | 'smtp'>('outbox');
  const [outbox, setOutbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testSubject, setTestSubject] = useState('🔒 Activate Your AetherDB Account - Magic Login Link');
  const [testSentSuccess, setTestSentSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // SMTP & Resend Settings
  const [resendApiKey, setResendApiKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [senderEmail, setSenderEmail] = useState('auth@aetherdb.ryzn.pro');
  const [senderName, setSenderName] = useState('AetherDB Auth Dispatcher');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Template state
  const [htmlTemplate, setHtmlTemplate] = useState(`<div style="font-family: Arial, sans-serif; padding: 24px; background: #09090b; color: #f4f4f5; border-radius: 12px; max-width: 480px;">
  <h2 style="color: #10b981; margin-top: 0;">AetherDB Account Activation</h2>
  <p style="font-size: 14px; color: #d4d4d8; line-height: 1.5;">Click the secure link below to verify your email and complete account login:</p>
  <div style="margin: 20px 0;">
    <a href="{{activation_url}}" target="_self" style="background: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">🚀 Activate Account & Log In</a>
  </div>
  <p style="font-size: 12px; color: #71717a; margin-top: 20px;">Or copy and paste this URL into your browser:<br/><span style="color: #38bdf8; word-break: break-all;">{{activation_url}}</span></p>
</div>`);

  const fetchEmailData = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson('/api/db/auth');
      if (data?.success) {
        if (data.emailOutbox) setOutbox(data.emailOutbox);
        if (data.emailConfig) {
          if (data.emailConfig.resendApiKey) setResendApiKey(data.emailConfig.resendApiKey);
          setSmtpHost(data.emailConfig.smtpHost || 'smtp.gmail.com');
          setSmtpPort(data.emailConfig.smtpPort?.toString() || '587');
          const rawSender = data.emailConfig.senderEmail || 'auth@aetherdb.ryzn.pro';
          const emailMatch = rawSender.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          setSenderEmail(emailMatch ? emailMatch[1] : 'auth@aetherdb.ryzn.pro');
          setSenderName(data.emailConfig.senderName || 'AetherDB');
          if (data.emailConfig.htmlTemplate) setHtmlTemplate(data.emailConfig.htmlTemplate);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchEmailData();
    }, 0);
  }, []);

  const handleSendTestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    setLoading(true);
    setTestSentSuccess(null);
    try {
      const res = await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_magic_link',
          email: testRecipient.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestSentSuccess(`Magic activation link dispatched successfully to ${testRecipient.trim()}!`);
        fetchEmailData();
      }
    } catch (err) {
      console.error('Failed to dispatch email', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_email_config',
          config: {
            resendApiKey,
            smtpHost,
            smtpPort: parseInt(smtpPort, 10) || 587,
            senderEmail,
            senderName,
            htmlTemplate
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save SMTP config', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOutbox = outbox.filter(item => {
    if (!search) return true;
    return item.recipient.toLowerCase().includes(search.toLowerCase()) || item.otpCode.includes(search);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 space-y-6 text-zinc-100 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-400" />
            <span>Gmail & Email OTP Dispatcher Studio</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure custom email dispatchers, design OTP templates, test Resend flows, and monitor live outbox logs.
          </p>
        </div>

        <button
          onClick={fetchEmailData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Outbox</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('outbox')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'outbox'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Sent Email Outbox ({outbox.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'templates'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Email HTML Template</span>
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'smtp'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Custom SMTP & Dispatcher Config</span>
        </button>
      </div>

      {/* TAB 1: Outbox & Test Dispatcher */}
      {activeTab === 'outbox' && (
        <div className="space-y-6">
          {/* Dispatch Test OTP Form */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Test Magic Link Dispatcher</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Engine Status: Live & Ready
              </span>
            </div>

            {testSentSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{testSentSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendTestOtp} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-zinc-400 font-medium block mb-1">Recipient Gmail Address</label>
                <input
                  type="email"
                  required
                  placeholder="recipient@gmail.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-medium block mb-1">Subject Header</label>
                <input
                  type="text"
                  required
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading || !testRecipient.trim()}
                  className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-md shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Dispatch Test Magic Link</span>
                </button>
              </div>
            </form>
          </div>

          {/* Outbox Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
            <div className="bg-zinc-850 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-100">
                Email Dispatch Logs ({filteredOutbox.length})
              </h3>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter by email or token..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1 pl-8 pr-2 text-[11px] text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900">
                    <th className="px-3 py-2.5">Message ID</th>
                    <th className="px-3 py-2.5">Recipient</th>
                    <th className="px-3 py-2.5">Magic Link Token</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Latency</th>
                    <th className="px-3 py-2.5">Sent Timestamp</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredOutbox.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 font-sans">
                        No email dispatch logs found. Click &quot;Dispatch Test Magic Link&quot; above to test!
                      </td>
                    </tr>
                  ) : (
                    filteredOutbox.map((mail) => (
                      <tr key={mail.id} className="hover:bg-zinc-850/50">
                        <td className="px-3 py-2.5 text-zinc-400 font-mono text-[11px]">
                          {mail.id}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-200 font-medium">
                          {mail.recipient}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-mono text-[11px]">
                            {mail.magicLink || mail.otpCode}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-sans font-semibold border ${
                              mail.status === 'DELIVERED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : mail.status === 'FAILED'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {mail.status}
                            </span>
                            {mail.dispatchError && (
                              <span className="text-[10px] text-rose-400/90 font-mono truncate max-w-[180px]" title={mail.dispatchError}>
                                {mail.dispatchError}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400 font-sans text-[11px]">
                          {mail.latencyMs}ms
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400 font-sans text-[11px]">
                          {new Date(mail.sentAt).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => copyToClipboard(mail.magicLink || mail.otpCode, mail.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                            title="Copy Magic Link Token"
                          >
                            {copiedId === mail.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Email HTML Template */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center justify-between">
              <span>Custom HTML Email Template</span>
              <span className="text-[10px] text-zinc-400 font-mono">Variables: {"{{otp_code}}"}, {"{{activation_url}}"}</span>
            </h3>
            <textarea
              rows={16}
              value={htmlTemplate}
              onChange={(e) => setHtmlTemplate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSaveSmtp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Save Template Settings
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-100">Live Rendered Email Preview</h3>
            <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950 min-h-[300px]">
              <div
                dangerouslySetInnerHTML={{
                  __html: htmlTemplate
                    .replace('{{otp_code}}', '582914')
                    .replace('{{activation_url}}', 'https://aetherdb.ryzn.pro/?activationToken=link_example&email=user@gmail.com')
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SMTP Settings */}
      {activeTab === 'smtp' && (
        <form onSubmit={handleSaveSmtp} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4 max-w-xl">
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">Custom Email Dispatcher Server Settings</h3>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Custom Email Config saved successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="col-span-2 space-y-1">
              <label className="text-zinc-300 font-medium flex items-center justify-between">
                <span>Resend API Key</span>
                <span className="text-[10px] text-emerald-400 font-mono">Active API Key Connected</span>
              </label>
              <input
                type="text"
                required
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-zinc-500">
                Emails are dispatched live via official Resend REST API (<span className="text-zinc-400 font-mono">https://api.resend.com/emails</span>).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">SMTP Server Host</label>
              <input
                type="text"
                required
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">SMTP Port</label>
              <input
                type="text"
                required
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-zinc-300 font-medium">Sender Email Address (RESEND_FROM)</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSenderEmail('auth@aetherdb.ryzn.pro')}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono transition-colors"
                  >
                    auth@aetherdb.ryzn.pro
                  </button>
                  <button
                    type="button"
                    onClick={() => setSenderEmail('noreply@aetherdb.ryzn.pro')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono transition-colors"
                  >
                    noreply@aetherdb.ryzn.pro
                  </button>
                  <button
                    type="button"
                    onClick={() => setSenderEmail('onboarding@resend.dev')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-mono transition-colors"
                  >
                    onboarding@resend.dev
                  </button>
                </div>
              </div>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="auth@aetherdb.ryzn.pro"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                🚀 <strong className="text-emerald-400">Verified Domain:</strong> <code className="text-zinc-200">aetherdb.ryzn.pro</code> ke liye verified sender <code className="text-emerald-400">AetherDB &lt;auth@aetherdb.ryzn.pro&gt;</code> configured hai.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Sender Display Name</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors"
          >
            Update SMTP & Email Credentials
          </button>
        </form>
      )}
    </div>
  );
}
