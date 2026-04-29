'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');

  const fetchCategories = async () => {
    const snap = await getDocs(collection(db, 'categories'));
    setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      if (editing) {
        await updateDoc(doc(db, 'categories', editing.id), { name });
        toast.success('Category updated');
      } else {
        await addDoc(collection(db, 'categories'), { name });
        toast.success('Category added');
      }
      setShowModal(false);
      setName('');
      setEditing(null);
      fetchCategories();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Category deleted');
      fetchCategories();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Categories</h1>
        <button
          onClick={() => {
            setEditing(null);
            setName('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-xl transition"
        >
          <FiPlus /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-400 text-center py-20">No categories yet.</p>
      ) : (
        <div className="grid gap-4">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="bg-dark-700/50 border border-white/10 rounded-xl p-4 flex items-center justify-between"
            >
              <span className="text-white">{cat.name}</span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditing(cat);
                    setName(cat.name);
                    setShowModal(true);
                  }}
                  className="text-gray-400 hover:text-primary transition"
                >
                  <FiEdit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="text-gray-400 hover:text-red-400 transition"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-700 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Category name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
            />

            <button
              onClick={handleSave}
              className="w-full mt-4 bg-primary hover:bg-primary/80 text-white py-3 rounded-xl font-semibold transition"
            >
              {editing ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}