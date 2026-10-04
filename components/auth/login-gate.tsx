'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  Rocket
} from 'lucide-react';
import { ThreeLogo } from '@/components/ui/three-logo';
import { safeFetchJson } from '@/lib/utils';

interface LoginGateProps {
  onSuccessLogin: (user: { email: string; token: string; id: string }) => void;
}

export function LoginGate({ onSuccessLogin }: LoginGateProps) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'input' | 'sent' | 'activating' | 'redirected_to_last_window'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | null>(null);
  const [resendDeliveryInfo, setResendDeliveryInfo] = useState<{ status: string; resendId?: string; error?: string } | null>(null);
  const [activatedUser, setActivatedUser] = useState<{ email: string; token: string; id: string } | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'sent' && resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendCooldown]);

  // Multi-channel cross-window sync listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. BroadcastChannel (modern multi-tab sync)
    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('aether_auth_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'AETHER_AUTH_ACTIVATED' && event.data.user) {
            try { window.focus(); } catch {}
            onSuccessLogin(event.data.user);
          }
        };
      } catch {}
    }

    // 2. Storage event (fires across all tabs & windows on same domain)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'aether_magic_login_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.email && parsed.token) {
            try { window.focus(); } catch {}
            onSuccessLogin({ email: parsed.email, token: parsed.token, id: parsed.id });
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Window postMessage (direct communication between opener and popup/new tab)
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'AETHER_AUTH_ACTIVATED' && e.data.user) {
        try { window.focus(); } catch {}
        onSuccessLogin(e.data.user);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('message', handleMessage);
    };
  }, [onSuccessLogin]);

  // Auto-check activation status when waiting for email link click
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    if (step === 'sent' && email) {
      checkInterval = setInterval(async () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        try {
          const data = await safeFetchJson('/api/db/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check_status', email: email.trim() })
          });
          if (data && data.success && data.activated && data.user) {
            onSuccessLogin({
              email: data.user.email,
              token: data.token,
              id: data.user.id
            });
          }
        } catch {
          // ignore transient polling errors
        }
      }, 3500);
    }
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [step, email, onSuccessLogin]);

  const handleResendLink = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    setResendSuccessMsg(null);
    try {
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const data = await safeFetchJson('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_magic_link',
          email: email.trim(),
          clientOrigin
        })
      });

      if (data && data.success) {
        setActivationToken(data.token);
        setActivationCode(data.code);
        if (data.resendDelivery) setResendDeliveryInfo(data.resendDelivery);
        setResendCooldown(30);
        setResendSuccessMsg(`New magic activation link dispatched to ${email}!`);
        setTimeout(() => setResendSuccessMsg(null), 4000);
      } else {
        setError(data?.error || 'Failed to resend magic link');
      }
    } catch {
      setError('Network error resending link');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectVerify = React.useCallback(async (targetEmail: string, tokenOrCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await safeFetchJson('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_magic_link',
          email: targetEmail,
          token: tokenOrCode
        })
      });

      if (data && data.success && data.user) {
        const authData = {
          email: data.user.email,
          token: data.token,
          id: data.user.id
        };
        setActivatedUser(authData);

        // 1. Broadcast to any other open tabs/windows
        if (typeof window !== 'undefined') {
          try {
            if ('BroadcastChannel' in window) {
              const bc = new BroadcastChannel('aether_auth_channel');
              bc.postMessage({ type: 'AETHER_AUTH_ACTIVATED', user: authData });
              setTimeout(() => bc.close(), 1000);
            }
          } catch {}

          try {
            localStorage.setItem('aether_magic_login_event', JSON.stringify({ ...authData, timestamp: Date.now() }));
          } catch {}

          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'AETHER_AUTH_ACTIVATED', user: authData }, '*');
              try { window.opener.focus(); } catch {}
            }
          } catch {}
        }

        // Check if we arrived here via activation link in URL
        const isFromExternalLink = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('activationToken');

        if (isFromExternalLink) {
          // User clicked from email -> show confirmation and move back to previous/last window
          setStep('redirected_to_last_window');
          setTimeout(() => {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.focus();
              }
              window.close();
            } catch {}
          }, 1500);
        } else {
          // User activated directly in this window
          onSuccessLogin(authData);
        }
      } else {
        setError(data?.error || 'Verification failed. Account is not active.');
        setStep('sent');
      }
    } catch {
      setError('Failed to verify magic link');
      setStep('sent');
    } finally {
      setLoading(false);
    }
  }, [onSuccessLogin]);

  // Check URL params for activation link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('activationToken');
      const emailParam = urlParams.get('email');

      if (token && emailParam) {
        setTimeout(() => {
          setEmail(emailParam);
          setStep('activating');
          handleDirectVerify(emailParam, token);
        }, 0);
      }
    }
  }, [handleDirectVerify]);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address (e.g., yourname@gmail.com)');
      return;
    }

    setLoading(true);
    try {
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const data = await safeFetchJson('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_magic_link',
          email: email.trim(),
          clientOrigin
        })
      });

      if (data && data.success) {
        setActivationToken(data.token);
        setActivationCode(data.code);
        if (data.resendDelivery) setResendDeliveryInfo(data.resendDelivery);
        setStep('sent');
      } else {
        setError(data?.error || 'Failed to send activation link');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error sending magic link');
    } finally {
      setLoading(false);
    }
  };

  const domainOrigin = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://aetherdb.ryzn.pro';

  const fullActivationUrl = `${domainOrigin}/?activationToken=${activationToken}&email=${encodeURIComponent(email)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullActivationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30 font-sans">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="relative w-full max-w-md bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <ThreeLogo size="lg" interactive={true} glow={true} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            AetherDB
          </h1>
          <p className="text-xs text-zinc-400">
            Gmail Magic Link & Real-Time Account Activation Gate
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs animate-fadeIn">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'input' && (
          <form onSubmit={handleRequestLink} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Enter Your Email / Gmail Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs text-amber-300">
              <div className="font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Account Activation Policy</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Aapke email par ek magic login & account activation link bheja jayega. <strong className="text-amber-200">Jab tak aap woh link click karke activate nahi karte, tab tak account create/access nahi hoga.</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Magic Link to Gmail...</span>
                </>
              ) : (
                <>
                  <span>Send Login Link to Gmail</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Activation Link Sent (Interactive Gmail Simulation) */}
        {step === 'sent' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Account Status Badge */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-semibold text-amber-300">Account Status:</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded font-mono font-bold text-[10px]">
                INACTIVE (UNVERIFIED)
              </span>
            </div>

            {resendDeliveryInfo?.status === 'DELIVERED' ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Dispatched live via <strong>Resend API</strong></span>
                </div>
                {resendDeliveryInfo.resendId && (
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    ID: {resendDeliveryInfo.resendId.slice(0, 12)}...
                  </span>
                )}
              </div>
            ) : resendDeliveryInfo?.status === 'FAILED' ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Resend Delivery Notice</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed font-mono">
                  {resendDeliveryInfo.error || 'Resend error. Check sender email in Email Studio.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-300 leading-relaxed">
                Magic activation link has been sent to your Gmail inbox (<strong className="text-emerald-400">{email}</strong>) via <strong>Resend API</strong>.
              </p>
            )}

            {/* Email Dispatch Info Card */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80 shadow-inner space-y-3 p-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-100">Waiting for Email Activation</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  Resend Dispatched
                </span>
              </div>

              <div className="p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                  <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Check Your Inbox: <strong className="text-white">{email}</strong></span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  A magic activation link has been sent to your Gmail address. Click the activation link in your email, or activate immediately right here.
                </p>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Auto-syncing activation across tabs...</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">auth@aetherdb.ryzn.pro</span>
                </div>
              </div>

              {/* Direct In-Window Activation Button */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStep('activating');
                    handleDirectVerify(email, activationToken || '');
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Rocket className="h-4 w-4" />
                  <span>🚀 Activate Account & Log In (In This Window)</span>
                </button>
                <p className="text-[10px] text-zinc-400 text-center">
                  Click to log in directly inside this window without opening a new tab
                </p>
              </div>
            </div>

            {resendSuccessMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-300 text-xs animate-fadeIn">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{resendSuccessMsg}</span>
              </div>
            )}

            {/* Resend Magic Link Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800 text-xs">
              <span className="text-[11px] text-zinc-400">Didn&apos;t receive the link?</span>
              <button
                type="button"
                onClick={handleResendLink}
                disabled={resendCooldown > 0 || loading}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 text-[11px] font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend Link (${resendCooldown}s)` : 'Resend Link to Gmail'}
                </span>
              </button>
            </div>

            <button
              onClick={() => {
                setStep('input');
                setError(null);
              }}
              className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors pt-2 cursor-pointer"
            >
              ← Use a different email address
            </button>
          </div>
        )}

        {/* STEP 3: Activating Progress */}
        {step === 'activating' && (
          <div className="py-8 text-center space-y-3 animate-fadeIn">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
            <div className="text-xs font-semibold text-zinc-200">
              Verifying Magic Link & Activating Account...
            </div>
            <p className="text-[11px] text-zinc-400">
              Setting up your active session for {email}
            </p>
          </div>
        )}

        {/* STEP 4: Redirected / Moved to Last Window */}
        {step === 'redirected_to_last_window' && (
          <div className="py-6 text-center space-y-5 animate-fadeIn">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-zinc-100 flex items-center justify-center gap-2">
                <span>🚀 Account Activated!</span>
              </h2>
              <p className="text-xs text-zinc-300">
                Aapka account verify aur activate ho chuka hai.
              </p>
              <p className="text-[11px] text-emerald-400 font-medium">
                Aapki pichli (last) window par session move kar diya gaya hai!
              </p>
            </div>

            <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Moving back to your last window...</span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    if (window.opener && !window.opener.closed) {
                      window.opener.focus();
                    }
                    window.close();
                  } catch {}
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Move to Last Window (Pichli Window Par Jayein)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activatedUser) {
                    onSuccessLogin(activatedUser);
                  }
                }}
                className="w-full py-2 px-3 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Or continue in this window instead
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="border-t border-zinc-800/80 pt-4 text-center">
          <span className="text-[10px] text-zinc-500 font-mono">
            AetherDB Zero-Trust Authentication Engine v2.4
          </span>
        </div>
      </div>
    </div>
  );
}
