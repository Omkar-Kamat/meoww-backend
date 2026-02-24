import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocketServer } from "./sockets/socket.server.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocketServer(server);

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();