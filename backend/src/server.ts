import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/types.js";

import {
  createLobby,
  getLobbyByCode,
  getLobbyBySocket,
  addPlayerToLobby,
  updateFlashcard,
  updateSettings,
  removePlayerFromLobby,
  updateLeader,
} from "./lobbyManager.js";

import {
  startGame,
  shuffleGameCards,
  setRoundStart,
  getCurrentQuestion,
  validateAnswer,
  getRoundResults,
  advanceToNextFlashcard,
  endGame,
} from "./gameManager.js";

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

  socket.on("updateLeader", (nextLeaderId) => {
    const lobby = updateLeader(nextLeaderId);
    if (!lobby) {
      console.log(`Failed to update leader`);
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

  socket.on("startGame", () => {
    const lobby = startGame(socket.id);
    if (!lobby) {
      console.log("Failed to start game: lobby not found");
      return;
    }

    lobby.status = "starting";
    io.to(lobby.code).emit("lobbyUpdated", lobby);

    // Start countdown: 3, 2, 1
    let countdown = 3;
    io.to(lobby.code).emit("startCountdown", countdown);
    countdown--;
    
    // Shuffle cards asynchronously during countdown
    shuffleGameCards(lobby.code);
    
    const countdownInterval = setInterval(() => {
      if (countdown >= 1) {
        io.to(lobby.code).emit("startCountdown", countdown);
        countdown--;
      } else {
        clearInterval(countdownInterval);
        
        // Start the game after 1 is shown
        lobby.status = "ongoing";
        io.to(lobby.code).emit("lobbyUpdated", lobby);

        const runGameplayLoop = (lobbyCode: string) => {
          const currentQuestion = getCurrentQuestion(lobbyCode);
          if (!currentQuestion) {
            const finalLobby = getLobbyByCode(lobbyCode);
            if (finalLobby) {
              finalLobby.status = "finished";
              io.to(lobbyCode).emit("lobbyUpdated", finalLobby);
              endGame(lobbyCode);
            }
            return;
          }
          
          // Set round start time when emitting question
          setRoundStart(lobbyCode);
          io.to(lobbyCode).emit("newFlashcard", currentQuestion);

          // Wait 5 seconds for answers
          setTimeout(() => {
            const results = getRoundResults(lobbyCode);
            if (results) {
              io.to(lobbyCode).emit("endFlashcard", results);
            }

            // Wait 3 seconds to show results
            setTimeout(() => {
              const nextQuestion = advanceToNextFlashcard(lobbyCode);

              if (nextQuestion) {
                // Continue to next round
                runGameplayLoop(lobbyCode);
              } else {
                // Game over
                const finalLobby = getLobbyByCode(lobbyCode);
                if (finalLobby) {
                  finalLobby.status = "finished";
                  io.to(lobbyCode).emit("lobbyUpdated", finalLobby);
                  endGame(lobbyCode);
                }
              }
            }, 3000);
          }, 5000);
        };

        runGameplayLoop(lobby.code);
      }
    }, 1000);
  });

  socket.on("requestCurrentQuestion", () => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby || lobby.status !== "ongoing") return;
    
    const question = getCurrentQuestion(lobby.code);
    if (question) {
      socket.emit("newFlashcard", question);
    }
  });

  socket.on("answer", (text) => {
    const result = validateAnswer(socket.id, text);
    if (!result || !result.isCorrect) return;
    socket.emit("correctGuess", result.timeTaken);
    io.to(result.lobby.code).emit("lobbyUpdated", result.lobby);
  });

});
httpServer.listen(3000, () => console.log("Server running on :3000"));
