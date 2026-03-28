'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, HelpCircle } from 'lucide-react';
import Turnstile from '@/components/Turnstile';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push('/admin');
    } catch {
      setError('Chyba pripojenia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Admin prihlásenie</h1>
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Prihlásiť sa
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <a
            href="mailto:lukasrajnic@elvoaq.com"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
          >
            <HelpCircle className="w-4 h-4" />
            Potrebujete pomoc? Kontaktujte správcu
          </a>
        </div>
      </div>
    </div>
  );
}
