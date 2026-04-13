"use client";

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";
  socket = io(`${wsUrl}/notifications`, {
    auth: { token: getAccessToken() },
    autoConnect: false,
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  s.auth = { token: getAccessToken() };
  s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
