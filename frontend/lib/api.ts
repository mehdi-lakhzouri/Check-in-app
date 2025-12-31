// API configuration and client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json();
}

// Session API
export const sessionsApi = {
  getAll: async () => {
    const res = await fetchApi<{ status: string; data: Session[] }>('/sessions');
    return { sessions: res.data };
  },
  getById: async (id: string) => {
    const res = await fetchApi<{ status: string; data: Session }>(`/sessions/${id}`);
    return { session: res.data };
  },
  create: async (data: CreateSessionDto) => {
    const res = await fetchApi<{ status: string; data: Session }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { session: res.data };
  },
  update: async (id: string, data: UpdateSessionDto) => {
    const res = await fetchApi<{ status: string; data: Session }>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { session: res.data };
  },
  delete: async (id: string) => {
    const res = await fetchApi<{ status: string; message: string }>(`/sessions/${id}`, {
      method: 'DELETE',
    });
    return { message: res.message };
  },
  getCheckIns: async (id: string) => {
    const res = await fetchApi<{ status: string; data: CheckIn[] }>(`/sessions/${id}/checkins`);
    return { checkIns: res.data };
  },
};

// Participant API
export const participantsApi = {
  getAll: async (search?: string) => {
    const url = search ? `/participants?search=${encodeURIComponent(search)}` : '/participants';
    const res = await fetchApi<{ status: string; data: Participant[] }>(url);
    return { participants: res.data };
  },
  getById: async (id: string) => {
    const res = await fetchApi<{ status: string; data: Participant }>(`/participants/${id}`);
    return { participant: res.data };
  },
  getDetails: async (id: string) => {
    const res = await fetchApi<{ status: string; data: ParticipantDetails }>(`/participants/${id}/details`);
    return { details: res.data };
  },
  getByQrCode: async (qrCode: string) => {
    const res = await fetchApi<{ status: string; data: Participant }>(`/participants/qr/${qrCode}`);
    return { participant: res.data };
  },
  generateQR: async () => {
    const res = await fetchApi<{ status: string; data: { qrCode: string; qrCodeDataUrl: string } }>('/participants/generate-qr');
    return res.data;
  },
  create: async (data: CreateParticipantDto) => {
    const res = await fetchApi<{ status: string; data: Participant }>('/participants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { participant: res.data };
  },
  update: async (id: string, data: UpdateParticipantDto) => {
    const res = await fetchApi<{ status: string; data: Participant }>(`/participants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { participant: res.data };
  },
  delete: async (id: string) => {
    const res = await fetchApi<{ status: string; message: string }>(`/participants/${id}`, {
      method: 'DELETE',
    });
    return { message: res.message };
  },
  bulkUpload: async (participants: Array<{ name: string; email: string; organization?: string }>) => {
    const res = await fetchApi<{ status: string; data: any }>('/participants/bulk', {
      method: 'POST',
      body: JSON.stringify({ participants }),
    });
    return res.data;
  },
  downloadQRCodes: () => {
    window.open(`${API_BASE_URL}/participants/qrcodes/download`, '_blank');
  },
  downloadTemplate: () => {
    window.open(`${API_BASE_URL}/participants/template/download`, '_blank');
  },
};

// Check-in API
export const checkInApi = {
  checkInWithQr: async (data: CheckInQrDto) => {
    const res = await fetchApi<{ status: string; data: CheckIn; message: string }>('/checkin/qr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { checkIn: res.data, message: res.message };
  },
  checkIn: async (data: CheckInDto) => {
    const res = await fetchApi<{ status: string; data: CheckIn; message: string }>('/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { checkIn: res.data, message: res.message };
  },
  getAll: async () => {
    const res = await fetchApi<{ status: string; data: CheckIn[] }>('/checkin');
    return { checkIns: res.data };
  },
};

// Registration API
export const registrationsApi = {
  getAll: async () => {
    const res = await fetchApi<{ status: string; data: Registration[] }>('/registrations');
    return { registrations: res.data };
  },
  create: async (data: CreateRegistrationDto) => {
    const res = await fetchApi<{ status: string; data: Registration }>('/registrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { registration: res.data };
  },
  delete: async (id: string) => {
    const res = await fetchApi<{ status: string; message: string }>(`/registrations/${id}`, {
      method: 'DELETE',
    });
    return { message: res.message };
  },
};

// Types
export interface Session {
  _id: string;
  name: string;
  isOpen: boolean;
  checkInsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  _id: string;
  name: string;
  email: string;
  organization?: string;
  qrCode: string;
  isActive: boolean;
  status: 'regular' | 'ambassador' | 'travel_grant';
  ambassadorPoints: number;
  referredParticipantIds: string[];
  travelGrantApplied: boolean;
  travelGrantApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  _id: string;
  participantId: string | Participant;
  sessionId: string | Session;
  checkInTime: string;
  status: 'present' | 'late' | 'absent';
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  _id: string;
  participantId: string | Participant;
  sessionId: string | Session;
  registrationDate: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateSessionDto {
  name: string;
  isOpen: boolean;
}

export interface UpdateSessionDto {
  name?: string;
  isOpen?: boolean;
}

export interface CreateParticipantDto {
  name: string;
  email: string;
  organization?: string;
  qrCode?: string; // Now optional - auto-generated by backend
  status?: 'regular' | 'ambassador' | 'travel_grant';
}

export interface UpdateParticipantDto {
  name?: string;
  email?: string;
  organization?: string;
  isActive?: boolean;
  status?: 'regular' | 'ambassador' | 'travel_grant';
  ambassadorPoints?: number;
  travelGrantApplied?: boolean;
  travelGrantApproved?: boolean;
}

export interface ParticipantDetails {
  participant: Participant;
  scores: {
    type: 'ambassador' | 'travel_grant';
    points?: number;
    referralCount?: number;
    applied?: boolean;
    approved?: boolean;
    applicationDate?: string;
    approvalDate?: string;
  } | null;
  referredParticipants: Array<{
    _id: string;
    name: string;
    email: string;
    organization?: string;
    status: string;
  }>;
  registrations: Registration[];
  checkIns: CheckIn[];
}

export interface CheckInQrDto {
  qrCode: string;
  sessionId: string;
}

export interface CheckInDto {
  participantId: string;
  sessionId: string;
}

export interface CreateRegistrationDto {
  participantId: string;
  sessionId: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}
