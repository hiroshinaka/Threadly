import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function renderBody(body) {
  if (!body) return null;
  if (typeof body === 'object') {
    if (body.type === 'image' && (body.thumbnail_url || body.url)) {
      const src = body.thumbnail_url || body.url;
      return (
        <div className="mt-3 w-full max-h-[600px] overflow-hidden rounded-md bg-slate-100">
          <div className="p-2">{body.text}</div>
          <br />
          <img src={src} alt={body.alt || ''} className="w-full h-full object-contain" />

        </div>

      );
    }
    return <p className="mt-2 text-slate-700">{body.text || JSON.stringify(body)}</p>;
  }
  try {
    const parsed = JSON.parse(body);
    return renderBody(parsed);
  } catch (err) {
    return <p className="mt-2 text-slate-700">{body}</p>;
  }
}

// Stable recursive comment renderer (defined outside the main component so its identity doesn't change between renders)
function CommentNode({ comment, replyingTo, setReplyingTo, replyText, setReplyText, submitReply, voteComment }) {
  return (
    <li key={comment.comment_id} className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 mb-1">{comment.username || comment.author_id} • <time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString()}</time></div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => voteComment(comment.comment_id, 1)} className="text-slate-500 hover:text-emerald-600">▲</button>
          <span className="text-slate-700 font-semibold">{comment.karma || 0}</span>
          <button onClick={() => voteComment(comment.comment_id, -1)} className="text-slate-500 hover:text-rose-600">▼</button>
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
    setComments(prev => prev.map(c => (c.comment_id === commentId ? { ...c, karma: (c.karma||0) + value } : c)));
    try {
      const res = await fetch(`/api/threads/comments/${commentId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
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
    <main className="max-w-3xl mx-auto p-6">
      <article className="bg-white border border-slate-200 p-6 rounded-md">
        <h1 className="text-2xl font-semibold mb-2">{thread.title}</h1>
        <div className="text-sm text-slate-500 mb-4">by {thread.author} • <time dateTime={thread.created_at || thread.createdAt}>{new Date(thread.created_at || thread.createdAt).toLocaleString()}</time></div>
        <div className="prose max-w-full">{renderBody(thread.body)}</div>
      </article>

      <section className="mt-6">
        <h2 className="text-lg font-medium mb-2">Comments</h2>
        <form onSubmit={submitComment} className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value)} className="w-full border rounded-md p-2" rows={4} placeholder="Add a comment..." />
          <div>
            <button className="px-4 py-2 bg-slate-900 text-white rounded-md">Post comment</button>
          </div>
        </form>

        <ul className="mt-4 space-y-3">
          {comments.map(c => (
            <CommentNode key={c.comment_id} comment={c} replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyText={replyText} setReplyText={setReplyText} submitReply={submitReply} voteComment={voteComment} />
          ))}
        </ul>
      </section>
    </main>
  );
}
