import React from 'react';
import { Link } from 'react-router-dom';

function renderImage(mediaArray) {
  if (!mediaArray) return null;
  // media may be a JSON string from the DB; if so try parse
  let media = mediaArray;
  if (typeof mediaArray === 'string') {
    try {
      media = JSON.parse(mediaArray);
    } catch (e) {
      media = [];
    }
  }
  if (!Array.isArray(media) || media.length === 0) return null;
  const first = media[0];
  if (!first || !first.url) return null;
  const src = first.url;
  return (
    <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
      <img src={src} alt={first.alt || ''} className="w-full h-full object-cover" />
    </div>
  );
}

function renderBody(body_text, mediaArray) {
  const truncate = (str, n = 160) => {
    if (!str) return '';
    return str.length > n ? str.slice(0, n - 1) + '\u2026' : str;
  };
  // prefer explicit body_text
  if (body_text && typeof body_text === 'string') return <p className="mt-2 text-slate-700">{truncate(body_text)}</p>;

  // fallback: if media has a caption field, try to show it
  if (mediaArray) {
    let media = mediaArray;
    if (typeof mediaArray === 'string') {
      try { media = JSON.parse(mediaArray); } catch(e) { media = []; }
    }
    if (Array.isArray(media) && media.length) {
      const first = media[0];
      if (first && (first.caption || first.text)) return <p className="mt-2 text-slate-700">{truncate(first.caption || first.text)}</p>;
    }
  }
  return null;
}

export default function ThreadCard({ thread }) {
    const created = thread.createdAt || thread.created_at || new Date().toISOString();
    const dt = new Date(created);
  // display date as YYYY-MM-DD
  const rel = dt.toISOString().slice(0, 10);

  const categorySlug = thread.category_slug || thread.categorySlug || (thread.category && thread.category.slug) || 'unknown';
  const author = thread.author || thread.username || 'anonymous';
  const authorImage = thread.image_url || thread.author_image_url || thread.profile_picture || thread.avatar_url || null;
  const likes = thread.likes || 0;
  const commentCount = thread.commentCount || thread.comment_count || 0;
  // prefer the canonical DB column `view_count`, then camelCase `viewCount`, then legacy `views`
  const views = (thread.view_count ?? thread.viewCount ?? thread.views) || 0;

  const [karma, setKarma] = React.useState(thread.karma || thread.karma_score || likes || 0);
  const [voted, setVoted] = React.useState(0); // 0 none, 1 up, -1 down


  React.useEffect(() => {

    const initial = Number(thread.user_vote ?? thread.user_vote_value ?? thread.current_user_vote ?? thread.user_vote_by_current_user ?? 0) || 0;
    setVoted(initial);

    if (typeof thread.karma === 'number') setKarma(thread.karma);
  }, [thread]);

  const doUp = (e) => {
    e.preventDefault();
    // toggle: if already upvoted, remove vote (send 0). otherwise send +1
    const current = voted;
    const toSend = current === 1 ? 0 : 1;
    const delta = toSend === 0 ? -1 : (current === -1 ? 2 : 1);
    setKarma(k => k + delta);
    setVoted(toSend === 0 ? 0 : 1);
    fetch(`/api/threads/${thread.thread_id}/vote`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: toSend }) })
      .then(r => r.json())
      .then(b => { if (b && typeof b.karma === 'number') setKarma(b.karma); })
      .catch(()=>{});
  };
  const doDown = (e) => {
    e.preventDefault();
    // toggle: if already downvoted, remove vote (send 0). otherwise send -1
    const current = voted;
    const toSend = current === -1 ? 0 : -1;
    const delta = toSend === 0 ? 1 : (current === 1 ? -2 : -1);
    setKarma(k => k + delta);
    setVoted(toSend === 0 ? 0 : -1);
    fetch(`/api/threads/${thread.thread_id}/vote`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: toSend }) })
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

  <Link to={threadHref} className="flex-1">
        <div className="flex items-start gap-3">
          {renderImage(thread.media)}

          <div className="flex-1">
            <div className="flex items-center gap-3 text-sm text-slate-500 mb-1">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">t/{categorySlug}</span>
              <span className="flex items-center gap-1">
                <img
                  src={authorImage || '/default-avatar.svg'}
                  alt="author avatar"
                  className="w-6 h-6 rounded-full object-cover border border-slate-200 bg-slate-100"
                  onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.svg'; }}
                  style={{ minWidth: 24, minHeight: 24 }}
                />
                <span>by {author}</span>
              </span>
              <span>•</span>
              <time dateTime={dt.toISOString()}>{rel}</time>
            </div>

            <h3 className="text-slate-900 text-lg font-medium">{thread.title}</h3>

            {renderBody(thread.body_text, thread.media)}

            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
              <span title="Comments"><i className="fa-solid fa-comment"></i> {commentCount}</span>
              <span title="Views"><i className="fa-solid fa-eye"></i> {views}</span>
            </div>
          </div>
        </div>
  </Link>
    </article>
  );
}