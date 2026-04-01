import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadHomepageImage, deleteFile } from '../../lib/storage';
import { Loader2, Save, Image as ImageIcon, Eye } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

export default function HomepageManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageStoragePath, setHeroImageStoragePath] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Vision Section
  const [visionTitle, setVisionTitle] = useState('');
  const [visionText1, setVisionText1] = useState('');
  const [visionText2, setVisionText2] = useState('');
  const [visionImageUrl, setVisionImageUrl] = useState('');
  const [visionImageStoragePath, setVisionImageStoragePath] = useState('');
  const [visionImageFile, setVisionImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'homepage');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title || '');
          setSubtitle(data.subtitle || '');
          setHeroImageUrl(data.heroImageUrl || '');
          setHeroImageStoragePath(data.heroImageStoragePath || '');
          
          setVisionTitle(data.visionTitle || '');
          setVisionText1(data.visionText1 || '');
          setVisionText2(data.visionText2 || '');
          setVisionImageUrl(data.visionImageUrl || '');
          setVisionImageStoragePath(data.visionImageStoragePath || '');
        }
      } catch (err) {
        console.error('Error fetching homepage settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let finalImageUrl = heroImageUrl;
      let finalImagePath = heroImageStoragePath;

      if (imageFile) {
        if (heroImageUrl && heroImageUrl.includes('supabase.co')) {
          try {
            await deleteFile(heroImageUrl);
          } catch (delErr) {
            console.error('Failed to delete old hero image:', delErr);
          }
        }

        try {
          const uploadResult = await uploadHomepageImage(imageFile);
          finalImageUrl = uploadResult.url;
          finalImagePath = uploadResult.path;
        } catch (uploadErr) {
          console.error('Error uploading file:', uploadErr);
          setError(uploadErr instanceof Error ? uploadErr.message : 'Erreur lors du téléchargement de l\'image.');
          setSaving(false);
          return;
        }
      }

      let finalVisionImageUrl = visionImageUrl;
      let finalVisionImagePath = visionImageStoragePath;

      if (visionImageFile) {
        if (visionImageUrl && visionImageUrl.includes('supabase.co')) {
          try {
            await deleteFile(visionImageUrl);
          } catch (delErr) {
            console.error('Failed to delete old vision image:', delErr);
          }
        }

        try {
          const uploadResult = await uploadHomepageImage(visionImageFile);
          finalVisionImageUrl = uploadResult.url;
          finalVisionImagePath = uploadResult.path;
        } catch (uploadErr) {
          console.error('Error uploading file:', uploadErr);
          setError(uploadErr instanceof Error ? uploadErr.message : 'Erreur lors du téléchargement de l\'image de vision.');
          setSaving(false);
          return;
        }
      }

      try {
        await setDoc(doc(db, 'settings', 'homepage'), {
          title,
          subtitle,
          heroImageUrl: finalImageUrl,
          heroImageStoragePath: finalImagePath,
          visionTitle,
          visionText1,
          visionText2,
          visionImageUrl: finalVisionImageUrl,
          visionImageStoragePath: finalVisionImagePath,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (dbErr) {
        console.error('Error saving homepage settings to Firestore:', dbErr);
        setError('Erreur lors de la sauvegarde des paramètres dans la base de données.');
        handleFirestoreError(dbErr, OperationType.WRITE, 'settings/homepage');
        setSaving(false);
        return;
      }

      setHeroImageUrl(finalImageUrl);
      setHeroImageStoragePath(finalImagePath);
      setImageFile(null);
      
      setVisionImageUrl(finalVisionImageUrl);
      setVisionImageStoragePath(finalVisionImagePath);
      setVisionImageFile(null);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Unexpected error in handleSubmit:', err);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-obsidian rounded-lg border border-obsidian-light">
          <ImageIcon className="w-5 h-5 text-gold" />
        </div>
        <h2 className="text-xl font-bold text-gray-100">Gérer la page d'accueil</h2>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          Paramètres sauvegardés avec succès !
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Hero Section */}
        <div className="p-6 bg-obsidian rounded-xl border border-obsidian-light space-y-6">
          <h3 className="text-lg font-bold text-gold flex items-center gap-2">
            <ImageIcon className="w-5 h-5" /> Section Héro (Principale)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Titre principal</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Sous-titre</label>
                <textarea
                  required
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Image Héro</label>
                <div className="mt-1 flex flex-col items-center gap-4">
                  {heroImageUrl && !imageFile && (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-obsidian-light">
                      <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Section */}
        <div className="p-6 bg-obsidian rounded-xl border border-obsidian-light space-y-6">
          <h3 className="text-lg font-bold text-gold flex items-center gap-2">
            <Eye className="w-5 h-5" /> Section Vision
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Titre de la vision</label>
                <input
                  type="text"
                  required
                  value={visionTitle}
                  onChange={(e) => setVisionTitle(e.target.value)}
                  placeholder="La Vision de Déodatus Yosèf"
                  className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Paragraphe 1</label>
                <textarea
                  required
                  value={visionText1}
                  onChange={(e) => setVisionText1(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Paragraphe 2</label>
                <textarea
                  required
                  value={visionText2}
                  onChange={(e) => setVisionText2(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Image de Vision</label>
                <div className="mt-1 flex flex-col items-center gap-4">
                  {visionImageUrl && !visionImageFile && (
                    <div className="relative w-full aspect-[4/5] max-w-[300px] mx-auto rounded-lg overflow-hidden border border-obsidian-light">
                      <img src={visionImageUrl} alt="Vision" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVisionImageFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 bg-obsidian-lighter border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Sauvegarder les modifications
          </button>
        </div>
      </form>
    </div>
  );
}
