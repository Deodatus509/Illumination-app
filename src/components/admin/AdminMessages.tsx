import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MessagingUI } from '../messaging/MessagingUI';

export default function AdminMessages() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get('id') || undefined;

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col h-screen">
      <header className="h-14 shrink-0 border-b border-white/10 bg-zinc-900 flex items-center px-4">
         <button onClick={() => navigate('/admin/dashboard')} className="p-2 mr-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-5 h-5 text-zinc-300" />
         </button>
         <h2 className="text-lg font-medium text-gold">Messagerie Globale</h2>
      </header>
      
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <MessagingUI 
          userRole={userProfile?.role as any || 'admin'} 
          initialConversationId={initialConversationId}
        />
      </div>
    </div>
  );
}
