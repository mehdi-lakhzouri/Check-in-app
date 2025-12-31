import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRegistrationDto } from './create-registration.dto';

export class UpdateRegistrationDto extends PartialType(
  OmitType(CreateRegistrationDto, ['participantId', 'sessionId'] as const),
) {}
