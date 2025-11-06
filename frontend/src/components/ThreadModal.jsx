import React, { useState, useEffect } from 'react';

export default function ThreadModal({ isOpen, onClose, categories = [], selectedCategory = null, onCreate }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState(selectedCategory || (categories[0] ? (categories[0].categories_id || categories[0].slug || categories[0].name) : ''));
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
    
  useEffect(() => {
    if (!isOpen) {
      // reset when closed
      setTitle('');
      setText('');
      setFile(null);
      setCategoryId(selectedCategory || (categories[0] ? (categories[0].categories_id || categories[0].slug || categories[0].name) : ''));
      setError(null);
    }
  }, [isOpen, selectedCategory, categories]);

  if (!isOpen) return null;

  // determine category flags
  const currentCategory = categories.find(c => (c.categories_id && String(c.categories_id) === String(categoryId)) || c.slug === categoryId || c.name === categoryId) || null;
  const textAllow = currentCategory ? Boolean(Number(currentCategory.text_allow ?? currentCategory.textAllow ?? 1)) : true;
  const photoAllow = currentCategory ? Boolean(Number(currentCategory.photo_allow ?? currentCategory.photoAllow ?? 1)) : true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setError(null);
    const MAX_TITLE = 120;
    if (!title || title.trim().length < 2) {
      setError('Please provide a title with at least 2 characters.');
      return;
    }
    if (title.trim().length > MAX_TITLE) {
      setError(`Title must be ${MAX_TITLE} characters or fewer.`);
      return;
    }

    // validate based on category flags
    if (photoAllow && !textAllow) {
      // image-only category
      if (!file) {
        setError('Please select an image to upload.');
        return;
      }
    }

    if (textAllow && !photoAllow) {
      // text-only category
      if (!text || text.trim().length === 0) {
        setError('Please enter the thread text.');
        return;
      }
    }

    // build payload: if file present send FormData, otherwise JSON
    setLoading(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('title', title.trim());
        fd.append('category_id', categoryId);
        // optional text
        if (text && text.trim()) fd.append('text', text.trim());
        await onCreate(fd);
      } else {
        const payload = { title: title.trim(), text: textAllow ? text.trim() : '', category_id: categoryId };
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
        console.error('onCreate handler failed', err);
        // Extract a friendly message if the error contains JSON (e.g. backend returns '{"ok":false,"message":"..."}')
        const getErrorMessage = (err) => {
          if (!err) return null;
          if (typeof err === 'string') return err;
          const msg = err.message || String(err);
          // try to find JSON payload in the message
          const jsonStart = msg.indexOf('{');
          const jsonEnd = msg.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonPart = msg.slice(jsonStart, jsonEnd + 1);
            try {
              const parsed = JSON.parse(jsonPart);
              if (parsed && parsed.message) return parsed.message;
            } catch (e) {
              // ignore parse errors
            }
          }
          // fallback: try to extract after status code text like 'Create thread failed: 401 ...'
          const parts = msg.split(':').map(p => p.trim()).filter(Boolean);
          return parts.length ? parts[parts.length - 1] : msg;
        };

        setError(getErrorMessage(err) || 'Failed to create thread');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg bg-white rounded-md shadow-lg">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-medium">Create a new Thread</h3>

          <label className="block mt-4">
            <span className="text-sm font-medium">Title</span>
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              />
              <div className="text-xs text-slate-500 mt-1">{title.trim().length}/120</div>
          </label>

          <label className="block mt-4">
            <span className="text-sm font-medium">Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2">
              {categories.map(c => (
                <option key={c.slug || c.categories_id || c.name} value={c.categories_id || c.slug || c.name}>{c.name}</option>
              ))}
            </select>
          </label>

          {/* Render inputs based on allowed types */}
          {textAllow && (
            <label className="block mt-4">
              <span className="text-sm font-medium">Text</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-1 block w-full rounded-md border px-3 py-2"
                rows={4}
              />
            </label>
          )}

          {photoAllow && (
            <label className="block mt-4">
              <span className="text-sm font-medium">Image</span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} className="mt-1 block w-full" />
            </label>
          )}

          <p className="text-sm text-red-600 mt-4">{error}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-md border">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-gray-900 text-white">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
