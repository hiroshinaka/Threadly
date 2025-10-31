import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './components/Signup';
import Login from './components/Login';
import './App.css';
import Header from './components/Header';
import AuthProvider from './context/AuthContext';
import ThreadList from './components/ThreadList';
import Profile from './components/Profile';
import Footer from './components/Footer';
import ThreadView from './components/ThreadView';
import SearchResults from './components/SearchResults';
// We'll fetch categories and threads from the backend instead of using mock data


function App() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'top' | 'hot'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [threadsData, setThreadsData] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    // fetch categories and threads from backend
    const load = async () => {
      try {
        const cRes = await fetch('/api/categories');
        if (cRes.ok) {
          const ct = cRes.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const cBody = await cRes.json();
            setCategories(cBody.categories || []);
          } else {
            const txt = await cRes.text();
            console.error('Expected JSON for /api/categories but got:', txt.slice(0, 400));
          }
        } else {
          const txt = await cRes.text().catch(() => null);
          console.error('Failed to fetch /api/categories', cRes.status, txt);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }

      try {
        const tRes = await fetch('/api/threads');
        if (tRes.ok) {
          const ct = tRes.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const tBody = await tRes.json();
            // threads router returns { ok:true, threads }
            setThreadsData(tBody.threads || []);
          } else {
            const txt = await tRes.text();
            console.error('Expected JSON for /api/threads but got:', txt.slice(0, 800));
            setThreadsData([]);
          }
        } else {
          const txt = await tRes.text().catch(() => null);
          console.error('Failed to fetch /api/threads', tRes.status, txt);
          setThreadsData([]);
        }
      } catch (err) {
        console.error('Failed to load threads', err);
      }
    };
    load();
  }, []);

  // reset visible count when sorting or category changes so the user sees the top of the new list
  useEffect(() => {
    setVisibleCount(8);
  }, [activeTab, selectedCategory]);

  // infinite scroll: when the user scrolls near the bottom, reveal more threads
  useEffect(() => {
    const onScroll = () => {
      // compute the total number of threads after category filtering (same logic used when rendering)
      const totalFiltered = threadsData.filter(t => {
        if (!selectedCategory) return true;
        const slug = t.categorySlug || t.category_slug || (t.category && t.category.slug);
        const id = t.categoryId || t.category_id || t.categories_id;
        const name = t.category && t.category.name;
        return selectedCategory === slug || selectedCategory === String(id) || selectedCategory === name;
      }).length;

      // only try to load more if we still have hidden threads
      if (visibleCount >= totalFiltered) return;

      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
      if (scrolledToBottom) {
        setVisibleCount(prev => Math.min(prev + 8, totalFiltered));
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [visibleCount, threadsData, selectedCategory, activeTab]);


  const threads = useMemo(() => {
    const now = Date.now();
    const scored = threadsData.map(t => {
      const createdAt = t.created_at || t.createdAt || new Date().toISOString();
      const likes = t.likes || 0;
      const commentCount = t.commentCount || t.comment_count || 0;
      // hours since creation (used for estimations)
      const hours = Math.max(1, (now - new Date(createdAt).getTime()) / 36e5);

      // Determine likes in the last hour. Prefer an explicit field if backend provides it
      // spreading total likes over hours and taking that per-hour rate as an estimate.
      const likesLastHour = Number(t.likes_last_hour ?? t.recent_likes ?? Math.round((likes) / hours));

      // hotScore for fallback/hybrid ranking (not used for final 'hot' sort when explicit data exists)
      const hot = likesLastHour || Math.log(1 + likes + commentCount) + (1 / hours);
      return { ...t, hotScore: hot, createdAt, likesLastHour };
    });

    if (activeTab === 'new') {
      return scored.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (activeTab === 'top') {
      // sort by total karma (server persistently tracks karma)
      return scored.sort((a, b) => ( (b.karma || b.karma_score || 0) - (a.karma || a.karma_score || 0) ));
    }
    // controversial: sort by number of comments (threads with more discussion bubble up)
    if (activeTab === 'controversial') {
      return scored.sort((a, b) => ((b.commentCount || b.comment_count || 0) - (a.commentCount || a.comment_count || 0)));
    }

    // fallback: if unknown tab, return by created date
    return scored.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeTab, threadsData]);


  return (
  <Router>
    <AuthProvider>
      <div className="app min-h-screen flex flex-col">
        <Header
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      <div className="flex-1 bg-gray-50">
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/t/:slug/:id" element={<ThreadView />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/" element={
          <main className="bg-gray-50">
            <section className="section">
              <div className="container">
              </div>
            </section>
            <section className="section alt py-6 max-w-7xl mx-auto">
              <div className="container mb-6 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="section-header">
                  <div className="flex gap-3">
                    {['new','top','controversial'].map(key => {
                      const isActive = activeTab === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveTab(key)}
                          aria-pressed={isActive}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out ${isActive ? 'bg-slate-900 text-white border border-slate-800' : 'bg-transparent text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'}`}
                        >{key.toUpperCase()}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="w-full px-4 sm:px-6 lg:px-8">
                <ThreadList
                  threads={threads
                    .filter(t => {
                      if (!selectedCategory) return true;
                      const slug = t.categorySlug || t.category_slug || (t.category && t.category.slug);
                      const id = t.categoryId || t.category_id || t.categories_id;
                      const name = t.category && t.category.name;
                      return selectedCategory === slug || selectedCategory === String(id) || selectedCategory === name;
                    })
                    .slice(0, visibleCount)}
                />
              </div>
            </section>
          </main>
        } />
      </Routes>
      </div>
        <Footer />
      </div>
    </AuthProvider>
  </Router>
);
}


export default App;