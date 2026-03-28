'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Music, Users, Activity, Download, LogOut, Shield, Loader2,
  ChevronDown, ChevronRight, AlertTriangle, HelpCircle
} from 'lucide-react';

type Tab = 'songs' | 'byUser' | 'users' | 'activity' | 'export';

interface AdminSong {
  id: string;
  songName: string;
  artist: string;
  notes: string;
  addedAfterFirstSession: boolean;
  createdAt: string;
  submittedBy: string;
  username: string;
}

interface UserSongGroup {
  id: string;
  displayName: string;
  username: string;
  songCount: number;
  songs: {
    id: string;
    song_name: string;
    artist: string;
    notes: string;
    added_after_first_session: boolean;
    created_at: string;
  }[];
}

interface UserInfo {
  id: string;
  username: string;
  display_name: string;
  email: string;
  is_active: boolean;
  identity_confirmed: boolean;
  last_login_at: string | null;
  songCount: number;
  sessionCount: number;
}

interface LogEntry {
  id: string;
  user_id: string;
  event_type: string;
  success: boolean;
  ip_address: string;
  country_code: string;
  city: string;
  user_agent: string;
  geo_alert: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  users?: { display_name: string; username: string };
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('songs');

  // Data
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [userGroups, setUserGroups] = useState<UserSongGroup[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);

  // UI state
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [logFilter, setLogFilter] = useState('');

  const checkAuth = useCallback(async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) { router.push('/admin/login'); return false; }
    const data = await res.json();
    if (data.user.role !== 'admin') { router.push('/login'); return false; }
    return true;
  }, [router]);

  const fetchSongs = async () => {
    const res = await fetch('/api/admin/songs');
    if (res.ok) {
      const data = await res.json();
      setSongs(data.songs);
    }
  };

  const fetchByUser = async () => {
    const res = await fetch('/api/admin/songs/by-user');
    if (res.ok) {
      const data = await res.json();
      setUserGroups(data.users);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  };

  const fetchLogs = async (page = 1, eventType = '') => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (eventType) params.set('eventType', eventType);
    const res = await fetch(`/api/admin/activity?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setLogTotal(data.total);
      setLogPage(page);
    }
  };

  useEffect(() => {
    checkAuth().then((ok) => {
      if (ok) {
        fetchSongs();
        setLoading(false);
      }
    });
  }, [checkAuth]);

  useEffect(() => {
    if (tab === 'songs') fetchSongs();
    if (tab === 'byUser') fetchByUser();
    if (tab === 'users') fetchUsers();
    if (tab === 'activity') fetchLogs(1, logFilter);
  }, [tab, logFilter]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleExport = (format: string) => {
    window.open(`/api/admin/export?format=${format}`, '_blank');
  };

  const toggleUserExpand = (id: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'songs' as Tab, label: 'Všetky piesne', icon: Music },
    { id: 'byUser' as Tab, label: 'Podľa osoby', icon: Users },
    { id: 'users' as Tab, label: 'Používatelia', icon: Users },
    { id: 'activity' as Tab, label: 'Aktivita', icon: Activity },
    { id: 'export' as Tab, label: 'Export', icon: Download },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="font-bold text-lg">Admin panel</h1>
              <p className="text-zinc-400 text-sm">Stuzkova — Správa piesní</p>
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
            <button onClick={handleLogout} className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-sm">
              <LogOut className="w-4 h-4" /> Odhlásiť
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* All Songs Tab */}
        {tab === 'songs' && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-zinc-700">
              <h2 className="font-semibold">Všetky piesne ({songs.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-400">
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">Pieseň</th>
                    <th className="text-left px-4 py-2">Interpret</th>
                    <th className="text-left px-4 py-2">Poznámky</th>
                    <th className="text-left px-4 py-2">Pridal/a</th>
                    <th className="text-left px-4 py-2">Dátum</th>
                    <th className="text-left px-4 py-2">Relácia</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((s, i) => (
                    <tr key={s.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                      <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{s.songName}</td>
                      <td className="px-4 py-2 text-zinc-400">{s.artist || '—'}</td>
                      <td className="px-4 py-2 text-zinc-400 max-w-[150px] truncate">{s.notes || '—'}</td>
                      <td className="px-4 py-2 text-zinc-300">{s.submittedBy}</td>
                      <td className="px-4 py-2 text-zinc-500 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString('sk-SK')}
                      </td>
                      <td className="px-4 py-2">
                        {s.addedAfterFirstSession ? (
                          <span className="text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded">Opätovná</span>
                        ) : (
                          <span className="text-green-400 text-xs bg-green-500/10 px-2 py-0.5 rounded">Prvá</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By User Tab */}
        {tab === 'byUser' && (
          <div className="space-y-3">
            {userGroups.map((group) => (
              <div key={group.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
                <button
                  onClick={() => toggleUserExpand(group.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30"
                >
                  <div className="flex items-center gap-3">
                    {expandedUsers.has(group.id) ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">{group.displayName}</p>
                      <p className="text-zinc-500 text-xs">{group.username}</p>
                    </div>
                  </div>
                  <span className="text-indigo-400 text-sm">{group.songCount} piesní</span>
                </button>

                {expandedUsers.has(group.id) && group.songs.length > 0 && (
                  <div className="border-t border-zinc-700">
                    <table className="w-full text-sm">
                      <tbody>
                        {group.songs.map((s, i) => (
                          <tr key={s.id} className="border-b border-zinc-700/30 hover:bg-zinc-700/20">
                            <td className="px-6 py-2 text-zinc-500 w-8">{i + 1}.</td>
                            <td className="px-4 py-2 font-medium">{s.song_name}</td>
                            <td className="px-4 py-2 text-zinc-400">{s.artist || '—'}</td>
                            <td className="px-4 py-2 text-zinc-500 text-xs">
                              {new Date(s.created_at).toLocaleDateString('sk-SK')}
                            </td>
                            <td className="px-4 py-2">
                              {s.added_after_first_session && (
                                <span className="text-amber-400 text-xs">[+]</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {userGroups.length === 0 && (
              <div className="text-center py-12 text-zinc-500">Žiadni používatelia.</div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-zinc-700">
              <h2 className="font-semibold">Používatelia ({users.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-400">
                    <th className="text-left px-4 py-2">Meno</th>
                    <th className="text-left px-4 py-2">Používateľské meno</th>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Stav</th>
                    <th className="text-left px-4 py-2">Piesne</th>
                    <th className="text-left px-4 py-2">Relácie</th>
                    <th className="text-left px-4 py-2">Posledné prihlásenie</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                      <td className="px-4 py-2 font-medium">{u.display_name || '—'}</td>
                      <td className="px-4 py-2 text-zinc-400">{u.username}</td>
                      <td className="px-4 py-2 text-zinc-400">{u.email || '—'}</td>
                      <td className="px-4 py-2">
                        {u.identity_confirmed ? (
                          <span className="text-green-400 text-xs bg-green-500/10 px-2 py-0.5 rounded">Overený</span>
                        ) : (
                          <span className="text-zinc-500 text-xs bg-zinc-700 px-2 py-0.5 rounded">Čaká</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-zinc-300">{u.songCount}</td>
                      <td className="px-4 py-2 text-zinc-300">{u.sessionCount}</td>
                      <td className="px-4 py-2 text-zinc-500 whitespace-nowrap">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString('sk-SK')
                          : 'Nikdy'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Všetky udalosti</option>
                <option value="login_attempt">Pokus o prihlásenie</option>
                <option value="login_blocked">Blokované prihlásenie</option>
                <option value="otp_requested">Žiadosť o OTP</option>
                <option value="otp_validated">Overenie OTP</option>
                <option value="session_started">Začiatok relácie</option>
                <option value="session_ended">Koniec relácie</option>
                <option value="song_added">Pridaná pieseň</option>
                <option value="song_deleted">Zmazaná pieseň</option>
                <option value="admin_login">Admin prihlásenie</option>
                <option value="admin_export">Admin export</option>
              </select>
              <span className="text-zinc-500 text-sm">Celkom: {logTotal}</span>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 text-zinc-400">
                      <th className="text-left px-4 py-2">Čas</th>
                      <th className="text-left px-4 py-2">Používateľ</th>
                      <th className="text-left px-4 py-2">Udalosť</th>
                      <th className="text-left px-4 py-2">IP</th>
                      <th className="text-left px-4 py-2">Krajina</th>
                      <th className="text-left px-4 py-2">Detaily</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className={`border-b border-zinc-700/50 hover:bg-zinc-700/30 ${
                          log.geo_alert ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-2 text-zinc-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('sk-SK')}
                        </td>
                        <td className="px-4 py-2 text-zinc-300">
                          {log.users?.display_name || '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            log.success === true ? 'bg-green-500/10 text-green-400' :
                            log.success === false ? 'bg-red-500/10 text-red-400' :
                            'bg-zinc-700 text-zinc-300'
                          }`}>
                            {log.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-zinc-500 font-mono text-xs">{log.ip_address || '—'}</td>
                        <td className="px-4 py-2">
                          <span className="flex items-center gap-1">
                            {log.geo_alert && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                            <span className={log.geo_alert ? 'text-amber-400' : 'text-zinc-500'}>
                              {log.country_code || '—'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-zinc-500 text-xs max-w-[200px] truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logTotal > 50 && (
                <div className="flex items-center justify-between p-4 border-t border-zinc-700">
                  <button
                    onClick={() => fetchLogs(logPage - 1, logFilter)}
                    disabled={logPage <= 1}
                    className="text-zinc-400 hover:text-white disabled:opacity-30 text-sm"
                  >
                    Predchádzajúca
                  </button>
                  <span className="text-zinc-500 text-sm">
                    Strana {logPage} z {Math.ceil(logTotal / 50)}
                  </span>
                  <button
                    onClick={() => fetchLogs(logPage + 1, logFilter)}
                    disabled={logPage >= Math.ceil(logTotal / 50)}
                    className="text-zinc-400 hover:text-white disabled:opacity-30 text-sm"
                  >
                    Ďalšia
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Tab */}
        {tab === 'export' && (
          <div className="max-w-lg">
            <h2 className="font-semibold text-lg mb-4">Exportovať piesne</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Stiahnite si zoznam všetkých žiadostí o piesne vo zvolenom formáte.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExport('csv')}
                className="w-full bg-zinc-800 border border-zinc-700 hover:border-indigo-500 rounded-lg p-4 text-left flex items-center gap-4"
              >
                <Download className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div>
                  <p className="font-medium">CSV</p>
                  <p className="text-zinc-400 text-sm">Pre Excel, Google Sheets alebo DJ softvér</p>
                </div>
              </button>

              <button
                onClick={() => handleExport('json')}
                className="w-full bg-zinc-800 border border-zinc-700 hover:border-indigo-500 rounded-lg p-4 text-left flex items-center gap-4"
              >
                <Download className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div>
                  <p className="font-medium">JSON</p>
                  <p className="text-zinc-400 text-sm">Pre vývojárov alebo API spotrebu</p>
                </div>
              </button>

              <button
                onClick={() => handleExport('txt')}
                className="w-full bg-zinc-800 border border-zinc-700 hover:border-indigo-500 rounded-lg p-4 text-left flex items-center gap-4"
              >
                <Download className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div>
                  <p className="font-medium">Textový súbor (.txt)</p>
                  <p className="text-zinc-400 text-sm">Čitateľný formát pre DJ alebo organizátora</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
