import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ThreadList from './ThreadList';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const q = useQuery().get('q') || '';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threads, setThreads] = useState([]);
  const [comments, setComments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subscribedIds, setSubscribedIds] = useState(new Set());

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

  // Fetch categories once and user's subscriptions (if any)
  useEffect(() => {
    let cancelled = false;
    const loadCats = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) return; // ignore silently
        const txt = await res.text();
        // defensive: some deployments may return HTML
        if (!res.headers.get('content-type')?.includes('application/json')) {
          console.error('Expected JSON for /api/categories but got:', txt.slice(0, 400));
          return;
        }
  const data = JSON.parse(txt);
  if (cancelled) return;
  // backend may return { categories: [...] } or an array directly
  setCategories(Array.isArray(data) ? data : (data.categories || []));

        // try loading user's subscriptions to mark subscribed categories
        try {
          const sRes = await fetch('/api/me/subscriptions', { credentials: 'include' });
          if (sRes.ok) {
            const sBody = await sRes.json();
            const ids = new Set((sBody.subscriptions || []).map(s => s.category_id));
            if (!cancelled) setSubscribedIds(ids);
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.error('Failed to fetch /api/categories', e);
      }
    };
    loadCats();
    return () => { cancelled = true; };
  }, []);

  const toggleSubscribe = async (catId) => {
    const isSub = subscribedIds.has(catId);
    try {
      const method = isSub ? 'DELETE' : 'POST';
      const res = await fetch(`/api/categories/${catId}/subscribe`, { method, credentials: 'include' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt}`);
      }
      const next = new Set(subscribedIds);
      if (isSub) next.delete(catId); else next.add(catId);
      setSubscribedIds(next);
    } catch (err) {
      console.error('Subscribe toggle failed', err);
      setError(err.message || String(err));
    }
  };

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

      {/* Categories section */}
      {!loading && categories.length > 0 && q.trim().length > 0 && (
        (() => {
          const term = q.trim().toLowerCase();
          const matched = categories.filter(c => (c.name || '').toLowerCase().includes(term) || (c.slug || '').toLowerCase().includes(term));
          if (matched.length === 0) return null;
          return (
            <section className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">Matching categories</h2>
              <div className="space-y-3">
                {matched.map(cat => (
                  <div key={cat.category_id || cat.categories_id || cat.slug} className="bg-white border border-slate-200 p-4 rounded-md flex items-start justify-between">
                    <div>
                      <button onClick={() => navigate(`/t/${cat.slug}`)} className="text-left text-lg font-medium text-slate-800 hover:underline">{cat.name}</button>
                      {cat.description && <div className="text-sm text-slate-600">{cat.description}</div>}
                    </div>
                    <div className="ml-4">
                      <button onClick={() => toggleSubscribe(cat.category_id || cat.categories_id)} className="text-sm px-3 py-1 bg-slate-100 rounded-md hover:bg-slate-200">
                        {subscribedIds.has(cat.category_id || cat.categories_id) ? 'Subscribed' : 'Subscribe'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()
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
