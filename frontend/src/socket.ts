import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@shared/types";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  "http://localhost:3000",
);

socket.on("connect", () => {
  console.log("Connected to backend:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from backend");
});
