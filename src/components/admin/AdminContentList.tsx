import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where, getDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Trash2, FileText, Video, BookOpen, ImageIcon, Headphones, Edit } from 'lucide-react';
import { deleteFile } from '../../lib/storage';

interface AdminContentListProps {
  type: 'blog' | 'library' | 'academy' | 'lesson';
  activeTab?: string;
  onEdit?: (item: any) => void;
}

export default function AdminContentList({ type, activeTab, onEdit }: AdminContentListProps) {
  const [items, setItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null; message: string }>({ isOpen: false, id: null, message: '' });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (type === 'lesson') {
      const fetchCourses = async () => {
        try {
          const snapshot = await getDocs(collection(db, 'courses'));
          const coursesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCourses(coursesList);
        } catch (err) {
          console.error("Erreur lors du chargement des cours", err);
        }
      };
      fetchCourses();
    }

    let collectionName = '';
    let q;

    if (type === 'blog') {
      collectionName = 'blogPosts';
      q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    } else if (type === 'library') {
      collectionName = 'library';
      q = query(collection(db, collectionName));
    } else if (type === 'academy') {
      collectionName = 'courses';
      q = query(collection(db, collectionName));
    } else if (type === 'lesson') {
      collectionName = 'lessons';
      q = query(collection(db, collectionName));
    }

    if (!collectionName) return;

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [type, activeTab]);

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
      isOpen: true,
      id,
      message: 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.'
    });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmModal.id) return;
    
    setDeletingId(confirmModal.id);
    const itemId = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null, message: '' });
    
    try {
      let collectionName = type === 'blog' ? 'blogPosts' : type === 'library' ? 'library' : type === 'academy' ? 'courses' : 'lessons';
      
      // Fetch the document first to get the storage paths
      const docRef = doc(db, collectionName, itemId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Delete associated files from Supabase Storage
        const urlsToDelete = [
          data.mediaUrl,
          data.coverImage,
          data.coverUrl,
          data.fileUrl,
          data.videoUrl
        ].filter(Boolean); // Filter out empty/undefined URLs
        
        for (const url of urlsToDelete) {
          try {
            await deleteFile(url);
          } catch (storageError) {
            console.error('Error deleting file from storage:', storageError);
            // Continue deleting the document even if storage deletion fails
          }
        }
      }
      
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${type}/${itemId}`);
      setAlertMessage('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (type === 'lesson' && courseFilter !== 'all') {
      return item.courseId === courseFilter;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="bg-obsidian-lighter p-12 rounded-xl border border-obsidian-light flex justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-obsidian-lighter p-12 rounded-xl border border-obsidian-light text-center">
        <p className="text-gray-500">Aucun contenu trouvé pour cette section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {type === 'lesson' && courses.length > 0 && (
        <div className="flex justify-end mb-4">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-4 py-2 bg-obsidian border border-obsidian-light rounded-lg text-gray-200 focus:outline-none focus:border-gold"
          >
            <option value="all">Tous les cours</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title || course.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-obsidian-light">
          <thead className="bg-obsidian">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Titre
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Détails
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Accès
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-obsidian-lighter divide-y divide-obsidian-light">
            {filteredItems.length > 0 ? filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-obsidian/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-obsidian rounded-lg flex items-center justify-center overflow-hidden">
                      {item.coverUrl || item.coverImage ? (
                        <img src={item.coverUrl || item.coverImage || undefined} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-200">
                        {item.title || item.name}
                      </div>
                      {type === 'blog' && (
                        <div className="text-xs text-gray-500">
                          Par {item.author}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300">
                    {type === 'blog' && new Date(item.createdAt).toLocaleDateString('fr-FR')}
                    {type === 'library' && item.format}
                    {type === 'academy' && item.difficulty}
                    {type === 'lesson' && item.duration}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.isFree || item.isFreePreview || item.price === 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gold/20 text-gold'
                  }`}>
                    {item.isFree || item.isFreePreview || item.price === 0 ? 'Gratuit' : (item.price ? `${item.price} €` : 'Payant')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {deletingId === item.id ? (
                    <Loader2 className="animate-spin h-5 w-5 text-gray-400 inline" />
                  ) : (
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  Aucun contenu trouvé pour ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-obsidian-lighter border border-obsidian-light rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Confirmation</h3>
            <p className="text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmModal({ isOpen: false, id: null, message: '' })}
                className="px-4 py-2 rounded-md border border-obsidian-light text-gray-300 hover:text-white hover:bg-obsidian transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-md bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-obsidian-lighter border border-obsidian-light rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-4">Erreur</h3>
            <p className="text-gray-400 mb-6">{alertMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 rounded-md bg-gold text-obsidian font-medium hover:bg-gold-light transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
