import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer, icon }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div className="relative bg-obsidian border border-obsidian-lighter rounded-xl shadow-2xl w-full max-w-lg transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-obsidian-light/50">
          <div className="flex items-center gap-3">
            {icon && <div>{icon}</div>}
            <h3 className="text-xl font-bold text-gray-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors p-1 rounded-md hover:bg-obsidian-lighter"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-obsidian-light/50 flex justify-end gap-3 bg-obsidian-light/30 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
