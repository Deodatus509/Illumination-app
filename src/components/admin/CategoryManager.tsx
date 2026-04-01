import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, Trash2, Edit, Save, X, Tag } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'blog' | 'library' | 'academy';
  createdAt: any;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'blog' | 'library' | 'academy'>('blog');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(fetchedCategories);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'categories');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), {
          name,
          type,
          updatedAt: serverTimestamp()
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'categories'), {
          name,
          type,
          createdAt: serverTimestamp()
        });
      }

      setName('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Erreur lors de la sauvegarde de la catégorie.');
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Erreur lors de la suppression de la catégorie.');
      handleFirestoreError(err, OperationType.DELETE, 'categories');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setType('blog');
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-obsidian rounded-lg border border-obsidian-light">
            <Tag className="w-5 h-5 text-gold" />
          </div>
          <h2 className="text-xl font-bold text-gray-100">
            {editingId ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
          </h2>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            Catégorie {editingId ? 'modifiée' : 'ajoutée'} avec succès !
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Nom de la catégorie</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type de contenu</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              >
                <option value="blog">Blog</option>
                <option value="library">Bibliothèque</option>
                <option value="academy">Académie</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-obsidian-light text-gray-300 font-medium rounded-lg hover:bg-obsidian transition-colors"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden">
        <div className="p-4 border-b border-obsidian-light bg-obsidian/50">
          <h3 className="text-lg font-bold text-gray-100">Liste des catégories</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-obsidian-light">
            <thead className="bg-obsidian">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nom</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th scope="col" className="relative px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-obsidian-lighter divide-y divide-obsidian-light">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-obsidian/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {category.type === 'blog' && 'Blog'}
                    {category.type === 'library' && 'Bibliothèque'}
                    {category.type === 'academy' && 'Académie'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Aucune catégorie trouvée.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
