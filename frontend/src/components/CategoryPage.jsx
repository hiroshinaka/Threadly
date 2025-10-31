import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ThreadList from './ThreadList';

export default function CategoryPage({ threadsData = [], categories = [] }) {
  const { categorySlug } = useParams();
  const [activeTab, setActiveTab] = useState('new');

  const category = categories.find(c => c.slug === categorySlug || String(c.categories_id) === String(categorySlug) || c.name === categorySlug) || null;

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
        <div>
          <h1 className="text-2xl font-semibold">{category.name}</h1>
          {category.description && <div className="text-sm text-slate-600">{category.description}</div>}
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
