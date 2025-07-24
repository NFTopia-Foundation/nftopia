import { Socket, Namespace } from "socket.io";
import { WebSocketEvent } from "../../types/websocket-events";

export function registerEventHandlers(io: Namespace, socket: Socket) {
  // Room/Channel subscription
  socket.on("subscribe", (room: string) => {
    socket.join(room);
    socket.emit("subscribed", room);
  });

  socket.on("unsubscribe", (room: string) => {
    socket.leave(room);
    socket.emit("unsubscribed", room);
  });

  // Heartbeat/ping
  socket.on("ping", () => {
    socket.emit("pong");
  });

  // Example: NFT activity
  socket.on(WebSocketEvent.NFT_ACTIVITY, (data) => {
    // Broadcast to room or user
    io.to(data.room).emit(WebSocketEvent.NFT_ACTIVITY, data);
  });

  // Example: Platform announcement
  socket.on(WebSocketEvent.PLATFORM_ANNOUNCEMENT, (data) => {
    io.emit(WebSocketEvent.PLATFORM_ANNOUNCEMENT, data);
  });

  // Example: Wallet activity
  socket.on(WebSocketEvent.WALLET_ACTIVITY, (data) => {
    io.to(data.userId).emit(WebSocketEvent.WALLET_ACTIVITY, data);
  });
}
