'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck } from 'react-icons/fi';

interface Category {
  id: string;
  name: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    price: string;
    categories: string[];
    image: string;
    color: string;
    inStock: boolean;
  }>({
    name: '',
    description: '',
    price: '',
    categories: [],
    image: '',
    color: '',
    inStock: true,
  });

  const fetchData = async () => {
    try {
      const [productsSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'categories')),
      ]);
      setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      const cats = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(cats);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      price: '',
      categories: categories[0]?.name ? [categories[0].name] : [],
      image: '',
      color: '',
      inStock: true,
    });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const cats =
      p.categories && p.categories.length > 0
        ? p.categories
        : p.category
        ? [p.category]
        : [];
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      categories: cats,
      image: p.image,
      color: p.color || '',
      inStock: p.inStock,
    });
    setShowModal(true);
  };

  const toggleCategory = (name: string) => {
    setForm(prev => {
      const has = prev.categories.includes(name);
      return {
        ...prev,
        categories: has ? prev.categories.filter(c => c !== name) : [...prev.categories, name],
      };
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.image) { toast.error('Name, price, and image are required'); return; }
    if (form.categories.length === 0) {
      toast.error('Pick at least one category');
      return;
    }
    try {
      const data = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.categories[0],
        categories: form.categories,
        image: form.image,
        color: form.color || null,
        inStock: form.inStock,
        createdAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, 'products', editing.id), data);
        toast.success('Product updated');
      } else {
        await addDoc(collection(db, 'products'), data);
        toast.success('Product added');
      }
      setShowModal(false);
      fetchData();
    } catch (e) { toast.error('Failed to save'); console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Product deleted');
      fetchData();
    } catch (e) { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <button onClick={openAdd} className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
          <FiPlus /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <p className="text-gray-400 text-center py-20">No products yet. Add your first product!</p>
      ) : (
        <div className="grid gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-dark-700/50 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={p.image} alt={p.name} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{p.name}</h3>
                <p className="text-gray-400 text-sm">
                  {((p.categories && p.categories.length > 0) ? p.categories : [p.category]).join(', ')}
                  {p.color && ` • ${p.color}`}
                </p>
              </div>
              <span className="text-secondary font-bold">{p.price} EGP</span>
              <span className={`px-2 py-1 rounded-full text-xs ${p.inStock ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {p.inStock ? 'In Stock' : 'Out'}
              </span>
              <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-primary transition"><FiEdit2 size={18} /></button>
              <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-400 transition"><FiTrash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-700 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><FiX size={20} /></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Product Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />
              <textarea placeholder="Description" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none resize-none" />
              <input type="number" placeholder="Price (EGP)" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />

              {/* Multi-category picker */}
              <div>
                <p className="text-gray-400 text-xs mb-2">
                  Categories <span className="text-gray-500">(pick one or more)</span>
                </p>
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No categories yet. Create some in the Categories page.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                      const selected = form.categories.includes(cat.name);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.name)}
                          aria-pressed={selected}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
                            selected
                              ? 'bg-primary border-primary text-white'
                              : 'bg-dark-600 border-white/10 text-gray-300 hover:border-white/20'
                          }`}
                        >
                          {selected && <FiCheck size={12} />}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.categories.length > 1 && (
                  <p className="text-gray-500 text-xs mt-2">
                    Primary category: <span className="text-primary">{form.categories[0]}</span> (first in the list).
                  </p>
                )}
              </div>

              <input type="text" placeholder="Image URL (e.g. /images/white-nfc-card.png)" value={form.image} onChange={e => setForm({...form, image: e.target.value})}
                className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />
              <input type="text" placeholder="Color (optional)" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none" />
              <label className="flex items-center gap-3 text-white">
                <input type="checkbox" checked={form.inStock} onChange={e => setForm({...form, inStock: e.target.checked})} className="accent-primary w-4 h-4" />
                In Stock
              </label>
              <button onClick={handleSave} className="w-full bg-primary hover:bg-primary/80 text-white py-3 rounded-xl font-semibold transition">
                {editing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}