import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for QR code verification before check-in
 */
export class VerifyQrDto {
  @ApiProperty({
    example: 'QR-ABC123XYZ',
    description: 'QR code of the participant',
  })
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Session ID to check registration for',
  })
  @IsMongoId()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * Verification badge indicating registration status
 */
export enum VerificationBadge {
  REGISTERED = 'REGISTERED',
  NOT_REGISTERED = 'NOT_REGISTERED',
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
}

/**
 * Verification result response
 */
export interface VerificationResult {
  participant: {
    _id: string;
    name: string;
    email: string;
    organization?: string;
    qrCode: string;
  };
  session: {
    _id: string;
    name: string;
    isOpen: boolean;
    requiresRegistration: boolean;
    capacity?: number | null;
    isAtCapacity?: boolean;
  };
  verification: {
    isRegistered: boolean;
    registrationStatus: string | null;
    isAlreadyCheckedIn: boolean;
    existingCheckIn?: {
      _id: string;
      checkInTime: Date;
      method: string;
    };
    badge: VerificationBadge;
    isAtCapacity?: boolean;
  };
  actions: {
    canAccept: boolean;
    canDecline: boolean;
    acceptLabel: string;
    declineLabel: string;
  };
  capacityInfo?: {
    current: number;
    max: number;
    remaining: number;
  };
}
