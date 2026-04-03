import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';
import { Loader2, Plus, Heart, CheckCircle2, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function SanctumRituals() {
  const { currentUser, openAuthModal } = useAuth();
  const [rituals, setRituals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  // Submission Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchRituals();
  }, []);

  const fetchRituals = async () => {
    try {
      const q = query(collection(db, 'rituals'), where('is_active', '==', true));
      const snapshot = await getDocs(q);
      setRituals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching rituals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const addStep = () => {
    setSteps([...steps, '']);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmitRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const validSteps = steps.filter(s => s.trim() !== '');
    if (!title.trim() || !description.trim() || validSteps.length === 0) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'ritual_submissions'), {
        title: title.trim(),
        description: description.trim(),
        steps: validSteps,
        submitted_by: currentUser.uid,
        status: 'pending',
        created_at: serverTimestamp()
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowSubmitModal(false);
        setSubmitSuccess(false);
        setTitle('');
        setDescription('');
        setSteps(['']);
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ritual_submissions');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <PageBanner 
        pageName="sanctum_rituals"
        title="Rituels & Pratiques" 
      />

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <p className="text-xl text-gray-300 max-w-2xl">
            Découvrez des rituels puissants partagés par la communauté et nos experts. Pratiquez avec intention et respect.
          </p>
          <button 
            onClick={() => currentUser ? setShowSubmitModal(true) : openAuthModal()}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Proposer un rituel
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>
        ) : rituals.length === 0 ? (
          <div className="text-center py-12 bg-obsidian-lighter rounded-xl border border-obsidian-light">
            <p className="text-gray-400">Aucun rituel n'est disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rituals.map((ritual) => (
              <motion.div 
                key={ritual.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden"
              >
                <div className="p-6 border-b border-obsidian-light">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-serif font-bold text-gold">{ritual.title}</h3>
                    {ritual.price > 0 && (
                      <span className="bg-gold/10 text-gold px-3 py-1 rounded-full text-sm font-medium">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300">{ritual.description}</p>
                </div>
                
                <div className="p-6 bg-obsidian/50">
                  <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Étapes du rituel</h4>
                  <div className="space-y-4">
                    {ritual.steps?.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-mystic-purple/20 text-mystic-purple-light flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-gray-300 pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Ritual Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-obsidian-lighter border border-obsidian-light rounded-xl p-6 max-w-2xl w-full shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-gold">Proposer un Rituel</h3>
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-100 mb-2">Rituel soumis avec succès !</h4>
                <p className="text-gray-400">Votre proposition sera examinée par nos experts avant d'être publiée.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRitual} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Titre du rituel</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent"
                    placeholder="Ex: Rituel de purification matinale"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description / Intention</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent"
                    placeholder="Quel est le but de ce rituel ? Quand doit-il être pratiqué ?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Étapes (soyez précis)</label>
                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="flex-shrink-0 w-10 h-10 bg-obsidian border border-obsidian-light rounded-lg flex items-center justify-center text-gray-400 font-medium">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => handleStepChange(index, e.target.value)}
                          required
                          className="flex-1 bg-obsidian border border-obsidian-light rounded-lg p-2 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent"
                          placeholder={`Description de l'étape ${index + 1}`}
                        />
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addStep}
                    className="mt-3 text-sm text-gold hover:text-gold-light flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une étape
                  </button>
                </div>

                <div className="pt-6 border-t border-obsidian-light flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !description.trim() || steps[0].trim() === ''}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
                    Soumettre le rituel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
