import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, FileText, Video, Headphones, BookOpen, Image as ImageIcon } from 'lucide-react';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface AdminContentManagerProps {
  type: 'blog' | 'library' | 'academy' | 'lesson';
  activeTab?: string;
}

export default function AdminContentManager({ type, activeTab }: AdminContentManagerProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setUploadMessage(null);

    try {
      let finalMediaUrl = '';
      let finalCoverUrl = '';

      if (mediaFile) {
        setUploadMessage('Upload du média en cours...');
        const resourceType = mediaFile.type.startsWith('video/') ? 'video' : mediaFile.type.startsWith('image/') ? 'image' : 'raw';
        const uploadResult = await uploadToCloudinary(mediaFile, resourceType);
        finalMediaUrl = uploadResult.secure_url;
      }
      
      if (coverFile) {
        setUploadMessage('Upload de l\'image de couverture en cours...');
        const uploadResult = await uploadToCloudinary(coverFile, 'image');
        finalCoverUrl = uploadResult.secure_url;
      }

      setUploadMessage('Enregistrement dans la base de données...');

      let collectionName = '';
      let data: any = {};

      if (type === 'blog') {
        collectionName = 'posts';
        data = {
          title: title || "",
          content: content || "",
          mediaUrl: finalMediaUrl || "",
          isFree: isFree || false,
          previewContent: description || content.substring(0, 150) + '...' || "",
          author: author || 'Admin',
          tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
          createdAt: serverTimestamp()
        };
      } else if (type === 'library') {
        collectionName = 'library';
        data = {
          title: title || "",
          description: description || "",
          price: isFree ? 0 : Number(price) || 0,
          isFree: isFree || false,
          fileUrl: finalMediaUrl || "",
          coverUrl: finalCoverUrl || "",
          pages: 0,
          format: format || "PDF",
          createdAt: serverTimestamp()
        };
      } else if (type === 'academy') {
        collectionName = 'courses';
        data = {
          name: title || "",
          description: description || "",
          difficulty: difficulty || "Débutant",
          price: isFree ? 0 : Number(price) || 0,
          isFree: isFree || false,
          coverImage: finalCoverUrl || "",
          moduleIds: [],
          tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
          createdAt: serverTimestamp()
        };
      } else if (type === 'lesson') {
        collectionName = 'lessons';
        data = {
          title: title || "",
          description: description || "",
          content: content || "",
          courseId: courseId || "",
          duration: duration || "10 min",
          videoUrl: finalMediaUrl || "",
          order: 99, // À gérer idéalement avec le nombre actuel de leçons
          isFreePreview: isFree || false,
          createdAt: serverTimestamp()
        };
      }

      console.log(`Données à enregistrer dans ${collectionName}:`, data);
      await addDoc(collection(db, collectionName), data);
      
      setSuccess(true);
      setUploadMessage(null);
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
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur lors de l'ajout du contenu:", err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      handleFirestoreError(err, OperationType.CREATE, type === 'blog' ? 'posts' : type === 'library' ? 'library' : type === 'academy' ? 'courses' : 'lessons');
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
          Ajouter du contenu : {type === 'blog' ? 'Blog' : type === 'library' ? 'Bibliothèque' : type === 'academy' ? 'Académie' : 'Leçon'}
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
          Contenu ajouté avec succès !
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
                Fichier Média (Image, Vidéo, Document, Audio)
              </label>
              <input
                type="file"
                required={type === 'library' || type === 'academy' || type === 'lesson'}
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
              />
            </div>

            {(type === 'library' || type === 'academy') && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Image de Couverture</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Ajouter le contenu
          </button>
        </div>
      </form>
    </div>
  );
}
