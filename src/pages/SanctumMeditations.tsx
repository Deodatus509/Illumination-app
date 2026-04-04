import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';
import { Loader2, Calendar, Clock, Users, CheckCircle2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Link } from 'react-router-dom';

export function SanctumMeditations() {
  const { currentUser, openAuthModal } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);

  useEffect(() => {
    fetchClasses();
    if (currentUser) {
      fetchUserEnrollments();
    }
  }, [currentUser]);

  const fetchClasses = async () => {
    try {
      const q = query(collection(db, 'meditation_classes'), where('is_active', '==', true));
      const snapshot = await getDocs(q);
      // Sort by date client-side to avoid needing a composite index immediately
      const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      classesData.sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      setClasses(classesData);
    } catch (error) {
      console.error("Error fetching meditation classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEnrollments = async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'meditation_members'), where('user_id', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      setEnrolledClasses(snapshot.docs.map(doc => doc.data().class_id));
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    }
  };

  const handleEnroll = async (classId: string) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    setEnrolling(classId);
    try {
      await addDoc(collection(db, 'meditation_members'), {
        class_id: classId,
        user_id: currentUser.uid,
        joined_at: serverTimestamp()
      });
      setEnrolledClasses([...enrolledClasses, classId]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'meditation_members');
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <PageBanner 
        pageName="sanctum_meditations"
        title="Méditation Collective" 
      />

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Rejoignez nos sessions de méditation guidée en direct. Unissez votre conscience à celle de la communauté pour un éveil profond.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 bg-obsidian-lighter rounded-xl border border-obsidian-light">
            <p className="text-gray-400">Aucune classe de méditation n'est programmée pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {classes.map((cls) => {
              const isEnrolled = enrolledClasses.includes(cls.id);
              const startDate = new Date(cls.start_date);
              const isPast = startDate < new Date();

              return (
                <motion.div 
                  key={cls.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden flex flex-col group"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={cls.imageUrl || 'https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&q=80'} 
                      alt={cls.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        {cls.price > 0 ? `${cls.price} €` : 'Gratuit'}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-100">{cls.title}</h3>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-6 line-clamp-3">{cls.description}</p>
                    
                    <div className="space-y-3 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gold" />
                        <span>{startDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gold" />
                        <span>{startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gold" />
                        <span>Session de groupe</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 pt-0 mt-auto">
                    <Link 
                      to={`/sanctum-lucis/meditations/${cls.id}`}
                      className="w-full py-3 bg-obsidian border border-obsidian-light text-gray-200 hover:bg-obsidian-light hover:text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 mb-3"
                    >
                      Voir les détails
                    </Link>
                    {isPast ? (
                      <button disabled className="w-full py-3 bg-obsidian border border-obsidian-light text-gray-500 rounded-lg font-medium cursor-not-allowed">
                        Session terminée
                      </button>
                    ) : isEnrolled ? (
                      <Link 
                        to={`/sanctum-lucis/meditations/${cls.id}`}
                        className="w-full py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Entrer dans la classe
                      </Link>
                    ) : (
                      <button 
                        onClick={() => handleEnroll(cls.id)}
                        disabled={enrolling === cls.id}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        {enrolling === cls.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'S\'inscrire à la session'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
