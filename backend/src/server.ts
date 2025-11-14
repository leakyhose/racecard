import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Lobby,
} from "@shared/types.js";

import {
  createLobby,
  getLobbyByCode,
  addPlayerToLobby,
  updateFlashcard,
  updateSettings,
  removePlayerFromLobby,
} from "./lobbyManager.js";

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

/*
 All socket.on that change lobby should emit, "lobbyUpdated", with accomanying lobby
 Requests to change the lobby should not include code either, server can figure it out itself
 Only exception are adding players to lobby
*/
io.on("connection", (socket) => {
  console.log(`connected to: ${socket.id}`);

  // Creates lobby
  socket.on("createLobby", (nickname) => {
    const lobby = createLobby(socket.id, nickname);
    socket.join(lobby.code);
    socket.emit("lobbyUpdated", lobby);
  });

  // Joins a lobby
  socket.on("joinLobby", (code, nickname) => {
    const lobby = addPlayerToLobby(code, socket.id, nickname);
    if (!lobby) {
      console.log(`Failed to join lobby ${code}: lobby not found`);
      return;
    }
    socket.join(code);
    io.to(code).emit("lobbyUpdated", lobby);
  });

  // Loads flashcards
  socket.on("updateFlashcard", (cards) => {
    const lobby = updateFlashcard(socket.id, cards);
    if (!lobby) {
      console.log(`Failed to update flashcards`);
      return;
    }
    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });

  socket.on("updateSettings", (settings) => {
    const lobby = updateSettings(socket.id, settings);
    if (!lobby) {
      console.log(`Failed to update settings`);
      return;
    }
    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });

  socket.on("getLobby", (code) => {
    const lobby = getLobbyByCode(code);
    socket.emit("lobbyData", lobby || null);
  });

  socket.on("disconnect", () => {
    const lobby = removePlayerFromLobby(socket.id);
    
    if (!lobby) return;
    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });
});

httpServer.listen(3000, () => console.log("Server running on :3000"));
