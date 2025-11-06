import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function AdminPage() {
  const [tab, setTab] = useState('threads');
  const [page, setPage] = useState(1);
  const threadsPerPage = 5;
  const { user, loggedIn } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);


  useEffect(() => {
    if (!loggedIn || Number(user?.role_id) !== 1) {
      navigate('/');
      return;
    }
    const loadThreads = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/threads');
        const body = await res.json();
        if (body && body.ok) {
          setThreads(body.threads || []);
        } else {
          setError('Failed to load threads');
        }
      } catch (e) {
        setError('Failed to load threads');
      } finally {
        setLoading(false);
      }
    };
    loadThreads();
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await fetch('/api/admin/users', { credentials: 'include' });
        const body = await res.json();
        if (body && body.ok) {
          setUsers(body.users || []);
        } else {
          setUsersError('Failed to load users');
        }
      } catch (e) {
        setUsersError('Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, [loggedIn, user, navigate]);


  const handleDeleteThread = async (threadId) => {
    if (!window.confirm('Delete this thread? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/threads/${threadId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setThreads(prev => prev.filter(t => t.thread_id !== threadId));
      } else {
        alert('Failed to delete thread');
      }
    } catch (e) {
      alert('Failed to delete thread');
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm('Ban this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true } : u));
      } else {
        alert('Failed to ban user');
      }
    } catch (e) {
      alert('Failed to ban user');
    }
  };

  const handleChangeRole = async (userId, roleId) => {
    if (!window.confirm(roleId === 1 ? 'Promote this user to admin?' : 'Demote this admin to user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role_id: roleId })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_id: roleId } : u));
      } else {
        const body = await res.json();
        alert(body.message || 'Failed to change role');
      }
    } catch (e) {
      alert('Failed to change role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const body = await res.json();
        alert(body.message || 'Failed to delete user');
      }
    } catch (e) {
      alert('Failed to delete user');
    }
  };

  if (!loggedIn || Number(user?.role_id) !== 1) {
    return <div className="p-8 text-center text-lg">Access denied.</div>;
  }

  return (
    <main className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="flex items-center gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('threads')}
          aria-pressed={tab === 'threads'}
          className={`pb-3 text-sm font-medium ${tab === 'threads' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-600'}`}
        >Threads</button>
        <button
          onClick={() => setTab('users')}
          aria-pressed={tab === 'users'}
          className={`pb-3 text-sm font-medium ${tab === 'users' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-600'}`}
        >Users</button>
      </div>

      {tab === 'threads' && (() => {
        const totalPages = Math.ceil(threads.length / threadsPerPage);
        const paginatedThreads = threads.slice((page - 1) * threadsPerPage, page * threadsPerPage);
        if (loading) return <div className="p-4">Loading threads...</div>;
        if (error) return <div className="p-4 text-red-600">{error}</div>;
        return <>
          <table className="min-w-full border rounded-md bg-white">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Author</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedThreads.map(thread => {
                const categorySlug = thread.category_slug || thread.categorySlug || (thread.category && thread.category.slug) || thread.category_name || 'unknown';
                const threadSlug = thread.thread_slug || thread.slug || thread.slugified || thread.slug_name || thread.thread_id;
                const threadUrl = `/t/${categorySlug}/${threadSlug}`;
                return (
                  <tr
                    key={thread.thread_id}
                    className="border-b cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => window.open(threadUrl, '_blank')}
                    title={`Go to thread: ${thread.title}`}
                  >
                    <td className="p-2 border text-xs">{thread.thread_id}</td>
                    <td className="p-2 border">{thread.title}</td>
                    <td className="p-2 border">{thread.author || thread.username || 'anonymous'}</td>
                    <td className="p-2 border">{thread.category_name || thread.category_slug}</td>
                    <td className="p-2 border text-xs">{new Date(thread.created_at).toLocaleDateString()}</td>
                    <td className="p-2 border">
                      <button onClick={e => { e.stopPropagation(); handleDeleteThread(thread.thread_id); }} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4 sticky bottom-0 py-4 z-10">
              <button
                className="px-3 py-1 rounded border bg-slate-100 text-slate-700 disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >Previous</button>
              <span className="px-2 text-sm">Page {page} of {totalPages}</span>
              <button
                className="px-3 py-1 rounded border bg-slate-100 text-slate-700 disabled:opacity-50"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >Next</button>
            </div>
          )}
        </>;
      })()}

      {tab === 'users' && (() => {
        if (usersLoading) return <div className="p-4">Loading users...</div>;
        if (usersError) return <div className="p-4 text-red-600">{usersError}</div>;
        return <>
          <table className="min-w-full border rounded-md bg-white">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Avatar</th>
                <th className="p-2 border">Username</th>
                <th className="p-2 border">Role</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.id !== user.id).map(u => (
                <tr key={u.id} className="border-b">
                  <td className="p-2 border text-xs">{u.id}</td>
                  <td className="p-2 border">
                    {u.image_url ? (
                      <img src={u.image_url} alt={u.username} className="h-8 w-8 rounded-full object-cover border" />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">?</span>
                    )}
                  </td>
                  <td className="p-2 border">{u.username}</td>
                  <td className="p-2 border">{u.role_id === 1 ? 'Admin' : 'User'}</td>
                  <td className="p-2 border flex gap-2">
                    {u.role_id === 2 && (
                      <button onClick={() => handleChangeRole(u.id, 1)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Promote to Admin</button>
                    )}
                    {u.role_id === 1 && (
                      <button onClick={() => handleChangeRole(u.id, 2)} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">Demote to User</button>
                    )}
                    <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>;
      })()}
    </main>
  );
}
