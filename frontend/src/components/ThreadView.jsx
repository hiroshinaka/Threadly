import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { useParams } from 'react-router-dom';

function renderBody(body_text, mediaArray) {
  // show body_text first
  const renderText = () => {
    if (!body_text) return null;
    return <p className="mt-2 text-slate-700">{body_text}</p>;
  };

  const renderMedia = () => {
    if (!mediaArray) return null;
    let media = mediaArray;
    if (typeof mediaArray === 'string') {
      try { media = JSON.parse(mediaArray); } catch (e) { media = []; }
    }
    if (!Array.isArray(media) || media.length === 0) return null;
    // render first media (gallery support can be added later)
    const m = media[0];
    if (!m || !m.url) return null;
    return (
      <div className="mt-3 w-full rounded-md bg-slate-100">
        {m.caption && <div className="p-2">{m.caption}</div>}
        <div className="px-2">
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-block w-full">
            <img src={m.url} alt={m.alt || ''} className="w-full h-auto object-contain max-h-[80vh] rounded-md" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderText()}
      {renderMedia()}
    </>
  );
}

// Stable recursive comment renderer (defined outside the main component so its identity doesn't change between renders)
function CommentNode({ comment, replyingTo, setReplyingTo, deleteComment, replyText, setReplyText, submitReply, voteComment, commentVotes, currentUser }) {
  return (
    <li key={comment.comment_id} className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 mb-1">{comment.username || comment.author_id} • <time dateTime={comment.created_at}>{new Date(comment.created_at).toISOString().slice(0,10)}</time></div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => voteComment(comment.comment_id, 1)} className={`text-slate-500 hover:text-emerald-600 ${commentVotes && commentVotes[comment.comment_id] === 1 ? 'text-emerald-600 font-bold' : ''}`}>▲</button>
          <span className="text-slate-700 font-semibold">{comment.karma || 0}</span>
          <button onClick={() => voteComment(comment.comment_id, -1)} className={`text-slate-500 hover:text-rose-600 ${commentVotes && commentVotes[comment.comment_id] === -1 ? 'text-rose-600 font-bold' : ''}`}>▼</button>
        </div>
      </div>
      <div className="mt-2">{comment.text}</div>
      <div className="mt-2 text-sm">
        <button onClick={() => setReplyingTo(replyingTo === comment.comment_id ? null : comment.comment_id)} className="text-slate-600 hover:text-slate-900">Reply</button>
        {currentUser && (Number(currentUser.role_id) === 1 || Number(currentUser.id) === Number(comment.author_id)) && (
          <button onClick={() => deleteComment(comment.comment_id)} className="ml-4 text-slate-600 hover:text-slate-900">Delete</button>
        )}
      </div>

        {replyingTo === comment.comment_id && (
        <div className="mt-2">
          <textarea autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} className="w-full border rounded-md p-2" rows={3} placeholder={`Reply to ${comment.username || 'user'}...`} />
          <div className="mt-2 flex gap-2">
            <button onClick={() => submitReply(comment.comment_id)} className="px-3 py-1 bg-slate-900 text-white rounded-md">Post reply</button>
            <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="px-3 py-1 border rounded-md">Cancel</button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <ul className="mt-3 ml-4 space-y-2">
          {comment.replies.map(r => (
            <CommentNode key={r.comment_id} comment={r} replyingTo={replyingTo} setReplyingTo={setReplyingTo} deleteComment={deleteComment} replyText={replyText} setReplyText={setReplyText} submitReply={submitReply} voteComment={voteComment} commentVotes={commentVotes} currentUser={currentUser} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ThreadView() {
  // App routes use /t/:slug/:id — second param is named `id` (may be numeric id or slug)
  const { id: idParam } = useParams();
  const identifier = idParam; // could be numeric id or thread slug
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // comment_id being replied to
  const [replyText, setReplyText] = useState('');
  const [commentVotes, setCommentVotes] = useState({}); // comment_id -> 1|-1|0
  const { user: currentUser } = useAuth();
  // removed IntersectionObserver fallback — view POST is sent immediately on load

  // helper: flatten nested comments into a single array (includes replies)
  const flattenComments = (list) => {
    const out = [];
    if (!list || !Array.isArray(list)) return out;
    const walk = (items) => {
      items.forEach(it => {
        out.push(it);
        if (it.replies && Array.isArray(it.replies) && it.replies.length) walk(it.replies);
      });
    };
    walk(list);
    return out;
  };

  // helper: update karma for a comment id anywhere in the nested tree (returns new tree)
  const updateCommentKarma = (items, commentId, delta) => {
    if (!items || !Array.isArray(items)) return items;
    return items.map(it => {
      if (it.comment_id === commentId) {
        return { ...it, karma: (Number(it.karma) || 0) + delta };
      }
      if (it.replies && it.replies.length) {
        return { ...it, replies: updateCommentKarma(it.replies, commentId, delta) };
      }
      return it;
    });
  };

  // helper: set karma to an absolute value for a comment id anywhere in the nested tree
  const setCommentKarma = (items, commentId, value) => {
    if (!items || !Array.isArray(items)) return items;
    return items.map(it => {
      if (it.comment_id === commentId) {
        return { ...it, karma: value };
      }
      if (it.replies && it.replies.length) {
        return { ...it, replies: setCommentKarma(it.replies, commentId, value) };
      }
      return it;
    });
  };

  // If an image is present and we measured its natural size, use that to adapt the left column width

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!identifier) {
          setError('No thread identifier provided in URL');
          return;
        }

        // if identifier is numeric, fetch by id endpoint
        if (/^\d+$/.test(String(identifier))) {
          const res = await fetch(`/api/threads/${identifier}`);
          if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
          const body = await res.json();
          setThread(body.thread);
          try { await fetch(`/api/threads/${body.thread.thread_id}/view`, { method: 'POST', credentials: 'include' }); } catch (e) { }
          setComments(body.comments || []);
          // initialize comment votes from server if present (include nested replies)
          if (body.comments && Array.isArray(body.comments)) {
            const mapping = {};
            flattenComments(body.comments).forEach(c => {
              mapping[c.comment_id] = Number(c.user_vote ?? c.user_vote_value ?? c.current_user_vote ?? c.user_vote_by_current_user ?? 0) || 0;
            });
            setCommentVotes(mapping);
          }
          return;
        }

        // otherwise identifier is probably a slug — fetch thread list and find matching slug
        const listRes = await fetch('/api/threads');
        if (!listRes.ok) throw new Error(`${listRes.status} ${await listRes.text()}`);
        const listBody = await listRes.json();
        const threads = listBody.threads || [];
        const found = threads.find(t => (t.thread_slug === identifier) || (t.slug === identifier) || (t.slugified === identifier));
        if (!found) {
          setError('Thread not found');
          return;
        }
        // populate thread and fetch its comments using the numeric id
        setThread(found);
        try { await fetch(`/api/threads/${found.thread_id}/view`, { method: 'POST', credentials: 'include' }); } catch (e) {}
        const detail = await fetch(`/api/threads/${found.thread_id}`);
        if (!detail.ok) throw new Error(`${detail.status} ${await detail.text()}`);
        const detailBody = await detail.json();
        setComments(detailBody.comments || []);
        if (detailBody.comments && Array.isArray(detailBody.comments)) {
          const mapping = {};
          flattenComments(detailBody.comments).forEach(c => {
            mapping[c.comment_id] = Number(c.user_vote ?? c.user_vote_value ?? c.current_user_vote ?? c.user_vote_by_current_user ?? 0) || 0;
          });
          setCommentVotes(mapping);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [identifier]);

  // IntersectionObserver fallback removed — views are recorded immediately on load

  const submitComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
  const res = await fetch(`/api/threads/${thread.thread_id}/comments`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) {
        // prefer structured JSON message if present, otherwise fall back to text
        let msg = 'Failed to post comment';
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await res.json();
            msg = (j && (j.message || j.msg || j.error)) ? (j.message || j.msg || j.error) : JSON.stringify(j);
          } else {
            const t = await res.text();
            msg = t || msg;
          }
        } catch (e) {
          const t = await res.text().catch(() => null);
          if (t) msg = t;
        }
        throw new Error(msg);
      }
      // refresh comments
      const refresh = await fetch(`/api/threads/${thread.thread_id}`);
      const body = await refresh.json();
      setComments(body.comments || []);
      setText('');
    } catch (err) {
      setError(err.message);
    }
  };

  

  const submitReply = async (parentId) => {
    if (!replyText.trim()) return;
    try {
  const res = await fetch(`/api/threads/${thread.thread_id}/comments`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: replyText, parent_id: parentId }) });
      if (!res.ok) {
        let msg = 'Failed to post reply';
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await res.json();
            msg = (j && (j.message || j.msg || j.error)) ? (j.message || j.msg || j.error) : JSON.stringify(j);
          } else {
            const t = await res.text();
            msg = t || msg;
          }
        } catch (e) {
          const t = await res.text().catch(() => null);
          if (t) msg = t;
        }
        throw new Error(msg);
      }
      // refresh
      const refresh = await fetch(`/api/threads/${thread.thread_id}`);
      const body = await refresh.json();
      setComments(body.comments || []);
      setReplyText('');
      setReplyingTo(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const voteComment = async (commentId, value) => {
    // toggle behavior: if user already voted same value, remove vote (send 0)
    const current = commentVotes[commentId] || 0;
    const toSend = current === value ? 0 : value;
    // compute optimistic delta
    const delta = toSend === 0 ? -current : (current === 0 ? value : (value - current));

    // optimistic update (supports nested replies)
    setComments(prev => updateCommentKarma(prev, commentId, delta));
    setCommentVotes(prev => ({ ...prev, [commentId]: toSend }));

    try {
  const res = await fetch(`/api/threads/comments/${commentId}/vote`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: toSend }) });
      if (!res.ok) {
        // prefer structured JSON message if present, otherwise fall back to text
        let msg = 'Vote failed';
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await res.json();
            msg = (j && (j.message || j.msg || j.error)) ? (j.message || j.msg || j.error) : JSON.stringify(j);
          } else {
            const t = await res.text();
            msg = t || msg;
          }
        } catch (e) {
          const t = await res.text().catch(() => null);
          if (t) msg = t;
        }
        throw new Error(msg);
      }
      const body = await res.json();
      // reconcile authoritative karma (supports nested replies)
      setComments(prev => setCommentKarma(prev, commentId, body.karma));
    } catch (err) {
      // on error, rollback optimistic (simple strategy: refetch comments)
      const refresh = await fetch(`/api/threads/${thread.thread_id}`);
      const b = await refresh.json();
      setComments(b.comments || []);
      setError(err.message || 'Vote failed');
    }
  };

  const deleteComment = async (commentId) => {
  if (!window.confirm('Delete this comment and its replies? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/threads/comments/${commentId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        let msg = 'Delete failed';
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await res.json();
            msg = (j && (j.message || j.msg || j.error)) ? (j.message || j.msg || j.error) : JSON.stringify(j);
          } else {
            const t = await res.text();
            msg = t || msg;
          }
        } catch (e) {
          const t = await res.text().catch(() => null);
          if (t) msg = t;
        }
        throw new Error(msg);
      }
      // refresh comments after delete
      const refresh = await fetch(`/api/threads/${thread.thread_id}`);
      const body = await refresh.json();
      setComments(body.comments || []);
    } catch (err) {
      setError(err.message || 'Unable to delete comment');
    }
  };

  // compute derived stats (include nested replies)
  const totalCommentVotes = flattenComments(comments).reduce((s, c) => s + (Number(c.karma) || 0), 0);
  const viewCount = thread ? (thread.view_count ?? thread.viewCount ?? thread.views ?? 0) : 0;
  const threadKarma = thread ? (thread.karma || 0) : 0;

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-rose-600">Error: {error}</div>;
  if (!thread) return <div className="p-6">Thread not found</div>;

  return (
    <main className="w-full max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
  <article className="bg-white border border-slate-200 p-6 rounded-md md:w-1/2">
          <h1 className="text-2xl font-semibold mb-2">{thread.title}</h1>
          <div className="text-sm text-slate-500 mb-4">by {thread.author} • <time dateTime={thread.created_at || thread.createdAt}>{new Date(thread.created_at || thread.createdAt).toISOString().slice(0,10)}</time></div>
          <div className="prose max-w-full">{renderBody(thread.body_text, thread.media)}</div>
          <br/>
          <div>
          <div className="bg-white border border-slate-200 p-4 rounded-md md:overflow-auto">
            <h2 className="text-lg font-bold mb-3">Thread stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md shadow-sm">
                <i class="fa-solid fa-eye w-6 h-6 text-slate-500 flex-none"></i>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Views</div>
                  <div className="text-lg font-semibold text-slate-900">{viewCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md shadow-sm">
                <i class="fa-solid fa-arrow-up w-6 h-6 text-slate-500 flex-none"></i>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Total Thread Karma</div>
                  <div className="text-lg font-semibold text-slate-900">{threadKarma}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md shadow-sm">
                <i class="fa-solid fa-comment w-6 h-6 text-slate-500 flex-none"></i>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Total Comments</div>
                  <div className="text-lg font-semibold text-slate-900">{thread.comment_count || 0}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md shadow-sm">
                <i class="fa-solid fa-arrow-up w-6 h-6 text-slate-500 flex-none"></i>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Total Comment Votes</div>
                  <div className="text-lg font-semibold text-slate-900">{totalCommentVotes}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </article>


        <aside className="mt-4 md:mt-0 md:w-1/2">
           <div className="bg-white border border-slate-200 p-4 rounded-md md:h-[calc(100vh-4rem)] md:overflow-auto ">
            <h2 className="text-lg font-bold mb-2 ">Comments</h2>
            <form onSubmit={submitComment} className="space-y-2">
              <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-10 border rounded-md p-2" rows={4} placeholder="Add a comment..." />
              <div>
                <button className="px-4 py-2 bg-slate-900 text-white rounded-md">Post comment</button>
              </div>
            </form>

            <ul className="mt-4 space-y-3 max-h-[60vh] overflow-auto">
              {comments.map(c => (
                <CommentNode key={c.comment_id} comment={c} replyingTo={replyingTo} setReplyingTo={setReplyingTo} deleteComment={deleteComment} replyText={replyText} setReplyText={setReplyText} submitReply={submitReply} voteComment={voteComment} commentVotes={commentVotes} currentUser={currentUser} />
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
