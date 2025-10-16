import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../images/spool-of-thread.png";

function getHeaderButtonVisibility(pathname) {
  return {
    showLogin: pathname !== "/login",
    showSignup: pathname !== "/signup",
    showCategorySelect: pathname === "/",
  };
}

const Header = ({ categories = [], selectedCategory, onCategoryChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showLogin, showSignup, showCategorySelect } = getHeaderButtonVisibility(
    location.pathname,
  );
  // Placeholder for session tracking. Replace with real session logic.
  const isLoggedIn = false; // TODO: Replace with session/auth state
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  return (
    <header className="bg-white w-full">
      <div className="mx-auto w-full px-2 sm:px-4 md:px-6">
        <div className="flex flex-row items-center justify-between h-16 gap-2 sm:gap-4 md:gap-8 w-full">
          {/* Left side: logo and category select */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-shrink-0">
            <button
              className="flex items-center gap-2 text-teal-600 bg-transparent border-none cursor-pointer"
              aria-label="Home"
              onClick={() => navigate("/")}
            >
              <img src={logo} alt="Site logo" className="w-7 h-7" />
              <span className="font-bold text-slate-800 text-base md:flex hidden">Threadly</span>
            </button>
            {/* Category select dropdown, only visible on allowed routes */}
            {showCategorySelect && (
              <div className="flex items-center">
                <label htmlFor="category-select" className="sr-only">
                  Select category
                </label>
                <select
                  id="category-select"
                  className="bg-transparent text-slate-800 border-none border-slate-200 rounded-md px-3 py-2 text-base"
                  value={selectedCategory || ""}
                  onChange={(e) =>
                    onCategoryChange && onCategoryChange(e.target.value || null)
                  }
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {/* Center: search bar */}
          <div className="flex-1 flex justify-center min-w-0 px-2 sm:px-4 md:px-6">
            <form className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  id="Search"
                  className="mt-0.5 w-full min-h-[44px] rounded border border-gray-300 shadow-sm text-base px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all duration-200"
                  placeholder="Search..."
                />
                <span className="absolute inset-y-0 right-2 grid w-8 place-content-center">
                  <button
                    type="submit"
                    aria-label="Submit"
                    className="rounded-full p-1.5 text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                      />
                    </svg>
                  </button>
                </span>
              </div>
            </form>
          </div>
          {/* Right side: Explore, auth buttons, profile dropdown */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-shrink-0">
            <button
              className="text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-in-out bg-transparent border-none cursor-pointer text-base"
              onClick={() => navigate("/#explore")}
            >
              Explore
            </button>
            {/* Auth buttons or profile dropdown */}
            <div className="flex items-center gap-3 ml-4">
              {!isLoggedIn ? (
                <>
                    <button
                        className="px-5 py-2.5 font-medium rounded-md border border-slate-300 text-base text-slate-700 transition-colors duration-200 ease-in-out hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => navigate("/login")}
                    >
                        Log in
                    </button>
                    <button
                        className="px-5 py-2.5 font-medium rounded-md bg-gray-900 text-white text-base transition-colors duration-200 ease-in-out hover:bg-gray-700 hover:text-white"
                        onClick={() => navigate("/signup")}
                    >
                        Sign up
                    </button>
                </>
              ) : (
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    className="overflow-hidden rounded-full border border-gray-300 shadow-inner dark:border-gray-600 transition-shadow duration-200 ease-in-out hover:bg-cyan-200"
                    onClick={() => setShowProfileMenu(v => !v)}
                  >
                    <span className="sr-only">Toggle dashboard menu</span>
                    {/* placeholder image */}
                    <img
                      src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                      alt=""
                      className="size-10 object-cover"
                    />
                  </button>
                  {showProfileMenu && (
                    <div
                      className="absolute right-0 z-10 mt-0.5 w-56 rounded-md border border-gray-100 bg-white shadow-lg"
                      role="menu"
                    >
                      <div className="p-2">
                        <a
                          href="#"
                          className="block rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          role="menuitem"
                        >
                          Profile
                        </a>
                        <a
                          href="#"
                          className="block rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          role="menuitem"
                        >
                          Subreddit List
                        </a>
                        <form method="POST" action="#">
                          <button
                            type="submit"
                            className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                            role="menuitem"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="size-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                              />
                            </svg>
                            Logout
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
