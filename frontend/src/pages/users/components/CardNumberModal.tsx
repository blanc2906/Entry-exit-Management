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
      await requestAddCardNumber(user._id);
      setStep('waiting');
      // Simulate waiting for card scan
      setTimeout(() => {
        setStep('input-card');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Card Number for {user.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {step === 'request' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-blue-500 text-6xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ready to Add Card
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Click the button below to request card scanning. 
                Make sure you have the card ready to scan.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestCard}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Requesting...' : 'Request Card Scan'}
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="text-center space-y-4">
            <div className="animate-pulse text-blue-500 text-6xl mb-4">💳</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Waiting for Card Scan
              </h3>
              <p className="text-sm text-gray-600">
                Please scan your card on the device reader. 
                The system will automatically detect and capture the card number.
              </p>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {step === 'input-card' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter or verify card number"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                The card number should be automatically filled. Verify or enter manually if needed.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                disabled={loading || !cardNumber.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Card Number'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardNumberModal;