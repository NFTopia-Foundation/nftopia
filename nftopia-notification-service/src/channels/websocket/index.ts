import { Server } from "socket.io";
import { ConnectionManager } from "./connection-manager";
import { websocketAuthMiddleware } from "./middlewares/auth.middleware";
import { registerEventHandlers } from "./event-handlers";
import config from "../../config/env";

export function setupWebSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
  });

  const connectionManager = new ConnectionManager({
    io,
    redisUrl: config.REDIS_URL,
  });
  connectionManager.initialize();

  // Namespace support
  const notificationNamespace = io.of("/notifications");

  notificationNamespace.use(websocketAuthMiddleware);

  notificationNamespace.on("connection", (socket) => {
    connectionManager.handleConnection(socket);
    registerEventHandlers(notificationNamespace, socket);
  });

  return io;
}
