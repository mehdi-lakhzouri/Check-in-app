import { format } from 'date-fns';
import type { Session } from '@/lib/schemas';
import type { SessionFormData, BulkSessionEntry } from './types';

// Helper function to parse CSV content
export function parseCSV(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

// Helper function to parse date from various formats
export function parseDateTime(dateStr: string): string {
  if (!dateStr) return '';
  
  // Try to parse various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  }
  
  // Try DD/MM/YYYY HH:mm format
  const ddmmyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2})?:?(\d{2})?/);
  if (ddmmyyyy) {
    const [, day, month, year, hour = '0', minute = '0'] = ddmmyyyy;
    const parsed = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "yyyy-MM-dd'T'HH:mm");
    }
  }
  
  return dateStr;
}

// Helper function to convert file rows to BulkSessionEntry
export function rowsToBulkSessions(rows: string[][], hasHeader: boolean): BulkSessionEntry[] {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const now = new Date();
  
  return dataRows
    .filter(row => row.some(cell => cell.trim()))
    .map((row, index) => {
      const [name, description, startTime, endTime, location, capacity, isOpen, requiresRegistration] = row;
      
      const startDate = parseDateTime(startTime) || format(new Date(now.getTime() + (index + 1) * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");
      const endDate = parseDateTime(endTime) || format(new Date(new Date(startDate).getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");
      
      return {
        id: `bulk-${Date.now()}-${index}`,
        name: name?.trim() || '',
        description: description?.trim() || '',
        startTime: startDate,
        endTime: endDate,
        location: location?.trim() || '',
        isOpen: isOpen?.toLowerCase() === 'true' || isOpen?.toLowerCase() === 'yes' || isOpen === '1',
        capacity: capacity ? parseInt(capacity) || undefined : undefined,
        requiresRegistration: requiresRegistration?.toLowerCase() === 'true' || requiresRegistration?.toLowerCase() === 'yes' || requiresRegistration === '1',
        // Per-session timing - undefined for bulk imports (use system defaults)
        autoOpenMinutesBefore: undefined,
        autoEndGraceMinutes: undefined,
        lateThresholdMinutes: undefined,
      };
    });
}

// Format date for display
export function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

// Format date for input fields
export function formatDateTimeForInput(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

// Get session status
export function getSessionStatus(session: Session): 'upcoming' | 'ongoing' | 'ended' {
  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  return 'ended';
}

// Get default form data
export function getDefaultFormData(): SessionFormData {
  const now = new Date();
  const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  
  return {
    name: '',
    description: '',
    startTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
    endTime: format(endTime, "yyyy-MM-dd'T'HH:mm"),
    location: '',
    isOpen: false,
    capacity: undefined,
    requiresRegistration: false,
    // Per-session timing - undefined means use system defaults
    autoOpenMinutesBefore: undefined,
    autoEndGraceMinutes: undefined,
    lateThresholdMinutes: undefined,
  };
}

// Create empty bulk session entry
export function createEmptyBulkSession(existingCount: number = 0): BulkSessionEntry {
  const now = new Date();
  const startTime = new Date(now.getTime() + (existingCount + 1) * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  
  return {
    id: `bulk-${Date.now()}`,
    name: '',
    description: '',
    startTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
    endTime: format(endTime, "yyyy-MM-dd'T'HH:mm"),
    location: '',
    isOpen: false,
    capacity: undefined,
    requiresRegistration: false,
    // Per-session timing - undefined means use system defaults
    autoOpenMinutesBefore: undefined,
    autoEndGraceMinutes: undefined,
    lateThresholdMinutes: undefined,
  };
}

// Validate a single session entry
export function validateSessionEntry(session: BulkSessionEntry): string | null {
  if (!session.name.trim()) {
    return 'Session name is required';
  }
  if (!session.startTime) {
    return 'Start time is required';
  }
  if (!session.endTime) {
    return 'End time is required';
  }
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  if (end <= start) {
    return 'End time must be after start time';
  }
  return null;
}

// Validate all bulk sessions
export function validateBulkSessions(sessions: BulkSessionEntry[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  sessions.forEach((session, index) => {
    const error = validateSessionEntry(session);
    if (error) {
      errors.push(`Session #${index + 1}: ${error}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
