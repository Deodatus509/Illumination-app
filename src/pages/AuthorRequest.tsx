import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Crown, Send, Loader2, ArrowLeft } from 'lucide-react';
import { PageBanner } from '../components/layout/PageBanner';

export function AuthorRequest() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: currentUser?.displayName || '',
    email: currentUser?.email || '',
    motivation: '',
    domains: '',
    experience: '',
    link: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addDoc(collection(db, 'author_requests'), {
        ...formData,
        user_id: currentUser.uid,
        status: 'pending',
        created_at: serverTimestamp()
      });

      setSubmitSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'author_requests');
      setSubmitError("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userProfile?.role === 'author' || userProfile?.role === 'admin' || userProfile?.role === 'editor') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gold mb-4">Vous êtes déjà auteur ou administrateur.</h2>
        <button onClick={() => navigate('/dashboard')} className="text-mystic-purple hover:underline">
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageBanner pageName="author-request" title="Devenir Auteur" />
      
      <div className="max-w-3xl mx-auto px-4 py-12 w-full">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-gold transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </button>

        {submitSuccess ? (
          <div className="bg-obsidian-lighter p-8 rounded-2xl border border-obsidian-light text-center">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-100 mb-4">Demande envoyée avec succès !</h3>
            <p className="text-gray-400 mb-8">
              Notre équipe va examiner votre demande. Vous recevrez une notification une fois qu'elle aura été traitée.
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gold text-obsidian font-bold rounded-lg hover:bg-gold-light transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>
        ) : (
          <div className="bg-obsidian-lighter p-8 rounded-2xl border border-obsidian-light">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-mystic-purple/20 rounded-xl">
                <Crown className="w-8 h-8 text-mystic-purple-light" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Candidature Auteur</h2>
                <p className="text-gray-400">Partagez votre lumière et vos enseignements avec la communauté.</p>
              </div>
            </div>

            {submitError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Nom complet</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="domains" className="block text-sm font-medium text-gray-300 mb-2">Domaines d'enseignement (ex: Astrologie, Kabbale, Méditation)</label>
                <input
                  type="text"
                  id="domains"
                  name="domains"
                  required
                  value={formData.domains}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-300 mb-2">Votre expérience</label>
                <textarea
                  id="experience"
                  name="experience"
                  required
                  rows={3}
                  value={formData.experience}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all resize-none"
                  placeholder="Décrivez brièvement votre parcours et votre expérience dans ces domaines..."
                ></textarea>
              </div>

              <div>
                <label htmlFor="motivation" className="block text-sm font-medium text-gray-300 mb-2">Pourquoi voulez-vous devenir Auteur ?</label>
                <textarea
                  id="motivation"
                  name="motivation"
                  required
                  rows={4}
                  value={formData.motivation}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all resize-none"
                ></textarea>
              </div>

              <div>
                <label htmlFor="link" className="block text-sm font-medium text-gray-300 mb-2">Lien ou document (optionnel)</label>
                <input
                  type="url"
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  placeholder="https://votre-site.com ou lien vers un document"
                  className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-mystic-purple text-white font-bold rounded-lg hover:bg-mystic-purple-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer la demande
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
