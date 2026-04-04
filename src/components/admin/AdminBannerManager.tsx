import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadFile, deleteFile } from '../../lib/storage';
import { Loader2, Save, Image as ImageIcon, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { useAuth } from '../../contexts/AuthContext';

const PAGES = [
  { id: 'about', name: 'À Propos', bucket: 'about-banner' },
  { id: 'academy', name: 'Académie', bucket: 'academy-banner' },
  { id: 'contact', name: 'Contact', bucket: 'contact-banner' },
  { id: 'library', name: 'Bibliothèque', bucket: 'library-banner' },
  { id: 'sanctum_rituals', name: 'Rituels & Pratiques', bucket: 'sanctum-rituals-banner' },
  { id: 'sanctum_meditations', name: 'Méditation Collective', bucket: 'sanctum-meditations-banner' },
  { id: 'sanctum_consultations', name: 'Consultations Spirituelles', bucket: 'sanctum-consultations-banner' },
  { id: 'sanctum_lucis', name: 'Sanctum Lucis', bucket: 'sanctum-lucis-banner' },
];

export default function AdminBannerManager() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [banners, setBanners] = useState<Record<string, { imageUrl: string, storagePath: string }>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const bannersData: Record<string, any> = {};
        for (const page of PAGES) {
          const docRef = doc(db, 'page_banners', page.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            bannersData[page.id] = docSnap.data();
          }
        }
        setBanners(bannersData);
      } catch (err) {
        console.error('Error fetching banners:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  const handleFileChange = (pageId: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [pageId]: file }));
  };

  const handleSave = async (pageId: string, bucket: string) => {
    const file = files[pageId];
    if (!file) return;

    setSaving(pageId);
    setError(null);
    setSuccess(null);

    try {
      const currentBanner = banners[pageId];
      
      // Delete old image if it exists
      if (currentBanner?.imageUrl && currentBanner.imageUrl.includes('supabase.co')) {
        try {
          await deleteFile(currentBanner.imageUrl);
        } catch (delErr) {
          console.error(`Failed to delete old banner for ${pageId}:`, delErr);
        }
      }

      // Upload new image
      const uploadResult = await uploadFile(file, bucket);
      
      // Save to Firestore
      await setDoc(doc(db, 'page_banners', pageId), {
        pageName: pageId,
        imageUrl: uploadResult.url,
        storagePath: uploadResult.path,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid
      }, { merge: true });

      setBanners(prev => ({
        ...prev,
        [pageId]: { imageUrl: uploadResult.url, storagePath: uploadResult.path }
      }));
      setFiles(prev => ({ ...prev, [pageId]: null }));
      
      setSuccess(`Bannière pour "${PAGES.find(p => p.id === pageId)?.name}" mise à jour avec succès.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(`Error saving banner for ${pageId}:`, err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de la bannière.');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette bannière ?')) return;

    setSaving(pageId);
    setError(null);
    setSuccess(null);

    try {
      const currentBanner = banners[pageId];
      
      if (currentBanner?.imageUrl && currentBanner.imageUrl.includes('supabase.co')) {
        try {
          await deleteFile(currentBanner.imageUrl);
        } catch (delErr) {
          console.error(`Failed to delete old banner for ${pageId}:`, delErr);
        }
      }

      await setDoc(doc(db, 'page_banners', pageId), {
        imageUrl: null,
        storagePath: null,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid
      }, { merge: true });

      setBanners(prev => {
        const newBanners = { ...prev };
        delete newBanners[pageId];
        return newBanners;
      });
      
      setSuccess(`Bannière pour "${PAGES.find(p => p.id === pageId)?.name}" supprimée.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(`Error deleting banner for ${pageId}:`, err);
      setError('Erreur lors de la suppression de la bannière.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="bg-obsidian-lighter rounded-2xl border border-obsidian-light overflow-hidden">
      <div className="p-6 border-b border-obsidian-light flex items-center gap-3">
        <ImageIcon className="w-6 h-6 text-gold" />
        <h2 className="text-xl font-serif font-bold text-gray-100">Gestion des Bannières</h2>
      </div>

      <div className="p-6 space-y-8">
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {PAGES.map(page => {
            const currentBanner = banners[page.id];
            const currentFile = files[page.id];
            const isSaving = saving === page.id;

            return (
              <div key={page.id} className="bg-obsidian p-6 rounded-xl border border-obsidian-light">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-200">{page.name}</h3>
                  {currentBanner?.imageUrl && (
                    <button
                      onClick={() => handleDelete(page.id)}
                      disabled={isSaving}
                      className="text-red-400 hover:text-red-300 transition-colors p-2 disabled:opacity-50"
                      title="Supprimer la bannière"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {currentBanner?.imageUrl && !currentFile && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-obsidian-light">
                      <img 
                        src={currentBanner.imageUrl} 
                        alt={`Bannière ${page.name}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {currentBanner?.imageUrl ? 'Remplacer l\'image' : 'Ajouter une image'}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => handleFileChange(page.id, e.target.files?.[0] || null)}
                        className="flex-grow px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                      />
                      <button
                        onClick={() => handleSave(page.id, page.bucket)}
                        disabled={!currentFile || isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Sauvegarder
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Format recommandé : 1920x300px. Poids max : 5MB. Formats : JPG, PNG, WEBP.
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
