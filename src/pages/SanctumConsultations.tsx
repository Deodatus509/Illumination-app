import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';
import { Loader2, MessageCircle, Send, CheckCircle2, List, ArrowLeft } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Link } from 'react-router-dom';
import { UserConsultationsList } from '../components/sanctum/UserConsultationsList';
import AdminConsultations from '../components/admin/AdminConsultations';
import { uploadConsultationFile } from '../lib/storage';

export function SanctumConsultations() {
  const { currentUser, userProfile, openAuthModal } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'list' | 'admin'>('new');
  const isAdmin = ['admin', 'editor', 'author'].includes(userProfile?.role || '');

  useEffect(() => {
    if (isAdmin && activeTab === 'new') {
      setActiveTab('admin');
    }
  }, [isAdmin]);
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    preferredDate: '',
    message: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const q = query(collection(db, 'consultation_services'), where('is_active', '==', true));
      const snapshot = await getDocs(q);
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!selectedService || !formData.message.trim() || !formData.fullName.trim()) return;

    setSubmitting(true);
    try {
      let fileUrl = '';
      if (file) {
        const uploadResult = await uploadConsultationFile(file);
        fileUrl = uploadResult.url;
      }

      await addDoc(collection(db, 'consultations'), {
        user_id: currentUser.uid,
        service_id: selectedService.id,
        ...formData,
        fileUrl,
        status: 'pending',
        created_at: serverTimestamp()
      });
      setSuccess(true);
      setFormData({
        fullName: '',
        birthDate: '',
        birthTime: '',
        birthPlace: '',
        preferredDate: '',
        message: ''
      });
      setFile(null);
      setSelectedService(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'consultations');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <PageBanner 
        pageName="sanctum_consultations"
        title="Consultations Spirituelles" 
      />

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link 
          to="/sanctum-lucis" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au Sanctuaire
        </Link>
        <div className="text-center mb-8">
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Demandez une guidance personnalisée à nos experts. Choisissez le service qui correspond à votre besoin spirituel actuel.
          </p>
        </div>

        {currentUser && (
          <div className="flex justify-center mb-12">
            <div className="bg-obsidian-lighter p-1 rounded-lg inline-flex">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'admin' ? 'bg-mystic-purple text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Gestion (Admin)
                </button>
              )}
              <button
                onClick={() => setActiveTab('new')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'new' ? 'bg-mystic-purple text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Nouvelle demande
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'list' ? 'bg-mystic-purple text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
                Mes demandes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'admin' && isAdmin ? (
          <AdminConsultations />
        ) : activeTab === 'list' ? (
          <UserConsultationsList />
        ) : success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center max-w-2xl mx-auto"
          >
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-100 mb-2">Demande envoyée avec succès</h3>
            <p className="text-gray-300 mb-6">
              Nous avons bien reçu votre demande de consultation. Un expert vous répondra très prochainement dans votre espace personnel.
            </p>
            <button 
              onClick={() => setSuccess(false)}
              className="px-6 py-2 bg-obsidian border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/10 transition-colors"
            >
              Faire une autre demande
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Services List */}
            <div>
              <h2 className="text-2xl font-serif font-bold text-gold mb-6">Services Disponibles</h2>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div 
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-6 rounded-xl border cursor-pointer transition-all ${
                        selectedService?.id === service.id 
                          ? 'bg-mystic-purple/20 border-mystic-purple shadow-lg shadow-mystic-purple/10' 
                          : 'bg-obsidian-lighter border-obsidian-light hover:border-mystic-purple/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-gray-100">{service.title}</h3>
                        <span className="text-gold font-medium">{service.price > 0 ? `${service.price} €` : 'Gratuit'}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{service.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Request Form */}
            <div className="bg-obsidian-lighter rounded-xl p-8 border border-obsidian-light h-fit sticky top-24">
              <h2 className="text-2xl font-serif font-bold text-gray-100 mb-6 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-mystic-purple" />
                Votre Demande
              </h2>
              
              {!selectedService ? (
                <div className="text-center py-12 text-gray-500">
                  Veuillez sélectionner un service dans la liste pour commencer.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Service sélectionné</label>
                    <div className="p-3 bg-obsidian rounded-lg border border-mystic-purple/30 text-gold font-medium">
                      {selectedService.title}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nom complet *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                      placeholder="Votre nom complet"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Date de naissance</label>
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Heure de naissance</label>
                      <input
                        type="time"
                        name="birthTime"
                        value={formData.birthTime}
                        onChange={handleInputChange}
                        className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lieu de naissance</label>
                    <input
                      type="text"
                      name="birthPlace"
                      value={formData.birthPlace}
                      onChange={handleInputChange}
                      className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                      placeholder="Ville, Pays"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date souhaitée (Optionnel)</label>
                    <input
                      type="date"
                      name="preferredDate"
                      value={formData.preferredDate}
                      onChange={handleInputChange}
                      className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Votre message / question *</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full bg-obsidian border border-obsidian-light rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                      placeholder="Décrivez votre situation, vos questions ou vos attentes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Pièce jointe (Photo, document...)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full bg-obsidian border border-obsidian-light rounded-lg p-3 text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-mystic-purple/20 file:text-mystic-purple hover:file:bg-mystic-purple/30 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !formData.message.trim() || !formData.fullName.trim()}
                    className="w-full py-3 bg-mystic-purple hover:bg-mystic-purple-light text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Envoyer la demande
                  </button>
                  
                  {!currentUser && (
                    <p className="text-sm text-yellow-500 text-center mt-4">
                      Vous devrez vous connecter pour envoyer cette demande.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
