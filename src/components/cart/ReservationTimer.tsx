'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface ReservationTimerProps {
  reservedUntil: string;
  productName: string;
  onExpired?: () => void;
  className?: string;
}

export function ReservationTimer({ 
  reservedUntil, 
  productName, 
  onExpired, 
  className = '' 
}: ReservationTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const expiresAt = new Date(reservedUntil).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        onExpired?.();
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [reservedUntil, isExpired, onExpired]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (): string => {
    if (isExpired) return 'text-red-600';
    if (timeRemaining < 300) return 'text-orange-600'; // Less than 5 minutes
    return 'text-green-600';
  };

  const getStatusMessage = (): string => {
    if (isExpired) return 'Reservation expired';
    if (timeRemaining < 300) return 'Reservation expiring soon';
    return 'Reserved for you';
  };

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="text-red-600 font-medium">
          Reservation expired for {productName}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <Clock className={`h-4 w-4 ${getStatusColor()}`} />
      <span className={getStatusColor()}>
        <span className="font-medium">{getStatusMessage()}</span>
        {!isExpired && (
          <span className="ml-1">
            ({formatTime(timeRemaining)} remaining)
          </span>
        )}
      </span>
    </div>
  );
}

interface CartReservationStatusProps {
  items: Array<{
    id: string;
    name: string;
    reservationId?: string;
    reservedUntil?: string;
  }>;
  onReservationExpired?: (itemId: string) => void;
  className?: string;
}

export function CartReservationStatus({ 
  items, 
  onReservationExpired, 
  className = '' 
}: CartReservationStatusProps) {
  const reservedItems = items.filter(item => item.reservationId && item.reservedUntil);
  
  if (reservedItems.length === 0) {
    return null;
  }

  const handleExpired = (itemId: string) => {
    onReservationExpired?.(itemId);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900">Stock Reservations</h3>
      <div className="space-y-1">
        {reservedItems.map((item) => (
          <ReservationTimer
            key={item.id}
            reservedUntil={item.reservedUntil!}
            productName={item.name}
            onExpired={() => handleExpired(item.id)}
            className="p-2 bg-gray-50 rounded-md"
          />
        ))}
      </div>
      <div className="text-xs text-gray-600">
        Complete your purchase before the reservation expires to secure these items.
      </div>
    </div>
  );
}

// Hook for managing reservation timers
export function useReservationTimer(reservedUntil: string) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const expiresAt = new Date(reservedUntil).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setTimeRemaining(remaining);
      setIsExpired(remaining === 0);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [reservedUntil]);

  return {
    timeRemaining,
    isExpired,
    formattedTime: `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`,
    isExpiringSoon: timeRemaining < 300 && timeRemaining > 0
  };
}
