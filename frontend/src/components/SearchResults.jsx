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
    </main>
  );
}
