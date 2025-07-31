import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import config from "./config/env";
import { connectWithRetry } from "./config/database";
import http from "http";
import { setupWebSocketServer } from "./channels/websocket";

const server = http.createServer(app);

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectWithRetry(config.MONGO_URI, {
      retryAttempts: 5,
      retryDelay: 3000,
    });

    // Start HTTP server
    server.listen(config.PORT, () => {
      console.log(`Notification service running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(`Database: ${config.MONGO_URI}`);
    });

    // Setup WebSocket server
    setupWebSocketServer(server);
    console.log("WebSocket server initialized");
  } catch (error) {
    console.error("Failed to start notification service:", error);
    process.exit(1);
  }
};

startServer();
