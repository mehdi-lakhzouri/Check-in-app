/**
 * Safe Sort Utility
 *
 * Prevents Remote Property Injection attacks (CodeQL: js/remote-property-injection)
 * by validating sort field names against a whitelist of allowed fields.
 *
 * This prevents attackers from injecting dangerous property names like:
 * - __proto__ (prototype pollution)
 * - constructor
 * - toString
 * - Other built-in object properties
 */

/**
 * Common sortable fields shared across entities
 */
export const COMMON_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  '_id',
] as const;

/**
 * Allowed sort fields for each entity type
 */
export const ALLOWED_SORT_FIELDS = {
  // Registration entity
  registration: [
    ...COMMON_SORT_FIELDS,
    'status',
    'registeredAt',
    'participantId',
    'sessionId',
  ],

  // CheckIn entity
  checkIn: [
    ...COMMON_SORT_FIELDS,
    'checkInTime',
    'method',
    'participantId',
    'sessionId',
    'isLate',
  ],

  // CheckInAttempt entity
  checkInAttempt: [
    ...COMMON_SORT_FIELDS,
    'attemptTime',
    'status',
    'participantId',
    'sessionId',
    'failureReason',
  ],

  // Participant entity
  participant: [
    ...COMMON_SORT_FIELDS,
    'name',
    'email',
    'organization',
    'status',
    'qrCode',
    'travelGrantAppliedAt',
    'travelGrantApproved',
    'registrationDate',
    'ambassadorPoints',
  ],

  // Session entity
  session: [
    ...COMMON_SORT_FIELDS,
    'name',
    'startTime',
    'endTime',
    'status',
    'location',
    'capacity',
    'registeredCount',
    'checkedInCount',
  ],

  // Generic/base (fallback)
  base: [...COMMON_SORT_FIELDS],
} as const;

export type EntityType = keyof typeof ALLOWED_SORT_FIELDS;

/**
 * Validates and sanitizes a sort field against a whitelist.
 * Returns a safe default if the provided field is not allowed.
 *
 * @param field - The user-provided sort field
 * @param entityType - The entity type to validate against
 * @param defaultField - The default field to use if validation fails (default: 'createdAt')
 * @returns A safe, validated sort field
 *
 * @example
 * // Returns 'name' (valid field)
 * validateSortField('name', 'participant');
 *
 * // Returns 'createdAt' (invalid field, uses default)
 * validateSortField('__proto__', 'participant');
 *
 * // Returns 'attemptTime' (custom default for invalid field)
 * validateSortField('constructor', 'checkInAttempt', 'attemptTime');
 */
export function validateSortField(
  field: string | undefined,
  entityType: EntityType,
  defaultField: string = 'createdAt',
): string {
  // If no field provided, return default
  if (!field) {
    return defaultField;
  }

  // Get allowed fields for this entity type
  const allowedFields = ALLOWED_SORT_FIELDS[entityType];

  // Check if the field is in the whitelist (case-sensitive)
  if (allowedFields.includes(field as any)) {
    return field;
  }

  // Field not allowed - return safe default
  // This prevents prototype pollution and other injection attacks
  return defaultField;
}

/**
 * Creates a safe sort object for Mongoose queries.
 * Validates the field and returns a properly typed sort object.
 *
 * @param field - The user-provided sort field
 * @param order - The sort order ('asc' or 'desc')
 * @param entityType - The entity type to validate against
 * @param defaultField - The default field to use if validation fails
 * @returns A safe sort object: { [validatedField]: 1 | -1 }
 *
 * @example
 * // Returns { name: 1 }
 * createSafeSortObject('name', 'asc', 'participant');
 *
 * // Returns { createdAt: -1 } (invalid field, uses default)
 * createSafeSortObject('__proto__', 'desc', 'participant');
 */
export function createSafeSortObject(
  field: string | undefined,
  order: 'asc' | 'desc' | undefined,
  entityType: EntityType,
  defaultField: string = 'createdAt',
): Record<string, 1 | -1> {
  const validatedField = validateSortField(field, entityType, defaultField);
  const sortDirection = order === 'asc' ? 1 : -1;

  return { [validatedField]: sortDirection };
}
