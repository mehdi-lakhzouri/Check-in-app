import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '10485760', 10),
  dest: process.env.UPLOAD_DEST || './uploads',
}));
