// =============================================================================
// Participants Module - Barrel Export
// =============================================================================
// Participant management components
// Import from '@/components/participants' for convenience

// Types
export * from './types';

// API
export { participantApi } from './api';

// Components
export { createParticipantColumns } from './participant-columns';
export { ParticipantProfileModal } from './participant-profile-modal';

// Main Content Component (re-exported from root)
export { ParticipantsContent } from '../participants-content';
