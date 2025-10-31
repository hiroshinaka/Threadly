import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function CategorySubscriptions({ categories = [], onChange }) {
  const { loggedIn } = useAuth();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!loggedIn) return setSubs([]);
      setLoading(true);
      try {
        const res = await fetch('/api/me/subscriptions', { credentials: 'include' });
        if (res.ok) {
          const body = await res.json();
          setSubs(body.subscriptions || []);
        }
      } catch (e) {
        console.error('Failed to load subscriptions', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loggedIn]);

  const isSubscribed = (catId) => subs.some(s => Number(s.category_id) === Number(catId));

  const toggle = async (catId) => {
    if (!loggedIn) return alert('Please log in to subscribe');
    try {
      if (isSubscribed(catId)) {
        const res = await fetch(`/api/categories/${catId}/subscribe`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
          setSubs(prev => prev.filter(s => Number(s.category_id) !== Number(catId)));
          onChange && onChange();
        }
      } else {
        const res = await fetch(`/api/categories/${catId}/subscribe`, { method: 'POST', credentials: 'include' });
        if (res.ok) {
          setSubs(prev => [...prev, { category_id: catId }]);
          onChange && onChange();
        }
      }
    } catch (e) {
      console.error('Subscribe toggle failed', e);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Your Subscriptions</h3>
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2 max-h-64 overflow-auto">
          {categories.map(c => (
            <li key={c.categories_id || c.slug} className="flex items-center justify-between">
              <div>{c.name}</div>
              <button onClick={() => toggle(c.categories_id)} className={`px-3 py-1 text-sm rounded-md ${isSubscribed(c.categories_id) ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                {isSubscribed(c.categories_id) ? 'Unsubscribe' : 'Subscribe'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
