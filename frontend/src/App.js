import React, { useMemo, useState } from 'react';
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
<div className="app p-4">
  <Header
    categories={categories}
    selectedCategory={selectedCategory}
    onCategoryChange={setSelectedCategory}
  />
  <br />
  <main>
    <section className="section">
      <div className="container">
        {/* Keep heading for discoverability but move UI to header */}
      </div>
    </section>

    <section className="section alt">
      <div className="container p-6">
        <div className="section-header">
          <div className="flex gap-3">
            {['new','top','hot'].map(key => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  aria-pressed={isActive}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${isActive ? 'bg-slate-900 text-white border border-slate-800' : 'bg-transparent text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >{key.toUpperCase()}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Render thread list full-width so cards can stretch to the viewport edge */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <ThreadList
          threads={threads
            .filter(t => !selectedCategory || t.categorySlug === selectedCategory)
            .slice(0, 8)}
        />
      </div>
    </section>
  </main>
  <br />
  <Footer />
</div>
);
}


export default App;