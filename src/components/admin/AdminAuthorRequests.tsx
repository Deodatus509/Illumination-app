import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Check, X, ExternalLink } from 'lucide-react';

interface AuthorRequest {
  id: string;
  user_id: string;
  name: string;
  email: string;
  motivation: string;
  domains: string;
  experience: string;
  link?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: any;
  reviewed_at?: any;
  reviewed_by?: string;
}

export function AdminAuthorRequests() {
  const [requests, setRequests] = useState<AuthorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'author_requests'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuthorRequest));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'author_requests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: AuthorRequest) => {
    setActionLoading(request.id);
    try {
      // 1. Update request status
      const requestRef = doc(db, 'author_requests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        reviewed_at: serverTimestamp()
      });

      // 2. Update user role
      const userRef = doc(db, 'users', request.user_id);
      await updateDoc(userRef, { role: 'author' });

      // 3. Create notification
      await setDoc(doc(collection(db, 'notifications')), {
        userId: request.user_id,
        title: 'Demande Auteur Approuvée',
        message: 'Votre demande pour devenir Auteur a été acceptée. Vous pouvez maintenant accéder au Dashboard Auteur.',
        type: 'system',
        isRead: false,
        createdAt: serverTimestamp(),
        link: '/dashboard/author'
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `author_requests/${request.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: AuthorRequest) => {
    setActionLoading(request.id);
    try {
      const requestRef = doc(db, 'author_requests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewed_at: serverTimestamp()
      });

      // Create notification
      await setDoc(doc(collection(db, 'notifications')), {
        userId: request.user_id,
        title: 'Demande Auteur Refusée',
        message: 'Votre demande pour devenir Auteur a été refusée après examen.',
        type: 'system',
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `author_requests/${request.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Demandes Auteur</h2>

      {requests.length === 0 ? (
        <div className="bg-obsidian-lighter p-8 rounded-xl border border-obsidian-light text-center">
          <p className="text-gray-400">Aucune demande pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.map(request => (
            <div key={request.id} className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-100">{request.name}</h3>
                  <p className="text-sm text-gray-400">{request.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Soumis le {request.created_at?.toDate().toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status === 'pending' ? 'En attente' :
                     request.status === 'approved' ? 'Approuvée' : 'Refusée'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <strong className="text-gray-400 block mb-1">Domaines d'enseignement :</strong>
                  <p>{request.domains}</p>
                </div>
                <div>
                  <strong className="text-gray-400 block mb-1">Motivation :</strong>
                  <p className="whitespace-pre-wrap">{request.motivation}</p>
                </div>
                <div>
                  <strong className="text-gray-400 block mb-1">Expérience :</strong>
                  <p className="whitespace-pre-wrap">{request.experience}</p>
                </div>
                {request.link && (
                  <div>
                    <strong className="text-gray-400 block mb-1">Lien / Document :</strong>
                    <a href={request.link} target="_blank" rel="noopener noreferrer" className="text-mystic-purple-light hover:underline flex items-center gap-1">
                      {request.link} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {request.status === 'pending' && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handleApprove(request)}
                    disabled={actionLoading === request.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approuver
                  </button>
                  <button
                    onClick={() => handleReject(request)}
                    disabled={actionLoading === request.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Refuser
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
