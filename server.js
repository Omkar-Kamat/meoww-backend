import 'dotenv/config';

import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { initSocketServer } from './src/sockets/socket.server.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const startServer = async () => {
    await connectDB();
    initSocketServer(server);
    server.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
};

startServer();
