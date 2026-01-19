import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiVersion: process.env.API_VERSION || '1',
  apiPrefix: process.env.API_PREFIX || 'api',
  checkinLateThresholdMinutes: parseInt(
    process.env.CHECKIN_LATE_THRESHOLD_MINUTES ?? '10',
    10,
  ),
}));
