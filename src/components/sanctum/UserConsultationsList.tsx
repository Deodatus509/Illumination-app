import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Edit, Trash2, MessageSquare, X, Check, Info } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { useNavigate } from 'react-router-dom';

export function UserConsultationsList() {
  const { currentUser } = useAuth();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'consultations'),
      where('user_id', '==', currentUser.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'consultations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCancel = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
      try {
        await deleteDoc(doc(db, 'consultations', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `consultations/${id}`);
      }
    }
  };

  const startEdit = (consultation: any) => {
    setEditingId(consultation.id);
    setEditData({
      fullName: consultation.fullName,
      birthDate: consultation.birthDate || '',
      birthTime: consultation.birthTime || '',
      birthPlace: consultation.birthPlace || '',
      preferredDate: consultation.preferredDate || '',
      message: consultation.message
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'consultations', id), editData);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  const openConsultation = (id: string) => {
    navigate(`/sanctum-lucis/consultations/${id}`);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-mystic-purple" /></div>;
  }

  if (consultations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Vous n'avez aucune demande de consultation en cours.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {consultations.map((consultation) => (
        <div key={consultation.id} className="bg-obsidian-lighter border border-obsidian-light rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-100">Demande de Consultation</h3>
              <p className="text-sm text-gray-400">
                Statut: <span className={`font-medium ${
                  consultation.status === 'pending' ? 'text-yellow-400' : 
                  consultation.status === 'approved' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {consultation.status === 'pending' ? 'En attente' : 
                   consultation.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => openConsultation(consultation.id)}
                className="p-2 bg-mystic-purple/20 text-mystic-purple-light hover:bg-mystic-purple/30 rounded-lg transition-colors"
                title="Voir détails"
              >
                <Info className="w-5 h-5" />
              </button>
              <button 
                onClick={() => openConsultation(consultation.id)}
                className="p-2 bg-gold/20 text-gold hover:bg-gold/30 rounded-lg transition-colors"
                title="Messages"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              {consultation.status === 'pending' && (
                <>
                  {editingId === consultation.id ? (
                    <button 
                      onClick={() => saveEdit(consultation.id)}
                      className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => startEdit(consultation)}
                      className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleCancel(consultation.id)}
                    className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {editingId === consultation.id ? (
            <div className="space-y-4 mt-4">
              <input
                type="text"
                value={editData.fullName}
                onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                className="w-full bg-obsidian border border-obsidian-light rounded-lg p-2 text-gray-200"
                placeholder="Nom complet"
              />
              <textarea
                value={editData.message}
                onChange={(e) => setEditData({...editData, message: e.target.value})}
                className="w-full bg-obsidian border border-obsidian-light rounded-lg p-2 text-gray-200"
                rows={4}
                placeholder="Message"
              />
              <button onClick={() => setEditingId(null)} className="text-sm text-gray-400 hover:text-white">Annuler l'édition</button>
            </div>
          ) : (
            <div className="mt-4 text-gray-300">
              <p><strong>Nom:</strong> {consultation.fullName}</p>
              <p className="mt-2"><strong>Message:</strong> {consultation.message}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
