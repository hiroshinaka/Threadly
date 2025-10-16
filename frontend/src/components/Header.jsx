import React, { useState } from 'react';
import SearchBar from './SearchBar';
import logo from '../images/spool-of-thread.png';

export default function Header({ categories = [], selectedCategory, onCategoryChange }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="w-full px-3 sm:px-4">
        {/* Mobile: search + hamburger | Desktop: 3-column grid */}
        <div className="
          h-14 items-center
          grid grid-cols-[1fr_auto]
          md:grid-cols-[1fr_minmax(320px,720px)_1fr]
          gap-3
        ">
          {/* LEFT (desktop) */}
          <div className="hidden md:flex items-center gap-6 justify-self-start">
            <a href="#home" className="flex items-center gap-2 font-bold text-slate-800" aria-label="Home">
              <img src={logo} alt="Site logo" className="w-7 h-7" />
              <span>Threadly</span>
            </a>

            <nav className="flex items-center gap-3">
              <a className="text-slate-600 hover:text-slate-900" href="#explore">Explore</a>
              <label htmlFor="category-select" className="sr-only">Select category</label>
              <select
                id="category-select"
                className="bg-transparent text-slate-800 border-none border-slate-200 rounded-md px-3 py-1 text-sm "
                value={selectedCategory || ''}
                onChange={e => onCategoryChange && onCategoryChange(e.target.value || null)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </nav>
          </div>

          {/* CENTER (desktop) / LEFT (mobile) */}
          <div className="justify-self-stretch md:justify-self-center w-full">
            <div className="w-full md:max-w-xl">
              <SearchBar onSearch={(q) => console.log('Search query:', q)} />
            </div>
          </div>

          {/* RIGHT (desktop) */}
          <div className="hidden md:flex items-center gap-3 justify-self-end">
            <button className="px-3 py-1 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-100">Log in</button>
            <button className="px-3 py-1 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-800">Sign up</button>
          </div>

          {/* HAMBURGER (mobile) */}
          <div className="md:hidden justify-self-end">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-300 hover:bg-slate-50"
            >
              <span className="sr-only">Open menu</span>
              {/* Hamburger icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER */}
      {open && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-50"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85%] bg-white shadow-xl border-l border-slate-200
                       transform transition-transform duration-200 ease-out translate-x-0"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-200">
              <a href="#home" className="flex items-center gap-2 font-bold text-slate-800" onClick={() => setOpen(false)}>
                <img src={logo} alt="Site logo" className="w-7 h-7" />
                <span>Threadly</span>
              </a>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-slate-50"
              >
                {/* X icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <a href="#explore" className="block text-slate-700 hover:text-slate-900" onClick={() => setOpen(false)}>
                Explore
              </a>

              <div className="space-y-1">
                <label htmlFor="m-category-select" className="text-sm text-slate-600">Category</label>
                <select
                  id="m-category-select"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={selectedCategory || ''}
                  onChange={e => {
                    onCategoryChange && onCategoryChange(e.target.value || null);
                    setOpen(false);
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </button>
                <button
                  className="flex-1 px-3 py-2 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  Sign up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
