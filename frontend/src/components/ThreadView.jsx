import React, { useEffect, useState } from 'react';
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
function CommentNode({ comment, replyingTo, setReplyingTo, replyText, setReplyText, submitReply, voteComment, commentVotes }) {
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
            <CommentNode key={r.comment_id} comment={r} replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyText={replyText} setReplyText={setReplyText} submitReply={submitReply} voteComment={voteComment} />
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
          setComments(body.comments || []);
          // initialize comment votes from server if present
          if (body.comments && Array.isArray(body.comments)) {
            const mapping = {};
            body.comments.forEach(c => {
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
        const detail = await fetch(`/api/threads/${found.thread_id}`);
        if (!detail.ok) throw new Error(`${detail.status} ${await detail.text()}`);
        const detailBody = await detail.json();
        setComments(detailBody.comments || []);
        if (detailBody.comments && Array.isArray(detailBody.comments)) {
          const mapping = {};
          detailBody.comments.forEach(c => {
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

  const submitComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
    const res = await fetch(`/api/threads/${thread.thread_id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to post comment');
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
      const res = await fetch(`/api/threads/${thread.thread_id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: replyText, parent_id: parentId }) });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to post reply');
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
    setComments(prev => prev.map(c => (c.comment_id === commentId ? { ...c, karma: (c.karma||0) + delta } : c)));
    setCommentVotes(prev => ({ ...prev, [commentId]: toSend }));
    try {
      const res = await fetch(`/api/threads/comments/${commentId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: toSend }) });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      // reconcile authoritative karma
      setComments(prev => prev.map(c => (c.comment_id === commentId ? { ...c, karma: body.karma } : c)));
    } catch (err) {
      // on error, rollback optimistic (simple strategy: refetch comments)
      const refresh = await fetch(`/api/threads/${thread.thread_id}`);
      const b = await refresh.json();
      setComments(b.comments || []);
      setError(err.message || 'Vote failed');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-rose-600">Error: {error}</div>;
  if (!thread) return <div className="p-6">Thread not found</div>;

  return (
    <main className="w-full p-6">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
  <article className="bg-white border border-slate-200 p-6 rounded-md md:w-1/2">
          <h1 className="text-2xl font-semibold mb-2">{thread.title}</h1>
          <div className="text-sm text-slate-500 mb-4">by {thread.author} • <time dateTime={thread.created_at || thread.createdAt}>{new Date(thread.created_at || thread.createdAt).toISOString().slice(0,10)}</time></div>
          <div className="prose max-w-full">{renderBody(thread.body_text, thread.media)}</div>
        </article>

        <aside className="mt-4 md:mt-0 md:w-1/2">
          <div className="bg-white border border-slate-200 p-4 rounded-md md:h-[calc(100vh-4rem)] md:overflow-auto">
            <h2 className="text-lg font-medium mb-2">Comments</h2>
            <form onSubmit={submitComment} className="space-y-2">
              <textarea value={text} onChange={e => setText(e.target.value)} className="w-full border rounded-md p-2" rows={4} placeholder="Add a comment..." />
              <div>
                <button className="px-4 py-2 bg-slate-900 text-white rounded-md">Post comment</button>
              </div>
            </form>

            <ul className="mt-4 space-y-3 max-h-[60vh] overflow-auto">
              {comments.map(c => (
                <CommentNode key={c.comment_id} comment={c} replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyText={replyText} setReplyText={setReplyText} submitReply={submitReply} voteComment={voteComment} commentVotes={commentVotes} />
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
