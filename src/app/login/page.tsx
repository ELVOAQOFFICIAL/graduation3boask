'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Mail, KeyRound, Loader2 } from 'lucide-react';
import Turnstile from '@/components/Turnstile';

export default function LoginPage() {
  const router = useRouter();
  const [layer, setLayer] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  // Layer 1 fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Layer 2 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Layer 3 fields
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const onTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleLayer1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/layer1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setTurnstileToken('');
      setLayer(data.nextLayer);
    } catch {
      setError('Chyba pripojenia. Skúste znova.');
    } finally {
      setLoading(false);
    }
  };

  const handleLayer2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/layer2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setTurnstileToken('');
      setLayer(data.nextLayer);
    } catch {
      setError('Chyba pripojenia. Skúste znova.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/layer3/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setOtpSent(true);
    } catch {
      setError('Chyba pripojenia. Skúste znova.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/layer3/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Chyba pripojenia. Skúste znova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🎓 Stuzkova</h1>
          <p className="text-zinc-400">Žiadosti o piesne</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < layer
                    ? 'bg-indigo-500 text-white'
                    : step === layer
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-8 h-0.5 ${
                    step < layer ? 'bg-indigo-500' : 'bg-zinc-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Layer 1: Credentials */}
          {layer === 1 && (
            <form onSubmit={handleLayer1}>
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold">Prihlásenie</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Zadajte svoje prihlasovacie údaje, ktoré ste dostali.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Používateľské meno</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    required
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Heslo</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Turnstile onVerify={onTurnstileVerify} />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Pokračovať
              </button>
            </form>
          )}

          {/* Layer 2: Name Confirmation */}
          {layer === 2 && (
            <form onSubmit={handleLayer2}>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold">Overenie totožnosti</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Zadajte svoje meno a priezvisko pre potvrdenie totožnosti.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Meno</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Priezvisko</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <Turnstile onVerify={onTurnstileVerify} />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Overiť
              </button>
            </form>
          )}

          {/* Layer 3: Email OTP */}
          {layer === 3 && !otpSent && (
            <form onSubmit={handleRequestOtp}>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold">Emailové overenie</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Zadajte svoj email. Pošleme vám 6-miestny overovací kód.
              </p>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Emailová adresa</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoComplete="email"
                />
              </div>

              <Turnstile onVerify={onTurnstileVerify} />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Odoslať kód
              </button>
            </form>
          )}

          {/* Layer 3: OTP Input */}
          {layer === 3 && otpSent && (
            <form onSubmit={handleVerifyOtp}>
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold">Zadajte overovací kód</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Overovací kód bol odoslaný na <span className="text-white">{email}</span>.
              </p>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">6-miestny kód</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-indigo-500"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Prihlásiť sa
              </button>

              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                className="w-full text-zinc-400 hover:text-white text-sm mt-3"
              >
                Odoslať kód znova
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Elvoaq AG · graduation3boask.elvoaq.com
        </p>
      </div>
    </div>
  );
}
