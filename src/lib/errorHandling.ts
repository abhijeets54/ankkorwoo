// Production-grade error handling framework
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    isOperational = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
    this.context = context;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', true, { resource, identifier });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, 'CONFLICT', true, context);
  }
}

export class StockError extends AppError {
  constructor(message: string, availableStock?: number, requestedQuantity?: number) {
    super(message, 400, 'STOCK_ERROR', true, { 
      availableStock, 
      requestedQuantity 
    });
  }
}

export class ReservationError extends AppError {
  constructor(message: string, reservationId?: string) {
    super(message, 400, 'RESERVATION_ERROR', true, { reservationId });
  }
}

export class WebhookError extends AppError {
  constructor(message: string, webhookType?: string, source?: string) {
    super(message, 400, 'WEBHOOK_ERROR', true, { 
      webhookType, 
      source 
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, table?: string) {
    super(message, 500, 'DATABASE_ERROR', true, { 
      operation, 
      table 
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, statusCode?: number) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, {
      service,
      externalStatusCode: statusCode
    });
  }
}

// Circuit breaker implementation
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(failureThreshold = 5, resetTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  async execute<T>(
    operationKey: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(operationKey);

    if (state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        state.state = 'HALF_OPEN';
      } else {
        if (fallback) {
          return await fallback();
        }
        throw new AppError(
          `Circuit breaker is OPEN for operation: ${operationKey}`,
          503,
          'CIRCUIT_BREAKER_OPEN'
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess(operationKey);
      return result;
    } catch (error) {
      this.onFailure(operationKey);
      
      if (fallback && state.state === 'OPEN') {
        return await fallback();
      }
      
      throw error;
    }
  }

  private getState(operationKey: string): CircuitBreakerState {
    if (!this.states.has(operationKey)) {
      this.states.set(operationKey, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED'
      });
    }
    return this.states.get(operationKey)!;
  }

  private onSuccess(operationKey: string): void {
    const state = this.getState(operationKey);
    state.failures = 0;
    state.state = 'CLOSED';
  }

  private onFailure(operationKey: string): void {
    const state = this.getState(operationKey);
    state.failures++;
    state.lastFailureTime = Date.now();
    
    if (state.failures >= this.failureThreshold) {
      state.state = 'OPEN';
    }
  }

  getStatus(operationKey: string): CircuitBreakerState {
    return { ...this.getState(operationKey) };
  }
}

// Retry mechanism with exponential backoff
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  backoffFactor: 2,
  retryableErrors: ['EXTERNAL_SERVICE_ERROR', 'DATABASE_ERROR', 'NETWORK_ERROR']
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let delay = config.baseDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Check if error is retryable
      if (error instanceof AppError) {
        if (!config.retryableErrors?.includes(error.errorCode)) {
          throw error;
        }
      }

      // Log retry attempt
      console.warn(`Operation failed, retrying (${attempt}/${config.maxAttempts})`, {
        error: error instanceof Error ? error.message : String(error),
        nextRetryIn: `${delay}ms`
      });

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay = Math.min(delay * config.backoffFactor, config.maxDelayMs);
    }
  }

  throw lastError!;
}

// Error logger interface
export interface ErrorLogger {
  log(error: Error, context?: Record<string, any>): Promise<void>;
}

// Console error logger (development)
class ConsoleErrorLogger implements ErrorLogger {
  async log(error: Error, context?: Record<string, any>): Promise<void> {
    console.error('Error logged:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

// Production error logger (would integrate with Sentry, DataDog, etc.)
class ProductionErrorLogger implements ErrorLogger {
  async log(error: Error, context?: Record<string, any>): Promise<void> {
    // In production, this would send to monitoring service
    const logData = {
      level: 'error',
      message: error.message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version
    };

    // For now, log to console (in production, send to monitoring service)
    console.error(JSON.stringify(logData));

    // TODO: Send to external monitoring service
    // await sendToMonitoringService(logData);
  }
}

// Global error handler
class ErrorHandler {
  private logger: ErrorLogger;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.logger = process.env.NODE_ENV === 'production'
      ? new ProductionErrorLogger()
      : new ConsoleErrorLogger();
    
    this.circuitBreaker = new CircuitBreaker();
  }

  async handleError(error: Error, context?: Record<string, any>): Promise<void> {
    // Log the error
    await this.logger.log(error, context);

    // If it's an operational error, we know how to handle it
    if (error instanceof AppError && error.isOperational) {
      return;
    }

    // For non-operational errors, we might want to crash in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Non-operational error detected:', error);
    }

    // In production, log but don't crash the application
    console.error('Unexpected error:', error);
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }
}

// Singleton error handler
export const errorHandler = new ErrorHandler();

// Utility function to handle async operations with error handling
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorContext?: Record<string, any>
): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await errorHandler.handleError(err, errorContext);
    return { error: err };
  }
}

// API response wrapper for consistent error responses
export function createErrorResponse(error: Error) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        context: error.context
      }
    };
  }

  // For unknown errors, don't expose internal details
  return {
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  };
}

// Middleware for Next.js API routes (Pages API)
export function withErrorHandling(
  handler: (req: any, res: any) => Promise<any>
) {
  return async (req: any, res: any) => {
    try {
      return await handler(req, res);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await errorHandler.handleError(err, { 
        url: req.url, 
        method: req.method,
        userAgent: req.headers?.['user-agent']
      });

      const errorResponse = createErrorResponse(err);
      
      return res.status(errorResponse.error.statusCode).json(errorResponse);
    }
  };
}

// Middleware for Next.js App Router
export function withAppRouterErrorHandling(
  handler: (req: any) => Promise<any>
) {
  return async (req: any) => {
    try {
      return await handler(req);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await errorHandler.handleError(err, { 
        url: req.url, 
        method: req.method,
        userAgent: req.headers?.get?.('user-agent')
      });

      const errorResponse = createErrorResponse(err);
      
      const { NextResponse } = await import('next/server');
      return NextResponse.json(errorResponse, { 
        status: errorResponse.error.statusCode 
      });
    }
  };
}