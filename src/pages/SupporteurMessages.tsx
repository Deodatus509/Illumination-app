import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessagingUI } from '../components/messaging/MessagingUI';

export function SupporteurMessages() {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get('id') || undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-serif font-bold text-gold">Messagerie Supporteur</h2>
        </div>
        
        <MessagingUI 
          userRole={userProfile?.role as any || 'supporteur'} 
          initialConversationId={initialConversationId}
        />
      </div>
    </div>
  );
}
