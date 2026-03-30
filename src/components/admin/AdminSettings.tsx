import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Save, Facebook, Twitter, Instagram, Linkedin, Youtube, Globe } from 'lucide-react';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    website: ''
  });

  const [blogBanner, setBlogBanner] = useState({
    imageUrl: '',
    linkUrl: '',
    isActive: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'socialLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSocialLinks(prev => ({ ...prev, ...docSnap.data() }));
        }

        const bannerRef = doc(db, 'settings', 'blogBanner');
        const bannerSnap = await getDoc(bannerRef);
        if (bannerSnap.exists()) {
          setBlogBanner(prev => ({ ...prev, ...bannerSnap.data() }));
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSocialLinks(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setBlogBanner(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await setDoc(doc(db, 'settings', 'socialLinks'), socialLinks);
      await setDoc(doc(db, 'settings', 'blogBanner'), blogBanner);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Erreur lors de l'enregistrement des paramètres.");
      handleFirestoreError(err, OperationType.UPDATE, 'settings/socialLinks');
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
    <div className="space-y-8">
      <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
        <h2 className="text-xl font-bold text-gray-100 mb-6">Réseaux Sociaux</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Ces liens apparaîtront sur la page de contact et dans le pied de page du site.
        </p>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            Paramètres enregistrés avec succès !
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Facebook className="w-4 h-4 text-[#1877F2]" /> Facebook
              </label>
              <input
                type="url"
                name="facebook"
                value={socialLinks.facebook}
                onChange={handleChange}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Twitter / X
              </label>
              <input
                type="url"
                name="twitter"
                value={socialLinks.twitter}
                onChange={handleChange}
                placeholder="https://twitter.com/..."
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Instagram className="w-4 h-4 text-[#E4405F]" /> Instagram
              </label>
              <input
                type="url"
                name="instagram"
                value={socialLinks.instagram}
                onChange={handleChange}
                placeholder="https://instagram.com/..."
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Linkedin className="w-4 h-4 text-[#0A66C2]" /> LinkedIn
              </label>
              <input
                type="url"
                name="linkedin"
                value={socialLinks.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Youtube className="w-4 h-4 text-[#FF0000]" /> YouTube
              </label>
              <input
                type="url"
                name="youtube"
                value={socialLinks.youtube}
                onChange={handleChange}
                placeholder="https://youtube.com/c/..."
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Globe className="w-4 h-4 text-gray-400" /> Site Web
              </label>
              <input
                type="url"
                name="website"
                value={socialLinks.website}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-obsidian-light">
            <h2 className="text-xl font-bold text-gray-100 mb-6">Bannière du Blog</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Configurez la bannière qui s'affiche en haut de la page du blog.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={blogBanner.isActive}
                  onChange={handleBannerChange}
                  className="w-5 h-5 rounded border-obsidian-light text-gold focus:ring-gold bg-obsidian"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
                  Activer la bannière
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL de l'image
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={blogBanner.imageUrl}
                  onChange={handleBannerChange}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lien de redirection (Optionnel)
                </label>
                <input
                  type="url"
                  name="linkUrl"
                  value={blogBanner.linkUrl}
                  onChange={handleBannerChange}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
