import React, { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // Assurez-vous du chemin correct
import { Track } from 'livekit-client';

interface LiveStreamProps {
  roomName: string;
  userName: string;
}

const ReactionOverlay = () => {
  const [reactions, setReactions] = useState<{id: number, emoji: string, x: number}[]>([]);

  const addReaction = (emoji: string) => {
    const id = Date.now();
    setReactions(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3000);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {reactions.map(r => (
        <div key={r.id} className="absolute animate-float opacity-0 text-3xl" style={{ left: `${r.x}%`, bottom: '10%' }}>
          {r.emoji}
        </div>
      ))}
      <div className="absolute bottom-20 right-4 pointer-events-auto">
        <button onClick={() => addReaction('❤️')} className="bg-white/20 p-2 rounded-full text-2xl">❤️</button>
      </div>
    </div>
  );
};

const ActiveMembers = () => {
    const participants = useParticipants();
    return (
        <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <h3 className="font-bold mb-2">Membres actifs ({participants.length})</h3>
            <ul className="text-sm">
                {participants.map(p => <li key={p.identity}>{p.name || p.identity}</li>)}
            </ul>
        </div>
    );
};

const Timer = ({ startTime }: { startTime: Date }) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const hh = Math.floor(diff / 3600).toString().padStart(2, '0');
            const mm = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const ss = (diff % 60).toString().padStart(2, '0');
            setElapsed(`${hh}:${mm}:${ss}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);
    return <div className="text-white bg-black/50 px-2 rounded">{elapsed}</div>;
};

export function LiveStream({ roomName, userName }: LiveStreamProps) {
  const [token, setToken] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(userName)}`);
        
        if (!resp.ok) {
          const errorText = await resp.text();
          console.error('Server error response:', errorText);
          throw new Error(`Erreur serveur: ${resp.status}`);
        }

        const data = await resp.json();
        if (data.token) {
          setToken(data.token);
        } else {
          throw new Error('Pas de token reçu dans la réponse JSON');
        }
      } catch (e) {
        console.error('Erreur lors de la récupération du token:', e);
        // On pourrait afficher une erreur à l'utilisateur ici
      }
    })();
  }, [roomName, userName]);

  const startBroadcast = () => {
      setIsBroadcasting(true);
      startTimeRef.current = new Date();
  };

  if (token === "") {
    return <div className="text-white text-center p-4">Chargement...</div>;
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL}
      data-lk-theme="default"
      className="h-[100dvh] bg-black"
    >
        {!isBroadcasting ? (
            <div className="flex h-full items-center justify-center">
                <button onClick={startBroadcast} className="bg-red-600 text-white px-6 py-3 rounded-full font-bold">
                    Rejoindre le live
                </button>
            </div>
        ) : (
            <div className="flex flex-col h-full">
                <div className="relative flex-1">
                    <VideoConference />
                    <ReactionOverlay />
                    <div className="absolute top-4 left-4"><Timer startTime={startTimeRef.current!} /></div>
                </div>
                <ActiveMembers />
                <ControlBar />
            </div>
        )}
    </LiveKitRoom>
  );
}
