/**
 * Store API Checkout Flow Integration Tests
 * 
 * This file contains tests for the WooCommerce Store API integration,
 * including cart synchronization and checkout processing.
 */

import { cartSession } from '@/lib/cartSession';
import { fetchNonce, syncCartToWoo, processCheckout } from '@/lib/storeApi';
import { withRetry } from '@/lib/withRetry';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Store API Integration', () => {
  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_WOOCOMMERCE_URL = 'https://example.com';
  });

  describe('CartSession', () => {
    it('should generate and persist a cart token', () => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });

      // Test getCartToken
      const token = cartSession.getCartToken();
      expect(token).toBeDefined();
      expect(token.startsWith('cart_')).toBe(true);
      
      // Test that token was stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('wc_cart_token', token);
    });

    it('should provide headers with cart token and nonce', () => {
      const nonce = 'test-nonce-123';
      const headers = cartSession.headers(nonce);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Cart-Token']).toBeDefined();
      expect(headers['X-WC-Store-API-Nonce']).toBe(nonce);
    });
  });

  describe('fetchNonce', () => {
    it('should fetch a nonce from the API', async () => {
      // Mock fetch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: 'test-nonce-123' }),
      });

      const nonce = await fetchNonce();
      
      expect(nonce).toBe('test-nonce-123');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/nonce',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Cart-Token': expect.any(String),
          }),
        })
      );
    });

    it('should handle errors when fetching nonce', async () => {
      // Mock fetch error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchNonce()).rejects.toThrow('Failed to fetch nonce: 500');
    });
  });

  describe('syncCartToWoo', () => {
    it('should clear cart and add items', async () => {
      const nonce = 'test-nonce-123';
      const items = [
        {
          id: 'item1',
          productId: '123',
          variationId: '456',
          quantity: 2,
          name: 'Test Product',
          price: '99.99',
          attributes: [
            { name: 'Color', value: 'Blue' },
            { name: 'Size', value: 'L' },
          ],
        },
      ];

      // Mock clear cart response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      // Mock add item response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              key: 'cart_item_1',
              id: 123,
              quantity: 2,
              name: 'Test Product',
              prices: { price: '99.99' },
            },
          ],
        }),
      });

      const result = await syncCartToWoo(nonce, items);
      
      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      
      // Check that DELETE was called to clear cart
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/wp-json/wc/store/v1/cart/items',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Cart-Token': expect.any(String),
            'X-WC-Store-API-Nonce': nonce,
          }),
        })
      );
      
      // Check that POST was called to add item
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/wp-json/wc/store/v1/cart/add-item',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Cart-Token': expect.any(String),
            'X-WC-Store-API-Nonce': nonce,
          }),
          body: JSON.stringify({
            id: 123,
            quantity: 2,
            variation_id: 456,
            variation: {
              'attribute_color': 'Blue',
              'attribute_size': 'L',
            },
          }),
        })
      );
    });

    it('should handle empty cart error', async () => {
      const nonce = 'test-nonce-123';
      const items: any[] = [];

      await expect(syncCartToWoo(nonce, items)).rejects.toThrow('Cart is empty');
    });
  });

  describe('processCheckout', () => {
    it('should process checkout and return order data', async () => {
      const nonce = 'test-nonce-123';
      const checkoutData = {
        billing_address: {
          first_name: 'John',
          last_name: 'Doe',
          address_1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postcode: '10001',
          country: 'US',
          email: 'john@example.com',
          phone: '555-1234',
        },
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          address_1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postcode: '10001',
          country: 'US',
        },
        payment_method: 'stripe',
      };

      // Mock checkout response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          order_id: 12345,
          status: 'processing',
          order_key: 'wc_order_abc123',
          payment_result: {
            payment_status: 'success',
            redirect_url: 'https://example.com/checkout/order-received/12345/',
          },
        }),
      });

      const result = await processCheckout(nonce, checkoutData);
      
      expect(result).toBeDefined();
      expect(result.order_id).toBe(12345);
      expect(result.payment_result.redirect_url).toBe('https://example.com/checkout/order-received/12345/');
      
      // Check that POST was called with correct data
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/wp-json/wc/store/v1/checkout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Cart-Token': expect.any(String),
            'X-WC-Store-API-Nonce': nonce,
          }),
          body: JSON.stringify(checkoutData),
        })
      );
    });

    it('should handle checkout errors', async () => {
      const nonce = 'test-nonce-123';
      const checkoutData = {
        billing_address: {
          first_name: 'John',
          last_name: 'Doe',
          // Missing required fields
        },
        shipping_address: {
          // Missing required fields
        },
        payment_method: 'stripe',
      };

      // Mock checkout error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid billing address',
      });

      await expect(processCheckout(nonce, checkoutData)).rejects.toThrow('Checkout failed: 400 - Invalid billing address');
    });
  });

  describe('withRetry', () => {
    it('should retry failed requests', async () => {
      // Create a mock function that fails twice then succeeds
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      
      // Wrap with retry
      const wrappedFn = withRetry(mockFn, { 
        retries: 3,
        initialDelay: 10, // Short delay for tests
      });
      
      // Execute and verify
      const result = await wrappedFn();
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      // Create a mock function that always fails
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      // Wrap with retry
      const wrappedFn = withRetry(mockFn, { 
        retries: 2,
        initialDelay: 10, // Short delay for tests
      });
      
      // Execute and verify
      await expect(wrappedFn()).rejects.toThrow('Persistent error');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
}); 