/**
 * CartSession utility for managing persistent cart tokens
 * Handles storage, retrieval, and header generation for Store API requests
 */
class CartSession {
  private readonly CART_TOKEN_KEY = 'woo_cart_token';
  private readonly TOKEN_EXPIRY_KEY = 'woo_cart_token_expiry';
  private readonly TOKEN_EXPIRY_DAYS = 30; // 30 days expiry
  
  /**
   * Get the current cart token or generate a new one if needed
   */
  getCartToken(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Generate a temporary token for server-side rendering
      return `cart_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    }
    
    try {
      // Try to get an existing token
      const existingToken = localStorage.getItem(this.CART_TOKEN_KEY);
      const tokenExpiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      
      // Check if token exists and is not expired
      if (existingToken && tokenExpiry && new Date(tokenExpiry) > new Date()) {
        return existingToken;
      }
      
      // Generate a new token
      const newToken = `cart_${Math.random().toString(36).substring(2)}_${Date.now()}`;
      
      // Set expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + this.TOKEN_EXPIRY_DAYS);
      
      // Save to localStorage
      localStorage.setItem(this.CART_TOKEN_KEY, newToken);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryDate.toISOString());
      
      return newToken;
    } catch (error) {
      console.error('Error managing cart token:', error);
      // Return a fallback token if localStorage fails
      return `cart_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    }
  }
  
  /**
   * Generate headers for Store API requests
   * @param nonce Optional nonce to include in headers
   */
  headers(nonce?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cart-Token': this.getCartToken(),
    };
    
    // Add nonce if provided
    if (nonce) {
      headers['X-WC-Store-API-Nonce'] = nonce;
    }
    
    return headers;
  }
  
  /**
   * Get fetch options with credentials included
   * @param method HTTP method
   * @param nonce Optional nonce to include in headers
   * @param body Optional request body
   * @returns Fetch options object with credentials included
   */
  fetchOptions(method: string = 'GET', nonce?: string, body?: any): RequestInit {
    const options: RequestInit = {
      method,
      headers: this.headers(nonce),
      credentials: 'include', // This ensures cookies are sent with the request
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    return options;
  }
  
  /**
   * Get WooCommerce session cookie if it exists
   */
  getWooCommerceSessionCookie(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }
    
    const cookies = document.cookie.split(';');
    const wooSessionCookie = cookies.find(cookie => cookie.trim().startsWith('wp_woocommerce_session_'));
    
    return wooSessionCookie ? wooSessionCookie.trim() : null;
  }
  
  /**
   * Debug method to log the current cart token
   */
  debugToken(): void {
    if (typeof window === 'undefined') {
      console.log('CartSession: Running on server, no token available');
      return;
    }
    
    const token = localStorage.getItem(this.CART_TOKEN_KEY);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    
    console.log('CartSession Debug:');
    console.log('- Token:', token || 'Not set');
    console.log('- Expiry:', expiry || 'Not set');
    
    if (expiry) {
      const expiryDate = new Date(expiry);
      const now = new Date();
      const isExpired = expiryDate < now;
      console.log('- Status:', isExpired ? 'EXPIRED' : 'Valid');
      
      if (!isExpired) {
        const daysLeft = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log('- Days remaining:', daysLeft);
      }
    }
    
    // Also log the WooCommerce session cookie if available
    const wooSessionCookie = this.getWooCommerceSessionCookie();
    console.log('- WooCommerce Session Cookie:', wooSessionCookie || 'Not set');
  }
}

// Export a singleton instance
export const cartSession = new CartSession(); 