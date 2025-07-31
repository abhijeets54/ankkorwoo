'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { getAllStates, getCitiesForState } from '@/lib/locationUtils';

interface StateCitySelectorProps {
  selectedState: string;
  selectedCity: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  stateError?: string;
  cityError?: string;
}

export default function StateCitySelector({
  selectedState,
  selectedCity,
  onStateChange,
  onCityChange,
  stateError,
  cityError
}: StateCitySelectorProps) {
  const [states] = useState(getAllStates());
  const [cities, setCities] = useState<string[]>([]);

  // Update cities when state changes
  useEffect(() => {
    if (selectedState) {
      const stateCities = getCitiesForState(selectedState);
      setCities(stateCities);

      // Clear city selection if current city is not in new state
      if (selectedCity && !stateCities.includes(selectedCity)) {
        onCityChange('');
      }
    } else {
      setCities([]);
      onCityChange('');
    }
  }, [selectedState]); // Removed selectedCity and onCityChange from dependencies

  // Separate effect to handle city validation when selectedCity changes
  useEffect(() => {
    if (selectedState && selectedCity && cities.length > 0) {
      // Clear city selection if current city is not in the current state's cities
      if (!cities.includes(selectedCity)) {
        onCityChange('');
      }
    }
  }, [selectedCity, cities]); // Only depend on selectedCity and cities array

  return (
    <>
      <div>
        <Label htmlFor="state">State</Label>
        <select
          id="state"
          value={selectedState}
          onChange={(e) => onStateChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c2c27] ${
            stateError ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Select State</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        {stateError && (
          <p className="text-sm text-red-500 mt-1">{stateError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="city">City</Label>
        <select
          id="city"
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
          disabled={!selectedState || cities.length === 0}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c2c27] ${
            cityError ? 'border-red-300' : 'border-gray-300'
          } ${!selectedState || cities.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">Select City</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {cityError && (
          <p className="text-sm text-red-500 mt-1">{cityError}</p>
        )}
        {selectedState && cities.length === 0 && (
          <p className="text-sm text-gray-500 mt-1">No cities available for selected state</p>
        )}
      </div>
    </>
  );
}
