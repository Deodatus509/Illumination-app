import React, { useState } from 'react';
import { Bell, Loader2, AlertTriangle, Info } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { sendNotification } from '../../utils/notificationService';
import { Modal } from '../ui/Modal';
import { Toast, ToastType } from '../ui/Toast';

interface NotificationHandlerProps {
  totalUsersCount: number;
}

interface ToastState {
  isVisible: boolean;
  type: ToastType;
  title: string;
  message: string;
}

export function NotificationHandler({ totalUsersCount }: NotificationHandlerProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultDetails, setResultDetails] = useState<{ success: number; fail: number; total: number } | null>(null);
  
  const [notificationTitle, setNotificationTitle] = useState('Nouveau contenu disponible !');
  const [notificationMessage, setNotificationMessage] = useState('Un message important de l\'administration.');
  const [notificationLink, setNotificationLink] = useState('/');
  
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    type: 'success',
    title: '',
    message: ''
  });

  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const handleSimulate = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      setToast({
        isVisible: true,
        type: 'error',
        title: 'Erreur',
        message: 'Le titre et le message sont requis.'
      });
      return;
    }
    
    setShowConfirm(false);
    setIsSimulating(true);

    let successCount = 0;
    let failCount = 0;
    let targetCount = 0;

    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      targetCount = querySnapshot.docs.length;
      
      for (const userDoc of querySnapshot.docs) {
        try {
          const privateDocRef = doc(db, 'users', userDoc.id, 'private', 'profile');
          const privateDocSnap = await getDoc(privateDocRef);
          
          let pushEnabled = true;
          if (privateDocSnap.exists()) {
            const privateData = privateDocSnap.data();
            if (privateData?.notificationPreferences?.push === false) {
              pushEnabled = false;
            }
          }

          if (pushEnabled) {
            await sendNotification({
              userId: userDoc.id,
              title: notificationTitle,
              message: notificationMessage,
              link: notificationLink || null
            });
            successCount++;
          }
        } catch (e) {
          console.warn(`Error sending to user ${userDoc.id}`, e);
          failCount++;
        }
      }

      setResultDetails({ success: successCount, fail: failCount, total: targetCount });

      if (failCount === 0 && successCount > 0) {
        setToast({
          isVisible: true,
          type: 'success',
          title: 'Succès',
          message: `${successCount} notification${successCount > 1 ? 's' : ''} ont été envoyées avec succès.`
        });
        setNotificationTitle('');
        setNotificationMessage('');
        setNotificationLink('/');
      } else if (successCount > 0 && failCount > 0) {
        setToast({
          isVisible: true,
          type: 'partial',
          title: 'Envoi partiel',
          message: `${successCount} notification${successCount > 1 ? 's' : ''} envoyées, ${failCount} échouée${failCount > 1 ? 's' : ''}.`
        });
      } else if (successCount === 0) {
        setToast({
          isVisible: true,
          type: 'error',
          title: 'Erreur',
          message: 'Échec de l’envoi des notifications.'
        });
        setShowResultModal(true);
      }

    } catch (error) {
      console.error('Critical error simulating notification:', error);
      setToast({
        isVisible: true,
        type: 'error',
        title: 'Erreur',
        message: 'Échec de l’envoi des notifications. Vérifiez votre connexion ou les permissions.'
      });
      setShowResultModal(true);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isSimulating}
        className="flex items-center gap-2 px-4 py-2 bg-mystic-purple hover:bg-mystic-purple-light text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-mystic-purple/20 focus:outline-none focus:ring-2 focus:ring-mystic-purple-light focus:ring-offset-2 focus:ring-offset-obsidian"
        aria-label="Envoyer une notification globale"
      >
        {isSimulating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Bell className="w-5 h-5" />
            Envoyer Notification Globale
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Créer une notification globale"
        icon={<Info className="w-6 h-6 text-mystic-purple-light" />}
        footer={
          <>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-gray-400 font-medium hover:text-gray-100 transition-colors focus:outline-none focus:underline"
            >
              Annuler
            </button>
            <button
              onClick={handleSimulate}
              disabled={isSimulating || !notificationTitle.trim() || !notificationMessage.trim()}
              className="px-5 py-2 bg-mystic-purple hover:bg-mystic-purple-light text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-mystic-purple-light disabled:opacity-50"
            >
              Confirmer l'envoi
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-200 mb-4 transition-colors">
            Voulez-vous envoyer une notification à l'ensemble des membres : <strong className="text-gray-100 font-bold">{totalUsersCount}</strong> utilisateur(s) ?
          </p>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300 mb-1 transition-colors">
              Titre de la notification <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              className="w-full bg-obsidian-light border border-obsidian-lighter rounded-lg px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mystic-purple/50 transition-all"
              placeholder="Ex: Nouveau contenu disponible"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300 mb-1 transition-colors">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              rows={3}
              className="w-full bg-obsidian-light border border-obsidian-lighter rounded-lg px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mystic-purple/50 transition-all resize-none"
              placeholder="Saisissez le contenu de votre message..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300 mb-1 transition-colors">
              Lien (optionnel)
            </label>
            <input
              type="text"
              value={notificationLink}
              onChange={(e) => setNotificationLink(e.target.value)}
              className="w-full bg-obsidian-light border border-obsidian-lighter rounded-lg px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mystic-purple/50 transition-all"
              placeholder="Ex: /blog ou /academy"
            />
          </div>
        </div>
      </Modal>

      {/* Complex Error / Details Modal (Fallback) */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Détails de l'opération"
        icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
        footer={
          <button
            onClick={() => setShowResultModal(false)}
            className="px-5 py-2 bg-obsidian border border-obsidian-lighter text-gray-100 font-medium rounded-lg hover:bg-obsidian-light transition-colors shadow-sm"
          >
            Fermer
          </button>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-300">Certaines notifications n'ont pas pu être envoyées correctement en raison d'erreurs techniques.</p>
          
          {resultDetails && (
            <div className="bg-obsidian-light rounded-lg p-4 border border-obsidian-lighter/50 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Tentatives totales:</span>
                <span className="text-gray-100 font-mono">{resultDetails.total}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-500 font-medium">Succès:</span>
                <span className="text-emerald-500 font-mono font-bold">{resultDetails.success}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-red-500 font-medium">Échecs:</span>
                <span className="text-red-500 font-mono font-bold">{resultDetails.fail}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Global Toast Feedback */}
      <Toast
        isVisible={toast.isVisible}
        onClose={hideToast}
        type={toast.type}
        title={toast.title}
        message={toast.message}
      />
    </>
  );
}
