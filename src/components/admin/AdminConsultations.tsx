import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, Edit2, Trash2, Check, X, MessageCircle, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminConsultations() {
  const [activeTab, setActiveTab] = useState<'services' | 'requests'>('requests');
  
  // Services State
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [currentService, setCurrentService] = useState<any>({ title: '', description: '', price: 0, is_active: true });

  // Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'services') {
      fetchServices();
    } else {
      fetchRequests();
    }
  }, [activeTab]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const q = query(collection(db, 'consultation_services'));
      const snapshot = await getDocs(q);
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'consultation_services');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const q = query(collection(db, 'consultations'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      
      // Fetch user details and service details for each request
      const requestsData = await Promise.all(snapshot.docs.map(async (requestDoc) => {
        const data = requestDoc.data();
        let userName = 'Utilisateur inconnu';
        let serviceName = 'Service inconnu';
        
        try {
          if (data.user_id) {
            const userSnap = await getDocs(query(collection(db, 'users'))); // Simplified for now
            const user = userSnap.docs.find(d => d.id === data.user_id);
            if (user) userName = user.data().name || userName;
          }
          if (data.service_id) {
            const serviceSnap = await getDocs(query(collection(db, 'consultation_services')));
            const service = serviceSnap.docs.find(d => d.id === data.service_id);
            if (service) serviceName = service.data().title || serviceName;
          }
        } catch (e) {
          console.error("Error fetching relations", e);
        }

        return { 
          id: requestDoc.id, 
          ...data,
          userName,
          serviceName
        };
      }));
      
      setRequests(requestsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'consultations');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSaveService = async () => {
    if (!currentService.title || !currentService.description) return;
    setLoadingServices(true);
    try {
      if (currentService.id) {
        await updateDoc(doc(db, 'consultation_services', currentService.id), {
          title: currentService.title,
          description: currentService.description,
          price: Number(currentService.price),
          is_active: currentService.is_active
        });
      } else {
        await addDoc(collection(db, 'consultation_services'), {
          title: currentService.title,
          description: currentService.description,
          price: Number(currentService.price),
          is_active: currentService.is_active
        });
      }
      setIsEditingService(false);
      setCurrentService({ title: '', description: '', price: 0, is_active: true });
      fetchServices();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'consultation_services');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Supprimer ce service ?')) return;
    try {
      await deleteDoc(doc(db, 'consultation_services', id));
      fetchServices();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `consultation_services/${id}`);
    }
  };

  const handleUpdateRequestStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'consultations', id), { status });
      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-obsidian-light pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'requests' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Demandes
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'services' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Services
        </button>
      </div>

      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-200">Services de Consultation</h3>
            <button
              onClick={() => {
                setCurrentService({ title: '', description: '', price: 0, is_active: true });
                setIsEditingService(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-mystic-purple text-white rounded-md hover:bg-mystic-purple-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau Service
            </button>
          </div>

          {isEditingService && (
            <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Titre</label>
                  <input
                    type="text"
                    value={currentService.title}
                    onChange={(e) => setCurrentService({ ...currentService, title: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prix (€)</label>
                  <input
                    type="number"
                    value={currentService.price}
                    onChange={(e) => setCurrentService({ ...currentService, price: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={currentService.description}
                  onChange={(e) => setCurrentService({ ...currentService, description: e.target.value })}
                  className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentService.is_active}
                  onChange={(e) => setCurrentService({ ...currentService, is_active: e.target.checked })}
                  className="rounded border-obsidian-light bg-obsidian text-mystic-purple focus:ring-mystic-purple"
                />
                <label className="text-sm text-gray-300">Actif</label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsEditingService(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveService}
                  disabled={loadingServices}
                  className="px-4 py-2 bg-gold text-obsidian font-medium rounded-md hover:bg-gold-light transition-colors flex items-center gap-2"
                >
                  {loadingServices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div key={service.id} className="bg-obsidian-lighter p-4 rounded-lg border border-obsidian-light relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentService(service);
                      setIsEditingService(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-lg font-bold text-gray-200 mb-1">{service.title}</h4>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{service.description}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gold font-medium">{service.price} €</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${service.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {service.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {selectedRequest ? (
            <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-200 mb-1">Demande de {selectedRequest.userName}</h3>
                  <p className="text-gold">{selectedRequest.serviceName}</p>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-obsidian p-4 rounded-lg border border-obsidian-light mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Message de l'utilisateur :</h4>
                <p className="text-gray-200 whitespace-pre-wrap">{selectedRequest.message}</p>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Statut :</span>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => handleUpdateRequestStatus(selectedRequest.id, e.target.value)}
                  className="bg-obsidian border border-obsidian-light rounded-md p-2 text-gray-200"
                >
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="completed">Terminé</option>
                  <option value="rejected">Rejeté</option>
                </select>
                
                {/* Future: Chat button */}
                <button className="ml-auto flex items-center gap-2 px-4 py-2 bg-mystic-purple/20 text-mystic-purple-light rounded-md hover:bg-mystic-purple/30 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Ouvrir la messagerie
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-obsidian-light text-gray-400 text-sm">
                    <th className="pb-3 font-medium">Utilisateur</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">Aucune demande de consultation.</td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="border-b border-obsidian-light/50 hover:bg-obsidian-light/20 transition-colors">
                        <td className="py-4 text-gray-200">{req.userName}</td>
                        <td className="py-4 text-gold">{req.serviceName}</td>
                        <td className="py-4 text-gray-400">
                          {req.created_at?.toDate ? req.created_at.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            req.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                            req.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {req.status === 'pending' ? 'En attente' :
                             req.status === 'approved' ? 'Approuvé' :
                             req.status === 'completed' ? 'Terminé' : 'Rejeté'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => setSelectedRequest(req)}
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
