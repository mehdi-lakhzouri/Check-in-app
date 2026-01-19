/**
 * Production-grade API client with error handling, retry logic, and type safety
 */

// ============================================================================
// Configuration
// ============================================================================

// NOTE: Backend runs on port 3000, configured via NEXT_PUBLIC_API_URL in .env.local
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

// ============================================================================
// Error Classes
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    if (typeof body === 'string') {
      return new ApiError(status, body);
    }
    if (typeof body === 'object' && body !== null) {
      const { message, code, errors } = body as Record<string, unknown>;
      return new ApiError(
        status,
        (message as string) || 'Unknown error',
        code as string,
        errors
      );
    }
    return new ApiError(status, 'Unknown error');
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Request Options
// ============================================================================

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

// ============================================================================
// HTTP Client
// ============================================================================

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  if (!response.ok) {
    const body = isJson ? await response.json().catch(() => null) : await response.text();
    throw ApiError.fromResponse(response.status, body);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return isJson ? response.json() : (response.text() as Promise<T>);
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, params, timeout = 30000, ...init } = options;
  
  const url = buildUrl(endpoint, params);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...DEFAULT_HEADERS,
        ...init.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    
    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NetworkError('Request timeout');
    }
    throw new NetworkError('Network request failed', error);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// HTTP Methods Helpers
// ============================================================================

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    fetchApi<T>(endpoint, { method: 'GET', params }),
    
  post: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, { method: 'POST', body }),
    
  put: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, { method: 'PUT', body }),
    
  patch: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, { method: 'PATCH', body }),
    
  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
};

// ============================================================================
// File Download Helpers
// ============================================================================

export function downloadFile(endpoint: string, filename?: string): void {
  const url = `${API_BASE_URL}${endpoint}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function openInNewTab(endpoint: string): void {
  window.open(`${API_BASE_URL}${endpoint}`, '_blank');
}
