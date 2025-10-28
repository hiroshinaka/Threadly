import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";
import CategoryModal from './CategoryModal';
import ThreadModal from './ThreadModal';
import logo from "../images/spool-of-thread.png";
import useAuth from '../hooks/useAuth';

export default function Header({
  categories = [],
  selectedCategory,
  onCategoryChange,
  isLoggedIn = false,
}) {
  const [open, setOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const [localCategories, setLocalCategories] = useState(categories || []);
  const { user, loggedIn, logout } = useAuth();

  // keep localCategories in sync when parent provides new categories
  React.useEffect(() => {
    setLocalCategories(categories || []);
  }, [categories]);

  const defaultCreateCategory = async (payload) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create category failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      // if backend returns created category, push it into localCategories
      if (body && body.category) {
        setLocalCategories((c) => [body.category, ...c]);
      }
      return body;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const defaultCreateThread = async (payload) => {
    try{
      let res;
      if (payload instanceof FormData) {
        res = await fetch('/api/threads', { method: 'POST', body: payload });
      } else {
        res = await fetch('/api/threads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create thread failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      return body;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };


  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2 text-base font-medium">
      <div className="w-full px-3 sm:px-4">
        {/* Layout grid */}
        <div
          className="
            h-14 items-center
            grid grid-cols-[1fr_auto]
            md:grid-cols-[1fr_minmax(320px,720px)_1fr]
            gap-3
          "
        >
          {/* LEFT (desktop) */}
          <div className="hidden md:flex items-center gap-x-6 justify-self-start">
            <a
              href="/"
              className="flex items-center gap-2 font-semibold text-slate-800 whitespace-nowrap"
              aria-label="Home"
            >
              <img src={logo} alt="Site logo" className="w-7 h-7" />
              <span>Threadly</span>
            </a>

            <nav className="flex items-center gap-3 ml-4 text-base">
              <label htmlFor="category-select" className="sr-only">
                Select category
              </label>
              <select
                id="category-select"
                className="bg-transparent text-slate-800 border-none rounded-md px-3 py-2 text-base font-medium focus:outline-none"
                value={selectedCategory || ""}
                onChange={(e) =>
                  onCategoryChange && onCategoryChange(e.target.value || null)
                }
              >
                <option value="">All Categories</option>
                {localCategories.map((cat) => (
                  <option key={cat.slug || cat.categories_id || cat.name} value={cat.slug || cat.categories_id || cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </nav>
            <button
              className="text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-in-out bg-transparent border-none cursor-pointer text-base"
              onClick={() => setShowThreadModal(true)}
            >
              + New Thread
            </button>
            <button
              className="text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-in-out bg-transparent border-none cursor-pointer text-base"
              onClick={() => setShowCategoryModal(true)}
            >
              + New Category
            </button>
          </div>

          {/* CENTER (search bar) */}
          <div className="justify-self-stretch md:justify-self-center w-full">
            <div className="w-full md:max-w-xl">
              <div className="min-h-[44px] flex items-center">
                <SearchBar
                  onSearch={(q) => {
                    const trimmed = String(q || '').trim();
                    if (!trimmed) return;
                    // navigate to search results page on submit
                    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
                  }}
                  className="w-full min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* RIGHT (desktop) */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 justify-self-end">
            <button
              className="text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-in-out bg-transparent border-none cursor-pointer text-base"
              onClick={() => navigate("/#explore")}
            >
              Explore
            </button>

            <div className="flex items-center gap-3 ml-4 flex-nowrap">
                  {!loggedIn ? (
                <>
                  <button
                    className="h-[44px] px-5 font-medium whitespace-nowrap rounded-md border border-slate-300 text-base text-slate-700 transition-colors duration-200 ease-in-out hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </button>
                  <button
                    className="h-[44px] px-5 font-medium whitespace-nowrap rounded-md bg-gray-900 text-white text-base transition-colors duration-200 ease-in-out hover:bg-gray-700 hover:text-white"
                    onClick={() => navigate("/signup")}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    className="flex items-center justify-center overflow-hidden rounded-full border border-gray-300 shadow-inner transition-shadow duration-200 ease-in-out hover:bg-cyan-200 min-h-[44px] w-[44px]"
                    onClick={() => setShowProfileMenu((v) => !v)}
                  >
                    <span className="sr-only">Toggle dashboard menu</span>
                    <img
                      src={user?.avatar || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1770&auto=format&fit=crop"}
                      alt={user ? user.username : "User"}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </button>

                  {showProfileMenu && (
                    <div
                      className="absolute right-0 z-10 mt-0.5 w-56 rounded-md border border-gray-100 bg-white shadow-lg"
                      role="menu"
                    >
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/profile');
                          }}
                          className="block text-left w-full rounded-lg px-4 py-2 text-base text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                          role="menuitem"
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            navigate('/subreddits');
                          }}
                          className="block text-left w-full rounded-lg px-4 py-2 text-base text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                          role="menuitem"
                        >
                          Categories 
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await logout();
                            } finally {
                              setShowProfileMenu(false);
                              navigate('/');
                            }
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-base text-red-700 hover:bg-red-50"
                          role="menuitem"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                            />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* HAMBURGER (mobile) */}
          <div className="md:hidden justify-self-end">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center h-[44px] w-[44px] rounded-md border border-slate-300 hover:bg-slate-50 transition-colors duration-200 ease-in-out"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="text-slate-700"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 bg-black/40 z-50"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85%] bg-white shadow-xl border-l border-slate-200 transform transition-transform duration-200 ease-out translate-x-0 text-base font-medium"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-200">
              <a
                href="/"
                className="flex items-center gap-2 font-semibold text-slate-800"
                onClick={() => setOpen(false)}
              >
                <img src={logo} alt="Site logo" className="w-7 h-7" />
                <span>Threadly</span>
              </a>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="h-[44px] w-[44px] inline-flex items-center justify-center rounded-md hover:bg-slate-50"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="text-slate-700"
                >
                  <path
                    d="M6 6l12 12M18 6l-12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="p-4 space-y-4">
              <a
                href="/"
                className="block text-slate-700 hover:text-slate-900 text-base font-medium"
                onClick={() => setOpen(false)}
              >
                Explore
              </a>
              <button
                type="button"
                className="block text-left w-full text-slate-700 hover:text-slate-900 text-base font-medium"
                onClick={() => { setShowThreadModal(true); setOpen(false); }}
   
              >
                Create a Thread
              </button>
              <button
                type="button"
                className="block text-left w-full text-slate-700 hover:text-slate-900 text-base font-medium"
                onClick={() => {
                  setShowCategoryModal(true);
                  setOpen(false);
                }}
              >
                Create a Category
              </button>

              <div className="space-y-1">
                <label
                  htmlFor="m-category-select"
                  className="text-base text-slate-600"
                >
                  Category
                </label>
                <select
                  id="m-category-select"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-base"
                  value={selectedCategory || ""}
                  onChange={(e) => {
                    onCategoryChange &&
                      onCategoryChange(e.target.value || null);
                    setOpen(false);
                  }}
                >
                  <option value="">All Categories</option>
                  {localCategories.map((cat) => (
                    <option key={cat.slug || cat.categories_id || cat.name} value={cat.slug || cat.categories_id || cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Buttons */}
              <div className="pt-4 flex gap-3">
                {!loggedIn ? (
                  <>
                    <button
                      className="flex-1 h-[44px] px-5 rounded-md border border-slate-300 text-base font-medium text-slate-700 transition-colors duration-200 ease-in-out hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => {
                        navigate("/login");
                        setOpen(false);
                      }}
                    >
                      Log in
                    </button>
                    <button
                      className="flex-1 h-[44px] px-5 rounded-md bg-gray-900 text-white text-base font-medium transition-colors duration-200 ease-in-out hover:bg-gray-700 hover:text-white"
                      onClick={() => {
                        navigate("/signup");
                        setOpen(false);
                      }}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex-1 h-[44px] px-5 rounded-md border border-slate-300 text-base font-medium text-slate-700 transition-colors duration-200 ease-in-out hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => {
                        navigate('/profile');
                        setOpen(false);
                      }}
                    >
                      Profile
                    </button>
                    <button
                      className="w-full h-[44px] px-5 rounded-md bg-red-50 text-red-700 text-base font-medium hover:bg-red-100"
                      onClick={async () => {
                        try {
                          await logout();
                        } finally {
                          setOpen(false);
                          navigate('/');
                        }
                      }}
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={localCategories}
        onCreate={defaultCreateCategory}
      />
      <ThreadModal
        isOpen={showThreadModal}
        onClose={() => setShowThreadModal(false)}
        onCreate={defaultCreateThread}
        categories={localCategories}
        selectedCategory={selectedCategory}
      />
    </>
  );
}
