import React, { useState, useEffect } from 'react';

export default function CategoryModal({ isOpen, onClose, categories = [], onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [textAllow, setTextAllow] = useState(true);
  const [photoAllow, setPhotoAllow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      // reset when closed
      setTitle('');
      setDescription('');
      setTextAllow(true);
      setPhotoAllow(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!title || title.trim().length < 2) {
      setError('Please provide a title with at least 2 characters.');
      return;
    }
    if (!description || description.trim().length < 50) {
      setError('Please provide a description with at least 50 characters.');
      return;
    }
    if (!textAllow && !photoAllow) {
      setError('At least one post type (text or photo) must be allowed.');
      return;
    }

    const payload = {
      name: title,
      description: description,
      text_allow: textAllow,
      photo_allow: photoAllow,
    };

    setLoading(true);
    try {
      if (onCreate) {
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      console.error('onCreate handler failed', err);
      setError(err.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg bg-white rounded-md shadow-lg">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-medium">Create a new Category</h3>

          <label className="block mt-4">
            <span className="text-sm font-medium">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
          </label>

          <label className="block mt-4">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2"
              rows={3}
            />
          </label>

          <div className="flex gap-4 mt-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={textAllow} onChange={(e) => setTextAllow(e.target.checked)} />
              <span className="text-sm">Allow text posts</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={photoAllow} onChange={(e) => setPhotoAllow(e.target.checked)} />
              <span className="text-sm">Allow photo posts</span>
            </label>
          </div>
          <br></br>
        <p className="text-red-500">By creating this category you will be the sole moderator until we figure out how to add more :)</p>


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
