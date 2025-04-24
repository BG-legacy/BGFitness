import React from 'react';
import '../styles/SuccessDialog.css';

const SuccessDialog = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <div className="dialog-header">
          <h3>Success!</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-body">
          <p>{message}</p>
        </div>
        <div className="dialog-footer">
          <button className="confirm-button" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessDialog;
