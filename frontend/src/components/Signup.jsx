import React, { useState } from 'react';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    setMessage(data.message || '');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">Sign Up for Threadly</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label htmlFor="username" className="block">
            <span className="text-sm font-medium text-gray-700">Username</span>
            <input
              type="text"
              id="username"
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </label>
          <label htmlFor="password" className="block">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input
              type="password"
              id="password"
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-md shadow-sm hover:bg-slate-700 transition-colors duration-200 ease-in-out"
          >
            Sign Up
          </button>
        </form>
        {message && <p className="text-center text-sm text-red-600 mt-4">{message}</p>}
      </div>
    </div>
  );
};

export default Signup;
