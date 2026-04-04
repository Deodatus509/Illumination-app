import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';
import { Loader2, ArrowLeft, Plus, Trash2, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function SanctumRitualPropose() {
  const { currentUser, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Général',
    level: 'Débutant',
    duration: '',
    objective: '',
    materials: [''],
    steps: ['']
  });

  const handleArrayChange = (index: number, field: 'materials' | 'steps', value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: 'materials' | 'steps') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (index: number, field: 'materials' | 'steps') => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        materials: formData.materials.filter(m => m.trim() !== ''),
        steps: formData.steps.filter(s => s.trim() !== ''),
        submitted_by: currentUser.uid,
        status: 'pending',
        created_at: serverTimestamp()
      };

      await addDoc(collection(db, 'ritual_submissions'), submissionData);
      // Show success toast
      navigate('/sanctum-lucis/rituals');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ritual_submissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian pb-20">
      <PageBanner 
        pageName="sanctum_ritual_propose"
        title="Proposer un Rituel" 
      />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/sanctum-lucis/rituals" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> Retour aux rituels
        </Link>

        <div className="bg-obsidian-lighter rounded-2xl border border-obsidian-light p-6 md:p-8 shadow-xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Partagez votre pratique</h2>
            <p className="text-gray-400">
              Proposez un rituel à la communauté. Il sera examiné par nos experts avant d'être publié.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre du rituel *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-3 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                  placeholder="Ex: Rituel de purification matinale"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description courte *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-3 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none h-24"
                  placeholder="Décrivez brièvement l'essence de ce rituel..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-3 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="Général">Général</option>
                  <option value="Protection">Protection</option>
                  <option value="Abondance">Abondance</option>
                  <option value="Amour">Amour</option>
                  <option value="Purification">Purification</option>
                  <option value="Guérison">Guérison</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Niveau *</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: e.target.value})}
                  className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-3 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Durée estimée *</label>
                <input
                  type="text"
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-3 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                  placeholder="Ex: 30 minutes"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectif détaillé</label>
                <textarea
                  value={formData.objective}
                  onChange={(e) => setFormData({...formData, objective: e.target.value})}
                  className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-3 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none h-24"
                  placeholder="Quel est le but profond de ce rituel ?"
                />
              </div>

              {/* Materials */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-300">Matériel nécessaire</label>
                  <button 
                    type="button" 
                    onClick={() => addArrayItem('materials')}
                    className="text-gold hover:text-yellow-400 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.materials.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleArrayChange(index, 'materials', e.target.value)}
                        className="flex-grow bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                        placeholder={`Élément ${index + 1}`}
                      />
                      {formData.materials.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeArrayItem(index, 'materials')}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-300">Étapes du rituel *</label>
                  <button 
                    type="button" 
                    onClick={() => addArrayItem('steps')}
                    className="text-gold hover:text-yellow-400 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="w-8 h-8 rounded-full bg-obsidian border border-obsidian-light flex items-center justify-center text-gray-400 flex-shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <textarea
                        required
                        value={step}
                        onChange={(e) => handleArrayChange(index, 'steps', e.target.value)}
                        className="flex-grow bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none min-h-[80px]"
                        placeholder={`Description de l'étape ${index + 1}`}
                      />
                      {formData.steps.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeArrayItem(index, 'steps')}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors mt-1"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-obsidian-light flex justify-end gap-4">
              <Link 
                to="/sanctum-lucis/rituals"
                className="px-6 py-3 bg-obsidian border border-obsidian-light text-gray-300 hover:text-white rounded-lg transition-colors font-medium"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={loading || !currentUser}
                className="px-6 py-3 bg-gold text-obsidian hover:bg-yellow-400 rounded-lg transition-colors font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Soumettre le rituel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
