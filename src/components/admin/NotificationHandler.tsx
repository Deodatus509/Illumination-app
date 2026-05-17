import React, { useState } from 'react';
import { Bell, Loader2, AlertTriangle, Info, Bug, RefreshCcw, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { sendNotification, NotificationResult } from '../../utils/notificationService';
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
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  
  const [isCleaning, setIsCleaning] = useState(false);
  
  const [resultDetails, setResultDetails] = useState<{ 
    success: number; 
    fail: number; 
    total: number;
    errors: Array<{ userId: string; userName: string; error: any }>;
  } | null>(null);

  const cleanInvalidTokens = async () => {
    if (!resultDetails) return;
    setIsCleaning(true);
    let cleaned = 0;
    
    try {
      const invalidTokenUserIds = resultDetails.errors
        .filter(err => err.error?.code?.includes('token') || err.error?.code?.includes('permission-denied'))
        .map(err => err.userId);

      for (const userId of invalidTokenUserIds) {
        const privateDocRef = doc(db, 'users', userId, 'private', 'profile');
        await updateDoc(privateDocRef, {
          'notificationPreferences.push': false,
          'notificationPreferences.last_error': 'invalid-token-auto-disabled'
        });
        cleaned++;
      }

      setToast({
        isVisible: true,
        type: 'success',
        title: 'Nettoyage terminé',
        message: `${cleaned} utilisateur(s) avec des tokens invalides ont été désactivés.`
      });
    } catch (error) {
      console.error('Error cleaning tokens:', error);
    } finally {
      setIsCleaning(false);
    }
  };
  
  const [notificationTitle, setNotificationTitle] = useState('Nouveau contenu disponible !');
  const [notificationMessage, setNotificationMessage] = useState('Un message important de l\'administration.');
  const [notificationLink, setNotificationLink] = useState('/');
  
  const [toast, setToast] = useState<ToastState & { actionLabel?: string; onAction?: () => void }>({
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
    const errorDetails: Array<{ userId: string; userName: string; error: any }> = [];

    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      targetCount = querySnapshot.docs.length;
      
      for (const userDoc of querySnapshot.docs) {
        try {
          const userData = userDoc.data();
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
            const result: NotificationResult = await sendNotification({
              userId: userDoc.id,
              title: notificationTitle,
              message: notificationMessage,
              link: notificationLink || null
            });
            
            if (result.success) {
              successCount++;
            } else {
              failCount++;
              errorDetails.push({
                userId: userDoc.id,
                userName: userData.displayName || userDoc.id,
                error: result.error
              });
            }
          }
        } catch (e: any) {
          console.warn(`Error sending to user ${userDoc.id}`, e);
          failCount++;
          errorDetails.push({
            userId: userDoc.id,
            userName: userDoc.id,
            error: { code: 'client-fail', message: e.message }
          });
        }
      }

      setResultDetails({ 
        success: successCount, 
        fail: failCount, 
        total: targetCount,
        errors: errorDetails
      });

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
          message: `${successCount} notification${successCount > 1 ? 's' : ''} envoyées, ${failCount} échouée${failCount > 1 ? 's' : ''}.`,
          actionLabel: 'Voir détails',
          onAction: () => setShowResultModal(true)
        });
      } else if (successCount === 0) {
        setToast({
          isVisible: true,
          type: 'error',
          title: 'Erreur',
          message: 'Échec de l’envoi des notifications.',
          actionLabel: 'Voir détails',
          onAction: () => setShowResultModal(true)
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
          <div className="flex items-center justify-between">
            <p className="text-gray-200 transition-colors">
              Envoi à <strong className="text-gray-100 font-bold">{totalUsersCount}</strong> membres.
            </p>
            <button 
              onClick={() => setIsDebugMode(!isDebugMode)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${isDebugMode ? 'bg-mystic-purple/20 text-mystic-purple-light' : 'bg-obsidian-light text-gray-500 hover:text-gray-400'}`}
            >
              <Bug size={14} />
              Debug {isDebugMode ? 'ON' : 'OFF'}
            </button>
          </div>

          {typeof Notification !== 'undefined' && (
            <div className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${Notification.permission === 'granted' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              <ShieldAlert size={14} />
              Permission Navigateur : <span className="uppercase font-bold">{Notification.permission}</span>
            </div>
          )}
          
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

      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Diagnostic des Notifications"
        icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={handleSimulate}
              className="flex items-center gap-2 px-4 py-2 bg-mystic-purple/10 text-mystic-purple-light hover:bg-mystic-purple/20 font-medium rounded-lg transition-colors"
            >
              <RefreshCcw size={16} />
              Réessayer
            </button>
            <button
              onClick={() => setShowResultModal(false)}
              className="px-5 py-2 bg-obsidian border border-obsidian-lighter text-gray-100 font-medium rounded-lg hover:bg-obsidian-light transition-colors shadow-sm"
            >
              Fermer
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">Rapport détaillé de l'envoi vers les membres du Sanctum.</p>
          
          {resultDetails && (
            <>
              <div className="bg-obsidian-light rounded-xl p-4 border border-obsidian-lighter/50 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <span className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Total</span>
                  <span className="text-gray-100 font-mono text-lg">{resultDetails.total}</span>
                </div>
                <div className="text-center border-x border-obsidian-lighter/30">
                  <span className="block text-[10px] text-emerald-500 uppercase tracking-wider mb-1 font-bold">Succès</span>
                  <span className="text-emerald-500 font-mono text-lg font-bold">{resultDetails.success}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] text-red-500 uppercase tracking-wider mb-1 font-bold">Échecs</span>
                  <span className="text-red-500 font-mono text-lg font-bold">{resultDetails.fail}</span>
                </div>
              </div>

              {resultDetails.errors.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 mb-2">Logs d'erreurs détaillés</h4>
                  {resultDetails.errors.map((err, idx) => (
                    <div key={idx} className="bg-obsidian-light/50 border border-red-500/10 rounded-lg overflow-hidden">
                      <button 
                        onClick={() => setExpandedErrorId(expandedErrorId === `${idx}` ? null : `${idx}`)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-red-500/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-200 block">{err.userName}</span>
                            <span className="text-[10px] text-red-400 font-mono">{err.error?.code || 'ERROR'}</span>
                          </div>
                        </div>
                        {expandedErrorId === `${idx}` ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                      </button>
                      
                      {expandedErrorId === `${idx}` && (
                        <div className="px-3 pb-3 pt-1 border-t border-red-500/5">
                          <p className="text-xs text-red-300/80 mb-2">{err.error?.message}</p>
                          <div className="bg-black/20 rounded p-2 text-[10px] font-mono text-gray-400 break-all">
                            ID: {err.userId}
                            {isDebugMode && (
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(err.error?.details || {}, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {resultDetails.fail > 0 && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex flex-col gap-2">
                    <div className="flex gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <p className="text-[11px] text-amber-200/70">
                        <strong>Diagnostic :</strong> Des erreurs de permissions ou de tokens ont été détectées. Cela arrive quand les utilisateurs révoquent l'accès ou si leurs sessions expirent.
                      </p>
                    </div>
                    <button 
                      onClick={cleanInvalidTokens}
                      disabled={isCleaning}
                      className="mt-1 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 py-1.5 px-3 rounded border border-amber-500/30 font-bold uppercase transition-all disabled:opacity-50"
                    >
                      {isCleaning ? 'Nettoyage...' : 'Désactiver les tokens invalides'}
                    </button>
                  </div>
                </div>
              )}
            </>
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
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
      />
    </>
  );
}
