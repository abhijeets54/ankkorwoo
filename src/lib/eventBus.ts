/**
 * Type-safe event bus system for cross-component communication
 * Eliminates circular dependencies by providing event-driven architecture
 */

import { useEffect } from 'react';

// Event type definitions
export interface AuthEvents {
  'auth:login-success': { user: any; token: string };
  'auth:login-error': { error: string };
  'auth:logout': void;
  'auth:register-success': { user: any; token: string };
  'auth:register-error': { error: string };
  'auth:profile-updated': { user: any };
  'auth:session-expired': void;
}

export interface CartEvents {
  'cart:item-added': { item: any; message?: string };
  'cart:item-removed': { itemId: string; message?: string };
  'cart:item-updated': { itemId: string; quantity: number; message?: string };
  'cart:cleared': { message?: string };
  'cart:checkout-success': { orderId: string; message?: string };
  'cart:checkout-error': { error: string };
  'cart:sync-started': void;
  'cart:sync-completed': void;
}

export interface NotificationEvents {
  'notification:show': { message: string; type: 'success' | 'error' | 'info'; duration?: number; action?: { label: string; onClick: () => void } };
  'notification:hide': { id: string };
}

// Combined event map
export type EventMap = AuthEvents & CartEvents & NotificationEvents;

// Event listener type
type EventListener<T = any> = (data: T) => void;

// Event bus class
class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event only once
   */
  once<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): void {
    const onceListener = (data: EventMap[K]) => {
      listener(data);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// Create and export singleton instance
export const eventBus = new EventBus();

// Convenience hooks for React components
export const useEventBus = () => eventBus;

// Helper functions for common event patterns
export const authEvents = {
  loginSuccess: (user: any, token: string) => 
    eventBus.emit('auth:login-success', { user, token }),
  
  loginError: (error: string) => 
    eventBus.emit('auth:login-error', { error }),
  
  logout: () => 
    eventBus.emit('auth:logout', undefined),
  
  registerSuccess: (user: any, token: string) => 
    eventBus.emit('auth:register-success', { user, token }),
  
  registerError: (error: string) => 
    eventBus.emit('auth:register-error', { error }),
  
  profileUpdated: (user: any) => 
    eventBus.emit('auth:profile-updated', { user }),
  
  sessionExpired: () => 
    eventBus.emit('auth:session-expired', undefined),
};

export const cartEvents = {
  itemAdded: (item: any, message?: string) => 
    eventBus.emit('cart:item-added', { item, message }),
  
  itemRemoved: (itemId: string, message?: string) => 
    eventBus.emit('cart:item-removed', { itemId, message }),
  
  itemUpdated: (itemId: string, quantity: number, message?: string) => 
    eventBus.emit('cart:item-updated', { itemId, quantity, message }),
  
  cleared: (message?: string) => 
    eventBus.emit('cart:cleared', { message }),
  
  checkoutSuccess: (orderId: string, message?: string) => 
    eventBus.emit('cart:checkout-success', { orderId, message }),
  
  checkoutError: (error: string) => 
    eventBus.emit('cart:checkout-error', { error }),
  
  syncStarted: () => 
    eventBus.emit('cart:sync-started', undefined),
  
  syncCompleted: () => 
    eventBus.emit('cart:sync-completed', undefined),
};

export const notificationEvents = {
  show: (message: string, type: 'success' | 'error' | 'info' = 'info', duration?: number, action?: { label: string; onClick: () => void }) =>
    eventBus.emit('notification:show', { message, type, duration, action }),

  hide: (id: string) =>
    eventBus.emit('notification:hide', { id }),
};

// React hook for subscribing to events
export function useEventListener<K extends keyof EventMap>(
  event: K,
  listener: EventListener<EventMap[K]>,
  deps: any[] = []
) {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, listener);
    return unsubscribe;
  }, deps);
}
