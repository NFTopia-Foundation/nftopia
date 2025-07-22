import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import config from "../../../config/env";

export function websocketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token =
    socket.handshake.auth?.token || socket.handshake.headers["authorization"];
  if (!token) {
    return next(new Error("Authentication token missing"));
  }
  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), config.JWT_SECRET);
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid authentication token"));
  }
}
