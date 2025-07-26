/**
 * withRetry - A utility for retrying failed API calls with exponential backoff
 * 
 * This utility wraps any async function and retries it if it fails, with an
 * exponential backoff delay between retries.
 */

/**
 * Options for the withRetry function
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  retries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Jitter factor (0-1) to add randomness to delay */
  jitter?: number;
  /** Function to determine if an error is retryable */
  retryableError?: (error: any) => boolean;
  /** Callback function executed before each retry */
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * Default retry options
 */
const defaultOptions: Required<RetryOptions> = {
  retries: 3,
  initialDelay: 500,
  maxDelay: 10000,
  jitter: 0.1,
  retryableError: () => true, // By default, retry all errors
  onRetry: (error, attempt) => console.warn(`Retry attempt ${attempt} after error:`, error)
};

/**
 * Wraps an async function with retry logic using exponential backoff
 * 
 * @param fn The async function to retry
 * @param options Retry options
 * @returns A wrapped function that will retry on failure
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const opts = { ...defaultOptions, ...options };
  
  return async function(...args: Parameters<T>): Promise<ReturnType<T>> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        // Execute the function
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        // Check if we've reached the maximum number of retries
        if (attempt >= opts.retries || !opts.retryableError(error)) {
          break;
        }
        
        // Call the onRetry callback
        opts.onRetry(error, attempt + 1);
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          opts.initialDelay * Math.pow(2, attempt),
          opts.maxDelay
        );
        
        // Add jitter to prevent synchronized retries
        const jitterDelay = delay * (1 + opts.jitter * (Math.random() * 2 - 1));
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, jitterDelay));
      }
    }
    
    // If we've exhausted all retries, throw the last error
    throw lastError;
  };
}

/**
 * Helper function to determine if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof TypeError ||
    error.message?.includes('network') ||
    error.message?.includes('Network') ||
    error.message?.includes('fetch') ||
    error.message?.includes('connection') ||
    error.message?.includes('timeout') ||
    error.message?.includes('abort')
  );
}

/**
 * Helper function to determine if an error is a server error (5xx)
 */
export function isServerError(error: any): boolean {
  return (
    error.status >= 500 ||
    (error.response && error.response.status >= 500)
  );
}

/**
 * Default retryable error function for API calls
 * Retries on network errors and server errors (5xx)
 */
export function isRetryableApiError(error: any): boolean {
  return isNetworkError(error) || isServerError(error);
} 