'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { getCurrentLocation, getLocationFromPincode, LocationData } from '@/lib/locationUtils';

interface LocationDetectorProps {
  onLocationDetected: (location: LocationData) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function LocationDetector({ onLocationDetected, onError, disabled }: LocationDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    
    try {
      // Get current coordinates
      const coordinates = await getCurrentLocation();
      
      // For now, we'll just return the coordinates
      // In a real implementation, you'd reverse geocode these
      onLocationDetected({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        city: '',
        state: '',
        country: 'India'
      });
      
      // Show a message that manual entry is needed
      onError('Location detected! Please enter your address details manually.');
      
    } catch (error) {
      console.error('Location detection error:', error);
      onError(error instanceof Error ? error.message : 'Failed to detect location');
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDetectLocation}
      disabled={disabled || isDetecting}
      className="w-full mb-4"
    >
      {isDetecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Detecting Location...
        </>
      ) : (
        <>
          <MapPin className="mr-2 h-4 w-4" />
          Detect My Location
        </>
      )}
    </Button>
  );
}
