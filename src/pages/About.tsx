import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Star, Shield, Facebook, Twitter, Instagram, Mail, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function About() {
  const navigate = useNavigate();
  const { currentUser, openAuthModal } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFeatureClick = (title: string) => {
    switch(title) {
      case 'Savoir Ancien':
        navigate('/academy');
        break;
      case 'Communauté':
        navigate('/blog');
        break;
      case 'Excellence':
        navigate('/library');
        break;
      case 'Protection':
        document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await addDoc(collection(db, 'messages'), {
        name,
        email,
        message,
        createdAt: serverTimestamp(),
        status: 'unread'
      });
      setSubmitSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      setSubmitError("Une erreur est survenue lors de l'envoi du message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinClick = () => {
    if (currentUser) {
      navigate('/academy');
    } else {
      openAuthModal('register');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-serif font-bold text-gold mb-6"
        >
          À Propos d'Illumination
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 max-w-3xl mx-auto text-lg leading-relaxed"
        >
          Illumination est bien plus qu'une simple plateforme d'apprentissage. C'est un sanctuaire numérique dédié à l'éveil spirituel, à la connaissance ésotérique et à l'évolution personnelle de chaque chercheur de vérité.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-3xl font-serif font-bold text-gray-100">Notre Mission</h2>
          <p className="text-gray-400 leading-relaxed text-lg">
            Notre mission est de démocratiser l'accès aux enseignements spirituels profonds, tout en préservant leur caractère sacré. Nous croyons que la véritable connaissance doit être à la fois accessible et protégée, offerte à ceux qui sont prêts à la recevoir.
          </p>
          <p className="text-gray-400 leading-relaxed text-lg">
            À travers nos formations, notre bibliothèque d'ouvrages rares et notre blogue initiatique, nous guidons chaque membre sur son propre chemin d'illumination.
          </p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative h-96 rounded-2xl overflow-hidden border border-obsidian-light shadow-2xl"
        >
          <img 
            src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop" 
            alt="Spiritual Journey" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian to-transparent opacity-60"></div>
        </motion.div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        {[
          { icon: <BookOpen className="w-8 h-8" />, title: "Savoir Ancien", desc: "Des enseignements millénaires adaptés au monde moderne." },
          { icon: <Users className="w-8 h-8" />, title: "Communauté", desc: "Un réseau de chercheurs partageant la même quête." },
          { icon: <Star className="w-8 h-8" />, title: "Excellence", desc: "Une qualité de contenu rigoureusement sélectionnée." },
          { icon: <Shield className="w-8 h-8" />, title: "Protection", desc: "Un espace sécurisé pour votre évolution spirituelle." }
        ].map((feature, index) => (
          <motion.div 
            key={index}
            onClick={() => handleFeatureClick(feature.title)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + (index * 0.1) }}
            className="bg-obsidian-lighter p-8 rounded-2xl border border-obsidian-light text-center group hover:border-gold/50 transition-colors cursor-pointer"
          >
            <div className="text-gold mb-4 flex justify-center group-hover:scale-110 transition-transform">{feature.icon}</div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Contact Section */}
      <div id="contact-section" className="mb-20 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-gray-100 mb-4">Nous Contacter</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Une question, une suggestion ou besoin d'accompagnement ? Notre équipe est à votre écoute.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Socials & Info */}
          <div className="bg-obsidian-lighter p-8 rounded-2xl border border-obsidian-light">
            <h3 className="text-2xl font-bold text-gray-100 mb-6">Restons Connectés</h3>
            <p className="text-gray-400 mb-8">
              Suivez-nous sur nos réseaux sociaux pour ne rien manquer de nos actualités, nouveaux cours et événements exclusifs.
            </p>
            
            <div className="space-y-6">
              <a href="#" className="flex items-center gap-4 text-gray-300 hover:text-gold transition-colors group">
                <div className="p-3 bg-obsidian rounded-lg border border-obsidian-light group-hover:border-gold/50 transition-colors">
                  <Facebook className="w-6 h-6" />
                </div>
                <span className="text-lg">Facebook</span>
              </a>
              <a href="#" className="flex items-center gap-4 text-gray-300 hover:text-gold transition-colors group">
                <div className="p-3 bg-obsidian rounded-lg border border-obsidian-light group-hover:border-gold/50 transition-colors">
                  <Twitter className="w-6 h-6" />
                </div>
                <span className="text-lg">Twitter / X</span>
              </a>
              <a href="#" className="flex items-center gap-4 text-gray-300 hover:text-gold transition-colors group">
                <div className="p-3 bg-obsidian rounded-lg border border-obsidian-light group-hover:border-gold/50 transition-colors">
                  <Instagram className="w-6 h-6" />
                </div>
                <span className="text-lg">Instagram</span>
              </a>
              <div className="flex items-center gap-4 text-gray-300">
                <div className="p-3 bg-obsidian rounded-lg border border-obsidian-light">
                  <Mail className="w-6 h-6" />
                </div>
                <span className="text-lg">contact@illumination.com</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-obsidian-lighter p-8 rounded-2xl border border-obsidian-light">
            <h3 className="text-2xl font-bold text-gray-100 mb-6">Message Direct</h3>
            
            {submitSuccess && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {submitError}
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Nom complet</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">Adresse e-mail</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                  placeholder="vous@exemple.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-1">Message</label>
                <textarea
                  id="message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold resize-none"
                  placeholder="Comment pouvons-nous vous aider ?"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gold text-obsidian font-bold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer le message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-obsidian-lighter rounded-3xl p-12 text-center border border-obsidian-light relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent"></div>
        <h2 className="text-3xl font-serif font-bold text-gray-100 mb-6">Rejoignez la Confrérie</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-lg">
          Que vous soyez au début de votre cheminement ou un initié expérimenté, Illumination vous offre les clés pour franchir la prochaine étape de votre évolution.
        </p>
        <button 
          onClick={handleJoinClick}
          className="px-8 py-4 bg-gold text-obsidian font-bold rounded-lg hover:bg-gold-light transition-colors shadow-lg shadow-gold/20"
        >
          Commencer le Voyage
        </button>
      </div>
    </div>
  );
}
