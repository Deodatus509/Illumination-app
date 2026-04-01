import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadHomepageImage, deleteFile } from '../../lib/storage';
import { Loader2, Save, FileText } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

export default function AdminAboutManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionText1, setMissionText1] = useState('');
  const [missionText2, setMissionText2] = useState('');
  const [missionImageUrl, setMissionImageUrl] = useState('');
  const [missionImageStoragePath, setMissionImageStoragePath] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [features, setFeatures] = useState([
    { title: "Savoir Ancien", desc: "Des enseignements millénaires adaptés au monde moderne.", icon: "BookOpen" },
    { title: "Communauté", desc: "Un réseau de chercheurs partageant la même quête.", icon: "Users" },
    { title: "Excellence", desc: "Une qualité de contenu rigoureusement sélectionnée.", icon: "Star" },
    { title: "Protection", desc: "Un espace sécurisé pour votre évolution spirituelle.", icon: "Shield" }
  ]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'about');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title || '');
          setSubtitle(data.subtitle || '');
          setMissionTitle(data.missionTitle || '');
          setMissionText1(data.missionText1 || '');
          setMissionText2(data.missionText2 || '');
          setMissionImageUrl(data.missionImageUrl || '');
          setMissionImageStoragePath(data.missionImageStoragePath || '');
          if (data.features) {
            setFeatures(data.features);
          }
        }
      } catch (err) {
        console.error('Error fetching about settings:', err);
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
      let finalImageUrl = missionImageUrl;
      let finalImagePath = missionImageStoragePath;

      if (imageFile) {
        if (missionImageUrl && missionImageUrl.includes('supabase.co')) {
          try {
            await deleteFile(missionImageUrl);
          } catch (delErr) {
            console.error('Failed to delete old image:', delErr);
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

      try {
        await setDoc(doc(db, 'settings', 'about'), {
          title,
          subtitle,
          missionTitle,
          missionText1,
          missionText2,
          missionImageUrl: finalImageUrl,
          missionImageStoragePath: finalImagePath,
          features,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (dbErr) {
        console.error('Error saving about settings to Firestore:', dbErr);
        setError('Erreur lors de la sauvegarde des paramètres dans la base de données.');
        handleFirestoreError(dbErr, OperationType.WRITE, 'settings/about');
        setSaving(false);
        return;
      }

      setMissionImageUrl(finalImageUrl);
      setMissionImageStoragePath(finalImagePath);
      setImageFile(null);
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
          <FileText className="w-5 h-5 text-gold" />
        </div>
        <h2 className="text-xl font-bold text-gray-100">Gérer la page À Propos</h2>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Titre de la page</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="À Propos d'Illumination"
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Sous-titre</label>
              <textarea
                required
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Titre de la mission</label>
              <input
                type="text"
                required
                value={missionTitle}
                onChange={(e) => setMissionTitle(e.target.value)}
                placeholder="Notre Mission"
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Texte Mission 1</label>
              <textarea
                required
                value={missionText1}
                onChange={(e) => setMissionText1(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Texte Mission 2</label>
              <textarea
                required
                value={missionText2}
                onChange={(e) => setMissionText2(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Image de la Mission</label>
              <div className="mt-1 flex flex-col items-center gap-4">
                {missionImageUrl && !imageFile && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-obsidian-light">
                    <img src={missionImageUrl} alt="Mission" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-obsidian-light">
              <h3 className="text-lg font-medium text-gray-200 mb-4">Sections Cliquables</h3>
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="p-4 bg-obsidian border border-obsidian-light rounded-lg space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gold font-medium">Section {index + 1}</span>
                      <select
                        value={feature.icon}
                        onChange={(e) => {
                          const newFeatures = [...features];
                          newFeatures[index].icon = e.target.value;
                          setFeatures(newFeatures);
                        }}
                        className="bg-obsidian-lighter border border-obsidian-light rounded text-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gold"
                      >
                        <option value="BookOpen">Livre (Savoir)</option>
                        <option value="Users">Utilisateurs (Communauté)</option>
                        <option value="Star">Étoile (Excellence)</option>
                        <option value="Shield">Bouclier (Protection)</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => {
                        const newFeatures = [...features];
                        newFeatures[index].title = e.target.value;
                        setFeatures(newFeatures);
                      }}
                      placeholder="Titre"
                      className="w-full px-3 py-2 bg-obsidian-lighter border border-obsidian-light rounded text-gray-200 focus:outline-none focus:border-gold text-sm"
                    />
                    <textarea
                      value={feature.desc}
                      onChange={(e) => {
                        const newFeatures = [...features];
                        newFeatures[index].desc = e.target.value;
                        setFeatures(newFeatures);
                      }}
                      placeholder="Description"
                      rows={2}
                      className="w-full px-3 py-2 bg-obsidian-lighter border border-obsidian-light rounded text-gray-200 focus:outline-none focus:border-gold text-sm"
                    />
                  </div>
                ))}
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
