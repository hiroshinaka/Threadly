import React, { useState, useRef, useEffect } from 'react';

export default function SearchBar({ onSearch, onChange, categories = [], subscriptions = [], onToggleSubscribe, onCategorySelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [localSubs, setLocalSubs] = useState(subscriptions || []);

  useEffect(() => setLocalSubs(subscriptions || []), [subscriptions]);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const matches = (query || '').trim().length > 0 && categories && categories.length
    ? categories.filter(c => (c.name || '').toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (typeof onChange === 'function') onChange(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setOpen(false);
    if (typeof onSearch === 'function') onSearch(query);
  };

  const isSubscribed = (catId) => localSubs && localSubs.some(s => Number(s.category_id) === Number(catId));

  const handleToggle = async (catId) => {
    // try parent handler first
    if (typeof onToggleSubscribe === 'function') {
      try {
        await onToggleSubscribe(catId);
        // optimistically update local state (parent is expected to keep global state in sync)
        setLocalSubs(prev => (isSubscribed(catId) ? prev.filter(s => Number(s.category_id) !== Number(catId)) : [...prev, { category_id: catId }]));
        return;
      } catch (e) {
        console.error('Parent onToggleSubscribe failed', e);
        // fallthrough to fallback API
      }
    }

    // fallback: call API directly
    try {
      if (isSubscribed(catId)) {
        const res = await fetch(`/api/categories/${catId}/subscribe`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
          setLocalSubs(prev => prev.filter(s => Number(s.category_id) !== Number(catId)));
        } else {
          const t = await res.text().catch(() => null);
          console.error('Unsubscribe failed', res.status, t);
        }
      } else {
        const res = await fetch(`/api/categories/${catId}/subscribe`, { method: 'POST', credentials: 'include' });
        if (res.ok) {
          setLocalSubs(prev => [...prev, { category_id: catId }]);
        } else {
          const t = await res.text().catch(() => null);
          console.error('Subscribe failed', res.status, t);
        }
      }
    } catch (err) {
      console.error('Subscribe API call failed', err);
    }
  };

  return (
    <div ref={ref} className="flex-1 flex justify-center min-w-0 px-2 sm:px-4 md:px-6 relative">
      <form onSubmit={handleSubmit} className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
        <div className="relative">
          <input
            type="text"
            id="Search"
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            className="mt-0.5 w-full min-h-[44px] rounded border border-gray-300 shadow-sm text-base px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all duration-200"
            placeholder="Search threads, categories..."
            aria-autocomplete="list"
          />
          <span className="absolute inset-y-0 right-2 grid w-8 place-content-center">
            <button type="submit" aria-label="Submit" className="rounded-full p-1.5 text-gray-700 transition-colors hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </span>

          {open && matches.length > 0 && (
            <ul className="absolute left-0 right-0 bg-white border mt-1 rounded-md shadow-lg z-50 max-h-60 overflow-auto">
              {matches.map(cat => (
                <li key={cat.categories_id || cat.slug} className="px-3 py-2 flex items-center justify-between">
                  <button type="button" onClick={() => { setQuery(''); setOpen(false); if (onCategorySelect) onCategorySelect(cat.slug || cat.categories_id); }} className="text-left text-sm text-slate-700 hover:underline">
                    {cat.name}
                  </button>
                  <div>
                    <button type="button" onClick={async () => { await handleToggle(cat.categories_id); }} className={`ml-2 px-2 py-1 text-xs rounded ${isSubscribed(cat.categories_id) ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {isSubscribed(cat.categories_id) ? 'Unsubscribe' : 'Subscribe'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </div>
  );
}
