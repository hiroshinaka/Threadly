import React from 'react';
import logo from '../images/spool-of-thread.png';

export default function Header({ categories = [], selectedCategory, onCategoryChange }) {
    return (
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
            <div className="max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-6">
                        <a href="#home" className="flex items-center gap-2 font-bold text-slate-800" aria-label="Home">
                            <img src={logo} alt="Site logo" className="w-7 h-7" />
                            <span>Threadly</span>
                        </a>

                        <nav className="flex items-center gap-3">
                            <a className="text-slate-600 hover:text-slate-900 " href="#explore">Explore</a>
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

                    <div className="flex items-center gap-3">
                        <button className="px-3 py-1 rounded-md border border-slate-300 text-sm text-slate-700">Log in</button>
                        <button className="px-3 py-1 rounded-md bg-slate-900 text-white text-sm">Sign up</button>
                    </div>
                </div>
            </div>
        </header>
    );
}