import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Clock, Award, Filter, CheckCircle, BookOpen, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';
import { ImageCarousel } from '../components/ui/ImageCarousel';

export function Academy() {
  const [isLoading, setIsLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { currentUser, userProfile, openAuthModal } = useAuth();
  const [enrollments, setEnrollments] = useState<Record<string, any>>({});
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; courseId: string | null; courseTitle: string }>({ isOpen: false, courseId: null, courseTitle: '' });
  const navigate = useNavigate();

  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCourses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(fetchedCourses);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!currentUser) {
        setEnrollments([]);
        setIsLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const enrollmentsMap: Record<string, any> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          enrollmentsMap[data.courseId] = data;
        });
        setEnrollments(enrollmentsMap);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEnrollments();
  }, [currentUser]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach(course => {
      if (course.category) cats.add(course.category);
    });
    return Array.from(cats);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchDifficulty = difficultyFilter === 'all' || course.difficulty === difficultyFilter;
      const matchCategory = categoryFilter === 'all' || course.category === categoryFilter;
      
      let matchPrice = true;
      if (priceFilter === 'free') {
        matchPrice = course.isFree || !course.price || course.price === 0;
      } else if (priceFilter === 'paid') {
        matchPrice = !course.isFree && course.price && course.price > 0;
      }

      const searchLower = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        (course.title && course.title.toLowerCase().includes(searchLower)) ||
        (course.name && course.name.toLowerCase().includes(searchLower)) ||
        (course.description && course.description.toLowerCase().includes(searchLower));

      return matchDifficulty && matchCategory && matchPrice && matchSearch;
    });
  }, [difficultyFilter, categoryFilter, priceFilter, searchQuery, courses]);

  const handleEnrollClick = (courseId: string, courseTitle: string, isPremiumCourse: boolean) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    
    const isPremiumUser = userProfile?.isPremium || userProfile?.role === 'admin';
    if (isPremiumCourse && !isPremiumUser) {
      alert("Ce cours est réservé aux membres premium. Veuillez mettre à niveau votre compte.");
      return;
    }
    
    setConfirmModal({ isOpen: true, courseId, courseTitle });
  };

  const confirmEnrollment = async () => {
    if (!currentUser || !confirmModal.courseId) return;
    
    setEnrollingCourseId(confirmModal.courseId);
    try {
      await addDoc(collection(db, 'enrollments'), {
        userId: currentUser.uid,
        courseId: confirmModal.courseId,
        enrolledAt: serverTimestamp(),
        completedLessons: [],
        progress: 0
      });
      setEnrollments({
        ...enrollments,
        [confirmModal.courseId]: {
          courseId: confirmModal.courseId,
          completedLessons: [],
          progress: 0
        }
      });
      setConfirmModal({ isOpen: false, courseId: null, courseTitle: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
      alert("Erreur lors de l'inscription.");
    } finally {
      setEnrollingCourseId(null);
    }
  };
  return (
    <div className="flex flex-col">
      <PageBanner pageName="academy" title="Académie" />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <ImageCarousel page="academy" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
            Des formations structurées et approfondies pour les étudiants sérieux. Suivez votre progression, passez les quiz et accédez aux vidéos exclusives.
          </p>

        <div className="flex flex-col md:flex-row justify-center items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative w-full md:w-auto md:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une formation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-obsidian border border-obsidian-light text-gray-200 rounded-lg focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Filtres :</span>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-obsidian border border-obsidian-light text-gray-300 rounded-md py-2 px-4 focus:outline-none focus:border-gold"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-obsidian border border-obsidian-light text-gray-300 rounded-md py-2 px-4 focus:outline-none focus:border-gold"
          >
            <option value="all">Tous les niveaux</option>
            <option value="Débutant">Débutant</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Avancé">Avancé</option>
          </select>

          {/* Price Filter */}
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="bg-obsidian border border-obsidian-light text-gray-300 rounded-md py-2 px-4 focus:outline-none focus:border-gold"
          >
            <option value="all">Tous les prix</option>
            <option value="free">Gratuit</option>
            <option value="paid">Payant</option>
          </select>
        </div>
      </div>

      <div className="space-y-12">
        {isLoading ? (
          [1, 2].map((i) => (
            <div key={i} className="bg-obsidian-lighter rounded-2xl overflow-hidden border border-obsidian-light animate-pulse flex flex-col md:flex-row h-auto md:h-[350px]">
              <div className="md:w-2/5 h-48 md:h-full bg-obsidian shrink-0"></div>
              <div className="p-8 md:w-3/5 flex flex-col justify-center space-y-4">
                <div className="flex gap-4 mb-4">
                  <div className="h-4 bg-obsidian rounded w-20"></div>
                  <div className="h-4 bg-obsidian rounded w-20"></div>
                  <div className="h-4 bg-obsidian rounded w-24"></div>
                </div>
                <div className="h-8 bg-obsidian rounded w-3/4 mb-4"></div>
                <div className="space-y-2 mb-8">
                  <div className="h-4 bg-obsidian rounded w-full"></div>
                  <div className="h-4 bg-obsidian rounded w-5/6"></div>
                  <div className="h-4 bg-obsidian rounded w-4/5"></div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-auto">
                  <div className="h-8 bg-obsidian rounded w-24"></div>
                  <div className="h-12 bg-obsidian rounded w-48"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          filteredCourses.map((course, index) => {
            const enrollment = enrollments[course.id];
            const isEnrolled = !!enrollment;
            const progress = enrollment?.progress || 0;
            const completedLessons = enrollment?.completedLessons || [];
            
            return (
            <motion.div 
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-obsidian-lighter rounded-2xl overflow-hidden border border-obsidian-light flex flex-col md:flex-row"
            >
            <div className="md:w-2/5 relative">
              <img 
                src={course.coverImage} 
                alt={course.title} 
                className="w-full h-full object-cover min-h-[250px]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-obsidian-lighter to-transparent" />
              <div className="absolute top-4 left-4 bg-obsidian/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gold border border-gold/30">
                {course.difficulty}
              </div>
            </div>
            
            <div className="p-8 md:w-3/5 flex flex-col justify-center">
              <div className="flex flex-wrap gap-4 mb-4 text-sm font-medium text-gray-400">
                <span className="flex items-center gap-1.5"><PlayCircle className="w-4 h-4 text-mystic-purple-light" /> {course.modules || 1} Modules</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-mystic-purple-light" /> {course.duration || 'À votre rythme'}</span>
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-mystic-purple-light" /> Certificat inclus</span>
              </div>
              
              <h2 className="text-3xl font-serif font-bold text-gray-100 mb-4">{course.title || course.name}</h2>
              <p className="text-gray-400 mb-8 text-lg leading-relaxed">{course.description}</p>
              
              {isEnrolled && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progression</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-obsidian rounded-full h-2">
                    <div 
                      className="bg-gold h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {completedLessons.length} leçons terminées
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-auto">
                <div className="text-3xl font-bold text-gold">{course.isFree ? 'Gratuit' : `$${course.price || 0}`}</div>
                
                {isEnrolled ? (
                  <Link 
                    to={`/course/${course.id}`}
                    className="w-full sm:w-auto px-8 py-3 bg-mystic-purple-light text-white font-bold rounded-md hover:bg-mystic-purple text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    Continuer le cours
                  </Link>
                ) : (
                  <button 
                    onClick={() => handleEnrollClick(course.id, course.title || course.name, course.isPremium)}
                    disabled={enrollingCourseId === course.id}
                    className="w-full sm:w-auto px-8 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light text-center transition-colors disabled:opacity-50"
                  >
                    {enrollingCourseId === course.id ? 'Inscription...' : "S'inscrire"}
                  </button>
                )}
                
                <Link 
                  to={`/course/${course.id}`}
                  className="w-full sm:w-auto px-8 py-3 border border-obsidian-light text-gray-300 font-bold rounded-md hover:text-white hover:bg-obsidian text-center transition-colors"
                >
                  Détails
                </Link>
              </div>
            </div>
          </motion.div>
          );
        })
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-obsidian-lighter border border-obsidian-light rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Confirmer l'inscription</h3>
            <p className="text-gray-400 mb-6">
              Voulez-vous vraiment vous inscrire au cours <span className="text-gold font-bold">{confirmModal.courseTitle}</span> ?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmModal({ isOpen: false, courseId: null, courseTitle: '' })}
                className="px-4 py-2 rounded-md border border-obsidian-light text-gray-300 hover:text-white hover:bg-obsidian transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmEnrollment}
                className="px-4 py-2 rounded-md bg-gold text-obsidian font-medium hover:bg-gold-light transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
