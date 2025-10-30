import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth';
import ThreadCard from './ThreadCard';
import Comment from './Comment';

export default function Profile() {
  const { user, loggedIn, refresh } = useAuth();
  const [tab, setTab] = useState('posts'); // 'posts' | 'comments'
  const [showContribModal, setShowContribModal] = useState(false);

  // profile data fetched from backend
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [counts, setCounts] = useState({ post_count: 0, comment_count: 0 });
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null);
  const defaultAvatar = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1770&auto=format&fit=crop';
  const [userAvatar, setUserAvatar] = useState(user?.image_url || defaultAvatar);

  useEffect(() => {
    setUserAvatar(user?.image_url || defaultAvatar);
  }, [user]);

  // fetch profile data for logged-in user
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/profile/me', { credentials: 'include' });
        const body = await res.json();
        if (!mounted) return;
        if (body && body.ok) {
          setPosts(body.posts || []);
          setComments(body.comments || []);
          setCounts(body.counts || { post_count: 0, comment_count: 0 });
        }
      } catch (e) {
        console.error('Failed to load profile data', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setUserAvatar(reader.result);
    reader.readAsDataURL(file);

    // upload to backend
    const form = new FormData();
    form.append('avatar', file);
    (async () => {
      try {
        const res = await fetch('/api/profile/avatar', {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        const body = await res.json();
        if (body && body.ok && body.user) {
          if (typeof refresh === 'function') await refresh();
          setUserAvatar(body.user.image_url || defaultAvatar);
        } else {
          console.error('Avatar upload failed', body);
        }
      } catch (err) {
        console.error('Avatar upload error', err);
      }
    })();
  };

  useEffect(() => {
    if (showContribModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [showContribModal]);

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 bg-white rounded-md shadow-md">
          <p className="text-center text-lg">You must be logged in to view your profile.</p>
        </div>
      </div>
    );
  }
  
  const myPosts = posts;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 flex gap-6">
          <div className="relative">
            <img
              src={userAvatar}
              alt={user?.username || 'User'}
              className="h-24 w-24 rounded-full object-cover"
            />

            {/* Hidden file input for choosing a new avatar */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Edit avatar button (bottom-right) */}
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="absolute bottom-0 right-0 -mb-0 -mr-0 h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white hover:bg-slate-800"
              aria-label="Change profile picture"
              title="Change profile picture"
            >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14.2639 15.9376L12.5958 14.2835C11.7909 13.4852 11.3884 13.0861 10.9266 12.9402C10.5204 12.8119 10.0838 12.8166 9.68048 12.9537C9.22188 13.1096 8.82814 13.5173 8.04068 14.3327L4.04409 18.2802M14.2639 15.9376L14.6053 15.5991C15.4112 14.7999 15.8141 14.4003 16.2765 14.2544C16.6831 14.1262 17.12 14.1312 17.5236 14.2688C17.9824 14.4252 18.3761 14.834 19.1634 15.6515L20 16.4936M14.2639 15.9376L18.275 19.9566M18.275 19.9566C17.9176 20.0001 17.4543 20.0001 16.8 20.0001H7.2C6.07989 20.0001 5.51984 20.0001 5.09202 19.7821C4.71569 19.5904 4.40973 19.2844 4.21799 18.9081C4.12796 18.7314 4.07512 18.5322 4.04409 18.2802M18.275 19.9566C18.5293 19.9257 18.7301 19.8728 18.908 19.7821C19.2843 19.5904 19.5903 19.2844 19.782 18.9081C20 18.4803 20 17.9202 20 16.8001V16.4936M12.5 4L7.2 4.00011C6.07989 4.00011 5.51984 4.00011 5.09202 4.21809C4.71569 4.40984 4.40973 4.7158 4.21799 5.09213C4 5.51995 4 6.08 4 7.20011V16.8001C4 17.4576 4 17.9222 4.04409 18.2802M20 11.5V16.4936M14 10.0002L16.0249 9.59516C16.2015 9.55984 16.2898 9.54219 16.3721 9.5099C16.4452 9.48124 16.5146 9.44407 16.579 9.39917C16.6515 9.34859 16.7152 9.28492 16.8425 9.1576L21 5.00015C21.5522 4.44787 21.5522 3.55244 21 3.00015C20.4477 2.44787 19.5522 2.44787 19 3.00015L14.8425 7.1576C14.7152 7.28492 14.6515 7.34859 14.6009 7.42112C14.556 7.4855 14.5189 7.55494 14.4902 7.62801C14.4579 7.71033 14.4403 7.79862 14.4049 7.97518L14 10.0002Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{user?.username}</h1>
                <p className="text-sm text-slate-600">@{user?.username}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-4 items-center">
              <div>
                <div className="text-sm text-slate-500">Karma</div>
                <div className="font-medium">{myPosts.reduce((s, p) => s + (p.karma || 0), 0)}</div>
              </div>
              <button onClick={() => setShowContribModal(true)} className="text-left">
                <div className="text-sm text-slate-500">Contributions</div>
                <div className="font-medium text-left text-slate-900">{counts.post_count + counts.comment_count}</div>
              </button>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-center gap-4 border-b border-slate-200">
            <button
              onClick={() => setTab('posts')}
              aria-pressed={tab === 'posts'}
              className={`pb-3 text-sm font-medium ${tab === 'posts' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-600'}`}
            >
              Posts
            </button>
            <button
              onClick={() => setTab('comments')}
              aria-pressed={tab === 'comments'}
              className={`pb-3 text-sm font-medium ${tab === 'comments' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-600'}`}
            >
              Comments
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="p-4 bg-white rounded shadow text-slate-600">Loading…</div>
            ) : (
              <>
                {tab === 'posts' && (
                  <>
                    {myPosts.length === 0 ? (
                      <div className="p-4 bg-white rounded shadow text-slate-600">No posts yet.</div>
                    ) : (
                      myPosts.map(post => (
                        <ThreadCard key={post.thread_id} thread={post} />
                      ))
                    )}
                  </>
                )}

                {tab === 'comments' && (
                  <>
                    {comments.length === 0 ? (
                      <div className="p-4 bg-white rounded shadow text-slate-600">No comments yet.</div>
                    ) : (
                      comments.map(c => (
                        <Comment key={c.comment_id} comment={c} authorName={user?.username} authorAvatar={userAvatar} />
                      ))
                    )}
                  </>
                )}
              </>
            )}
          </div>
          
        </section>

        {/* Contributions modal */}
        {showContribModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowContribModal(false)}
              aria-hidden
            />

            <div className="relative z-60 w-full max-w-sm mx-4">
              <div className="bg-gray-800 text-white rounded-lg shadow-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Contributions</h3>
                    <p className="text-sm text-slate-300">Total posts and comments</p>
                  </div>
                  <button
                    onClick={() => setShowContribModal(false)}
                    aria-label="Close"
                    className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-slate-300 hover:bg-gray-700"
                  >
                    <span className="sr-only">Close</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-400">Posts</div>
                    <div className="text-2xl font-semibold">{counts.post_count}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400">Comments</div>
                    <div className="text-2xl font-semibold">{counts.comment_count}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
