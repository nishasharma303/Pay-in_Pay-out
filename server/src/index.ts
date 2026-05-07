import 'dotenv/config';
import app from './app';
import { prisma } from './config/database';

const PORT = process.env.PORT || 5001;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`⏳ DB connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY/1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      return connectWithRetry(attempt + 1);
    }
    throw error;
  }
}

async function bootstrap() {
  try {
    await connectWithRetry();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();