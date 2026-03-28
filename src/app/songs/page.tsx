'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Music, ArrowUpDown, Search, ArrowLeft, Loader2 } from 'lucide-react';

interface Song {
  id: string;
  song_name: string;
  artist: string | null;
  notes: string | null;
  created_at: string;
}

type SortKey = 'song_name' | 'artist' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function SongsPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const fetchSongs = useCallback(async () => {
    const res = await fetch('/api/songs');
    if (!res.ok) {
      router.push('/login');
      return;
    }
    const data = await res.json();
    setSongs(data.songs);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = songs.filter((s) => {
    const q = filter.toLowerCase();
    return (
      s.song_name.toLowerCase().includes(q) ||
      (s.artist?.toLowerCase().includes(q) ?? false)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const valA = a[sortKey] || '';
    const valB = b[sortKey] || '';
    return valA < valB ? -dir : valA > valB ? dir : 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="font-bold text-lg">Všetky piesne</h1>
              <p className="text-zinc-400 text-sm">{songs.length} piesní celkom</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Späť na panel
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search / Filter */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Vyhľadať podľa názvu alebo interpreta..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Songs table */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400 text-sm">
                  <th className="text-left px-4 py-3 w-12">#</th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort('song_name')} className="flex items-center gap-1 hover:text-white">
                      Názov piesne <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort('artist')} className="flex items-center gap-1 hover:text-white">
                      Interpret <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">Poznámky</th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-white">
                      Dátum <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((song, i) => (
                  <tr key={song.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                    <td className="px-4 py-3 text-zinc-500 text-sm">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{song.song_name}</td>
                    <td className="px-4 py-3 text-zinc-400">{song.artist || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm max-w-[200px]">
                      {song.notes ? (
                        <button
                          onClick={() => toggleNotes(song.id)}
                          className="text-left hover:text-white"
                        >
                          {expandedNotes.has(song.id)
                            ? song.notes
                            : song.notes.length > 80
                            ? song.notes.slice(0, 80) + '...'
                            : song.notes}
                        </button>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-sm whitespace-nowrap">
                      {new Date(song.created_at).toLocaleDateString('sk-SK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-500">
                      <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {filter ? 'Žiadne výsledky pre tento filter.' : 'Zatiaľ neboli pridané žiadne piesne.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
