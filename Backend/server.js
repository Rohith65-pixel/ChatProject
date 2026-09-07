import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';

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


// --------------------
// Express middleware
// --------------------

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

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
        origin: 'http://localhost:5173',
        credentials: true
    }
});


// THIS IS WHERE SOCKET AUTHENTICATION HAPPENS
io.use(socketAuth);


// Initialize socket events
initializeSocket(io);


// --------------------
// Start server
// --------------------

app_server.listen(PORT, () => {
    console.log(`Server Running on PORT: ${PORT}`);
    connectDB();
});