import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, Edit2, Trash2, Check, X, Eye, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadFile, deleteFile } from '../../lib/storage';

export default function AdminRituals() {
  const [activeTab, setActiveTab] = useState<'rituals' | 'submissions'>('rituals');
  
  // Rituals State
  const [rituals, setRituals] = useState<any[]>([]);
  const [loadingRituals, setLoadingRituals] = useState(false);
  const [isEditingRitual, setIsEditingRitual] = useState(false);
  const [currentRitual, setCurrentRitual] = useState<any>({ title: '', description: '', steps: [''], price: 0, is_active: true, status: 'active' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  const { currentUser } = useAuth();

  useEffect(() => {
    if (activeTab === 'rituals') {
      fetchRituals();
    } else {
      fetchSubmissions();
    }
  }, [activeTab]);

  const fetchRituals = async () => {
    setLoadingRituals(true);
    try {
      const q = query(collection(db, 'rituals'));
      const snapshot = await getDocs(q);
      setRituals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'rituals');
    } finally {
      setLoadingRituals(false);
    }
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const q = query(collection(db, 'ritual_submissions'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      
      const submissionsData = await Promise.all(snapshot.docs.map(async (subDoc) => {
        const data = subDoc.data();
        let userName = 'Utilisateur inconnu';
        
        try {
          if (data.submitted_by) {
            const userSnap = await getDocs(query(collection(db, 'users')));
            const user = userSnap.docs.find(d => d.id === data.submitted_by);
            if (user) userName = user.data().name || userName;
          }
        } catch (e) {
          console.error("Error fetching user", e);
        }

        return { id: subDoc.id, ...data, userName };
      }));
      
      setSubmissions(submissionsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ritual_submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveRitual = async () => {
    if (!currentRitual.title || !currentRitual.description) return;
    setLoadingRituals(true);
    try {
      let imageUrl = currentRitual.imageUrl || '';
      if (imageFile) {
        if (imageUrl && imageUrl.includes('supabase.co')) {
          try {
            await deleteFile(imageUrl);
          } catch (e) {
            console.error("Failed to delete old image", e);
          }
        }
        const uploadResult = await uploadFile(imageFile, 'ritual-images');
        imageUrl = uploadResult.url;
      }

      const ritualData = {
        title: currentRitual.title,
        description: currentRitual.description,
        category: currentRitual.category || 'Général',
        level: currentRitual.level || 'Débutant',
        duration: currentRitual.duration || '30 min',
        isPremium: currentRitual.price > 0 || currentRitual.isPremium || false,
        imageUrl: imageUrl,
        objective: currentRitual.objective || '',
        materials: currentRitual.materials?.filter((m: string) => m.trim() !== '') || [],
        steps: currentRitual.steps.filter((s: string) => s.trim() !== ''),
        audioUrl: currentRitual.audioUrl || '',
        videoUrl: currentRitual.videoUrl || '',
        price: Number(currentRitual.price) || 0,
        is_active: currentRitual.is_active,
        status: currentRitual.status,
        updated_at: serverTimestamp()
      };

      if (currentRitual.id) {
        await updateDoc(doc(db, 'rituals', currentRitual.id), ritualData);
      } else {
        await addDoc(collection(db, 'rituals'), {
          ...ritualData,
          created_by: currentUser?.uid,
          created_at: serverTimestamp()
        });
      }
      setIsEditingRitual(false);
      setCurrentRitual({ title: '', description: '', category: 'Général', level: 'Débutant', duration: '', isPremium: false, imageUrl: '', objective: '', materials: [''], steps: [''], audioUrl: '', videoUrl: '', price: 0, is_active: true, status: 'active' });
      setImageFile(null);
      setImagePreview(null);
      fetchRituals();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rituals');
    } finally {
      setLoadingRituals(false);
    }
  };

  const handleDeleteRitual = async (id: string) => {
    if (!window.confirm('Supprimer ce rituel ?')) return;
    try {
      await deleteDoc(doc(db, 'rituals', id));
      fetchRituals();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rituals/${id}`);
    }
  };

  const handleUpdateSubmissionStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'ritual_submissions', id), { status });
      
      // If approved, create a new ritual
      if (status === 'approved' && selectedSubmission) {
        await addDoc(collection(db, 'rituals'), {
          title: selectedSubmission.title,
          description: selectedSubmission.description,
          category: selectedSubmission.category || 'Général',
          level: selectedSubmission.level || 'Débutant',
          duration: selectedSubmission.duration || '30 min',
          objective: selectedSubmission.objective || '',
          materials: selectedSubmission.materials || [],
          steps: selectedSubmission.steps,
          created_by: selectedSubmission.submitted_by,
          status: 'active',
          price: 0,
          isPremium: false,
          is_active: true,
          created_at: serverTimestamp()
        });
      }

      fetchSubmissions();
      if (selectedSubmission && selectedSubmission.id === id) {
        setSelectedSubmission({ ...selectedSubmission, status });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ritual_submissions/${id}`);
    }
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...currentRitual.steps];
    newSteps[index] = value;
    setCurrentRitual({ ...currentRitual, steps: newSteps });
  };

  const addStep = () => {
    setCurrentRitual({ ...currentRitual, steps: [...currentRitual.steps, ''] });
  };

  const removeStep = (index: number) => {
    const newSteps = currentRitual.steps.filter((_: any, i: number) => i !== index);
    setCurrentRitual({ ...currentRitual, steps: newSteps });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-obsidian-light pb-2">
        <button
          onClick={() => setActiveTab('rituals')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'rituals' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Rituels Actifs
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'submissions' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Soumissions
        </button>
      </div>

      {activeTab === 'rituals' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-200">Catalogue des Rituels</h3>
            <button
              onClick={() => {
                setCurrentRitual({ title: '', description: '', steps: [''], price: 0, is_active: true, status: 'active' });
                setIsEditingRitual(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-mystic-purple text-white rounded-md hover:bg-mystic-purple-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau Rituel
            </button>
          </div>

          {isEditingRitual && (
            <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Titre</label>
                  <input
                    type="text"
                    value={currentRitual.title}
                    onChange={(e) => setCurrentRitual({ ...currentRitual, title: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
                  <select
                    value={currentRitual.category || 'Général'}
                    onChange={(e) => setCurrentRitual({ ...currentRitual, category: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  >
                    <option value="Général">Général</option>
                    <option value="Protection">Protection</option>
                    <option value="Abondance">Abondance</option>
                    <option value="Amour">Amour</option>
                    <option value="Purification">Purification</option>
                    <option value="Guérison">Guérison</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Niveau</label>
                  <select
                    value={currentRitual.level || 'Débutant'}
                    onChange={(e) => setCurrentRitual({ ...currentRitual, level: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  >
                    <option value="Débutant">Débutant</option>
                    <option value="Intermédiaire">Intermédiaire</option>
                    <option value="Avancé">Avancé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Durée</label>
                  <input
                    type="text"
                    value={currentRitual.duration || ''}
                    onChange={(e) => setCurrentRitual({ ...currentRitual, duration: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                    placeholder="Ex: 30 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prix (€)</label>
                  <input
                    type="number"
                    value={currentRitual.price}
                    onChange={(e) => setCurrentRitual({ ...currentRitual, price: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Image</label>
                  <div className="flex items-center gap-4">
                    {imagePreview || currentRitual.imageUrl ? (
                      <img 
                        src={imagePreview || currentRitual.imageUrl} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded-md border border-obsidian-light"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-obsidian-lighter rounded-md border border-obsidian-light flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-1.5 text-gray-200 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-mystic-purple file:text-white hover:file:bg-mystic-purple-light"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={currentRitual.description}
                  onChange={(e) => setCurrentRitual({ ...currentRitual, description: e.target.value })}
                  className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Objectif détaillé</label>
                <textarea
                  value={currentRitual.objective || ''}
                  onChange={(e) => setCurrentRitual({ ...currentRitual, objective: e.target.value })}
                  className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Étapes du rituel</label>
                {currentRitual.steps.map((step: string, index: number) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <span className="bg-obsidian-light text-gray-400 px-3 py-2 rounded-md">{index + 1}</span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      className="flex-1 bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                      placeholder="Description de l'étape..."
                    />
                    <button 
                      onClick={() => removeStep(index)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={addStep}
                  className="mt-2 text-sm text-gold hover:text-gold-light flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter une étape
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={currentRitual.is_active}
                  onChange={(e) => setCurrentRitual({ ...currentRitual, is_active: e.target.checked })}
                  className="rounded border-obsidian-light bg-obsidian text-mystic-purple focus:ring-mystic-purple"
                />
                <label className="text-sm text-gray-300">Actif</label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsEditingRitual(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRitual}
                  disabled={loadingRituals}
                  className="px-4 py-2 bg-gold text-obsidian font-medium rounded-md hover:bg-gold-light transition-colors flex items-center gap-2"
                >
                  {loadingRituals ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rituals.map((ritual) => (
              <div key={ritual.id} className="bg-obsidian-lighter p-4 rounded-lg border border-obsidian-light relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentRitual(ritual);
                      setIsEditingRitual(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRitual(ritual.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-lg font-bold text-gray-200 mb-1">{ritual.title}</h4>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{ritual.description}</p>
                <div className="text-sm text-gray-500 mb-3">
                  {ritual.steps?.length || 0} étapes
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gold font-medium">{ritual.price > 0 ? `${ritual.price} €` : 'Gratuit'}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${ritual.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {ritual.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {selectedSubmission ? (
            <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-200 mb-1">{selectedSubmission.title}</h3>
                  <p className="text-mystic-purple-light">Proposé par : {selectedSubmission.userName}</p>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                  <p className="text-gray-200 bg-obsidian p-3 rounded-lg border border-obsidian-light">{selectedSubmission.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Étapes</h4>
                  <div className="space-y-2">
                    {selectedSubmission.steps?.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-3 bg-obsidian p-3 rounded-lg border border-obsidian-light">
                        <span className="text-gold font-bold">{idx + 1}.</span>
                        <p className="text-gray-200">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-obsidian-light">
                <span className="text-sm text-gray-400">Statut :</span>
                <select
                  value={selectedSubmission.status}
                  onChange={(e) => handleUpdateSubmissionStatus(selectedSubmission.id, e.target.value)}
                  className="bg-obsidian border border-obsidian-light rounded-md p-2 text-gray-200"
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Approuver (Créer rituel)</option>
                  <option value="rejected">Rejeter</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-obsidian-light text-gray-400 text-sm">
                    <th className="pb-3 font-medium">Titre</th>
                    <th className="pb-3 font-medium">Proposé par</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loadingSubmissions ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">Aucune soumission de rituel.</td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr key={sub.id} className="border-b border-obsidian-light/50 hover:bg-obsidian-light/20 transition-colors">
                        <td className="py-4 text-gray-200 font-medium">{sub.title}</td>
                        <td className="py-4 text-mystic-purple-light">{sub.userName}</td>
                        <td className="py-4 text-gray-400">
                          {sub.created_at?.toDate ? sub.created_at.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            sub.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            sub.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {sub.status === 'pending' ? 'En attente' :
                             sub.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-2 text-gray-400 hover:text-gold transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
