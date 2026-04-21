import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { PlayCircle, Clock, Award, CheckCircle, Lock, BookOpen, Target, Users, AlertCircle, Headphones } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function CourseView() {
  const { courseId } = useParams();
  const { currentUser, userProfile, openAuthModal } = useAuth();
  const isPremiumUser = userProfile?.isPremium || userProfile?.role === 'admin';
  const canEdit = ['admin', 'author', 'editor'].includes(userProfile?.role || '');
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // States for Prerequisites Edit
  const [isEditingPrereq, setIsEditingPrereq] = useState(false);
  const [prereqText, setPrereqText] = useState('');

  useEffect(() => {
    if (!courseId) return;
    
    const unsubscribeCourse = onSnapshot(doc(db, 'courses', courseId), (docSnap) => {
      if (docSnap.exists()) {
        setCourse({ id: docSnap.id, ...docSnap.data() });
      } else {
        setCourse(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `courses/${courseId}`);
    });

    const qLessons = query(collection(db, 'lessons'), where('courseId', '==', courseId));
    const unsubscribeLessons = onSnapshot(qLessons, (snapshot) => {
      const lessonsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort lessons by order if available
      lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLessons(lessonsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lessons');
    });

    return () => {
      unsubscribeCourse();
      unsubscribeLessons();
    };
  }, [courseId]);

  useEffect(() => {
    const fetchEnrollment = async () => {
      if (!currentUser || !courseId) {
        setIsLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'enrollments'), 
          where('userId', '==', currentUser.uid),
          where('courseId', '==', courseId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setEnrollment({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEnrollment();
  }, [currentUser, courseId]);

  if (isLoading && !course) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Cours introuvable</h2>
          <Link to="/academy" className="text-gold hover:underline">Retour à l'Académie</Link>
        </div>
      </div>
    );
  }

  const handleEnroll = async () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    
    if (course.isPremium && !isPremiumUser) {
      alert("Ce cours est réservé aux membres premium. Veuillez mettre à niveau votre compte.");
      return;
    }
    
    setIsEnrolling(true);
    try {
      const docRef = await addDoc(collection(db, 'enrollments'), {
        userId: currentUser.uid,
        courseId: course.id,
        enrolledAt: serverTimestamp(),
        completedLessons: [],
        progress: 0
      });
      setEnrollment({
        id: docRef.id,
        userId: currentUser.uid,
        courseId: course.id,
        completedLessons: [],
        progress: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
      alert("Erreur lors de l'inscription.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSavePrereq = async () => {
    if (!courseId) return;
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        prerequisites: prereqText
      });
      setIsEditingPrereq(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${courseId}`);
    }
  };

  const completedLessons = enrollment?.completedLessons || [];
  const progressPercentage = lessons && lessons.length > 0 
    ? Math.round((completedLessons.length / lessons.length) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="bg-obsidian-lighter rounded-2xl overflow-hidden border border-obsidian-light mb-12">
        <div className="h-64 md:h-96 relative">
          <img 
            src={course.coverImage || undefined} 
            alt={course.name || course.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian-lighter via-obsidian-lighter/80 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <div className="flex flex-wrap gap-4 mb-4 text-sm font-medium text-gray-300">
              <span className="flex items-center gap-1.5 bg-obsidian/80 px-3 py-1 rounded-full border border-obsidian-light">
                <PlayCircle className="w-4 h-4 text-gold" /> {lessons.length} Leçons
              </span>
              <span className="flex items-center gap-1.5 bg-obsidian/80 px-3 py-1 rounded-full border border-obsidian-light">
                <Clock className="w-4 h-4 text-gold" /> {course.duration || 'À votre rythme'}
              </span>
              <span className="flex items-center gap-1.5 bg-obsidian/80 px-3 py-1 rounded-full border border-obsidian-light">
                <Award className="w-4 h-4 text-gold" /> Certificat inclus
              </span>
              <span className="flex items-center gap-1.5 bg-obsidian/80 px-3 py-1 rounded-full border border-gold/30 text-gold">
                {course.difficulty || 'Tous niveaux'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-100 mb-4">{course.name || course.title}</h1>
            <p className="text-xl text-gray-400 max-w-3xl mb-4">{course.description}</p>
            {course.tags && course.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {course.tags.map((tag: string, index: number) => (
                  <span key={index} className="px-3 py-1 text-xs font-medium bg-mystic-purple/20 text-mystic-purple-light border border-mystic-purple/30 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-8 border-t border-obsidian-light bg-obsidian/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-3xl font-bold text-gold">{course.isFree ? 'Gratuit' : `$${course.price || 0}`}</div>
          
          {isLoading ? (
            <div className="h-12 w-48 bg-obsidian animate-pulse rounded-md"></div>
          ) : enrollment ? (
            <div className="flex items-center gap-6 w-full sm:w-auto">
              <div className="flex-grow sm:flex-grow-0 min-w-[200px]">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progression</span>
                  <span className="text-gold font-bold">{progressPercentage}%</span>
                </div>
                <div className="h-2 bg-obsidian rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gold transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              <Link 
                to={`/lesson/${lessons?.find(l => !completedLessons.includes(l.id))?.id || lessons?.[0]?.id || 'l1'}`}
                className="px-8 py-3 bg-mystic-purple-light text-white font-bold rounded-md hover:bg-mystic-purple transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <BookOpen className="w-5 h-5" />
                {completedLessons.length === lessons?.length ? 'Revoir le cours' : 'Continuer'}
              </Link>
            </div>
          ) : (
            <button 
              onClick={handleEnroll}
              disabled={isEnrolling}
              className="w-full sm:w-auto px-12 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {isEnrolling ? 'Inscription...' : "S'inscrire maintenant"}
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Course Details */}
        <div className="lg:col-span-2 space-y-12">
          {course.videoUrl && (
            <section className="rounded-2xl overflow-hidden border border-obsidian-light shadow-2xl bg-black relative aspect-video flex items-center justify-center">
              <video
                controls
                src={course.videoUrl || undefined}
                className="w-full h-full object-contain"
              />
            </section>
          )}

          {course.audioUrl && (
            <section className="rounded-2xl overflow-hidden border border-obsidian-light shadow-xl bg-obsidian-lighter p-6">
              <div className="w-full flex flex-col items-center">
                <h3 className="text-xl font-serif font-bold text-gold mb-4 flex items-center gap-2">
                  <Headphones className="w-5 h-5" /> Présentation Audio
                </h3>
                <audio
                  controls
                  src={course.audioUrl || undefined}
                  className="w-full"
                />
              </div>
            </section>
          )}

          {course.learningObjectives && course.learningObjectives.length > 0 && (
            <section>
              <h2 className="text-2xl font-serif font-bold text-gray-100 mb-6 flex items-center gap-3">
                <Target className="w-6 h-6 text-gold" />
                Objectifs d'apprentissage
              </h2>
              <ul className="space-y-4">
                {course.learningObjectives.map((obj: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-mystic-purple-light shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid sm:grid-cols-2 gap-8">
            {course.targetAudience && (
              <section className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
                <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold" />
                  Public cible
                </h3>
                <p className="text-gray-400">{course.targetAudience}</p>
              </section>
            )}
            
            {(course.prerequisites || canEdit) && (
              <section className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gold" />
                    Prérequis
                  </h3>
                  {canEdit && !isEditingPrereq && (
                      <button onClick={() => { setPrereqText(course.prerequisites || ''); setIsEditingPrereq(true); }} className="text-xs text-gold hover:text-gold-light border border-gold/30 rounded px-2 py-1 transition-colors">
                        Spécifier / Modifier
                      </button>
                  )}
                </div>
                {isEditingPrereq ? (
                  <div className="space-y-3">
                    <textarea 
                      value={prereqText} 
                      onChange={(e) => setPrereqText(e.target.value)} 
                      className="w-full bg-obsidian border border-obsidian-light text-white p-3 rounded-xl focus:outline-none focus:border-gold transition-colors" 
                      rows={3} 
                      placeholder="Indiquez les prérequis de ce cours..." 
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditingPrereq(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">Annuler</button>
                      <button onClick={handleSavePrereq} className="px-4 py-2 bg-gold text-obsidian text-xs font-bold rounded-lg hover:bg-gold-light transition-colors">Enregistrer</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">{course.prerequisites || 'Aucun prérequis spécifié.'}</p>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Curriculum Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light sticky top-24">
            <div className="p-6 border-b border-obsidian-light">
              <h2 className="text-xl font-serif font-bold text-gray-100">Programme du cours</h2>
            </div>
            <div className="p-2">
              {lessons?.map((lesson, index) => {
                const isCompleted = completedLessons.includes(lesson.id);
                const isLocked = !enrollment && !lesson.isFreePreview && !lesson.isFree && !isPremiumUser;
                const canManuallyComplete = enrollment && !lesson.quiz;
                
                const toggleCompletion = async (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!canManuallyComplete || !enrollment || !currentUser) return;
                  
                  try {
                    let newCompletedLessons = [...completedLessons];
                    if (isCompleted) {
                      newCompletedLessons = newCompletedLessons.filter(id => id !== lesson.id);
                    } else {
                      newCompletedLessons.push(lesson.id);
                    }
                    
                    const newProgress = Math.round((newCompletedLessons.length / lessons.length) * 100);
                    
                    const q = query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid), where('courseId', '==', courseId));
                    const snapshot = await getDocs(q);
                    
                    if (!snapshot.empty) {
                      const enrollmentDoc = snapshot.docs[0];
                      await updateDoc(doc(db, 'enrollments', enrollmentDoc.id), {
                        completedLessons: newCompletedLessons,
                        progress: newProgress
                      });
                      
                      // Update local state
                      setEnrollment({
                        ...enrollment,
                        completedLessons: newCompletedLessons,
                        progress: newProgress
                      });
                    }
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, 'enrollments');
                  }
                };

                return (
                  <div 
                    key={lesson.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                      isLocked ? 'opacity-50' : 'hover:bg-obsidian/50'
                    }`}
                  >
                    <div className="shrink-0">
                      {isCompleted ? (
                        <button onClick={canManuallyComplete ? toggleCompletion : undefined} className={`${canManuallyComplete ? 'hover:scale-110 transition-transform cursor-pointer' : 'cursor-default'}`} title={canManuallyComplete ? "Marquer comme non terminé" : "Terminé"}>
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </button>
                      ) : isLocked ? (
                        <Lock className="w-6 h-6 text-gray-500" />
                      ) : (
                        <button 
                          onClick={canManuallyComplete ? toggleCompletion : undefined}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                            canManuallyComplete ? 'border-gray-400 hover:border-green-500 hover:text-green-500 cursor-pointer text-gray-400 group' : 'border-gray-500 text-gray-400 cursor-default'
                          }`}
                          title={canManuallyComplete ? "Marquer comme terminé" : ""}
                        >
                          {canManuallyComplete ? (
                            <>
                              <span className="group-hover:hidden">{index + 1}</span>
                              <CheckCircle className="w-4 h-4 hidden group-hover:block" />
                            </>
                          ) : (
                            index + 1
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h4 className={`font-medium ${isCompleted ? 'text-gray-300' : 'text-gray-200'}`}>
                        {lesson.title}
                      </h4>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> {lesson.duration}
                      </div>
                    </div>
                    {!isLocked && (
                      <Link 
                        to={`/lesson/${lesson.id}`}
                        className="p-2 text-gold hover:bg-gold/10 rounded-full transition-colors"
                      >
                        <PlayCircle className="w-5 h-5" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
