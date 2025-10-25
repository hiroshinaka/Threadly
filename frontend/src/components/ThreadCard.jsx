import React from 'react';

function renderBody(body) {
  if (!body) return null;
  // body may be plain text or a JSON blob (for images)
  if (typeof body === 'object') {
    if (body.type === 'image' && (body.thumbnail_url || body.url)) {
      const src = body.thumbnail_url || body.url;
      return (
        <div className="mt-3 w-full h-40 overflow-hidden rounded-md bg-slate-100">
          <img src={src} alt={body.alt || ''} className="w-full h-full object-cover" />
        </div>
      );
    }
    return <p className="mt-2 text-slate-700">{body.text || JSON.stringify(body)}</p>;
  }
  // try parse
  try {
    const parsed = JSON.parse(body);
    return renderBody(parsed);
  } catch (err) {
    // plain text
    return <p className="mt-2 text-slate-700">{body}</p>;
  }
}

export default function ThreadCard({ thread }) {
    const created = thread.createdAt || thread.created_at || new Date().toISOString();
    const dt = new Date(created);
    const since = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const mins = Math.round((Date.now() - dt.getTime()) / 60000);
    const rel = mins < 60 ? since.format(-mins, 'minute') : since.format(-Math.round(mins/60), 'hour');

  const categorySlug = thread.category_slug || thread.categorySlug || (thread.category && thread.category.slug) || 'unknown';
    const author = thread.author || thread.username || 'anonymous';
    const likes = thread.likes || 0;
    const commentCount = thread.commentCount || thread.comment_count || 0;
    const views = thread.views || 0;

  const [karma, setKarma] = React.useState(thread.karma || thread.karma_score || likes || 0);
  const [voted, setVoted] = React.useState(0); // 0 none, 1 up, -1 down

  const doUp = (e) => {
    e.preventDefault();
    if (voted === 1) return;
    const delta = voted === -1 ? 2 : 1;
    setKarma(k => k + delta);
    setVoted(1);
    // optimistic: attempt backend POST and reconcile returned karma
    fetch(`/api/threads/${thread.thread_id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 1 }) })
      .then(r => r.json())
      .then(b => { if (b && typeof b.karma === 'number') setKarma(b.karma); })
      .catch(()=>{});
  };
  const doDown = (e) => {
    e.preventDefault();
    if (voted === -1) return;
    const delta = voted === 1 ? -2 : -1;
    setKarma(k => k + delta);
    setVoted(-1);
    fetch(`/api/threads/${thread.thread_id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: -1 }) })
      .then(r => r.json())
      .then(b => { if (b && typeof b.karma === 'number') setKarma(b.karma); })
      .catch(()=>{});
  };

  const threadSlug = thread.thread_slug || thread.slug || thread.slugified || thread.slug_name;
  const threadHref = `/t/${categorySlug}/${threadSlug || thread.thread_id}`;

  return (
    <article className="w-full flex items-start gap-4 p-3 bg-white border border-slate-200 rounded-md">
      <div className="flex flex-col items-center pr-3">
        <button aria-label="Upvote" onClick={doUp} className={`text-slate-500 hover:text-emerald-600 ${voted===1? 'text-emerald-600 font-bold':''}`}>
          ▲
        </button>
        <div className="text-sm text-slate-700 font-semibold mt-1">{karma}</div>
        <button aria-label="Downvote" onClick={doDown} className={`text-slate-500 hover:text-rose-600 ${voted===-1? 'text-rose-600 font-bold':''}`}>
          ▼
        </button>
      </div>

      <a href={threadHref} target="_blank" rel="noopener noreferrer" className="flex-1">
        <div className="flex items-center gap-3 text-sm text-slate-500 mb-1">
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">t/{categorySlug}</span>
          <span>by {author}</span>
          <span>•</span>
          <time dateTime={dt.toISOString()}>{rel}</time>
        </div>

        <h3 className="text-slate-900 text-lg font-medium">{thread.title}</h3>

        {renderBody(thread.body)}

        <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
          <span title="Comments">💬 {commentCount}</span>
          <span title="Views">👁 {views}</span>
        </div>
      </a>
    </article>
  );
}