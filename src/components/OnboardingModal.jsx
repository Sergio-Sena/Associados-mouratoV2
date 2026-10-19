import React, { useEffect } from 'react';
import { FichaCadastralStandalone } from './FichaCadastralStandalone';

export const OnboardingModal = ({ isOpen, onClose, defaultMode = 'native' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop printing-receipt" 
      style={{ 
        zIndex: 1100, 
        overflowY: 'auto', 
        padding: '1.25rem 0.75rem',
        alignItems: 'flex-start'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '100%', 
          maxWidth: '1040px', 
          margin: '2rem auto' 
        }}
      >
        <FichaCadastralStandalone 
          isFullPage={false} 
          onClose={onClose} 
          defaultMode={defaultMode} 
        />
      </div>
    </div>
  );
};
