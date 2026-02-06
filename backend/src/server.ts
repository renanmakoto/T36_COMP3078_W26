import dotenv from 'dotenv';
import app from './app';
import { connectPrisma } from './lib/prisma';

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const host = '0.0.0.0';

async function start() {
  try {
    await connectPrisma();
    app.log.info('Database connected');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  app
    .listen({ port, host })
    .then((address) => {
      app.log.info(`Server listening at ${address}`);
    })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}

start();
