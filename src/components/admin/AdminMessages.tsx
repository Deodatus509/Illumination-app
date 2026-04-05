import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessagingUI } from '../messaging/MessagingUI';

export default function AdminMessages() {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-gold">Messagerie Globale</h2>
      </div>
      
      <MessagingUI userRole={userProfile?.role as any || 'admin'} />
    </div>
  );
}
