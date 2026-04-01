import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Save, LayoutTemplate } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

export default function AdminFooterManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brandName, setBrandName] = useState('ILLUMINATION');
  const [description, setDescription] = useState("Votre Sanctuaire Numérique d'Enseignements Ésotériques et Initiatiques par Déodatus Yosèf.");
  const [copyrightText, setCopyrightText] = useState('ILLUMINATION. Tous droits réservés.');
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'footer');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBrandName(data.brandName || 'ILLUMINATION');
          setDescription(data.description || "Votre Sanctuaire Numérique d'Enseignements Ésotériques et Initiatiques par Déodatus Yosèf.");
          setCopyrightText(data.copyrightText || 'ILLUMINATION. Tous droits réservés.');
          setTermsContent(data.termsContent || '');
          setPrivacyContent(data.privacyContent || '');
          if (data.socialLinks) {
            setSocialLinks({
              facebook: data.socialLinks.facebook || '',
              twitter: data.socialLinks.twitter || '',
              instagram: data.socialLinks.instagram || '',
              linkedin: data.socialLinks.linkedin || ''
            });
          }
        }
      } catch (err) {
        console.error('Error fetching footer settings:', err);
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
      await setDoc(doc(db, 'settings', 'footer'), {
        brandName,
        description,
        copyrightText,
        termsContent,
        privacyContent,
        socialLinks,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (dbErr) {
      console.error('Error saving footer settings to Firestore:', dbErr);
      setError('Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setSaving(false);
    }
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSocialLinks(prev => ({ ...prev, [name]: value }));
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
        <LayoutTemplate className="w-6 h-6 text-gold" />
        <h2 className="text-xl font-serif font-bold text-gray-100">Gestion du Pied de Page</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-900/50 text-green-400 p-4 rounded-xl">
            Paramètres du pied de page mis à jour avec succès !
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom de la marque</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Texte du Copyright</label>
            <input
              type="text"
              value={copyrightText}
              onChange={(e) => setCopyrightText(e.target.value)}
              className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
              required
            />
            <p className="text-xs text-gray-500 mt-1">L'année courante sera ajoutée automatiquement au début.</p>
          </div>

          <div className="pt-6 border-t border-obsidian-light">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Pages Légales</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Conditions d'utilisation</label>
                <textarea
                  value={termsContent}
                  onChange={(e) => setTermsContent(e.target.value)}
                  rows={6}
                  placeholder="Saisissez le contenu des conditions d'utilisation ici..."
                  className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Politique de confidentialité</label>
                <textarea
                  value={privacyContent}
                  onChange={(e) => setPrivacyContent(e.target.value)}
                  rows={6}
                  placeholder="Saisissez le contenu de la politique de confidentialité ici..."
                  className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-obsidian-light">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Réseaux Sociaux (Optionnel)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Facebook URL</label>
                <input
                  type="url"
                  name="facebook"
                  value={socialLinks.facebook}
                  onChange={handleSocialChange}
                  placeholder="https://facebook.com/..."
                  className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Twitter URL</label>
                <input
                  type="url"
                  name="twitter"
                  value={socialLinks.twitter}
                  onChange={handleSocialChange}
                  placeholder="https://twitter.com/..."
                  className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Instagram URL</label>
                <input
                  type="url"
                  name="instagram"
                  value={socialLinks.instagram}
                  onChange={handleSocialChange}
                  placeholder="https://instagram.com/..."
                  className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  name="linkedin"
                  value={socialLinks.linkedin}
                  onChange={handleSocialChange}
                  placeholder="https://linkedin.com/..."
                  className="w-full bg-obsidian border border-obsidian-light text-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-obsidian rounded-xl font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  );
}
