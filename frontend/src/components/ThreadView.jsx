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

export default function ThreadView() {
  // App routes use /t/:slug/:id — second param is named `id` (may be numeric id or slug)
  const { id: idParam } = useParams();
  const identifier = idParam; // could be numeric id or thread slug
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

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
            <li key={c.comment_id} className="border rounded-md p-3 bg-white">
              <div className="text-sm text-slate-500 mb-1">{c.username || c.author_id} • <time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString()}</time></div>
              <div>{c.text}</div>
              {c.replies && c.replies.length > 0 && (
                <ul className="mt-3 ml-4 space-y-2">
                  {c.replies.map(r => (
                    <li key={r.comment_id} className="border rounded-md p-2 bg-slate-50">
                      <div className="text-sm text-slate-500 mb-1">{r.username || r.author_id} • <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString()}</time></div>
                      <div>{r.text}</div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
