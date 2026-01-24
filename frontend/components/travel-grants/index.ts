// =============================================================================
// Travel Grants Module - Barrel Export
// =============================================================================
// Travel grant management components
// Import from '@/components/travel-grants' for convenience

// Types
export * from './types';

// API
export { travelGrantApi } from './api';

// Components
export { TravelGrantDetailsSheet } from './travel-grant-details-sheet';
export type { TravelGrantDetailsSheetProps } from './travel-grant-details-sheet';

// Main Content Component
export { TravelGrantsContent } from './travel-grants-content';
export { default as TravelGrantsContentDefault } from './travel-grants-content';
