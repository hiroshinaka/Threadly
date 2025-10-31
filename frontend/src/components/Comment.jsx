import React from 'react';

export default function Comment({ comment, authorName, authorAvatar }) {
  const created = comment.created_at || comment.createdAt || new Date().toISOString();
  const dt = new Date(created);
  const rel = dt.toLocaleDateString();

  const name = authorName || comment.username || 'User';
  const avatar = authorAvatar || comment.avatar || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1770&auto=format&fit=crop';

  return (
    <article className="w-full p-3 bg-white border border-slate-200 rounded-md">
      <div className="mb-2 text-sm text-slate-500 flex items-center gap-2">
        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">t/{comment.category_name || comment.category_slug || 'unknown'}</span>
        <span>•</span>
        <span className="truncate">{comment.thread_title || 'Untitled'}</span>
      </div>

      <div className="flex items-start gap-3">
        <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-800">{name}</div>
            <div className="text-xs text-slate-500">{rel}</div>
          </div>

          <p className="mt-1 text-slate-700">{comment.text}</p>

          <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <button aria-label="Upvote" className="text-slate-500 hover:text-emerald-600">▲</button>
              <div className="text-slate-700 font-medium">{comment.karma || comment.karma_score || 0}</div>
              <button aria-label="Downvote" className="text-slate-500 hover:text-rose-600">▼</button>
            </div>
            <div className="text-slate-500">{comment.comment_count || comment.replies_count || ''}</div>
          </div>
        </div>
      </div>
    </article>
  );
}
