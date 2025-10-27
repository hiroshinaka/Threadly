import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ThreadList from './ThreadList';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const q = useQuery().get('q') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threads, setThreads] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const load = async () => {
      const trimmed = (q || '').trim();
      if (!trimmed) return setThreads([]);
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=50`);
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const body = await res.json();
      setThreads(body.threads || []);
      setComments(body.comments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [q]);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Search results for "{q}"</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-rose-600">Error: {error}</div>}
      {!loading && !error && threads.length === 0 && <div>No results</div>}
      {!loading && threads.length > 0 && (
        <div className="space-y-4">
          <ThreadList threads={threads} />
        </div>
      )}

      {!loading && comments.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Matching comments</h2>
          <div className="space-y-4">
                {comments.map(c => (
                  <div key={c.comment_id} className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="text-sm text-slate-500 mb-1">by {c.author_username} • <time dateTime={c.created_at}>{new Date(c.created_at).toISOString().slice(0,10)}</time></div>
                <div className="text-slate-800">{(c.text || '').length > 200 ? (c.text || '').slice(0, 197) + '\u2026' : c.text}</div>
                <div className="mt-2">
                  <a href={`/t/unknown/${c.thread_id}`} className="text-sm text-slate-600 hover:underline">View thread</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
