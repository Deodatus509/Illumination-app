import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'partial';

interface ToastProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function Toast({ isVisible, onClose, title, message, type, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-success-bg',
          border: 'border-success/30',
          icon: <CheckCircle className="w-5 h-5 text-success" />,
          title: 'text-success-text'
        };
      case 'error':
        return {
          bg: 'bg-error-bg',
          border: 'border-error/30',
          icon: <XCircle className="w-5 h-5 text-error" />,
          title: 'text-error-text'
        };
      case 'partial':
        return {
          bg: 'bg-warning-bg',
          border: 'border-warning/30',
          icon: <AlertTriangle className="w-5 h-5 text-warning" />,
          title: 'text-warning-text'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right-8 fade-in duration-300">
      <div className={`${styles.bg} border ${styles.border} backdrop-blur-md shadow-2xl rounded-lg p-4 max-w-sm w-full flex items-start gap-3`}>
        <div className="shrink-0 mt-0.5">
          {styles.icon}
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-bold ${styles.title} mb-1`}>{title}</h4>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
