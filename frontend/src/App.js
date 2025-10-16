import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './components/Signup';
import Login from './components/Login';
import './App.css';
import Header from './components/Header';
import ThreadList from './components/ThreadList';
import Footer from './components/Footer';
import { categories, threads as seedThreads } from './data/mock';


function App() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'top' | 'hot'
  const [selectedCategory, setSelectedCategory] = useState(null);


  const threads = useMemo(() => {
  const now = Date.now();
  const scored = seedThreads.map(t => {
  const hours = Math.max(1, (now - new Date(t.createdAt).getTime()) / 36e5);
  const hot = Math.log(1 + t.likes + t.commentCount) + (1 / hours); // simple, fast hot score
  return { ...t, hotScore: hot };
});


if (activeTab === 'new') {
  return scored.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
if (activeTab === 'top') {
  return scored.sort((a, b) => (b.likes + b.commentCount) - (a.likes + a.commentCount));
}
// hot
  return scored.sort((a, b) => b.hotScore - a.hotScore);
}, [activeTab]);


return (
  <Router>
    <div className="app">
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <main>
            <section className="section">
              <div className="container">
              </div>
            </section>
            <section className="section alt bg-gray-50 py-6">
              <div className="container mb-6 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="section-header">
                  <div className="flex gap-3">
                    {['new','top','hot'].map(key => {
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
                    .filter(t => !selectedCategory || t.categorySlug === selectedCategory)
                    .slice(0, 8)}
                />
              </div>
            </section>
          </main>
        } />
      </Routes>
      <Footer />
    </div>
  </Router>
);
}


export default App;