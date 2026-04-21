import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc, addDoc, serverTimestamp, where, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Search, Filter, Shield, UserX, UserCheck, MoreVertical, Loader2, Trash2, Bell, LayoutDashboard, Users, FileText, MessageSquare, Ban, Unlock } from 'lucide-react';
import { UserRole } from '../contexts/AuthContext';
import AdminContentManager from '../components/admin/AdminContentManager';
import AdminVideoManager from '../components/admin/AdminVideoManager';
import AdminMessages from '../components/admin/AdminMessages';
import AdminStatistics from '../components/admin/AdminStatistics';
import AdminSubscriptions from '../components/admin/AdminSubscriptions';
import AdminReports from '../components/admin/AdminReports';
import AdminSettings from '../components/admin/AdminSettings';
import HomepageManager from '../components/admin/HomepageManager';
import AdminAboutManager from '../components/admin/AdminAboutManager';
import AdminFooterManager from '../components/admin/AdminFooterManager';
import CategoryManager from '../components/admin/CategoryManager';
import AdminBannerManager from '../components/admin/AdminBannerManager';
import AdminCarouselManager from '../components/admin/AdminCarouselManager';
import AdminSanctumLucis from '../components/admin/AdminSanctumLucis';
import { AdminAuthorRequests } from '../components/admin/AdminAuthorRequests';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isPremium: boolean;
  avatar: string;
  createdAt: string;
  isVerified: boolean;
  markedForDeletion: boolean;
  isBlocked?: boolean;
}

export function AdminPanel() {
  const { userProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; userId: string | null; message: string }>({ isOpen: false, userId: null, message: '' });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSimulatingNotif, setIsSimulatingNotif] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [counts, setCounts] = useState({ blog: 0, library: 0, academy: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active tab from URL path
  const pathParts = location.pathname.split('/');
  let currentTab = pathParts.length > 2 ? pathParts[2] : 'overview';
  if (currentTab === 'dashboard') currentTab = 'overview';
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'lessons' | 'documents' | 'audio' | 'videos' | 'blog' | 'subscriptions' | 'statistics' | 'reports' | 'settings' | 'homepage' | 'about' | 'footer' | 'categories' | 'banners' | 'carousels' | 'messages' | 'sanctum_lucis' | 'author_requests'>(
    ['overview', 'users', 'content', 'lessons', 'documents', 'audio', 'videos', 'blog', 'subscriptions', 'statistics', 'reports', 'settings', 'homepage', 'about', 'footer', 'categories', 'banners', 'carousels', 'messages', 'sanctum_lucis', 'author_requests'].includes(currentTab) 
      ? currentTab as any 
      : 'overview'
  );

  // Sync URL to state
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    let currentTab = pathParts.length > 2 ? pathParts[2] : 'overview';
    if (currentTab === 'dashboard') currentTab = 'overview';
    
    if (['overview', 'users', 'content', 'lessons', 'documents', 'audio', 'videos', 'blog', 'subscriptions', 'statistics', 'reports', 'settings', 'homepage', 'about', 'footer', 'categories', 'banners', 'carousels', 'messages', 'sanctum_lucis', 'author_requests'].includes(currentTab)) {
      if (activeTab !== currentTab) {
        setActiveTab(currentTab as any);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const blogSnap = await getDocs(collection(db, 'blogPosts'));
        const librarySnap = await getDocs(collection(db, 'library'));
        const academySnap = await getDocs(collection(db, 'courses'));
        setCounts({
          blog: blogSnap.size,
          library: librarySnap.size,
          academy: academySnap.size
        });
      } catch (err) {
        console.error("Error fetching counts:", err);
      }
    };
    if (activeTab === 'overview') fetchCounts();
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any);
    setEditingItem(null);
    if (tabId === 'overview') {
      navigate('/admin/dashboard');
    } else {
      navigate(`/admin/${tabId}`);
    }
  };

  const simulateNotification = async () => {
    setIsSimulatingNotif(true);
    try {
      // Find all users who have push notifications enabled
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      let notifiedCount = 0;
      for (const userDoc of querySnapshot.docs) {
        try {
          const privateDocRef = doc(db, 'users', userDoc.id, 'private', 'profile');
          const privateDocSnap = await getDoc(privateDocRef);
          if (privateDocSnap.exists()) {
            const privateData = privateDocSnap.data() as any;
            if (privateData.notificationPreferences?.push !== false) {
              // Create notification
              await addDoc(collection(db, 'notifications'), {
                userId: userDoc.id,
                title: 'Nouveau contenu disponible !',
                message: 'Un nouvel article de blog ou ressource a été ajouté.',
                link: '/blog',
                isRead: false,
                createdAt: serverTimestamp()
              });
              notifiedCount++;
            }
          }
        } catch (e) {
          console.warn(`Could not check preferences for user ${userDoc.id}`);
        }
      }
      setAlertMessage(`${notifiedCount} notifications envoyées avec succès.`);
    } catch (error) {
      console.error('Error simulating notification:', error);
      setAlertMessage('Erreur lors de l\'envoi des notifications.');
    } finally {
      setIsSimulatingNotif(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      if (userProfile?.role !== 'admin') return;

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: AdminUser[] = [];
        
        for (const userDoc of querySnapshot.docs) {
          const publicData = userDoc.data();
          
          // Fetch private data for each user to get email and status
          // Note: In a real production app with many users, this N+1 query pattern 
          // should be replaced with a Cloud Function or a denormalized admin collection
          let privateData = { email: 'N/A', isVerified: false, markedForDeletion: false, isBlocked: false };
          try {
            const privateDocRef = doc(db, 'users', userDoc.id, 'private', 'profile');
            const privateDocSnap = await getDoc(privateDocRef);
            if (privateDocSnap.exists()) {
              privateData = { ...privateData, ...privateDocSnap.data() } as any;
            }
          } catch (e) {
            console.warn(`Could not fetch private data for user ${userDoc.id}`);
          }

          fetchedUsers.push({
            id: userDoc.id,
            name: publicData.name || publicData.displayName || 'Sans nom',
            email: privateData.email || publicData.email || 'N/A',
            role: publicData.role || 'client',
            isPremium: publicData.isPremium || false,
            avatar: publicData.avatar || publicData.photoURL || '',
            createdAt: publicData.createdAt || new Date().toISOString(),
            isVerified: privateData.isVerified || false,
            markedForDeletion: privateData.markedForDeletion || false,
            isBlocked: privateData.isBlocked || false,
          });
        }
        
        setUsers(fetchedUsers);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && userProfile?.role === 'admin') {
      fetchUsers();
    }
  }, [userProfile, authLoading]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      // Also mark as verified when an admin changes their role
      try {
        const privateDocRef = doc(db, 'users', userId, 'private', 'profile');
        await setDoc(privateDocRef, { isVerified: true }, { merge: true });
      } catch (e) {
        // Ignore if private profile doesn't exist yet
      }
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, isVerified: true } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setAlertMessage("Erreur lors de la modification du rôle.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePremiumToggle = async (userId: string, currentPremiumStatus: boolean) => {
    setActionLoading(userId);
    try {
      const newPremiumStatus = !currentPremiumStatus;
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isPremium: newPremiumStatus });
      
      setUsers(users.map(u => u.id === userId ? { ...u, isPremium: newPremiumStatus } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setAlertMessage("Erreur lors de la modification du statut premium.");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteUser = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      userId,
      message: "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
    });
  };

  const handleDeleteUser = async () => {
    if (!confirmModal.userId) return;
    const userId = confirmModal.userId;
    setConfirmModal({ isOpen: false, userId: null, message: '' });

    setActionLoading(userId);
    try {
      // Delete private profile first
      await deleteDoc(doc(db, 'users', userId, 'private', 'profile'));
      // Then delete public profile
      await deleteDoc(doc(db, 'users', userId));
      
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      setAlertMessage("Erreur lors de la suppression de l'utilisateur.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockToggle = async (userId: string, currentBlockedStatus: boolean) => {
    setActionLoading(userId);
    try {
      const newBlockedStatus = !currentBlockedStatus;
      const privateDocRef = doc(db, 'users', userId, 'private', 'profile');
      await setDoc(privateDocRef, { isBlocked: newBlockedStatus }, { merge: true });
      
      setUsers(users.map(u => u.id === userId ? { ...u, isBlocked: newBlockedStatus } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/private/profile`);
      setAlertMessage("Erreur lors du blocage/déblocage de l'utilisateur.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessageUser = async (userId: string) => {
    try {
      // Check if a direct conversation already exists
      const q = query(
        collection(db, 'conversations'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', userProfile?.uid)
      );
      const snapshot = await getDocs(q);
      
      let conversationId = null;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.participants.includes(userId)) {
          conversationId = doc.id;
          break;
        }
      }

      if (!conversationId) {
        // Create a new direct conversation
        const newConv = await addDoc(collection(db, 'conversations'), {
          type: 'direct',
          created_by: userProfile?.uid,
          participants: [userProfile?.uid, userId],
          status: 'open',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          last_message: '',
          last_message_time: serverTimestamp()
        });
        conversationId = newConv.id;
      }

      // Navigate to messages tab and maybe select this conversation
      handleTabChange('messages');
      // You might want to pass the conversationId via state or context to open it automatically
    } catch (error) {
      console.error("Error creating conversation:", error);
      setAlertMessage("Erreur lors de la création de la conversation.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-gold" />
      </div>
    );
  }

  if (!userProfile || !['admin', 'editor', 'supporteur'].includes(userProfile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAdmin = userProfile.role === 'admin';
  const isEditor = userProfile.role === 'editor' || isAdmin;
  const isSupporteur = userProfile.role === 'supporteur' || isAdmin;

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'deletion') matchesStatus = user.markedForDeletion;
    if (statusFilter === 'verified') matchesStatus = user.isVerified;
    if (statusFilter === 'unverified') matchesStatus = !user.isVerified;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-400" />
            {userProfile?.role === 'admin' ? 'Administration' : 
             userProfile?.role === 'editor' ? 'Tableau de bord Éditeur' : 
             userProfile?.role === 'supporteur' ? 'Tableau de bord Supporteur' : 'Tableau de bord'}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {userProfile?.role === 'admin' ? 'Gérez la plateforme, les utilisateurs et le contenu.' : 
             userProfile?.role === 'editor' ? 'Gérez le contenu de la plateforme.' : 
             userProfile?.role === 'supporteur' ? 'Gérez les messages de support.' : ''}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={simulateNotification}
            disabled={isSimulatingNotif}
            className="flex items-center gap-2 px-4 py-2 bg-mystic-purple-light text-white rounded-md hover:bg-mystic-purple transition-colors disabled:opacity-50"
          >
            {isSimulatingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Simuler Notification
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-obsidian-light mb-8 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-obsidian-light scrollbar-track-transparent">
        {[
          { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard, roles: ['admin', 'editor', 'supporteur'] },
          { id: 'users', label: 'Utilisateurs', icon: Users, roles: ['admin'] },
          { id: 'homepage', label: 'Accueil', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'about', label: 'À Propos', icon: FileText, roles: ['admin', 'editor'] },
          { id: 'footer', label: 'Pied de page', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'banners', label: 'Bannières', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'carousels', label: 'Carrousels', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'categories', label: 'Catégories', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'content', label: 'Contenu', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'videos', label: 'Vidéos', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'messages', label: 'Messages', icon: LayoutDashboard, roles: ['admin', 'supporteur'] },
          { id: 'sanctum_lucis', label: 'Sanctum Lucis', icon: LayoutDashboard, roles: ['admin', 'editor'] },
          { id: 'author_requests', label: 'Demandes Auteur', icon: Users, roles: ['admin'] },
          { id: 'subscriptions', label: 'Abonnements', icon: LayoutDashboard, roles: ['admin'] },
          { id: 'statistics', label: 'Statistiques', icon: LayoutDashboard, roles: ['admin'] },
          { id: 'reports', label: 'Rapports', icon: LayoutDashboard, roles: ['admin'] },
          { id: 'settings', label: 'Paramètres', icon: LayoutDashboard, roles: ['admin'] },
        ].filter(tab => tab.roles.includes(userProfile?.role || '')).map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isAdmin && (
              <div 
                onClick={() => handleTabChange('users')}
                className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light cursor-pointer hover:bg-obsidian transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 font-medium">Utilisateurs Inscrits</h3>
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <p className="text-3xl font-bold text-gray-100">{users.length}</p>
              </div>
            )}
            
            {(isAdmin || isEditor) && (
              <>
                <div 
                  onClick={() => handleTabChange('content')}
                  className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light cursor-pointer hover:bg-obsidian transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 font-medium">Articles de Blogue</h3>
                    <LayoutDashboard className="w-5 h-5 text-mystic-purple-light" />
                  </div>
                  <p className="text-3xl font-bold text-gray-100">{counts.blog}</p>
                </div>

                <div 
                  onClick={() => handleTabChange('content')}
                  className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light cursor-pointer hover:bg-obsidian transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 font-medium">Ressources Bibliothèque</h3>
                    <LayoutDashboard className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-100">{counts.library}</p>
                </div>

                <div 
                  onClick={() => handleTabChange('content')}
                  className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light cursor-pointer hover:bg-obsidian transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 font-medium">Cours Académie</h3>
                    <LayoutDashboard className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-100">{counts.academy}</p>
                </div>
              </>
            )}
          </div>
          
          {isAdmin && (
            <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
              <h3 className="text-xl font-bold text-gray-100 mb-6">Statistiques Utilisateurs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div 
                onClick={() => handleTabChange('users')}
                className="text-center p-4 bg-obsidian rounded-lg border border-obsidian-light cursor-pointer hover:border-gold transition-colors"
              >
                <div className="text-2xl font-bold text-gold">{users.length}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Total</div>
              </div>
              <div 
                onClick={() => {
                  setRoleFilter('editor');
                  handleTabChange('users');
                }}
                className="text-center p-4 bg-obsidian rounded-lg border border-obsidian-light cursor-pointer hover:border-mystic-purple-light transition-colors"
              >
                <div className="text-2xl font-bold text-mystic-purple-light">
                  {users.filter(u => u.role === 'editor').length}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Éditeurs</div>
              </div>
              <div 
                onClick={() => {
                  setStatusFilter('deletion');
                  handleTabChange('users');
                }}
                className="text-center p-4 bg-obsidian rounded-lg border border-obsidian-light cursor-pointer hover:border-red-400 transition-colors"
              >
                <div className="text-2xl font-bold text-red-400">
                  {users.filter(u => u.markedForDeletion).length}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">À Supprimer</div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {activeTab === 'homepage' && <HomepageManager />}
      {activeTab === 'about' && <AdminAboutManager />}
      {activeTab === 'footer' && <AdminFooterManager />}
      {activeTab === 'banners' && <AdminBannerManager />}
      {activeTab === 'categories' && <CategoryManager />}

      {activeTab === 'users' && isAdmin && (
        <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-obsidian-light bg-obsidian/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-obsidian-light rounded-md leading-5 bg-obsidian text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold sm:text-sm"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-500" />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="block w-full pl-10 pr-8 py-2 border border-obsidian-light rounded-md leading-5 bg-obsidian text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold sm:text-sm appearance-none"
              >
                <option value="all">Tous les rôles</option>
                <option value="client">Client</option>
                <option value="editor">Éditeur</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-8 py-2 border border-obsidian-light rounded-md leading-5 bg-obsidian text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold sm:text-sm appearance-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="verified">Email Vérifié</option>
              <option value="unverified">Email Non Vérifié</option>
              <option value="deletion">En attente de suppression</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-gold" />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-obsidian-light">
              <thead className="bg-obsidian">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Accès
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Inscription
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-obsidian-lighter divide-y divide-obsidian-light">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-obsidian/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.avatar ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={user.avatar || undefined} alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-300">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-200">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {user.markedForDeletion ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <UserX className="w-3 h-3 mr-1" /> Suppression
                            </span>
                          ) : user.isVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <UserCheck className="w-3 h-3 mr-1" /> Vérifié
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              En attente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={actionLoading === user.id}
                          className="block w-full pl-3 pr-8 py-1 text-sm border border-obsidian-light rounded-md bg-obsidian text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
                        >
                          <option value="client">Client</option>
                          <option value="author">Auteur</option>
                          <option value="editor">Editeur</option>
                          <option value="supporteur">Supporteur</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handlePremiumToggle(user.id, user.isPremium)}
                          disabled={actionLoading === user.id}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            user.isPremium 
                              ? 'bg-gold text-obsidian hover:bg-gold-light' 
                              : 'bg-obsidian border border-obsidian-light text-gray-400 hover:text-white'
                          }`}
                        >
                          {user.isPremium ? 'Premium' : 'Standard'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {actionLoading === user.id ? (
                          <Loader2 className="animate-spin h-5 w-5 text-gray-400 inline" />
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleMessageUser(user.id)}
                              className="text-mystic-purple-light hover:text-mystic-purple transition-colors"
                              title="Envoyer un message"
                            >
                              <MessageSquare className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleBlockToggle(user.id, user.isBlocked || false)}
                              className={`${user.isBlocked ? 'text-green-400 hover:text-green-300' : 'text-yellow-500 hover:text-yellow-400'} transition-colors`}
                              title={user.isBlocked ? "Débloquer l'utilisateur" : "Bloquer l'utilisateur"}
                            >
                              {user.isBlocked ? <Unlock className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
                            </button>
                            <button
                              onClick={() => confirmDeleteUser(user.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Supprimer l'utilisateur"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Aucun utilisateur trouvé correspondant à vos critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {/* Content Management Tabs */}
      {activeTab === 'content' && (
        <AdminContentManager />
      )}

      {/* New Tabs */}
      {activeTab === 'statistics' && <AdminStatistics />}
      {activeTab === 'subscriptions' && <AdminSubscriptions />}
      {activeTab === 'reports' && <AdminReports />}
      {activeTab === 'settings' && <AdminSettings />}
      {activeTab === 'videos' && <AdminVideoManager />}
      {activeTab === 'messages' && <AdminMessages />}
      {activeTab === 'sanctum_lucis' && <AdminSanctumLucis />}
      {activeTab === 'carousels' && <AdminCarouselManager />}
      {activeTab === 'author_requests' && <AdminAuthorRequests />}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-obsidian-lighter border border-obsidian-light rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Confirmation</h3>
            <p className="text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmModal({ isOpen: false, userId: null, message: '' })}
                className="px-4 py-2 rounded-md border border-obsidian-light text-gray-300 hover:text-white hover:bg-obsidian transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
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
