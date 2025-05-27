// frontend/src/pages/users/components/CardNumberModal.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../../types/user';
import { useUserStore } from '../../../store/useUserStore';

interface CardNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const CardNumberModal: React.FC<CardNumberModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { requestAddCardNumber, addCardNumber, loading, error } = useUserStore();
  const [step, setStep] = useState<'request' | 'waiting' | 'input-card'>('request');
  const [cardNumber, setCardNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('request');
      setCardNumber('');
    }
  }, [isOpen]);

  const handleRequestCard = async () => {
    if (!user) return;
    
    try {
      // Note: Backend expects deviceId, but for card we might use a default device or handle differently
      await requestAddCardNumber(user._id, 'default-device');
      setStep('waiting');
      // Simulate waiting for card scan
      setTimeout(() => {
        setStep('input-card');
        // Simulate scanned card number
        setCardNumber('1234567890');
      }, 3000);
    } catch (error) {
      console.error('Error requesting card number:', error);
    }
  };

  const handleAddCard = async () => {
    if (!user || !cardNumber.trim()) return;

    try {
      await addCardNumber({
        userId: user._id,
        cardNumber: cardNumber.trim(),
        deviceMac: 'default-device-mac' // This should come from device selection
      });
      onClose();
    } catch (error) {
      console.error('Error adding card number:', error);
    }
  };

  const handleClose = () => {
    setStep('request');
    setCardNumber('');
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(5px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a202c', margin: 0 }}>
            Add Card Number for {user.name}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.5rem',
              borderRadius: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#1a202c';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {step === 'request' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💳</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', marginBottom: '0.5rem' }}>
                Ready to Add Card
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0' }}>
                Click the button below to request card scanning. 
                Make sure you have the card ready to scan.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#4b5563',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestCard}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  background: loading ? '#9ca3af' : '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading) e.currentTarget.style.background = '#2563eb';
                }}
                onMouseOut={(e) => {
                  if (!loading) e.currentTarget.style.background = '#3b82f6';
                }}
              >
                {loading ? 'Requesting...' : 'Request Card Scan'}
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: '1rem',
              animation: 'pulse 2s infinite'
            }}>💳</div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', marginBottom: '0.5rem' }}>
                Waiting for Card Scan
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Please scan your card on the device reader. 
                The system will automatically detect and capture the card number.
              </p>
            </div>
            <div style={{
              width: '2rem',
              height: '2rem',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        )}

        {step === 'input-card' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter or verify card number"
                autoFocus
              />
              <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                The card number should be automatically filled. Verify or enter manually if needed.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#4b5563',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                disabled={loading || !cardNumber.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  background: loading || !cardNumber.trim() ? '#9ca3af' : '#7c3aed',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || !cardNumber.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading && cardNumber.trim()) e.currentTarget.style.background = '#6d28d9';
                }}
                onMouseOut={(e) => {
                  if (!loading && cardNumber.trim()) e.currentTarget.style.background = '#7c3aed';
                }}
              >
                {loading ? 'Adding...' : 'Add Card Number'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CardNumberModal;