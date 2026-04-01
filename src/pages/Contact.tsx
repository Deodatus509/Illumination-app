import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, Loader2, Facebook, Twitter, Instagram, Linkedin, Youtube, Globe, MessageCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<any>(null);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const docRef = doc(db, 'settings', 'socialLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSocialLinks(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching social links:", error);
      }
    };
    fetchSocialLinks();
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(formData.email)) {
      setSubmitError("Veuillez entrer une adresse e-mail valide.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      await addDoc(collection(db, 'messages'), {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        createdAt: serverTimestamp(),
        status: 'unread'
      });
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      setSubmitError("Une erreur est survenue lors de l'envoi du message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-serif font-bold text-gold mb-6"
        >
          Contactez-nous
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 max-w-2xl mx-auto text-lg"
        >
          Une question sur nos enseignements ? Un problème technique ? N'hésitez pas à nous écrire.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-1 space-y-8"
        >
          <div className="bg-obsidian-lighter p-6 rounded-2xl border border-obsidian-light">
            <Mail className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-bold text-gray-100 mb-2">Email</h3>
            <p className="text-gray-400 text-sm">contact@illumination-academy.com</p>
          </div>
          <div className="bg-obsidian-lighter p-6 rounded-2xl border border-obsidian-light">
            <MessageSquare className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-bold text-gray-100 mb-2">Support</h3>
            <p className="text-gray-400 text-sm">Disponible du lundi au vendredi, de 9h à 18h.</p>
          </div>
          
          {socialLinks && Object.keys(socialLinks).length > 0 && (
            <div className="bg-obsidian-lighter p-6 rounded-2xl border border-obsidian-light">
              <h3 className="text-lg font-bold text-gray-100 mb-4">Suivez-nous</h3>
              <div className="flex flex-wrap gap-4">
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.whatsapp && (
                  <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
                {socialLinks.telegram && (
                  <a href={socialLinks.telegram} target="_blank" rel="noopener noreferrer" className="p-2 bg-obsidian rounded-full text-gray-400 hover:text-gold hover:bg-obsidian-light transition-colors">
                    <Send className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2 bg-obsidian-lighter p-8 rounded-2xl border border-obsidian-light"
        >
          {submitSuccess ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-100 mb-2">Message envoyé !</h3>
              <p className="text-gray-400">Nous vous répondrons dans les plus brefs délais.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  {submitError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
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
                    className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">Sujet</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-obsidian border border-obsidian-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all resize-none"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gold text-obsidian font-bold rounded-lg hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
                {!isSubmitting && <Send className="w-5 h-5" />}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
