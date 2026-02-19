import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Package } from 'lucide-react';
import api from '../api';
import { getErrorMessage } from '../utils';

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/items');
      setItems(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/api/items', formData);
      setItems([...items, res.data]);
      setFormData({ name: '', description: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;

    try {
      await api.delete(`/api/items/${itemId}`);
      setItems(items.filter(item => item.item_id !== itemId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="items-loading">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto" data-testid="items-page">
      <div className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-2">Items</h1>
        <p className="text-muted-foreground">Manage your items with full CRUD operations</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Create Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-8" data-testid="create-item-form">
        <h2 className="font-heading text-xl font-bold text-primary mb-4">Create New Item</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="item-name" className="block text-sm font-semibold text-stone-700 mb-2">
              Name
            </label>
            <input
              id="item-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition"
              placeholder="Item name"
              required
              data-testid="item-name-input"
            />
          </div>
          <div>
            <label htmlFor="item-description" className="block text-sm font-semibold text-stone-700 mb-2">
              Description
            </label>
            <textarea
              id="item-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition resize-none"
              placeholder="Item description (optional)"
              rows="3"
              data-testid="item-description-input"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !formData.name.trim()}
            className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-6 py-3 font-bold hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            data-testid="create-item-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Item
              </>
            )}
          </button>
        </div>
      </form>

      {/* Items List */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-heading text-xl font-bold text-primary mb-4">Your Items</h2>
        
        {items.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-items">
            <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="text-stone-400">No items yet. Create your first item above.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="items-list">
            {items.map((item, index) => (
              <div
                key={item.item_id}
                className="flex items-start gap-4 p-4 rounded-xl border border-stone-200 hover:border-accent/30 hover:bg-stone-50/50 transition-all group"
                data-testid={`item-${index}`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-primary mb-1" data-testid={`item-name-${index}`}>
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-stone-500" data-testid={`item-description-${index}`}>
                      {item.description}
                    </p>
                  )}
                  <p className="text-xs text-stone-400 mt-2">
                    Created: {new Date(item.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.item_id)}
                  className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
                  aria-label="Delete item"
                  data-testid={`delete-item-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
