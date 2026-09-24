import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';

import http from 'http';
import { Server } from 'socket.io';

import connectDB from './utils/db.js';

import authRouter from './routes/authRouter.js';
import conversationRouter from './routes/conversationRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import mediaRouter from './routes/mediaRoutes.js';

import { handleError, notFound } from './middleware/errorMiddleware.js';
import { socketAuth } from './middleware/authMiddleware.js';
import initializeSocket from './socket/socket.js';

const PORT = process.env.PORT || 5000;
const app = express();

const isProd =
  process.env.NODE_ENV === 'prod' ||
  process.env.NODE_ENV === 'production';

// In production (same-origin setup) we can allow any origin.
// In local dev, restrict to the Vite dev server.
const corsOrigin = isProd ? true : 'http://localhost:5173';

// --------------------
// Express middleware
// --------------------

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// REST routes
// --------------------

app.use('/api/auth', authRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/messages', messageRouter);
app.use('/api/media', mediaRouter);

// --------------------
// Serve React build
// --------------------

const buildPath = path.join(process.cwd(), 'Frontend', 'chatApp', 'dist');

if (isProd) {
  app.use(express.static(buildPath));
  // Express 5+ doesn't accept app.get('*') as a valid path pattern.
  // Use a regex catch-all instead.
  app.get(/.*/, (req, res) =>
    res.sendFile(path.join(buildPath, 'index.html'))
  );
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

// --------------------
// Error middleware
// --------------------

app.use(handleError);
app.use(notFound);

// --------------------
// HTTP server
// --------------------

const app_server = http.createServer(app);

// --------------------
// Socket.IO
// --------------------

const io = new Server(app_server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

io.use(socketAuth);
initializeSocket(io);

app_server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Running on PORT: ${PORT}`);
  connectDB();
});
