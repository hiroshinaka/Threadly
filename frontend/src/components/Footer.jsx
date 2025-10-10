import React from 'react';


export default function Footer() {
return (
    <footer className="footer">
        <div className="container footer-inner">
            <p>© {new Date().getFullYear()} Threadly · Built with React</p>
            <nav className="nav small">
            <a className="nav-link" href="#terms">Terms</a>
            <a className="nav-link" href="#privacy">Privacy</a>
        </nav>
        </div>
    </footer>
    );
}