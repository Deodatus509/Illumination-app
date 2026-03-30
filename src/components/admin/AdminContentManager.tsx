import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, FileText, Video, Headphones, BookOpen, Image as ImageIcon, Save, X } from 'lucide-react';
import { uploadImage, uploadPDF, uploadVideo, uploadAudio, uploadCourseImage, uploadLessonFile, uploadFile, deleteFile, uploadBlogCover } from '../../lib/storage';

interface AdminContentManagerProps {
  type: 'blog' | 'library' | 'academy' | 'lesson';
  activeTab?: string;
  editingItem?: any | null;
  onCancelEdit?: () => void;
}

export default function AdminContentManager({ type, activeTab, editingItem, onCancelEdit }: AdminContentManagerProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [price, setPrice] = useState(0);
  const [isFree, setIsFree] = useState(true);
  const [difficulty, setDifficulty] = useState('Débutant');
  const [format, setFormat] = useState(
    activeTab === 'audio' ? 'Audio' : 
    activeTab === 'videos' ? 'Vidéo' : 
    'PDF'
  );
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');
  const [courseId, setCourseId] = useState('');
  const [duration, setDuration] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    setFormat(
      activeTab === 'audio' ? 'Audio' : 
      activeTab === 'videos' ? 'Vidéo' : 
      'PDF'
    );
  }, [activeTab]);

  useEffect(() => {
    if (type === 'lesson') {
      const fetchCourses = async () => {
        try {
          const snapshot = await getDocs(collection(db, 'courses'));
          const coursesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCourses(coursesList);
          if (coursesList.length > 0) {
            setCourseId(coursesList[0].id);
          }
        } catch (err) {
          console.error("Erreur lors du chargement des cours", err);
        }
      };
      fetchCourses();
    }
  }, [type]);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || editingItem.name || '');
      setDescription(editingItem.description || editingItem.previewContent || '');
      setContent(editingItem.content || '');
      setPrice(editingItem.price || 0);
      setIsFree(editingItem.isFree ?? (editingItem.price === 0));
      setDifficulty(editingItem.difficulty || 'Débutant');
      setFormat(editingItem.format || 'PDF');
      setTags(editingItem.tags ? editingItem.tags.join(', ') : '');
      setAuthor(editingItem.author || '');
      setCourseId(editingItem.courseId || '');
      setDuration(editingItem.duration || '');
      // Note: We don't set files, they need to be re-uploaded if changed
    } else {
      // Reset form
      setTitle('');
      setDescription('');
      setContent('');
      setMediaFile(null);
      setCoverFile(null);
      setAudioFile(null);
      setPdfFile(null);
      setPrice(0);
      setIsFree(true);
      setTags('');
      setAuthor('');
      setDuration('');
    }
  }, [editingItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setUploadMessage(null);

    try {
      let finalMediaUrl = '';
      let finalMediaPath = '';
      let finalCoverUrl = '';
      let finalCoverPath = '';
      let finalAudioUrl = '';
      let finalAudioPath = '';
      let finalPdfUrl = '';
      let finalPdfPath = '';

      if (mediaFile) {
        // Validation type et taille
        const isVideo = format === 'Vidéo' || (type === 'lesson' && mediaFile.type.startsWith('video/'));
        const isAudio = format === 'Audio' || (type === 'lesson' && mediaFile.type.startsWith('audio/'));
        const maxSize = isVideo ? 50 * 1024 * 1024 : isAudio ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
        
        if (mediaFile.size > maxSize) {
          throw new Error(`Le fichier média dépasse la taille limite de ${isVideo ? '50MB' : isAudio ? '20MB' : '10MB'}.`);
        }

        // Validation du type de fichier
        if (type === 'library') {
          if (format === 'PDF' && mediaFile.type !== 'application/pdf') {
            throw new Error('Le fichier doit être un PDF.');
          } else if (format === 'Vidéo' && !mediaFile.type.startsWith('video/')) {
            throw new Error('Le fichier doit être une vidéo.');
          } else if (format === 'Audio' && !mediaFile.type.startsWith('audio/')) {
            throw new Error('Le fichier doit être un audio.');
          } else if (format === 'Image' && !mediaFile.type.startsWith('image/')) {
            throw new Error('Le fichier doit être une image.');
          }
        } else if (type === 'lesson') {
          if (!mediaFile.type.startsWith('video/') && !mediaFile.type.startsWith('audio/')) {
             // In lessons, mediaFile is usually video or audio
             // We allow both, but we should check if it's one of them
          }
        }
        
        // Delete old media file if editing
        if (editingItem) {
          const oldMediaUrl = editingItem.mediaUrl || editingItem.fileUrl || editingItem.videoUrl;
          if (oldMediaUrl && oldMediaUrl.includes('supabase.co')) {
            try {
              await deleteFile(oldMediaUrl);
            } catch (delErr) {
              console.error('Failed to delete old media file:', delErr);
            }
          }
        }

        setUploadMessage('Upload du média en cours...');
        
        let uploadResult;
        if (type === 'blog') {
          uploadResult = await uploadImage(mediaFile);
        } else if (type === 'library') {
          if (format === 'PDF' || format === 'Epub') uploadResult = await uploadPDF(mediaFile);
          else if (format === 'Audio') uploadResult = await uploadAudio(mediaFile);
          else if (format === 'Vidéo') uploadResult = await uploadVideo(mediaFile);
          else uploadResult = await uploadImage(mediaFile);
        } else if (type === 'lesson') {
          uploadResult = await uploadLessonFile(mediaFile);
        } else {
          uploadResult = await uploadFile(mediaFile, 'lesson-files');
        }
        finalMediaUrl = uploadResult.url;
        finalMediaPath = uploadResult.path;
      }
      
      if (coverFile) {
        if (coverFile.size > 10 * 1024 * 1024) {
          throw new Error('L\'image de couverture dépasse la taille limite de 10MB.');
        }
        
        // Delete old cover file if editing
        if (editingItem) {
          const oldCoverUrl = editingItem.coverImage || editingItem.coverUrl;
          if (oldCoverUrl && oldCoverUrl.includes('supabase.co')) {
            try {
              await deleteFile(oldCoverUrl);
            } catch (delErr) {
              console.error('Failed to delete old cover file:', delErr);
            }
          }
        }

        setUploadMessage('Upload de l\'image de couverture en cours...');
        let coverUploadResult;
        if (type === 'academy') {
          coverUploadResult = await uploadCourseImage(coverFile);
        } else if (type === 'blog') {
          coverUploadResult = await uploadBlogCover(coverFile);
        } else {
          coverUploadResult = await uploadImage(coverFile);
        }
        finalCoverUrl = coverUploadResult.url;
        finalCoverPath = coverUploadResult.path;
      } else if (editingItem) {
        finalCoverUrl = editingItem.coverUrl || editingItem.coverImage || '';
        finalCoverPath = editingItem.coverStoragePath || '';
      }

      if (audioFile) {
        if (audioFile.size > 20 * 1024 * 1024) {
          throw new Error('Le fichier audio dépasse la taille limite de 20MB.');
        }
        if (!audioFile.type.startsWith('audio/')) {
          throw new Error('Le fichier doit être un audio.');
        }
        if (editingItem && editingItem.audioUrl && editingItem.audioUrl.includes('supabase.co')) {
          try { await deleteFile(editingItem.audioUrl); } catch (e) {}
        }
        setUploadMessage('Upload du fichier audio en cours...');
        const audioUploadResult = await uploadAudio(audioFile);
        finalAudioUrl = audioUploadResult.url;
        finalAudioPath = audioUploadResult.path;
      } else if (editingItem) {
        finalAudioUrl = editingItem.audioUrl || '';
        finalAudioPath = editingItem.audioStoragePath || '';
      }

      if (pdfFile) {
        if (pdfFile.size > 10 * 1024 * 1024) {
          throw new Error('Le fichier PDF dépasse la taille limite de 10MB.');
        }
        if (pdfFile.type !== 'application/pdf') {
          throw new Error('Le fichier doit être un PDF.');
        }
        if (editingItem && editingItem.fileUrl && editingItem.fileUrl.includes('supabase.co')) {
          try { await deleteFile(editingItem.fileUrl); } catch (e) {}
        }
        setUploadMessage('Upload du fichier PDF en cours...');
        const pdfUploadResult = await uploadPDF(pdfFile);
        finalPdfUrl = pdfUploadResult.url;
        finalPdfPath = pdfUploadResult.path;
      } else if (editingItem) {
        finalPdfUrl = editingItem.fileUrl || '';
        finalPdfPath = editingItem.fileStoragePath || '';
      }

      setUploadMessage('Enregistrement dans la base de données...');

      let collectionName = '';
      let data: any = {};

      if (type === 'blog') {
        collectionName = 'posts';
        data = {
          title: title || "",
          content: content || "",
          mediaUrl: finalMediaUrl || (editingItem ? editingItem.mediaUrl : ""),
          mediaStoragePath: finalMediaPath || (editingItem ? editingItem.mediaStoragePath : ""),
          coverImage: finalCoverUrl || (editingItem ? editingItem.coverImage : ""),
          coverStoragePath: finalCoverPath || (editingItem ? editingItem.coverStoragePath : ""),
          isFree: isFree || false,
          previewContent: description || content.substring(0, 150) + '...' || "",
          author: author || 'Admin',
          tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
          updatedAt: serverTimestamp()
        };
        if (!editingItem) data.createdAt = serverTimestamp();
      } else if (type === 'library') {
        collectionName = 'library';
        data = {
          title: title || "",
          description: description || "",
          price: isFree ? 0 : Number(price) || 0,
          isFree: isFree || false,
          fileUrl: finalMediaUrl || (editingItem ? editingItem.fileUrl : ""),
          fileStoragePath: finalMediaPath || (editingItem ? editingItem.fileStoragePath : ""),
          coverUrl: finalCoverUrl || (editingItem ? editingItem.coverUrl : ""),
          coverStoragePath: finalCoverPath || (editingItem ? editingItem.coverStoragePath : ""),
          pages: 0,
          format: format || "PDF",
          updatedAt: serverTimestamp()
        };
        if (!editingItem) data.createdAt = serverTimestamp();
      } else if (type === 'academy') {
        collectionName = 'courses';
        data = {
          name: title || "",
          description: description || "",
          difficulty: difficulty || "Débutant",
          price: isFree ? 0 : Number(price) || 0,
          isFree: isFree || false,
          coverImage: finalCoverUrl || (editingItem ? editingItem.coverImage : ""),
          coverStoragePath: finalCoverPath || (editingItem ? editingItem.coverStoragePath : ""),
          audioUrl: finalAudioUrl || (editingItem ? editingItem.audioUrl : ""),
          audioStoragePath: finalAudioPath || (editingItem ? editingItem.audioStoragePath : ""),
          moduleIds: editingItem ? editingItem.moduleIds : [],
          tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
          updatedAt: serverTimestamp()
        };
        if (!editingItem) data.createdAt = serverTimestamp();
      } else if (type === 'lesson') {
        collectionName = 'lessons';
        data = {
          title: title || "",
          description: description || "",
          content: content || "",
          courseId: courseId || "",
          duration: duration || "10 min",
          videoUrl: finalMediaUrl || (editingItem ? editingItem.videoUrl : ""),
          videoStoragePath: finalMediaPath || (editingItem ? editingItem.videoStoragePath : ""),
          audioUrl: finalAudioUrl || (editingItem ? editingItem.audioUrl : ""),
          audioStoragePath: finalAudioPath || (editingItem ? editingItem.audioStoragePath : ""),
          fileUrl: finalPdfUrl || (editingItem ? editingItem.fileUrl : ""),
          fileStoragePath: finalPdfPath || (editingItem ? editingItem.fileStoragePath : ""),
          order: editingItem ? editingItem.order : 99,
          isFreePreview: isFree || false,
          updatedAt: serverTimestamp()
        };
        if (!editingItem) data.createdAt = serverTimestamp();
      }

      console.log(`Données à enregistrer dans ${collectionName}:`, data);
      
      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), data);
        setSuccess(true);
        if (onCancelEdit) onCancelEdit();
      } else {
        await addDoc(collection(db, collectionName), data);
        setSuccess(true);
        // Reset form
        setTitle('');
        setDescription('');
        setContent('');
        setMediaFile(null);
        setCoverFile(null);
        setPrice(0);
        setIsFree(true);
        setTags('');
        setAuthor('');
        setDuration('');
        setResetKey(prev => prev + 1);
      }
      
      setUploadMessage(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du contenu:", err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      handleFirestoreError(err, editingItem ? OperationType.UPDATE : OperationType.CREATE, type === 'blog' ? 'posts' : type === 'library' ? 'library' : type === 'academy' ? 'courses' : 'lessons');
    } finally {
      setLoading(false);
      setUploadMessage(null);
    }
  };

  return (
    <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-obsidian rounded-lg border border-obsidian-light">
          {type === 'blog' && <FileText className="w-5 h-5 text-mystic-purple-light" />}
          {type === 'library' && <BookOpen className="w-5 h-5 text-blue-400" />}
          {type === 'academy' && <Video className="w-5 h-5 text-green-400" />}
          {type === 'lesson' && <Headphones className="w-5 h-5 text-gold" />}
        </div>
        <h2 className="text-xl font-bold text-gray-100">
          {editingItem ? 'Modifier le contenu :' : 'Ajouter du contenu :'} {type === 'blog' ? 'Blog' : type === 'library' ? 'Bibliothèque' : type === 'academy' ? 'Académie' : 'Leçon'}
        </h2>
      </div>

      {uploadMessage && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {uploadMessage}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          Contenu {editingItem ? 'modifié' : 'ajouté'} avec succès !
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form key={resetKey} onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {type === 'lesson' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Cours associé</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name || course.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Titre / Nom</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
              />
            </div>

            {(type === 'library' || type === 'academy' || type === 'lesson') && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
            )}

            {type === 'blog' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Auteur</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                  />
                </div>
              </>
            )}
            
            {(type === 'blog' || type === 'academy') && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="ex: spiritualité, méditation"
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
            )}

            {type === 'academy' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Difficulté</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>
            )}

            {type === 'lesson' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Durée (ex: 15 min)</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Fichier Média (Image, Vidéo, Document, Audio) {editingItem && '(Optionnel)'}
              </label>
              <input
                type="file"
                required={!editingItem && (type === 'library' || type === 'academy' || type === 'lesson')}
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
              />
            </div>

            {(type === 'library' || type === 'academy' || type === 'blog') && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Image de Couverture {editingItem && '(Optionnel)'}</label>
                <input
                  type="file"
                  accept="image/*"
                  required={!editingItem && (type === 'library' || type === 'academy' || type === 'blog')}
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                />
              </div>
            )}

            {(type === 'academy' || type === 'lesson') && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Fichier Audio (Optionnel)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                />
              </div>
            )}

            {type === 'lesson' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Fichier PDF (Optionnel)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                />
              </div>
            )}

            {type === 'library' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                >
                  <option value="PDF">PDF</option>
                  <option value="Epub">Epub</option>
                  <option value="Audio">Audio</option>
                  <option value="Vidéo">Vidéo</option>
                  <option value="Image">Image</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-4 h-4 text-gold bg-obsidian border-obsidian-light rounded focus:ring-gold focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-300">
                  {type === 'lesson' ? 'Aperçu Gratuit' : 'Contenu Gratuit'}
                </span>
              </label>

              {!isFree && (type === 'library' || type === 'academy') && (
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required={!isFree}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="Prix (€)"
                    className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {(type === 'blog' || type === 'lesson') && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Contenu {type === 'lesson' ? 'de la leçon' : 'de l\'article'}</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
            />
          </div>
        )}

        <div className="flex justify-end gap-4">
          {editingItem && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-6 py-3 border border-obsidian-light text-gray-300 font-medium rounded-lg hover:bg-obsidian transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingItem ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
            {editingItem ? 'Enregistrer les modifications' : 'Ajouter le contenu'}
          </button>
        </div>
      </form>
    </div>
  );
}
