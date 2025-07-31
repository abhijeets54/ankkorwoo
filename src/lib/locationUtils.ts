// Location detection and Indian states/cities utilities

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface IndianState {
  name: string;
  code: string;
  cities: string[];
}

// Indian states and major cities data
export const INDIAN_STATES: IndianState[] = [
  {
    name: 'Punjab',
    code: 'PB',
    cities: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla']
  },
  {
    name: 'Delhi',
    code: 'DL',
    cities: ['New Delhi', 'Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi']
  },
  {
    name: 'Maharashtra',
    code: 'MH',
    cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Sangli', 'Malegaon']
  },
  {
    name: 'Karnataka',
    code: 'KA',
    cities: ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davanagere', 'Bellary', 'Bijapur', 'Shimoga']
  },
  {
    name: 'Tamil Nadu',
    code: 'TN',
    cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi']
  },
  {
    name: 'Gujarat',
    code: 'GJ',
    cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari']
  },
  {
    name: 'Rajasthan',
    code: 'RJ',
    cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar']
  },
  {
    name: 'West Bengal',
    code: 'WB',
    cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Malda', 'Bardhaman', 'Baharampur', 'Habra', 'Kharagpur']
  },
  {
    name: 'Uttar Pradesh',
    code: 'UP',
    cities: ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad']
  },
  {
    name: 'Haryana',
    code: 'HR',
    cities: ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula']
  },
  {
    name: 'Madhya Pradesh',
    code: 'MP',
    cities: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa']
  },
  {
    name: 'Bihar',
    code: 'BR',
    cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar']
  },
  {
    name: 'Odisha',
    code: 'OR',
    cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda']
  },
  {
    name: 'Kerala',
    code: 'KL',
    cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kannur', 'Kasaragod']
  },
  {
    name: 'Jharkhand',
    code: 'JH',
    cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Phusro', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar']
  },
  {
    name: 'Assam',
    code: 'AS',
    cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'North Lakhimpur']
  },
  {
    name: 'Chhattisgarh',
    code: 'CG',
    cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur', 'Mahasamund']
  },
  {
    name: 'Uttarakhand',
    code: 'UK',
    cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Kotdwar', 'Pithoragarh', 'Almora']
  },
  {
    name: 'Himachal Pradesh',
    code: 'HP',
    cities: ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Palampur', 'Baddi', 'Nahan', 'Paonta Sahib', 'Sundarnagar', 'Chamba']
  },
  {
    name: 'Jammu and Kashmir',
    code: 'JK',
    cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur', 'Punch', 'Rajouri', 'Kupwara']
  },
  {
    name: 'Goa',
    code: 'GA',
    cities: ['Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Sanquelim', 'Cuncolim', 'Quepem']
  },
  {
    name: 'Andhra Pradesh',
    code: 'AP',
    cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Anantapur', 'Vizianagaram']
  },
  {
    name: 'Telangana',
    code: 'TS',
    cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet']
  },
  {
    name: 'Arunachal Pradesh',
    code: 'AR',
    cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tezpur', 'Bomdila', 'Ziro', 'Along', 'Changlang', 'Tezu', 'Khonsa']
  },
  {
    name: 'Manipur',
    code: 'MN',
    cities: ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul', 'Senapati', 'Tamenglong', 'Chandel', 'Jiribam', 'Kangpokpi']
  },
  {
    name: 'Meghalaya',
    code: 'ML',
    cities: ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Baghmara', 'Ampati', 'Resubelpara', 'Mawkyrwat', 'Williamnagar', 'Khliehriat']
  },
  {
    name: 'Mizoram',
    code: 'MZ',
    cities: ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip', 'Mamit', 'Lawngtlai', 'Saitual', 'Khawzawl']
  },
  {
    name: 'Nagaland',
    code: 'NL',
    cities: ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Phek', 'Kiphire', 'Longleng', 'Peren']
  },
  {
    name: 'Sikkim',
    code: 'SK',
    cities: ['Gangtok', 'Namchi', 'Geyzing', 'Mangan', 'Jorethang', 'Nayabazar', 'Rangpo', 'Singtam', 'Yuksom', 'Ravangla']
  },
  {
    name: 'Tripura',
    code: 'TR',
    cities: ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailasahar', 'Belonia', 'Khowai', 'Pratapgarh', 'Ranir Bazar', 'Sonamura', 'Kumarghat']
  },
  {
    name: 'Andaman and Nicobar Islands',
    code: 'AN',
    cities: ['Port Blair', 'Diglipur', 'Mayabunder', 'Rangat', 'Havelock Island', 'Neil Island', 'Car Nicobar', 'Nancowry', 'Little Andaman', 'Baratang']
  },
  {
    name: 'Chandigarh',
    code: 'CH',
    cities: ['Chandigarh']
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    code: 'DN',
    cities: ['Daman', 'Diu', 'Silvassa']
  },
  {
    name: 'Lakshadweep',
    code: 'LD',
    cities: ['Kavaratti', 'Agatti', 'Minicoy', 'Amini', 'Andrott', 'Kalpeni', 'Kadmat', 'Kiltan', 'Chetlat', 'Bitra']
  },
  {
    name: 'Puducherry',
    code: 'PY',
    cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam']
  },
  {
    name: 'Ladakh',
    code: 'LA',
    cities: ['Leh', 'Kargil', 'Nubra', 'Zanskar', 'Drass', 'Khaltse', 'Nyoma', 'Durbuk', 'Khalsi', 'Turtuk']
  }
];

/**
 * Get user's current location using browser geolocation API
 */
export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

/**
 * Reverse geocode coordinates to get address using India Post API
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<LocationData> => {
  try {
    // For demo purposes, we'll use a simple approach
    // In production, you'd use a proper reverse geocoding service
    
    // This is a placeholder - you would integrate with a real service like:
    // - Google Maps Geocoding API
    // - MapMyIndia API
    // - OpenStreetMap Nominatim
    
    throw new Error('Reverse geocoding not implemented - please enter address manually');
  } catch (error) {
    throw new Error('Failed to get address from coordinates');
  }
};

/**
 * Get location data from pincode using India Post API
 */
export const getLocationFromPincode = async (pincode: string): Promise<LocationData> => {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0 || data[0].Status !== 'Success') {
      throw new Error('Invalid pincode or no data found');
    }
    
    const postOffice = data[0].PostOffice[0];
    
    return {
      latitude: 0, // API doesn't provide coordinates
      longitude: 0,
      city: postOffice.District,
      state: postOffice.State,
      pincode: pincode,
      country: 'India'
    };
  } catch (error) {
    throw new Error('Failed to get location from pincode');
  }
};

/**
 * Calculate shipping cost based on state and order value
 */
export const calculateShippingCost = (state: string, orderValue: number): number => {
  // Free shipping for orders above ₹2999
  if (orderValue > 2999) {
    return 0;
  }
  
  // Punjab gets ₹49 shipping
  if (state.toLowerCase().includes('punjab')) {
    return 49;
  }
  
  // All other states get ₹99 shipping
  return 99;
};

/**
 * Get all Indian states for dropdown
 */
export const getAllStates = (): string[] => {
  return INDIAN_STATES.map(state => state.name).sort();
};

/**
 * Get cities for a specific state
 */
export const getCitiesForState = (stateName: string): string[] => {
  const state = INDIAN_STATES.find(s => s.name.toLowerCase() === stateName.toLowerCase());
  return state ? state.cities.sort() : [];
};

/**
 * Detect if a state is Punjab (case-insensitive)
 */
export const isPunjab = (state: string): boolean => {
  return state.toLowerCase().includes('punjab');
};
