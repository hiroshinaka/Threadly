import React from 'react';


export default function Footer() {
    return (
    <footer className="bg-white py-8 relative z-50 border-t border-slate-200">
            <div className="max-w-full px-6 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-base text-slate-700 font-medium text-center md:text-left">
                    © {new Date().getFullYear()} Threadly · Built with React
                </div>
                <nav className="flex gap-8 text-sm font-normal">
                    <a className="text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-in-out" href="#terms">Terms</a>
                    <a className="text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-in-out" href="#privacy">Privacy</a>
                </nav>
            </div>
        </footer>
    );
}