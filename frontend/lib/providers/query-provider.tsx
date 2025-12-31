'use client';

/**
 * TanStack Query Provider - Production-grade configuration
 * Includes DevTools, error handling, and optimized defaults
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { ApiError, NetworkError } from '@/lib/api/client';

// ============================================================================
// Error Handler
// ============================================================================

function handleQueryError(error: unknown): void {
  if (ApiError.isApiError(error)) {
    // Handle specific HTTP errors
    switch (error.status) {
      case 401:
        console.error('Unauthorized - Please log in again');
        // Could redirect to login here
        break;
      case 403:
        console.error('Forbidden - You do not have permission');
        break;
      case 404:
        console.error('Resource not found');
        break;
      case 500:
        console.error('Server error - Please try again later');
        break;
      default:
        console.error(`API Error: ${error.message}`);
    }
  } else if (error instanceof NetworkError) {
    console.error('Network error - Please check your connection');
  } else {
    console.error('Unknown error:', error);
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

function shouldRetry(failureCount: number, error: unknown): boolean {
  // Don't retry on client errors (4xx)
  if (ApiError.isApiError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }
  // Retry up to 3 times for network errors and server errors
  return failureCount < 3;
}

function getRetryDelay(attemptIndex: number): number {
  // Exponential backoff with jitter
  const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
  const jitter = Math.random() * 1000;
  return baseDelay + jitter;
}

// ============================================================================
// Query Client Factory
// ============================================================================

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 30 seconds
        staleTime: 30 * 1000,
        // Cache is kept for 5 minutes after last subscriber unmounts
        gcTime: 5 * 60 * 1000,
        // Retry configuration
        retry: shouldRetry,
        retryDelay: getRetryDelay,
        // Refetch on window focus for real-time data
        refetchOnWindowFocus: true,
        // Don't refetch on mount if data is still fresh
        refetchOnMount: true,
        // Refetch on reconnect
        refetchOnReconnect: true,
        // Network mode
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once
        retry: 1,
        retryDelay: 1000,
        // Log mutation errors
        onError: handleQueryError,
        // Network mode
        networkMode: 'online',
      },
    },
  });
}

// ============================================================================
// Browser Query Client (Singleton)
// ============================================================================

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: use singleton pattern
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// ============================================================================
// Provider Component
// ============================================================================

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // NOTE: Using useState ensures the client is created once per component lifecycle
  // This is the recommended pattern for Next.js App Router
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// ============================================================================
// Hook to access QueryClient
// ============================================================================

export { useQueryClient } from '@tanstack/react-query';
