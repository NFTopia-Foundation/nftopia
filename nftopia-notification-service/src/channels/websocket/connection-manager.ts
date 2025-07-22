import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

interface ConnectionManagerOptions {
  io: Server;
  redisUrl: string;
}

export class ConnectionManager {
  private io: Server;
  private redisUrl: string;

  constructor(options: ConnectionManagerOptions) {
    this.io = options.io;
    this.redisUrl = options.redisUrl;
  }

  public async initialize() {
    // Redis adapter for horizontal scaling
    const pubClient = createClient({ url: this.redisUrl });
    const subClient = pubClient.duplicate();
    await pubClient.connect();
    await subClient.connect();
    this.io.adapter(createAdapter(pubClient, subClient));
  }

  public handleConnection(socket: Socket) {
    // Attach per-connection logic here
    socket.on("disconnect", (reason) => {
      // Clean up resources, log disconnects, etc.
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  }
}
