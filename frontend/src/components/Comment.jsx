import React from 'react';

export default function Comment({ comment, authorName, authorAvatar }) {
  const created = comment.created_at || comment.createdAt || new Date().toISOString();
  const dt = new Date(created);
  const rel = dt.toLocaleDateString();

  const name = authorName || comment.username || 'User';
  const avatar = authorAvatar || comment.avatar || '/default-avatar.svg';
  // detect removed comments: backend stores a JSON string when soft-deleted
  let removedMeta = null;
  if (typeof comment.text === 'string') {
    try {
      const parsed = JSON.parse(comment.text);
      if (parsed && parsed.removed) removedMeta = parsed;
    } catch (e) {
      // not JSON
    }
  }
  return (
    <article className="w-full p-3 bg-white border border-slate-200 rounded-md">
      <div className="mb-2 text-sm text-slate-500 flex items-center gap-2">
        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">t/{comment.category_name || comment.category_slug || 'unknown'}</span>
        <span>•</span>
  <span className="truncate min-w-0">{comment.thread_title || 'Untitled'}</span>
      </div>

      <div className="flex items-start gap-3">
        <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-800">{name}</div>
            <div className="text-xs text-slate-500">{rel}</div>
          </div>

          {/* truncate long comments for profile list views; handle removed comments specially */}
          {removedMeta ? (
            <div className="mt-1 text-slate-500 italic">{
              removedMeta.reason ? (`[removed] ${removedMeta.reason}`) : '[removed]'
            }{removedMeta.removed_by ? ` — removed by user: ${removedMeta.removed_by}` : ''}</div>
          ) : (
            <p className="mt-1 text-slate-700">
              {typeof comment.text === 'string' && comment.text.length > 200 ? comment.text.slice(0, 247) + '\u2026' : comment.text}
            </p>
          )}

          <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
            <div>
              {comment.thread_id ? (
                <a
                  href={`/t/${comment.category_slug || comment.category_name || ''}/${comment.thread_id}`}
                  className="text-slate-700 hover:underline"
                >
                  View thread
                </a>
              ) : (
                <span className="text-slate-500">View thread</span>
              )}
            </div>
            <div className="text-slate-500">{comment.comment_count || comment.replies_count || ''}</div>
          </div>
        </div>
      </div>
    </article>
  );
}
