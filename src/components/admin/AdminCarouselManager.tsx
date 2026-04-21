import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, doc, setDoc, getDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { uploadFile, deleteFile } from '../../lib/storage';
import { Loader2, Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Check, MoveUp, MoveDown, AlertTriangle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { useAuth } from '../../contexts/AuthContext';

const PAGES = [
  { id: 'home', name: 'Accueil', bucket: 'home-carousel' },
  { id: 'academy', name: 'Académie', bucket: 'academy-carousel' },
  { id: 'library', name: 'Bibliothèque', bucket: 'library-carousel' },
  { id: 'blog', name: 'Blog', bucket: 'blog-carousel' },
];

interface CarouselItem {
  id: string;
  page: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  orderIndex: number;
  isActive: boolean;
}

export default function AdminCarouselManager() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [globalSettings, setGlobalSettings] = useState<Record<string, boolean>>({
    home: true, academy: true, library: true, blog: true
  });
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [editingItem, setEditingItem] = useState<Partial<CarouselItem> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'carousels'), orderBy('orderIndex', 'asc'));
      const snapshot = await getDocs(q);
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselItem));
      setItems(fetchedItems);
    } catch (err) {
      console.error('Error fetching carousels:', err);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch items
      await fetchItems();

      // Fetch global settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'carousels'));
      if (settingsDoc.exists()) {
        setGlobalSettings(settingsDoc.data() as Record<string, boolean>);
      } else {
        // Initialize if not exists
        await setDoc(doc(db, 'settings', 'carousels'), {
          home: true, academy: true, library: true, blog: true
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobalStatus = async () => {
    const newStatus = !globalSettings[activePage];
    try {
      await setDoc(doc(db, 'settings', 'carousels'), {
        [activePage]: newStatus
      }, { merge: true });
      setGlobalSettings(prev => ({ ...prev, [activePage]: newStatus }));
      setSuccess(`Carrousel ${newStatus ? 'activé' : 'désactivé'} pour la page ${PAGES.find(p => p.id === activePage)?.name}.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error toggling global status:', err);
      setError('Erreur lors de la modification du statut global.');
    }
  };

  const handleSave = async () => {
    if (!editingItem?.title || !editingItem?.page) {
      setError('Le titre et la page sont obligatoires.');
      return;
    }

    if (!editingItem.id && !selectedFile) {
      setError('Une image est obligatoire pour un nouvel élément.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let imageUrl = editingItem.imageUrl;

      if (selectedFile) {
        const bucket = PAGES.find(p => p.id === editingItem.page)?.bucket || 'home-carousel';
        const uploadResult = await uploadFile(selectedFile, bucket);
        imageUrl = uploadResult.url;

        // Delete old image if replacing
        if (editingItem.imageUrl && editingItem.imageUrl.includes('supabase.co')) {
          try {
            await deleteFile(editingItem.imageUrl);
          } catch (delErr) {
            console.error('Failed to delete old image:', delErr);
          }
        }
      }

      const isNew = !editingItem.id;
      const docRef = isNew ? doc(collection(db, 'carousels')) : doc(db, 'carousels', editingItem.id!);
      
      const itemData = {
        page: editingItem.page,
        title: editingItem.title,
        description: editingItem.description || '',
        imageUrl,
        link: editingItem.link || '',
        orderIndex: editingItem.orderIndex ?? items.filter(i => i.page === editingItem.page).length,
        isActive: editingItem.isActive ?? true,
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {})
      };

      await setDoc(docRef, itemData, { merge: true });
      
      setSuccess(isNew ? 'Élément ajouté avec succès.' : 'Élément mis à jour avec succès.');
      setEditingItem(null);
      setSelectedFile(null);
      fetchItems();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving carousel item:', err);
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CarouselItem) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    setSaving(true);
    try {
      if (item.imageUrl && item.imageUrl.includes('supabase.co')) {
        await deleteFile(item.imageUrl);
      }
      await deleteDoc(doc(db, 'carousels', item.id));
      setSuccess('Élément supprimé.');
      fetchItems();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Erreur lors de la suppression.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: CarouselItem) => {
    try {
      await setDoc(doc(db, 'carousels', item.id), {
        isActive: !item.isActive,
        updatedAt: serverTimestamp()
      }, { merge: true });
      fetchItems();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const handleMove = async (item: CarouselItem, direction: 'up' | 'down') => {
    const pageItems = items.filter(i => i.page === item.page).sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = pageItems.findIndex(i => i.id === item.id);
    
    if (
      (direction === 'up' && currentIndex === 0) || 
      (direction === 'down' && currentIndex === pageItems.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetItem = pageItems[targetIndex];

    try {
      // Swap orderIndex
      await setDoc(doc(db, 'carousels', item.id), { orderIndex: targetItem.orderIndex }, { merge: true });
      await setDoc(doc(db, 'carousels', targetItem.id), { orderIndex: item.orderIndex }, { merge: true });
      fetchItems();
    } catch (err) {
      console.error('Error moving item:', err);
    }
  };

  const filteredItems = items.filter(item => item.page === activePage).sort((a, b) => a.orderIndex - b.orderIndex);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="bg-obsidian-lighter rounded-2xl border border-obsidian-light overflow-hidden">
      <div className="p-6 border-b border-obsidian-light flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-gold" />
          <h2 className="text-xl font-serif font-bold text-gray-100">Gestion des Carrousels</h2>
        </div>
        <button
          onClick={() => setEditingItem({ page: activePage, isActive: true, orderIndex: filteredItems.length })}
          disabled={filteredItems.length >= 10}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={filteredItems.length >= 10 ? "Maximum 10 images atteint" : ""}
        >
          <Plus className="w-5 h-5" />
          Ajouter une image
        </button>
      </div>

      <div className="p-6">
        {/* Page Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PAGES.map(page => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activePage === page.id 
                  ? 'bg-gold text-obsidian' 
                  : 'bg-obsidian text-gray-400 hover:text-gray-200 border border-obsidian-light'
              }`}
            >
              {page.name}
            </button>
          ))}
        </div>

        {/* Global Settings & Warnings */}
        <div className="mb-8 p-4 bg-obsidian rounded-xl border border-obsidian-light flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="globalActive"
              checked={globalSettings[activePage] ?? true}
              onChange={handleToggleGlobalStatus}
              className="w-5 h-5 rounded border-obsidian-light text-gold focus:ring-gold bg-obsidian-lighter"
            />
            <label htmlFor="globalActive" className="text-gray-200 font-medium">
              Afficher le carrousel sur la page {PAGES.find(p => p.id === activePage)?.name}
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              Éléments actifs : <strong className="text-gray-200">{filteredItems.filter(i => i.isActive).length}/10</strong>
            </span>
            {filteredItems.filter(i => i.isActive).length < 5 && (
              <div className="flex items-center gap-1 text-amber-400 text-sm bg-amber-400/10 px-2 py-1 rounded">
                <AlertTriangle className="w-4 h-4" />
                <span>Minimum 5 requis</span>
              </div>
            )}
            {filteredItems.filter(i => i.isActive).length >= 10 && (
              <div className="flex items-center gap-1 text-blue-400 text-sm bg-blue-400/10 px-2 py-1 rounded">
                <span>Maximum atteint</span>
              </div>
            )}
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Edit Form */}
        {editingItem && (
          <div className="mb-8 p-6 bg-obsidian rounded-xl border border-obsidian-light">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-200">
                {editingItem.id ? 'Modifier l\'image' : 'Nouvelle image'}
              </h3>
              <button onClick={() => { setEditingItem(null); setSelectedFile(null); }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={editingItem.title || ''}
                    onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Lien du bouton (optionnel)</label>
                  <input
                    type="text"
                    value={editingItem.link || ''}
                    onChange={e => setEditingItem({ ...editingItem, link: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingItem.isActive ?? true}
                    onChange={e => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-obsidian-light text-gold focus:ring-gold bg-obsidian-lighter"
                  />
                  <label htmlFor="isActive" className="text-gray-300 font-medium">Image active</label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Image *</label>
                  {editingItem.imageUrl && !selectedFile && (
                    <div className="mb-4 relative w-full h-32 rounded-lg overflow-hidden border border-obsidian-light">
                      <img src={editingItem.imageUrl || undefined} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                  />
                  <p className="text-xs text-gray-500 mt-2">Format recommandé : 1920x400px. Poids max : 5MB.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucune image pour ce carrousel.</p>
          ) : (
            filteredItems.map((item, index) => (
              <div key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${item.isActive ? 'bg-obsidian border-obsidian-light' : 'bg-obsidian/50 border-obsidian-lighter opacity-75'}`}>
                {/* Image Preview */}
                <div className="w-32 h-20 rounded-lg overflow-hidden shrink-0">
                  <img src={item.imageUrl || undefined} alt={item.title} className="w-full h-full object-cover" />
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <h4 className="text-lg font-bold text-gray-200 truncate">{item.title}</h4>
                  <p className="text-sm text-gray-400 truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {item.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    {item.link && <span className="text-xs text-blue-400 truncate">Lien: {item.link}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col gap-1 mr-2">
                    <button 
                      onClick={() => handleMove(item, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleMove(item, 'down')}
                      disabled={index === filteredItems.length - 1}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`p-2 rounded-lg transition-colors ${item.isActive ? 'text-green-400 hover:bg-green-400/10' : 'text-gray-400 hover:bg-gray-400/10'}`}
                    title={item.isActive ? 'Désactiver' : 'Activer'}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
