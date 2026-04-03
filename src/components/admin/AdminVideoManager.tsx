import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadVideo, deleteFile } from '../../lib/storage';
import { Video, Trash2, Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminVideoManager() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; lessonId: string | null; videoUrl: string | null }>({ isOpen: false, lessonId: null, videoUrl: null });

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const q = query(collection(db, 'lessons'));
      const snapshot = await getDocs(q);
      const lessonsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLessons(lessonsData);
    } catch (err) {
      console.error("Erreur lors du chargement des leçons:", err);
      setError("Erreur lors du chargement des leçons.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (lessonId: string, file: File) => {
    if (!file.type.startsWith('video/')) {
      setError("Le fichier doit être une vidéo.");
      return;
    }

    setUploadingId(lessonId);
    setError(null);
    setSuccess(null);

    try {
      // Find current lesson to delete old video if exists
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson?.videoUrl) {
        await deleteFile(lesson.videoUrl);
      }

      // Upload new video
      const { url } = await uploadVideo(file);

      // Update Firestore
      await updateDoc(doc(db, 'lessons', lessonId), {
        videoUrl: url
      });

      setSuccess("Vidéo mise à jour avec succès.");
      fetchLessons();
    } catch (err) {
      console.error("Erreur lors de l'upload:", err);
      setError("Erreur lors de l'upload de la vidéo.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteClick = (lessonId: string, videoUrl: string) => {
    setConfirmModal({ isOpen: true, lessonId, videoUrl });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmModal.lessonId || !confirmModal.videoUrl) return;
    
    const { lessonId, videoUrl } = confirmModal;
    setConfirmModal({ isOpen: false, lessonId: null, videoUrl: null });
    setUploadingId(lessonId);
    setError(null);
    setSuccess(null);

    try {
      await deleteFile(videoUrl);
      await updateDoc(doc(db, 'lessons', lessonId), {
        videoUrl: null
      });

      setSuccess("Vidéo supprimée avec succès.");
      fetchLessons();
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Erreur lors de la suppression de la vidéo.");
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de confirmation */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian w-full max-w-md rounded-2xl border border-obsidian-light p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Confirmer la suppression</h3>
            </div>
            
            <p className="text-gray-300 mb-8">
              Êtes-vous sûr de vouloir supprimer cette vidéo ? Cette action est irréversible.
            </p>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmModal({ isOpen: false, lessonId: null, videoUrl: null })}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-obsidian rounded-lg border border-obsidian-light">
          <Video className="w-5 h-5 text-gold" />
        </div>
        <h2 className="text-xl font-bold text-gray-100">Gestionnaire de Vidéos des Leçons</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {lessons.map(lesson => (
          <div key={lesson.id} className="bg-obsidian-lighter p-4 rounded-xl border border-obsidian-light flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-100">{lesson.title}</h3>
              <p className="text-sm text-gray-400">Cours ID: {lesson.courseId}</p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {lesson.videoUrl ? (
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <a 
                    href={lesson.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm truncate max-w-[200px]"
                  >
                    Voir la vidéo
                  </a>
                  <button
                    onClick={() => handleDeleteClick(lesson.id, lesson.videoUrl)}
                    disabled={uploadingId === lesson.id}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Supprimer la vidéo"
                  >
                    {uploadingId === lesson.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  </button>
                </div>
              ) : (
                <span className="text-gray-500 text-sm italic">Aucune vidéo</span>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUpload(lesson.id, e.target.files[0]);
                    }
                  }}
                  disabled={uploadingId === lesson.id}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button 
                  disabled={uploadingId === lesson.id}
                  className="flex items-center gap-2 px-4 py-2 bg-obsidian border border-obsidian-light text-gray-300 rounded-lg hover:text-white hover:bg-obsidian-light transition-colors disabled:opacity-50"
                >
                  {uploadingId === lesson.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Remplacer / Ajouter
                </button>
              </div>
            </div>
          </div>
        ))}
        {lessons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucune leçon trouvée.
          </div>
        )}
      </div>
    </div>
  );
}
