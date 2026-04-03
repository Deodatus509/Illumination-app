import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';
import { Loader2, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function SanctumConsultations() {
  const { currentUser, openAuthModal } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [message, setMessage] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!selectedService || !message.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'consultations'), {
        user_id: currentUser.uid,
        service_id: selectedService.id,
        message: message.trim(),
        status: 'pending',
        created_at: serverTimestamp()
      });
      setSuccess(true);
      setMessage('');
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
        <div className="text-center mb-12">
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Demandez une guidance personnalisée à nos experts. Choisissez le service qui correspond à votre besoin spirituel actuel.
          </p>
        </div>

        {success ? (
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">Votre message / question</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={6}
                      className="w-full bg-obsidian border border-obsidian-light rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-mystic-purple focus:border-transparent transition-all"
                      placeholder="Décrivez votre situation, vos questions ou vos attentes..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
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
