class StockUpdateManager {
  private static instance: StockUpdateManager | null = null;
  private eventSource: EventSource | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private activeProducts: Set<string> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private connectionUpdateTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  private constructor() {}

  static getInstance(): StockUpdateManager {
    if (!StockUpdateManager.instance) {
      StockUpdateManager.instance = new StockUpdateManager();
    }
    return StockUpdateManager.instance;
  }

  subscribe(productId: string, callback: (data: any) => void) {
    if (!this.subscribers.has(productId)) {
      this.subscribers.set(productId, new Set());
    }
    this.subscribers.get(productId)!.add(callback);
    this.activeProducts.add(productId);
    
    console.log(`Subscribed to product ${productId}, total active products: ${this.activeProducts.size}`);
    
    // Debounced connection update
    this.scheduleConnectionUpdate();
  }

  unsubscribe(productId: string, callback: (data: any) => void) {
    const productSubscribers = this.subscribers.get(productId);
    if (productSubscribers) {
      productSubscribers.delete(callback);
      if (productSubscribers.size === 0) {
        this.subscribers.delete(productId);
        this.activeProducts.delete(productId);
        console.log(`Unsubscribed from product ${productId}, total active products: ${this.activeProducts.size}`);
        this.scheduleConnectionUpdate();
      }
    }
  }

  private scheduleConnectionUpdate() {
    // Clear existing timeout
    if (this.connectionUpdateTimeout) {
      clearTimeout(this.connectionUpdateTimeout);
    }
    
    this.connectionUpdateTimeout = setTimeout(() => {
      this.updateConnection();
    }, 1000); // 1 second debounce
  }

  private async updateConnection() {
    // Close existing connection if products changed or no products
    if (this.eventSource) {
      console.log('Closing existing SSE connection');
      this.eventSource.close();
      this.eventSource = null;
    }

    // Only connect if we have products to watch
    if (this.activeProducts.size === 0) {
      console.log('No active products, not creating connection');
      return;
    }

    if (this.isConnecting) {
      console.log('Already connecting, skipping');
      return;
    }

    // Clear old connections first
    try {
      await fetch('/api/stock-updates', { method: 'DELETE' });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup old connections:', error);
    }

    this.isConnecting = true;
    const productArray = Array.from(this.activeProducts);
    const params = new URLSearchParams({
      products: productArray.join(',')
    });

    console.log(`Creating SSE connection for ${this.activeProducts.size} products:`, productArray);
    
    try {
      // Create SSE connection - this should be a single long-lived connection
      this.eventSource = new EventSource(`/api/stock-updates?${params}`, {
        withCredentials: false
      });

      this.eventSource.onopen = (event) => {
        console.log('Stock updates SSE connection opened successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Clear any reconnect timeout since we're now connected
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          console.log('Received SSE message:', update);
          
          if (update.type === 'stock_update' && update.productId) {
            const productSubscribers = this.subscribers.get(update.productId);
            if (productSubscribers) {
              productSubscribers.forEach(callback => {
                try {
                  callback(update);
                } catch (callbackError) {
                  console.error('Error in stock update callback:', callbackError);
                }
              });
            }
          } else if (update.type === 'connected') {
            console.log('SSE connection confirmed:', update.message);
          } else if (update.type === 'heartbeat') {
            // Heartbeat received, connection is alive
            console.debug('SSE heartbeat received at', update.timestamp);
          } else if (update.type === 'error') {
            console.warn('SSE error notification:', update.message);
          } else if (update.type === 'service_unavailable') {
            console.warn('SSE service unavailable:', update.message);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error, 'Raw data:', event.data);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.isConnecting = false;
        
        // Check if we've exceeded max reconnection attempts
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection attempts.`);
          this.cleanup();
          return;
        }
        
        // Close the failed connection
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        
        // Schedule reconnection with exponential backoff
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    // Don't reconnect if no active products or max attempts reached
    if (this.activeProducts.size === 0 || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    // Clear existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Increment reconnect attempts
    this.reconnectAttempts++;

    // Exponential backoff: start with 2 seconds, max 60 seconds
    const baseDelay = 2000;
    const backoffMultiplier = Math.pow(2, Math.min(this.reconnectAttempts - 1, 5)); // Cap at 2^5 = 32
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    const backoffDelay = Math.min(baseDelay * backoffMultiplier + jitter, 60000);
    
    console.log(`Scheduling SSE reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(backoffDelay)}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.activeProducts.size > 0 && !this.isConnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Attempting SSE reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.updateConnection();
      }
    }, backoffDelay);
  }

  // Manual reconnection method (useful for retry buttons)
  forceReconnect() {
    console.log('Forcing SSE reconnection...');
    this.reconnectAttempts = 0; // Reset attempts
    
    // Clear timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connectionUpdateTimeout) {
      clearTimeout(this.connectionUpdateTimeout);
      this.connectionUpdateTimeout = null;
    }
    
    // Close existing connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnecting = false;
    this.updateConnection();
  }

  cleanup() {
    console.log('Cleaning up StockUpdateManager');
    
    // Clear all timeouts
    if (this.connectionUpdateTimeout) {
      clearTimeout(this.connectionUpdateTimeout);
      this.connectionUpdateTimeout = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Clear subscribers and products
    this.subscribers.clear();
    this.activeProducts.clear();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Get current connection status
  getStatus() {
    return {
      isConnecting: this.isConnecting,
      hasConnection: this.eventSource?.readyState === EventSource.OPEN,
      connectionState: this.eventSource?.readyState,
      connectionStates: {
        [EventSource.CONNECTING]: 'CONNECTING',
        [EventSource.OPEN]: 'OPEN', 
        [EventSource.CLOSED]: 'CLOSED'
      },
      activeProducts: Array.from(this.activeProducts),
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Get detailed subscriber info
  getSubscriberInfo() {
    const info: { [productId: string]: number } = {};
    this.subscribers.forEach((callbacks, productId) => {
      info[productId] = callbacks.size;
    });
    return info;
  }
}

export const stockUpdateManager = StockUpdateManager.getInstance();