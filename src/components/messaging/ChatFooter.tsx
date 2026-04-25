import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Mic, Camera, Image, FileText, Music, MapPin, X, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageEditor } from './ImageEditor';

interface ChatFooterProps {
  onSendMessage: (message: string) => Promise<void>;
  onFileUpload: (file: File) => Promise<void>;
  sending: boolean;
  onAudioRecordStart: () => void;
  onAudioRecordStop: () => void;
  isRecording: boolean;
}

export function ChatFooter({ onSendMessage, onFileUpload, sending, onAudioRecordStart, onAudioRecordStop, isRecording }: ChatFooterProps) {
  const [text, setText] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [isCancelZone, setIsCancelZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSendMessage(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setEditingImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        await onFileUpload(file);
      }
      setShowMediaMenu(false);
    }
  };

  const handleSaveEditedImage = async (blob: Blob) => {
    const file = new File([blob], 'edited_image.jpg', { type: 'image/jpeg' });
    await onFileUpload(file);
    setEditingImage(null);
  };

  const handleAudioDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (text.trim()) return;
    onAudioRecordStart();
  };

  const handleAudioUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (text.trim()) return;
    if (isCancelZone) {
      console.log('Recording cancelled');
      onAudioRecordStop(); // Assume this handles cancellation if needed internally
    } else {
      onAudioRecordStop();
    }
    setIsCancelZone(false);
  };

  return (
    <div className="bg-[#0f0f0f] border-t border-zinc-800 p-3 pt-2 relative">
      {/* Media Menu Sheet */}
      <AnimatePresence>
        {showMediaMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-full left-0 right-0 bg-[#1a1a1a] p-4 rounded-t-2xl border-t border-zinc-800 grid grid-cols-3 gap-4"
          >
            {[
              { icon: Camera, label: 'Caméra', action: () => console.log('Camera') },
              { icon: Image, label: 'Galerie', action: () => fileInputRef.current?.click() },
              { icon: FileText, label: 'Document', action: () => console.log('Doc') },
              { icon: Music, label: 'Audio', action: () => console.log('Audio') },
              { icon: MapPin, label: 'Localisation', action: () => console.log('Location') },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="flex flex-col items-center gap-2 p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition"
              >
                <item.icon className="w-6 h-6 text-[#d4af37]" />
                <span className="text-xs text-zinc-400">{item.label}</span>
              </button>
            ))}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setShowMediaMenu(!showMediaMenu)}
          className={`p-2 rounded-full transition-all ${showMediaMenu ? 'bg-[#d4af37] text-black rotate-45' : 'bg-zinc-800 text-zinc-400'}`}
        >
          <Plus size={24} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 bg-zinc-900 text-white rounded-2xl px-4 py-2.5 max-h-32 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-[#d4af37] resize-none overflow-y-auto"
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
          }}
        />

        <motion.button
          type={text.trim() ? 'submit' : 'button'}
          whileTap={{ scale: 0.9 }}
          onMouseDown={handleAudioDown}
          onMouseUp={handleAudioUp}
          onTouchStart={handleAudioDown}
          onTouchEnd={handleAudioUp}
          className={`p-3 rounded-full shadow-lg transition-all duration-300 ${
            text.trim() 
              ? 'bg-[#d4af37] text-black scale-100' 
              : 'bg-zinc-800 text-zinc-400'
          } ${isRecording ? 'scale-125 bg-red-600 text-white' : ''}`}
        >
          {sending ? (
            <Loader2 className="animate-spin" size={24} />
          ) : text.trim() ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Send size={24} /></motion.div>
          ) : (
            <Mic size={24} className={isRecording ? 'animate-pulse' : ''} />
          )}
        </motion.button>
      </form>
      
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-[#0f0f0f] flex items-center justify-between px-4 z-10">
          <span className="text-red-500 animate-pulse font-mono">REC 00:00</span>
          <Trash2 className="text-zinc-500" />
          <span className="text-zinc-400 text-sm">Glissez pour annuler</span>
        </div>
      )}

      {editingImage && (
        <ImageEditor 
          image={editingImage} 
          onClose={() => setEditingImage(null)} 
          onSave={handleSaveEditedImage} 
        />
      )}
    </div>
  );
}
