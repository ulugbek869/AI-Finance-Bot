// src/components/Modal.js
'use client';
import { useEffect } from 'react';
import { triggerHaptic } from '../lib/telegram';

export default function Modal({ isOpen, onClose, title, children }) {
  // Prevent body scrolling when modal is open
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

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      triggerHaptic('light');
      onClose();
    }
  };

  return (
    <div className={`modal-overlay active`} onClick={handleOverlayClick}>
      <div className="modal-sheet">
        <div className="modal-handle" onClick={onClose}></div>
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
