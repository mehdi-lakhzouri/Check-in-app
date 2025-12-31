import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Registration, RegistrationSchema } from './schemas';
import { RegistrationRepository } from './repositories';
import { RegistrationsService } from './services';
import { RegistrationsController } from './controllers';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Registration.name, schema: RegistrationSchema }]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, RegistrationRepository],
  exports: [RegistrationsService, RegistrationRepository],
})
export class RegistrationsModule {}
