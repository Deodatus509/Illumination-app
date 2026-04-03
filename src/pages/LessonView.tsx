import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Lock, Download, PlayCircle, FileText, ChevronLeft, Crown, CheckCircle, HelpCircle, Headphones } from 'lucide-react';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

  export function LessonView() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { userProfile, currentUser, openAuthModal } = useAuth();
  
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [courseLessons, setCourseLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<'success' | 'error' | null>(null);
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);

  useEffect(() => {
    if (!lessonId) return;

    const fetchLessonData = async () => {
      setIsLoading(true);
      try {
        // Fetch lesson
        const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
        if (!lessonDoc.exists()) {
          setLesson(null);
          setIsLoading(false);
          return;
        }
        const lessonData = { id: lessonDoc.id, ...lessonDoc.data() } as any;
        setLesson(lessonData);

        // Fetch course
        if (lessonData.courseId) {
          const courseDoc = await getDoc(doc(db, 'courses', lessonData.courseId));
          if (courseDoc.exists()) {
            setCourse({ id: courseDoc.id, ...courseDoc.data() });
          }
          
          // Fetch all lessons for the course to determine prev/next
          const lessonsQuery = query(
            collection(db, 'lessons'),
            where('courseId', '==', lessonData.courseId)
          );
          const lessonsSnapshot = await getDocs(lessonsQuery);
          const lessonsList = lessonsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setCourseLessons(lessonsList);

          // Fetch enrollment
          if (currentUser) {
            const q = query(
              collection(db, 'enrollments'), 
              where('userId', '==', currentUser.uid),
              where('courseId', '==', lessonData.courseId)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const enrollmentData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
              setEnrollment(enrollmentData);
              if (enrollmentData.completedLessons?.includes(lessonId)) {
                setIsLessonCompleted(true);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching lesson data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessonData();
  }, [lessonId, currentUser]);

  // Vérification des droits d'accès
  const isPremiumUser = userProfile?.isPremium || userProfile?.role === 'admin';
  const isEnrolled = !!enrollment;
  const isRegistered = !!currentUser;
  
  // Si la leçon est un aperçu gratuit (isFreePreview), elle est visible par les utilisateurs inscrits (connectés) ou premium.
  // Sinon, elle n'est visible que par les utilisateurs inscrits au cours ou premium.
  let canViewFullContent = false;
  
  if (isPremiumUser) {
    canViewFullContent = true;
  } else if (isEnrolled) {
    canViewFullContent = true;
  } else if (lesson?.isFreePreview && isRegistered) {
    canViewFullContent = true;
  } else if (lesson?.isFree) {
    canViewFullContent = true;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center text-gray-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Leçon introuvable</h2>
          <Link to="/academy" className="text-gold hover:underline">Retour à l'Académie</Link>
        </div>
      </div>
    );
  }

  // Logique de "Teasing" (Règle des 80% / 200 mots)
  const words = (lesson.content || '').split(' ');
  const previewWordCount = 100;
  const isTruncated = !canViewFullContent && words.length > previewWordCount;
  
  const displayContent = isTruncated 
    ? words.slice(0, previewWordCount).join(' ') + '...'
    : (lesson.content || '');

  const handleDownloadPdf = async () => {
    if (!currentUser?.email || !lesson.fileUrl) return;
    
    try {
      setIsDownloading(true);
      const pdfUrl = lesson.fileUrl;
      
      const response = await fetch(pdfUrl);

      if (!response.ok) throw new Error('Failed to download PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lesson.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error downloading PDF:', error);
      alert('Erreur lors du téléchargement du document.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleQuizSubmit = async () => {
    if (selectedAnswer === null || !lesson.quiz) return;

    if (selectedAnswer === lesson.quiz.correctAnswer) {
      setQuizResult('success');
      setIsLessonCompleted(true);
      
      // Update progress in Firestore
      if (currentUser && enrollment) {
        try {
          const completedLessons = enrollment.completedLessons || [];
          
          if (!completedLessons.includes(lesson.id)) {
            completedLessons.push(lesson.id);
            
            // Fetch total lessons for this course to calculate progress
            const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', lesson.courseId));
            const lessonsSnapshot = await getDocs(lessonsQuery);
            const totalLessons = lessonsSnapshot.size || 1;
            
            const progress = Math.min(100, Math.round((completedLessons.length / totalLessons) * 100));
            
            await updateDoc(doc(db, 'enrollments', enrollment.id), {
              completedLessons,
              progress,
              lastUpdated: new Date().toISOString()
            });
            
            setEnrollment({ ...enrollment, completedLessons, progress });
          }
        } catch (error) {
          console.error("Error updating progress:", error);
        }
      } else if (currentUser && !enrollment) {
          // Create enrollment if it doesn't exist
          try {
             // Fetch total lessons for this course to calculate progress
            const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', lesson.courseId));
            const lessonsSnapshot = await getDocs(lessonsQuery);
            const totalLessons = lessonsSnapshot.size || 1;
            const progress = Math.min(100, Math.round((1 / totalLessons) * 100));

            const newEnrollmentRef = doc(collection(db, 'enrollments'));
            const newEnrollmentData = {
                userId: currentUser.uid,
                courseId: lesson.courseId,
                enrolledAt: new Date().toISOString(),
                completedLessons: [lesson.id],
                progress,
                lastUpdated: new Date().toISOString()
            };
            await setDoc(newEnrollmentRef, newEnrollmentData);
            setEnrollment({ id: newEnrollmentRef.id, ...newEnrollmentData });
          } catch (error) {
              console.error("Error creating enrollment:", error);
          }
      }
    } else {
      setQuizResult('error');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-gray-200 pb-24">
      {/* Header Navigation */}
      <div className="border-b border-obsidian-light bg-obsidian-lighter/50 backdrop-blur-md sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to={`/course/${lesson.courseId}`} className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Retour au cours
          </Link>
          <span className="text-mystic-purple-light font-serif italic text-sm">{course?.name || course?.title || 'Académie'}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-5xl font-serif font-bold text-gold mb-8 leading-tight"
        >
          {lesson.title}
        </motion.h1>

        {/* Media Player Section (Video) */}
        {lesson.videoUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-12 rounded-2xl overflow-hidden border border-obsidian-light shadow-2xl bg-black relative aspect-video flex items-center justify-center"
          >
            {canViewFullContent ? (
              <div className="w-full h-full">
                <video
                  controls
                  src={lesson.videoUrl}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-obsidian-lighter/90 backdrop-blur-sm p-6 text-center">
                <Lock className="w-12 h-12 text-mystic-purple-light mb-4" />
                <h3 className="text-2xl font-serif font-bold text-gray-100 mb-2">Vidéo Réservée</h3>
                <p className="text-gray-400 max-w-md">
                  L'enseignement vidéo complet est réservé aux initiés de rang Premium ou aux étudiants inscrits.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Media Player Section (Audio) */}
        {lesson.audioUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12 rounded-2xl overflow-hidden border border-obsidian-light shadow-xl bg-obsidian-lighter p-6"
          >
            {canViewFullContent ? (
              <div className="w-full flex flex-col items-center">
                <h3 className="text-xl font-serif font-bold text-gold mb-4 flex items-center gap-2">
                  <Headphones className="w-5 h-5" /> Enseignement Audio
                </h3>
                <audio
                  controls
                  src={lesson.audioUrl}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <Lock className="w-8 h-8 text-mystic-purple-light mb-3" />
                <h3 className="text-xl font-serif font-bold text-gray-100 mb-2">Audio Réservé</h3>
                <p className="text-gray-400 text-sm max-w-md">
                  L'enseignement audio est réservé aux initiés de rang Premium ou aux étudiants inscrits.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Content Section with Teasing Logic */}
        <div className="relative">
          <div className={`prose prose-invert prose-gold max-w-none text-gray-300 leading-relaxed text-lg font-sans ${isTruncated ? 'pb-32' : ''}`}>
            {displayContent.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="mb-6">{paragraph}</p>
            ))}
          </div>

          {/* Fade Out Mask & CTA for Freemium */}
          {isTruncated && (
            <div className="absolute bottom-0 left-0 w-full pt-32 pb-8 bg-gradient-to-t from-obsidian via-obsidian/90 to-transparent flex flex-col items-center justify-end">
              <div className="bg-obsidian-lighter border border-mystic-purple/30 p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold via-mystic-purple to-gold" />
                <Crown className="w-10 h-10 text-gold mx-auto mb-4" />
                <h3 className="text-2xl font-serif font-bold text-gray-100 mb-3">Déverrouiller le Savoir</h3>
                <p className="text-gray-400 mb-8 text-sm">
                  Vous avez lu l'aperçu gratuit (200 mots). Pour accéder à l'intégralité de ce texte sacré, à la vidéo explicative et aux documents PDF, élevez votre conscience et votre rang.
                </p>
                
                {!currentUser ? (
                  <button 
                    onClick={() => openAuthModal('login')}
                    className="w-full py-4 bg-gold text-obsidian font-bold rounded-lg hover:bg-gold-light transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  >
                    Se connecter pour s'abonner
                  </button>
                ) : (
                  <button className="w-full py-4 bg-mystic-purple-light text-white font-bold rounded-lg hover:bg-mystic-purple transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(75,0,130,0.4)]">
                    Devenir Membre Premium
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Resources & Quiz Section */}
        {canViewFullContent && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 pt-8 border-t border-obsidian-light space-y-12"
          >
            {/* PDFs */}
            {lesson.fileUrl && (
              <div>
                <h3 className="text-2xl font-serif font-bold text-gold mb-6 flex items-center gap-3">
                  <FileText className="w-6 h-6" /> Documents Initiatiques
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button 
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="flex items-center justify-between p-4 rounded-xl bg-obsidian-lighter border border-obsidian-light hover:border-gold/50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-mystic-purple/20 rounded-lg text-mystic-purple-light group-hover:text-gold transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-200 group-hover:text-gold transition-colors">Support de cours.pdf</h4>
                        <p className="text-xs text-gray-500">
                          {isDownloading ? 'Génération du filigrane...' : 'Document sécurisé (Filigrane)'}
                        </p>
                      </div>
                    </div>
                    <Download className={`w-5 h-5 text-gray-400 group-hover:text-gold transition-colors ${isDownloading ? 'animate-bounce' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Quiz & Completion */}
            {lesson.quiz ? (
              <div className="bg-obsidian-lighter rounded-2xl p-8 border border-obsidian-light">
                {!showQuiz && !isLessonCompleted ? (
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-100 mb-4">Avez-vous assimilé cette leçon ?</h3>
                    <button 
                      onClick={() => setShowQuiz(true)}
                      className="px-8 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light transition-colors"
                    >
                      Passer le test de validation
                    </button>
                  </div>
                ) : isLessonCompleted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-serif font-bold text-gold mb-2">Leçon Validée</h3>
                    <p className="text-gray-400 mb-6">Votre progression a été enregistrée avec succès.</p>
                    <Link to={`/course/${lesson.courseId}`} className="px-8 py-3 bg-mystic-purple-light text-white font-bold rounded-md hover:bg-mystic-purple transition-colors inline-block">
                      Retour au cours
                    </Link>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold text-gold mb-6 flex items-center gap-2">
                      <HelpCircle className="w-6 h-6" /> Test de Connaissance
                    </h3>
                    <p className="text-lg text-gray-200 mb-6">{lesson.quiz.question}</p>
                    
                    <div className="space-y-3 mb-8">
                      {lesson.quiz.options.map((option: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedAnswer(idx)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedAnswer === idx 
                              ? 'border-gold bg-gold/10 text-gold' 
                              : 'border-obsidian-light bg-obsidian hover:border-gray-500 text-gray-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {quizResult === 'error' && (
                      <p className="text-red-400 mb-4 text-sm font-medium">Réponse incorrecte. Prenez le temps de relire la leçon et réessayez.</p>
                    )}

                    <div className="flex justify-end">
                      <button 
                        onClick={handleQuizSubmit}
                        disabled={selectedAnswer === null}
                        className="px-8 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Valider ma réponse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-obsidian-lighter rounded-2xl p-8 border border-obsidian-light text-center">
                {isLessonCompleted ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-serif font-bold text-gold mb-2">Leçon Validée</h3>
                    <p className="text-gray-400 mb-6">Votre progression a été enregistrée avec succès.</p>
                    <Link to={`/course/${lesson.courseId}`} className="px-8 py-3 bg-mystic-purple-light text-white font-bold rounded-md hover:bg-mystic-purple transition-colors inline-block">
                      Retour au cours
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-gray-100 mb-4">Avez-vous terminé cette leçon ?</h3>
                    <button 
                      onClick={async () => {
                        setIsLessonCompleted(true);
                        // Update progress in Firestore
                        if (currentUser && enrollment) {
                          try {
                            const completedLessons = enrollment.completedLessons || [];
                            if (!completedLessons.includes(lesson.id)) {
                              completedLessons.push(lesson.id);
                              const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', lesson.courseId));
                              const lessonsSnapshot = await getDocs(lessonsQuery);
                              const totalLessons = lessonsSnapshot.size || 1;
                              const progress = Math.min(100, Math.round((completedLessons.length / totalLessons) * 100));
                              await updateDoc(doc(db, 'enrollments', enrollment.id), {
                                completedLessons,
                                progress,
                                lastUpdated: new Date().toISOString()
                              });
                              setEnrollment({ ...enrollment, completedLessons, progress });
                            }
                          } catch (error) {
                            console.error("Error updating progress:", error);
                          }
                        } else if (currentUser && !enrollment) {
                            try {
                              const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', lesson.courseId));
                              const lessonsSnapshot = await getDocs(lessonsQuery);
                              const totalLessons = lessonsSnapshot.size || 1;
                              const progress = Math.min(100, Math.round((1 / totalLessons) * 100));
                              const newEnrollmentRef = doc(collection(db, 'enrollments'));
                              const newEnrollmentData = {
                                  userId: currentUser.uid,
                                  courseId: lesson.courseId,
                                  enrolledAt: new Date().toISOString(),
                                  completedLessons: [lesson.id],
                                  progress,
                                  lastUpdated: new Date().toISOString()
                              };
                              await setDoc(newEnrollmentRef, newEnrollmentData);
                              setEnrollment({ id: newEnrollmentRef.id, ...newEnrollmentData });
                            } catch (error) {
                                console.error("Error creating enrollment:", error);
                            }
                        }
                      }}
                      className="px-8 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light transition-colors"
                    >
                      Marquer comme terminée
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Navigation Buttons */}
        {courseLessons.length > 0 && (
          <div className="mt-12 pt-8 border-t border-obsidian-light flex flex-col sm:flex-row items-center justify-between gap-4">
            {(() => {
              const currentIndex = courseLessons.findIndex(l => l.id === lesson.id);
              const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
              const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;
              
              // Determine if next lesson is locked
              const isNextLocked = nextLesson && !enrollment && !isAdminOrPrestataire && !nextLesson.isFreePreview;

              return (
                <>
                  <button 
                    disabled={!prevLesson}
                    onClick={() => prevLesson && navigate(`/lesson/${prevLesson.id}`)}
                    className={`w-full sm:w-auto px-6 py-3 border font-bold rounded-md text-center transition-colors flex items-center justify-center gap-2 ${
                      !prevLesson 
                        ? 'border-obsidian-light text-gray-600 bg-obsidian/50 cursor-not-allowed' 
                        : 'border-obsidian-light text-gray-300 hover:text-white hover:bg-obsidian'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Leçon précédente
                  </button>

                  <button 
                    disabled={!nextLesson || isNextLocked}
                    onClick={() => nextLesson && !isNextLocked && navigate(`/lesson/${nextLesson.id}`)}
                    className={`w-full sm:w-auto px-6 py-3 font-bold rounded-md text-center transition-colors flex items-center justify-center gap-2 ${
                      !nextLesson 
                        ? 'bg-obsidian border border-obsidian-light text-gray-600 cursor-not-allowed' 
                        : isNextLocked 
                          ? 'bg-obsidian border border-obsidian-light text-gray-500 cursor-not-allowed' 
                          : 'bg-gold text-obsidian hover:bg-gold-light'
                    }`}
                    title={isNextLocked ? "Inscrivez-vous pour accéder à cette leçon" : ""}
                  >
                    Leçon suivante
                    {isNextLocked ? <Lock className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5 rotate-180" />}
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
