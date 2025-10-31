import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function Sidebar({ onOpenThread, onOpenCategory }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { loggedIn, logout } = useAuth();

  // Mouse proximity handler
  useEffect(() => {
    const onMove = (e) => {
      try {
        if (e.clientX < 20) {
          setOpen(true);
          return;
        }
        if (!hovered && !pinned) setOpen(false);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [hovered, pinned]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/threads');
        const body = await res.json();
        if (!mounted) return;
        if (body && body.ok && Array.isArray(body.threads)) {
          setPosts(body.threads.slice(0, 6));
        } else if (Array.isArray(body)) {
          setPosts(body.slice(0, 6));
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error('Failed to load recent posts', err);
        setPosts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // ignore
    }
    navigate('/');
    setOpen(false);
  };

  const width = 320;
  const visible = 26; // amount visible when closed
  const handleSize = 40;
  const topOffset = 56;

  const closedOffset = `-${width - visible}px`;

  const containerStyle = {
    left: '0px',
    transform: open ? `translateX(0px)` : `translateX(${closedOffset})`,
    top: `${topOffset}px`,
    height: `calc(100vh - ${topOffset}px)`,
    width: `${width}px`,
    transition: 'transform 300ms ease',
  };

  return (
    <div className="hidden md:block">
      <div
        ref={ref}
        id="sidebar"
        onMouseEnter={() => { setHovered(true); setOpen(true); }}
        onMouseLeave={() => { setHovered(false); if (!pinned) setOpen(false); }}
        className={`fixed bg-white shadow-lg flex flex-col justify-between border border-gray-100 z-40`}
        style={containerStyle}
        aria-hidden={!open}
      >
        <button
          aria-label={open ? 'Close sidebar' : 'Open sidebar'}
          onClick={() => { const newPinned = !pinned; setPinned(newPinned); setOpen(newPinned); }}
          onMouseEnter={() => { setHovered(true); setOpen(true); }}
          onMouseLeave={() => { setHovered(false); }}
          className="absolute bg-white rounded-full flex items-center justify-center shadow-sm"
          style={{
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            right: `-${Math.floor(handleSize / 2)}px`,
            top: '25%',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="px-4 py-6 overflow-y-auto flex-1">
          <p className="px-2 py-2 text-lg font-semibold">Website Title!</p>
          <hr className="my-4" />

          <ul className="mt-6 space-y-1">
            <li>
              <a href="/" className="block rounded-lg px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                🏡 Home Page
              </a>
            </li>

            {loggedIn ? (
              <>
                <li>
                  <a href="/profile" className="block rounded-lg px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    👤 Profile
                  </a>
                </li>
                <li>
                  <button onClick={handleLogout} className="w-full text-left block rounded-lg px-2 py-2 text-sm font-medium text-red-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    🛑 Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <a href="/signup" className="block rounded-lg px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    📝 Sign Up
                  </a>
                </li>
                <li>
                  <a href="/login" className="block rounded-lg px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    👉 Log In
                  </a>
                </li>
              </>
            )}
          </ul>

          <hr className="my-4" />

          {/* Dedicated section for creation actions */}
          {loggedIn && (
            <div className="space-y-2">
              <button onClick={() => { onOpenThread && onOpenThread(); }} className="w-full text-left block rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              ✏️ New Thread
              </button>
              <button onClick={() => { onOpenCategory && onOpenCategory(); }} className="w-full text-left block rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              ✏️ New Category
              </button>
            </div>
          )}

          <hr className="my-4" />

          <div id="recent-posts" className="px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Posts</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              {loading ? (
                <li className="text-gray-400">Loading...</li>
              ) : posts.length === 0 ? (
                <li className="text-gray-400">No recent posts</li>
              ) : (
                posts.map((post) => (
                  <li key={post.thread_id || post.id || post.slug} className="border-b border-gray-100 pb-1 mb-1">
                    {(() => {
                      const categorySlug = post.categorySlug || post.category_slug || (post.category && (post.category.slug || post.category.name));
                      const threadIdent = post.thread_slug || post.slug || post.slugified || post.thread_id || post.id;
                      const safeCategory = encodeURIComponent(categorySlug || 'all');
                      const safeThread = encodeURIComponent(threadIdent || '');
                      const href = `/t/${safeCategory}/${safeThread}`;
                      return (
                        <>
                          <a href={href} className="block hover:text-gray-800 hover:underline">
                            {post.title} <span className="font-light text-xs">({post.post_type || post.type || 'post'})</span>
                          </a>
                          <div className="flex justify-between text-gray-400 text-xs mt-0.5">
                            <span>👁 {post.view_count || post.hits || ''}</span>
                            <span>{new Date(post.created_at || post.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </>
                      );
                    })()}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
