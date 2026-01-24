// =============================================================================
// Registrations Module - Barrel Export
// =============================================================================
// Registration management components
// Import from '@/components/registrations' for convenience

// Types
export * from './types';

// Re-export the bulk registration dialog from the parent folder
export { BulkRegistrationDialog } from '../bulk-registration-dialog';

// Main Content Component
export { RegistrationsContent } from './registrations-content';
export { default as RegistrationsContentDefault } from './registrations-content';
