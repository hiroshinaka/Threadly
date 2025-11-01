import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ThreadList from './ThreadList';

export default function CategoryPage({ threadsData = [], categories = [] }) {
  const { categorySlug } = useParams();
  const [activeTab, setActiveTab] = useState('new');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subsLoading, setSubsLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const category = categories.find(c => c.slug === categorySlug || String(c.categories_id) === String(categorySlug) || c.name === categorySlug) || null;
  const [categoryDetail, setCategoryDetail] = useState(null);
  

  useEffect(() => {
    if (!category) return;
    let mounted = true;
    (async () => {
      setSubsLoading(true);
      try {
        const res = await fetch('/api/me/subscriptions', { credentials: 'include' });
        if (!res.ok) {
          if (mounted) setIsSubscribed(false);
          return;
        }
        const body = await res.json();
        const subs = body.subscriptions || [];
        const found = subs.some(s => String(s.category_id || s.categories_id || s.categoryId) === String(category.categories_id));
        if (mounted) setIsSubscribed(Boolean(found));
      } catch (e) {
        if (mounted) setIsSubscribed(false);
      } finally {
        if (mounted) setSubsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [category]);

  // fetch detailed category info (admin_id, admin_username) for permission checks and display
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!categorySlug) return;
      try {
        const res = await fetch(`/api/categories/${encodeURIComponent(categorySlug)}`);
        if (!mounted) return;
        if (!res.ok) {
          setCategoryDetail(null);
          return;
        }
        const body = await res.json();
        if (body && body.ok && body.category) setCategoryDetail(body.category);
      } catch (e) {
        if (mounted) setCategoryDetail(null);
      }
    })();
    return () => { mounted = false; };
  }, [categorySlug]);

  const textAllowed = Boolean(Number(categoryDetail?.text_allow ?? category?.text_allow ?? 1));
  const photoAllowed = Boolean(Number(categoryDetail?.photo_allow ?? category?.photo_allow ?? 1));

  const threads = useMemo(() => {
    const now = Date.now();
    const scored = threadsData
      .filter(t => {
        const slug = t.categorySlug || t.category_slug || (t.category && t.category.slug);
        const id = t.categoryId || t.category_id || t.categories_id;
        const name = t.category && t.category.name;
        if (!category) return false;
        return slug === category.slug || String(id) === String(category.categories_id) || name === category.name;
      })
      .map(t => {
        const createdAt = t.created_at || t.createdAt || new Date().toISOString();
        const likes = t.likes || 0;
        const commentCount = t.commentCount || t.comment_count || 0;
        const hours = Math.max(1, (now - new Date(createdAt).getTime()) / 36e5);
        const likesLastHour = Number(t.likes_last_hour ?? t.recent_likes ?? Math.round((likes) / hours));
        const hot = likesLastHour || Math.log(1 + likes + commentCount) + (1 / hours);
        return { ...t, hotScore: hot, createdAt, likesLastHour };
      });

    if (activeTab === 'new') return scored.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (activeTab === 'top') return scored.sort((a, b) => ((b.karma || b.karma_score || 0) - (a.karma || a.karma_score || 0)));
    if (activeTab === 'controversial') return scored.sort((a, b) => ((b.commentCount || b.comment_count || 0) - (a.commentCount || a.comment_count || 0)));
    return scored.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [threadsData, category, activeTab]);

  if (!category) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Category not found</h1>
        <p>If you followed a stale link the category may have been removed.</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{category.name}</h1>
              <button onClick={async () => {
                if (!currentUser) { navigate('/login'); return; }
                setSubsLoading(true);
                try {
                  const catId = category.categories_id || category.category_id;
                  if (!catId) return;
                  if (isSubscribed) {
                    const res = await fetch(`/api/categories/${catId}/subscribe`, { method: 'DELETE', credentials: 'include' });
                    if (res.ok) setIsSubscribed(false);
                  } else {
                    const res = await fetch(`/api/categories/${catId}/subscribe`, { method: 'POST', credentials: 'include' });
                    if (res.ok) setIsSubscribed(true);
                  }
                } catch (e) {
                  console.error('Subscription toggle failed', e);
                } finally { setSubsLoading(false); }
              }} disabled={subsLoading} className={`px-2 py-1 text-xs rounded ${isSubscribed ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-green-700'}`}>
                {subsLoading ? '...' : (isSubscribed ? 'Unsubscribe' :  'Subscribe')}
              </button>
            </div>
            {category.description && (
              <div className="mt-3 p-2 bg-white border border-slate-100 rounded-md shadow-sm mr-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Created and Moderated by <span className="font-medium text-slate-800">{categoryDetail?.admin_username || `#${category.admin_id}`}</span></div>
                    <div className="mt-2 flex items-center gap-2">
                      {textAllowed && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">Text</span>}
                      {photoAllowed && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Photos</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-700 whitespace-pre-line">{category.description}</div>
              </div>
            )}
              {(currentUser && (Number(currentUser.role_id) === 1 || Number(currentUser.id) === Number(categoryDetail?.admin_id || category.admin_id))) && (
                <div className="mt-3">
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Delete category "${category.name}" and all its threads? This action is permanent.`)) return;
                      try {
                        const catId = category.categories_id || category.category_id;
                        const res = await fetch(`/api/categories/${encodeURIComponent(catId)}`, { method: 'DELETE', credentials: 'include' });
                        if (!res.ok) {
                          const txt = await res.text().catch(() => '');
                          throw new Error(`Failed to delete category: ${res.status} ${txt}`);
                        }
                        navigate('/');
                      } catch (err) {
                        console.error('Delete category failed', err);
                        alert('Failed to delete category');
                      }
                    }}
                    className="px-3 py-1 text-xs rounded bg-red-50 text-red-700 border border-red-100"
                  >
                    Delete Category
                  </button>
                </div>
              )}
          </div>
        </div>
        <div className="flex gap-2">
          {['new','top','controversial'].map(key => {
            const isActive = activeTab === key;
            return (
              <button key={key} onClick={() => setActiveTab(key)} className={`px-3 py-1 rounded-md text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {key.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <ThreadList threads={threads} />
    </main>
  );
}
