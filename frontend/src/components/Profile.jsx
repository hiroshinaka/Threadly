import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { threads as seedThreads } from '../data/mock';

export default function Profile() {
  const { user, loggedIn } = useAuth();
  const [tab, setTab] = useState('posts'); // 'posts' | 'comments'
  const [showContribModal, setShowContribModal] = useState(false);

  // lock scroll when modal is open
  useEffect(() => {
    if (showContribModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [showContribModal]);

  // If not logged in, show simple message
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 bg-white rounded-md shadow-md">
          <p className="text-center text-lg">You must be logged in to view your profile.</p>
        </div>
      </div>
    );
  }

  // Find posts authored by this user from mock threads
  const myPosts = seedThreads.filter(t => t.author === (user?.username || ''));

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 flex gap-6">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1770&auto=format&fit=crop'}
            alt={user?.username || 'User'}
            className="h-24 w-24 rounded-full object-cover"
          />
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
                <div className="font-medium">{myPosts.reduce((s, p) => s + (p.likes || 0), 0)}</div>
              </div>
              <button onClick={() => setShowContribModal(true)}>
                <div className="text-sm text-slate-500">Contributions</div>
                <div className="font-medium text-left text-slate-900">
                  {myPosts.length}
                </div>
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
            {tab === 'posts' && (
              <>
                {myPosts.length === 0 ? (
                  <div className="p-4 bg-white rounded shadow text-slate-600">No posts yet.</div>
                ) : (
                  myPosts.map(post => (
                    <article key={post.id} className="p-4 bg-white rounded shadow">
                      <h3 className="text-base font-semibold text-slate-900">{post.title}</h3>
                      <div className="text-sm text-slate-500 mt-1">{post.categorySlug} • {new Date(post.createdAt).toLocaleString()}</div>
                      <div className="mt-2 text-sm text-slate-700">{post.views} views • {post.likes} likes • {post.commentCount} comments</div>
                    </article>
                  ))
                )}
              </>
            )}

            {tab === 'comments' && (
              <div className="p-4 bg-white rounded shadow text-slate-600">No comments yet.</div>
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
                    <div className="text-2xl font-semibold">{myPosts.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400">Comments</div>
                    <div className="text-2xl font-semibold">0</div>
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
