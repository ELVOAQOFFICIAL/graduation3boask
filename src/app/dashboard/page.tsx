'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Plus, Trash2, Search, LogOut, List, Loader2, HelpCircle } from 'lucide-react';

interface Song {
  id: string;
  song_name: string;
  artist: string | null;
  notes: string | null;
  created_at: string;
}

interface MusicResult {
  id: string;
  songName: string;
  artist: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ displayName: string } | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Song form
  const [songName, setSongName] = useState('');
  const [artist, setArtist] = useState('');
  const [notes, setNotes] = useState('');
  const [musicApiId, setMusicApiId] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Music search
  const [searchResults, setSearchResults] = useState<MusicResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      router.push('/login');
      return;
    }
    const data = await res.json();
    if (data.user.role === 'admin') {
      router.push('/admin');
      return;
    }
    setUser(data.user);
  }, [router]);

  const fetchSongs = useCallback(async () => {
    const res = await fetch('/api/songs/mine');
    if (res.ok) {
      const data = await res.json();
      setSongs(data.songs);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchUser(), fetchSongs()]).finally(() => setLoading(false));
  }, [fetchUser, fetchSongs]);

  const handleSearch = (query: string) => {
    setSongName(query);
    setMusicApiId('');

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/music-search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  };

  const selectResult = (result: MusicResult) => {
    setSongName(result.songName);
    setArtist(result.artist);
    setMusicApiId(result.id);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songName, artist, notes, musicApiId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess('Pieseň bola pridaná!');
      setSongName('');
      setArtist('');
      setNotes('');
      setMusicApiId('');
      setShowForm(false);
      await fetchSongs();
    } catch {
      setError('Chyba pripojenia. Skúste znova.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess('Pieseň bola zmazaná.');
      setDeleteId(null);
      await fetchSongs();
    } catch {
      setError('Chyba pripojenia. Skúste znova.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="font-bold text-lg">Stuzkova</h1>
              <p className="text-zinc-400 text-sm">Ahoj, {user?.displayName}!</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="mailto:lukasrajnic@elvoaq.com"
              className="text-zinc-400 hover:text-indigo-400 flex items-center gap-1.5 text-sm"
            >
              <HelpCircle className="w-4 h-4" />
              Pomoc
            </a>
            <button
              onClick={() => router.push('/songs')}
              className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-sm"
            >
              <List className="w-4 h-4" />
              Všetky piesne
            </button>
            <button
              onClick={handleLogout}
              className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Odhlásiť
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Add Song Button / Form */}
        {!showForm ? (
          <button
            onClick={() => { setShowForm(true); setSuccess(''); }}
            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg p-4 flex items-center justify-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6"
          >
            <Plus className="w-5 h-5" />
            Pridať pieseň
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-400" />
              Pridať novú pieseň
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <label className="block text-sm text-zinc-400 mb-1">Názov piesne *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={songName}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 pr-8"
                    placeholder="Vyhľadajte alebo zadajte názov..."
                    required
                    maxLength={255}
                  />
                  {searching && <Loader2 className="w-4 h-4 animate-spin text-zinc-500 absolute right-3 top-3" />}
                  {!searching && songName.length >= 3 && <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />}
                </div>

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => selectResult(r)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700/50 last:border-0"
                      >
                        <p className="text-white text-sm">{r.songName}</p>
                        <p className="text-zinc-400 text-xs">{r.artist}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Interpret</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Meno interpreta..."
                  maxLength={255}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">Poznámky (voliteľné)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                rows={2}
                maxLength={500}
                placeholder="Napr. zahrať o polnoci..."
              />
              <p className="text-zinc-500 text-xs mt-1">{notes.length}/500</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setSearchResults([]); }}
                className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium flex items-center gap-2 text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Pridať pieseň
              </button>
            </div>
          </form>
        )}

        {/* My Songs */}
        <div>
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-400" />
            Moje piesne ({songs.length})
          </h2>

          {songs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Zatiaľ ste nepridali žiadne piesne.</p>
              <p className="text-sm mt-1">Kliknite na &quot;Pridať pieseň&quot; vyššie.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {songs.map((song, i) => (
                <div
                  key={song.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-zinc-500 text-sm mt-0.5 w-6 text-right flex-shrink-0">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{song.song_name}</p>
                      {song.artist && <p className="text-zinc-400 text-sm truncate">{song.artist}</p>}
                      {song.notes && <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{song.notes}</p>}
                      <p className="text-zinc-600 text-xs mt-1">
                        {new Date(song.created_at).toLocaleDateString('sk-SK', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {deleteId === song.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDelete(song.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-500/20 rounded"
                      >
                        Potvrdiť
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-zinc-400 hover:text-white text-xs px-2 py-1"
                      >
                        Zrušiť
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(song.id)}
                      className="text-zinc-500 hover:text-red-400 flex-shrink-0"
                      title="Zmazať pieseň"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
