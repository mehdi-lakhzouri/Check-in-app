'use client';

import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, NetworkError } from '@/lib/api/client';

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  description = 'An error occurred while loading the data.',
}: ErrorStateProps) {
  const isNetworkError = error instanceof NetworkError;
  const isApiError = error instanceof ApiError;

  const getErrorMessage = () => {
    if (isNetworkError) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (isApiError) {
      switch (error.status) {
        case 401:
          return 'You are not authorized. Please log in again.';
        case 403:
          return 'You do not have permission to access this resource.';
        case 404:
          return 'The requested resource was not found.';
        case 500:
          return 'A server error occurred. Please try again later.';
        default:
          return error.message || description;
      }
    }
    return error?.message || description;
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {isNetworkError ? (
            <WifiOff className="h-5 w-5 text-destructive" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <CardTitle className="text-lg text-destructive">{title}</CardTitle>
        </div>
        <CardDescription className="text-destructive/80">
          {getErrorMessage()}
        </CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-destructive p-2 rounded-md bg-destructive/10">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 px-2 text-destructive hover:text-destructive"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
