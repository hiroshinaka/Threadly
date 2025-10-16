import React, { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="flex-1 flex justify-center min-w-0 px-2 sm:px-4 md:px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl"
      >
        <div className="relative">
          <input
            type="text"
            id="Search"
            value={query}
            onChange={handleChange}
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
  );
}
