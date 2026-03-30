import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { RecaptchaVerifier, linkWithPhoneNumber, PhoneAuthProvider, signInWithCredential, linkWithCredential } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { User, Mail, Phone, Globe, Moon, Sun, Bell, Shield, AlertTriangle, Save, Loader2, Camera, CheckCircle } from 'lucide-react';
import { uploadAvatar } from '../lib/storage';

export default function Profile() {
  const { currentUser: user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Phone Auth State
  const [verificationId, setVerificationId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Public Profile State
  const [publicData, setPublicData] = useState({
    name: '',
    bio: '',
    avatar: ''
  });

  // Private Profile State
  const [privateData, setPrivateData] = useState({
    phone: '',
    language: 'FR',
    theme: 'light',
    notificationPreferences: {
      push: true,
      sms: false,
      email: true
    },
    markedForDeletion: false
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        // Fetch public data (already in userProfile context, but good to ensure freshness)
        if (userProfile) {
          setPublicData({
            name: userProfile.displayName || '',
            bio: (userProfile as any).bio || '',
            avatar: userProfile.photoURL || ''
          });
        }

        // Fetch private data
        const privateDocRef = doc(db, 'users', user.uid, 'private', 'profile');
        const privateDocSnap = await getDoc(privateDocRef);

        if (privateDocSnap.exists()) {
          const data = privateDocSnap.data();
          setPrivateData({
            phone: data.phone || '',
            language: data.language || 'FR',
            theme: data.theme || 'light',
            notificationPreferences: data.notificationPreferences || { push: true, sms: false, email: true },
            markedForDeletion: data.markedForDeletion || false
          });
          setPhoneVerified(data.isPhoneVerified || false);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/private/profile`);
        setErrorMessage('Erreur lors du chargement du profil.');
      }
    };

    fetchProfileData();
  }, [user, userProfile]);

  const handlePublicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPublicData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrivateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name.startsWith('notif_')) {
        const notifType = name.replace('notif_', '');
        setPrivateData(prev => ({
          ...prev,
          notificationPreferences: {
            ...prev.notificationPreferences,
            [notifType]: checked
          }
        }));
      } else {
        setPrivateData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setPrivateData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validatePhone = (phone: string) => {
    if (!phone) return true; // Optional field
    try {
      return isValidPhoneNumber(phone);
    } catch (e) {
      return false;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    setErrorMessage('');

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('L\'image dépasse la taille limite de 10MB.');
      }

      // Delete old avatar if it exists and is a Supabase URL
      if (publicData.avatar && publicData.avatar.includes('supabase.co')) {
        try {
          const { deleteFile } = await import('../lib/storage');
          await deleteFile(publicData.avatar);
        } catch (delErr) {
          console.error('Failed to delete old avatar:', delErr);
        }
      }

      const uploadResult = await uploadAvatar(file);

      setPublicData(prev => ({ ...prev, avatar: uploadResult.url }));
      
      // Update Firestore immediately
      const publicDocRef = doc(db, 'users', user.uid);
      await updateDoc(publicDocRef, { avatar: uploadResult.url, photoURL: uploadResult.url, storagePath: uploadResult.path });
      
      const privateDocRef = doc(db, 'users', user.uid, 'private', 'profile');
      await setDoc(privateDocRef, { avatar: uploadResult.url, storagePath: uploadResult.path }, { merge: true });
      
      setSuccessMessage('Photo de profil mise à jour !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error uploading image:', error);
      setErrorMessage('Erreur lors du téléchargement de l\'image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleSendOtp = async () => {
    if (!privateData.phone || !validatePhone(privateData.phone) || !user) {
      setErrorMessage('Veuillez entrer un numéro de téléphone valide au format international.');
      return;
    }

    try {
      setErrorMessage('');
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      
      let formattedPhone = privateData.phone;
      const phoneNumber = parsePhoneNumber(formattedPhone);
      if (phoneNumber) {
        formattedPhone = phoneNumber.formatInternational();
      }

      const confirmationResult = await linkWithPhoneNumber(user, formattedPhone, appVerifier);
      (window as any).confirmationResult = confirmationResult;
      setShowOtpInput(true);
      setSuccessMessage('Code SMS envoyé !');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      if (error.code === 'auth/credential-already-in-use') {
        setErrorMessage('Ce numéro de téléphone est déjà associé à un autre compte.');
      } else if (error.code === 'auth/operation-not-allowed' || error.message.includes('region enabled')) {
        setErrorMessage('L\'authentification par téléphone ou la région SMS n\'est pas activée. Veuillez l\'activer dans la console Firebase : Authentication > Sign-in method > Phone, et Authentication > Settings > SMS Region Policy.');
      } else {
        setErrorMessage('Erreur lors de l\'envoi du SMS. Assurez-vous que le format est correct.');
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || !user) return;
    
    try {
      setErrorMessage('');
      const confirmationResult = (window as any).confirmationResult;
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otpCode);
      
      await linkWithCredential(user, credential);
      
      setPhoneVerified(true);
      setShowOtpInput(false);
      setSuccessMessage('Numéro de téléphone vérifié avec succès !');
      
      // Update Firestore
      const privateDocRef = doc(db, 'users', user.uid, 'private', 'profile');
      await setDoc(privateDocRef, { isPhoneVerified: true }, { merge: true });
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setErrorMessage('Code incorrect ou expiré.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (privateData.phone && !validatePhone(privateData.phone)) {
      setErrorMessage('Le numéro de téléphone n\'est pas valide. Veuillez utiliser le format international (ex: +33612345678).');
      return;
    }

    setLoading(true);

    try {
      // 1. Update Public Data
      const publicDocRef = doc(db, 'users', user.uid);
      await updateDoc(publicDocRef, {
        name: publicData.name,
        bio: publicData.bio,
        avatar: publicData.avatar
      });

      // 2. Update Private Data
      const privateDocRef = doc(db, 'users', user.uid, 'private', 'profile');
      
      // Format phone number if valid
      let formattedPhone = privateData.phone;
      if (formattedPhone) {
        const phoneNumber = parsePhoneNumber(formattedPhone);
        if (phoneNumber) {
          formattedPhone = phoneNumber.formatInternational();
        }
      }

      const privatePayload: any = {
        email: user.email, // Keep email in sync
        phone: formattedPhone,
        language: privateData.language,
        theme: privateData.theme,
        notificationPreferences: privateData.notificationPreferences,
        markedForDeletion: privateData.markedForDeletion,
        lastLogin: new Date().toISOString()
      };

      if (privateData.markedForDeletion) {
        privatePayload.deletionScheduledAt = serverTimestamp();
      } else {
        privatePayload.deletionScheduledAt = null;
      }

      // Use setDoc with merge to create if it doesn't exist, or update if it does
      await setDoc(privateDocRef, privatePayload, { merge: true });

      setSuccessMessage('Profil mis à jour avec succès !');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      setErrorMessage('Une erreur est survenue lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Veuillez vous connecter pour accéder à votre profil.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gérez vos informations publiques et vos paramètres de confidentialité.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section Publique */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex items-center">
            <Globe className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">Informations Publiques</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                {publicData.avatar ? (
                  <img src={publicData.avatar} alt="Avatar" className="h-24 w-24 rounded-full object-cover border-2 border-indigo-100" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-indigo-100">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm">
                  {uploadingImage ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
                </label>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Photo de profil</h4>
                <p className="text-xs text-gray-500 mt-1">JPG, GIF ou PNG. 1MB max.</p>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom complet</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={publicData.name}
                  onChange={handlePublicChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  placeholder="Jean Dupont"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio / Description</label>
              <div className="mt-1">
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={publicData.bio}
                  onChange={handlePublicChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                  placeholder="Parlez-nous un peu de vous..."
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">Ces informations seront visibles par les autres utilisateurs.</p>
            </div>
          </div>
        </div>

        {/* Section Privée */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex items-center">
            <Shield className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">Informations Privées & Sécurité</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email (Lecture seule)</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="bg-gray-50 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Téléphone (Format International)</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="relative flex-grow focus-within:z-10">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={privateData.phone}
                    onChange={handlePrivateChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-none rounded-l-md py-2 border"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={phoneVerified || !privateData.phone}
                  className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                >
                  {phoneVerified ? (
                    <><CheckCircle className="h-4 w-4 text-green-500" /> <span>Vérifié</span></>
                  ) : (
                    <span>Vérifier</span>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Nécessaire pour la vérification OTP (One-Time Password).</p>
              <div id="recaptcha-container"></div>
              
              {showOtpInput && (
                <div className="mt-3 flex items-center space-x-2">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Code SMS"
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-32 sm:text-sm border-gray-300 rounded-md py-2 border px-3"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Confirmer
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Préférences UX */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Préférences</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 space-y-6">
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">Langue</label>
                <select
                  id="language"
                  name="language"
                  value={privateData.language}
                  onChange={handlePrivateChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                >
                  <option value="FR">Français</option>
                  <option value="EN">English</option>
                  <option value="KH">Kreyòl Ayisyen</option>
                </select>
              </div>

              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700">Thème</label>
                <div className="mt-1 flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={privateData.theme === 'light'}
                      onChange={handlePrivateChange}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <span className="ml-2 flex items-center text-sm text-gray-700"><Sun className="h-4 w-4 mr-1"/> Clair</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={privateData.theme === 'dark'}
                      onChange={handlePrivateChange}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <span className="ml-2 flex items-center text-sm text-gray-700"><Moon className="h-4 w-4 mr-1"/> Sombre</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 flex items-center mb-4">
                <Bell className="h-4 w-4 mr-2" /> Notifications
              </h4>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="notif_email"
                      name="notif_email"
                      type="checkbox"
                      checked={privateData.notificationPreferences.email}
                      onChange={handlePrivateChange}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="notif_email" className="font-medium text-gray-700">Email</label>
                    <p className="text-gray-500">Recevoir des mises à jour importantes par email.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="notif_sms"
                      name="notif_sms"
                      type="checkbox"
                      checked={privateData.notificationPreferences.sms}
                      onChange={handlePrivateChange}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="notif_sms" className="font-medium text-gray-700">SMS</label>
                    <p className="text-gray-500">Recevoir des alertes de sécurité par SMS.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RGPD / Suppression */}
        <div className="bg-red-50 shadow sm:rounded-lg overflow-hidden border border-red-100">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-red-800">Zone de danger</h3>
            <div className="mt-2 max-w-xl text-sm text-red-700">
              <p>Une fois que vous marquez votre compte pour suppression, il sera définitivement effacé après 30 jours conformément au RGPD.</p>
            </div>
            <div className="mt-5">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="markedForDeletion"
                  checked={privateData.markedForDeletion}
                  onChange={handlePrivateChange}
                  className="focus:ring-red-500 h-4 w-4 text-red-600 border-red-300 rounded"
                />
                <span className="ml-2 text-sm text-red-800 font-medium">
                  Marquer mon compte pour suppression
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
            ) : (
              <Save className="-ml-1 mr-2 h-5 w-5" />
            )}
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  );
}
