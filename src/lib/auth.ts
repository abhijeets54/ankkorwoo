/**
 * Authentication module that works with the WooCommerce authentication API
 */

import { 
  createCustomer, 
  customerLogin, 
  getCustomer,
  updateCustomer,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from './woocommerce';

// Types for customer authentication
export interface CustomerCredentials {
  email: string;
  password: string;
}

export interface CustomerRegistration extends CustomerCredentials {
  firstName: string;
  lastName: string;
  phone?: string;
  acceptsMarketing?: boolean;
  address?: CustomerAddress;
}

export interface CustomerAddress {
  /**
   * Street address (required)
   */
  address1: string;
  /**
   * Apartment, suite, etc. (optional)
   */
  address2?: string;
  /**
   * City (required)
   */
  city: string;
  /**
   * State/Province (optional)
   * Can contain any text value (up to 30 characters)
   */
  province?: string;
  /**
   * Country (required)
   */
  country: string;
  /**
   * Postal/ZIP code (required)
   */
  zip: string;
  /**
   * Phone number (optional)
   */
  phone?: string;
}

export interface CustomerUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  acceptsMarketing?: boolean;
}

export interface CustomerSession {
  accessToken: string;
  expiresAt: string;
}

// Local storage keys
const AUTH_TOKEN_KEY = 'woo_auth_token';
const REFRESH_TOKEN_KEY = 'woo_refresh_token';

/**
 * Register a new customer with WooCommerce
 * @param registration Customer registration data
 * @returns Customer data and access token if successful
 */
export async function registerCustomer(registration: CustomerRegistration) {
  try {
    const { email, password, firstName, lastName, phone, acceptsMarketing = false, address } = registration;
    
    const result = await createCustomer({
      email,
      password,
      firstName,
      lastName,
      phone,
      acceptsMarketing
    });
    
    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new Error(result.customerUserErrors[0].message);
    }
    
    if (!result.authToken) {
      throw new Error('Registration failed: No authentication token returned');
    }
    
    // Store the token in localStorage
    saveCustomerToken({ 
      accessToken: result.authToken,
      expiresAt: calculateTokenExpiry(result.authToken) 
    });
    
    // Save refresh token if available
    if (result.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    }
    
    // Get customer data using the new token
    const customer = await getCustomer(result.authToken);
    
    return {
      customer,
      accessToken: result.authToken,
      expiresAt: calculateTokenExpiry(result.authToken)
    };
  } catch (error) {
    console.error('Error registering customer:', error);
    throw error;
  }
}

/**
 * Log in a customer with WooCommerce
 * @param credentials Customer credentials
 * @returns Customer data and access token if successful
 */
export async function loginCustomer(credentials: CustomerCredentials) {
  try {
    const { email, password } = credentials;
    
    const result = await customerLogin(email, password);
    
    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new Error(result.customerUserErrors[0].message);
    }
    
    if (!result.authToken) {
      throw new Error('Login failed: No authentication token returned');
    }
    
    // Store the token in localStorage
    saveCustomerToken({ 
      accessToken: result.authToken,
      expiresAt: calculateTokenExpiry(result.authToken) 
    });
    
    // Save refresh token if available
    if (result.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    }
    
    // Get customer data using the new token
    const customer = await getCustomer(result.authToken);
    
    return {
      customer,
      accessToken: result.authToken,
      expiresAt: calculateTokenExpiry(result.authToken)
    };
  } catch (error) {
    console.error('Error logging in customer:', error);
    throw error;
  }
}

/**
 * Calculate token expiry from JWT token
 * @param token JWT token
 * @returns ISO date string of expiry
 */
function calculateTokenExpiry(token: string): string {
  try {
    // Basic JWT parsing - tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      // If token isn't valid JWT format, set default expiry to 1 day
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date.toISOString();
    }
    
    // Decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));
    
    // JWT uses 'exp' field for expiry timestamp (in seconds)
    if (payload.exp) {
      return new Date(payload.exp * 1000).toISOString();
    } else {
      // Fallback: set expiry to 1 day if no exp field
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date.toISOString();
    }
  } catch (error) {
    console.error('Error calculating token expiry:', error);
    // Fallback: set expiry to 1 day
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString();
  }
}

/**
 * Update a customer's profile
 * @param customerData Customer data to update
 * @returns Updated customer data
 */
export async function updateCustomerProfile(customerData: CustomerUpdate) {
  try {
    // Use the API endpoint to update the profile since it has access to HTTP-only cookies
    const response = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include HTTP-only cookies
      body: JSON.stringify(customerData),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Profile update failed');
    }

    return {
      customer: result.customer,
      accessToken: 'token_managed_by_server', // Token is managed server-side
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    console.error('Error updating customer profile:', error);
    throw error;
  }
}

/**
 * Add a new address for the customer
 * @param address Address data
 * @returns Updated customer data
 */
export async function addCustomerAddress(address: CustomerAddress) {
  try {
    const session = getCustomerSession();
    
    if (!session) {
      throw new Error('No active customer session found');
    }
    
    const result = await createAddress(session.accessToken, address);
    
    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new Error(result.customerUserErrors[0].message);
    }
    
    // Get updated customer data
    const customer = await getCustomer(session.accessToken);
    
    return {
      customer,
      address: result.customerAddress
    };
  } catch (error) {
    console.error('Error adding customer address:', error);
    throw error;
  }
}

/**
 * Update an existing customer address
 * @param id Address ID
 * @param address Address data
 * @returns Updated customer data
 */
export async function updateCustomerAddress(id: string, address: CustomerAddress) {
  try {
    const session = getCustomerSession();
    
    if (!session) {
      throw new Error('No active customer session found');
    }
    
    const result = await updateAddress(session.accessToken, id, address);
    
    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new Error(result.customerUserErrors[0].message);
    }
    
    // Get updated customer data
    const customer = await getCustomer(session.accessToken);
    
    return {
      customer,
      address: result.customerAddress
    };
  } catch (error) {
    console.error('Error updating customer address:', error);
    throw error;
  }
}

/**
 * Delete a customer address
 * @param id Address ID
 * @returns Updated customer data
 */
export async function deleteCustomerAddress(id: string) {
  try {
    const session = getCustomerSession();
    
    if (!session) {
      throw new Error('No active customer session found');
    }
    
    const result = await deleteAddress(session.accessToken, id);
    
    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new Error(result.customerUserErrors[0].message);
    }
    
    // Get updated customer data
    const customer = await getCustomer(session.accessToken);
    
    return {
      customer,
      deletedAddressId: result.deletedCustomerAddressId
    };
  } catch (error) {
    console.error('Error deleting customer address:', error);
    throw error;
  }
}

/**
 * Set a default address for the customer
 * @param addressId Address ID
 * @returns Updated customer data
 */
export async function setCustomerDefaultAddress(addressId: string) {
  try {
    const session = getCustomerSession();
    
    if (!session) {
      throw new Error('No active customer session found');
    }
    
    const result = await setDefaultAddress(session.accessToken, addressId);
    
    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new Error(result.customerUserErrors[0].message);
    }
    
    // Get updated customer data
    const customer = await getCustomer(session.accessToken);
    
    return {
      customer
    };
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
}

/**
 * Logout the current customer
 */
export function logoutCustomer() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  // Also clear cookies
  deleteCookie(AUTH_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
}

/**
 * Delete cookie by name
 */
function deleteCookie(name: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

/**
 * Get the current customer session from cookies
 * @returns Customer session if active, null otherwise
 */
export function getCustomerSession(): CustomerSession | null {
  try {
    if (typeof document === 'undefined') {
      return null;
    }

    const token = getCookie(AUTH_TOKEN_KEY);
    if (!token) {
      return null;
    }

    // For now, we'll create a basic session object with the token
    // In a real implementation, you might want to decode the JWT to get expiration
    return {
      accessToken: token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    };
  } catch (error) {
    console.error('Error getting customer session:', error);
    return null;
  }
}

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }

  return null;
}

/**
 * Save customer token to localStorage and cookies
 * @param session Customer session to save
 */
function saveCustomerToken(session: CustomerSession) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(session));
  }

  // Also save to cookies for consistency with clientAuth
  setCookie(AUTH_TOKEN_KEY, session.accessToken);
}

/**
 * Set cookie with name and value
 */
function setCookie(name: string, value: string, days = 30) {
  if (typeof document !== 'undefined') {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = `${name}=${value}${expires}; path=/; SameSite=Lax${secure}`;
  }
}

/**
 * Check if customer is logged in
 * @returns true if customer is logged in, false otherwise
 */
export function isCustomerLoggedIn(): boolean {
  return getCustomerSession() !== null;
}

/**
 * Get the current customer data
 * @returns Customer data if logged in, null otherwise
 */
export async function getCurrentCustomer() {
  try {
    const session = getCustomerSession();
    
    if (!session) {
      return null;
    }
    
    const customer = await getCustomer(session.accessToken);
    return customer;
  } catch (error) {
    console.error('Error getting current customer:', error);
    // If there's an error, the token might be invalid
    logoutCustomer();
    return null;
  }
} 