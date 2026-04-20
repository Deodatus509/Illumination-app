import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  stream: MediaStream;
  onCancel: () => void;
  onSend: () => void;
}

export function AudioVisualizer({ stream, onCancel, onSend }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let animationId: number;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const draw = () => {
          animationId = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let barHeight;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            
            ctx.fillStyle = `rgba(234, 179, 8, ${barHeight / 100})`; // gold/yellow
            ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
            
            x += barWidth + 1;
          }
        };
        draw();
      }
    }

    return () => {
      cancelAnimationFrame(animationId);
      audioContext.close();
    };
  }, [stream]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-zinc-900 rounded-full pl-2 pr-1 py-1 w-full border border-yellow-500/30 overflow-hidden"
    >
      <button 
        onClick={onCancel}
        className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-white/5 rounded-full transition-colors flex-shrink-0"
      >
        <Trash2 size={20} />
      </button>

      <div className="flex items-center gap-2 flex-shrink-0">
        <motion.div 
          animate={{ opacity: [1, 0, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
        />
        <span className="text-sm font-mono text-white w-10">{formatTime(duration)}</span>
      </div>

      <div className="flex-1 h-8 flex items-center justify-center relative overflow-hidden">
        {/* Instruction Glisser pour annuler (optionnel, on le garde fixe ou on utilise framer-motion pour le slide) */}
        <span className="absolute inset-x-0 mx-auto text-[10px] uppercase tracking-widest text-zinc-500 text-center pointer-events-none opacity-40">
          Enregistrement...
        </span>
        <canvas ref={canvasRef} width={200} height={32} className="w-full h-full relative z-10" />
      </div>

      <button 
        onClick={onSend}
        className="w-10 h-10 bg-yellow-500 text-black rounded-full flex justify-center items-center hover:bg-yellow-400 transition-colors flex-shrink-0 shadow-lg"
      >
        <Send size={18} className="translate-x-[1px]" />
      </button>
    </motion.div>
  );
}
