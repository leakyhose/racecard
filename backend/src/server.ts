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
  getLobbyBySocket,
  addPlayerToLobby,
  updateFlashcard,
  updateSettings,
  removePlayerFromLobby,
  updateLeader,
  wipeMiniStatus,
  sortPlayersByMetric,
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
  allPlayersAnsweredCorrectly,
  generateDistractors,
  areDistractorsReady,
  areDistractorsGenerating,
} from "./gameManager.js";

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

// Testing
app.use(express.json());
app.get("/status", (req, res) => {
  res.json({
    status: "Running",
    timestamp: new Date().toISOString(),
  });
});

// Store callbacks for active rounds to enable event-driven early ending
const activeRounds = new Map<
  string,
  {
    endRound: () => void;
    roundStartTime: number;
    roundEnded: boolean;
  }
>();

// NOTE: THERE ARE SOME INCONSISTENCIES WITH FUNCTIONS TAKING IN CODE OR LOBBY ID,
// MAKE SURE THEY MATCH THE ONES IN THE MANAGER FILES
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
    lobby.players = sortPlayersByMetric(lobby);
    io.to(code).emit("lobbyUpdated", lobby);
    // Send join notification to chat
    io.to(code).emit("chatMessage", {
      player: "System",
      text: `${nickname} joined the lobby`,
    });

    // If game is ongoing, send current question to the new player
    if (lobby.status === "ongoing") {
      const questionData = getCurrentQuestion(code);
      if (questionData) {
        socket.emit(
          "newFlashcard",
          questionData.question,
          questionData.choices,
        );
      } else {
        // If there's no current question (between rounds), show waiting message
        socket.emit("startCountdown", "Waiting for current round to end");
      }
    }
  });

  // Loads flashcards
  socket.on("updateFlashcard", async (cards) => {
    const lobby = updateFlashcard(socket.id, cards);
    if (!lobby) {
      console.log(`Failed to update flashcards`);
      return;
    }

    // If multiple choice is enabled and flashcards were uploaded, generate distractors
    if (lobby.settings.multipleChoice && cards.length > 0) {
      // Check if already generating
      if (areDistractorsGenerating(lobby.code)) {
        console.log(
          `Distractors already generating for ${lobby.code}, skipping...`,
        );
        io.to(lobby.code).emit("lobbyUpdated", lobby);
        return;
      }

      lobby.distractorStatus = "generating";
      io.to(lobby.code).emit("lobbyUpdated", lobby);

      try {
        await generateDistractors(lobby.code);
        lobby.distractorStatus = "ready";
      } catch (error) {
        console.error("Error generating distractors:", error);
        lobby.distractorStatus = "error";
      }
    } else {
      lobby.distractorStatus = "idle";
    }

    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });

  // Updates settings
  socket.on("updateSettings", async (settings) => {
    const lobby = updateSettings(socket.id, settings);
    if (!lobby) {
      console.log(`Failed to update settings`);
      return;
    }

    // If multiple choice was enabled and flashcards exist, generate distractors
    if (settings.multipleChoice && lobby.flashcards.length > 0) {
      // Check if already generating
      if (areDistractorsGenerating(lobby.code)) {
        console.log(
          `Distractors already generating for ${lobby.code}, skipping...`,
        );
        io.to(lobby.code).emit("lobbyUpdated", lobby);
        return;
      }

      // Check if distractors are already ready (have been generated for current flashcards)
      const alreadyReady =
        areDistractorsReady(lobby.code) &&
        lobby.flashcards.every(
          (card) => card.distractors && card.distractors.length === 3,
        );

      if (!alreadyReady) {
        lobby.distractorStatus = "generating";
        io.to(lobby.code).emit("lobbyUpdated", lobby);

        try {
          await generateDistractors(lobby.code);
          lobby.distractorStatus = "ready";
        } catch (error) {
          console.error("Error generating distractors:", error);
          lobby.distractorStatus = "error";
        }
      } else {
        lobby.distractorStatus = "ready";
      }
    } else if (!settings.multipleChoice) {
      lobby.distractorStatus = "idle";
    }

    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });

  // Updates leader
  socket.on("updateLeader", (nextLeaderId) => {
    const lobby = updateLeader(nextLeaderId);
    if (!lobby) {
      console.log(`Failed to update leader`);
      return;
    }
    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });

  // Gets lobby data, used to check when lobby exists too when null is emitted
  socket.on("getLobby", (code) => {
    const lobby = getLobbyByCode(code);
    socket.emit("lobbyData", lobby || null);
  });

  // Handles disconnection
  socket.on("disconnect", () => {
    const lobbyBeforeRemoval = getLobbyBySocket(socket.id);
    const playerName = lobbyBeforeRemoval?.players.find(
      (p) => p.id === socket.id,
    )?.name;
    const lobby = removePlayerFromLobby(socket.id);

    if (!lobby) {
      // Lobby was deleted, as it became empty
      return;
    }

    if (lobby?.leader === socket.id) {
      if (lobby.players.length > 0) {
        if (!lobby.players[0]) {
          console.log("No players found when updating leader on disconnect");
          return;
        }
        lobby.leader = lobby.players[0].id;
      }
    }
    if (!lobby) return;
    lobby.players = sortPlayersByMetric(lobby);
    io.to(lobby.code).emit("lobbyUpdated", lobby);
    // Send leave notification to chat
    if (playerName) {
      io.to(lobby.code).emit("chatMessage", {
        player: "System",
        text: `${playerName} left the lobby`,
      });
    }
  });

  // Starts game, and gameplay loop
  socket.on("startGame", () => {
    const lobby = startGame(socket.id);
    if (!lobby) {
      console.log("Failed to start game: lobby not found");
      return;
    }

    lobby.status = "starting";
    lobby.players = sortPlayersByMetric(lobby);
    io.to(lobby.code).emit("lobbyUpdated", lobby);

    shuffleGameCards(lobby.code);

    // Start countdown
    let countdown = 3;
    io.to(lobby.code).emit("startCountdown", countdown);
    countdown--;

    const countdownInterval = setInterval(() => {
      if (countdown > 0) {
        io.to(lobby.code).emit("startCountdown", countdown);
        countdown--;
      } else {
        clearInterval(countdownInterval);

        // Set status to ongoing before starting game loop
        lobby.status = "ongoing";
        lobby.players = sortPlayersByMetric(lobby);
        io.to(lobby.code).emit("lobbyUpdated", lobby);

        const runGameplayLoop = (lobbyCode: string) => {
          const questionData = getCurrentQuestion(lobbyCode);
          if (!questionData) {
            const finalLobby = getLobbyByCode(lobbyCode);
            if (finalLobby) {
              finalLobby.status = "finished";
              if (finalLobby.players[0]) {
                finalLobby.players[0].wins += 1;
              }
              finalLobby.players = sortPlayersByMetric(finalLobby);
              io.to(lobbyCode).emit("lobbyUpdated", finalLobby);
              endGame(lobbyCode);
            }
            return;
          }

          // Set round start time when emitting question
          setRoundStart(lobbyCode);
          io.to(lobbyCode).emit(
            "newFlashcard",
            questionData.question,
            questionData.choices,
          );

          const roundStartTime = Date.now();
          const ROUND_DURATION = 10000;
          let roundEnded = false;

          // Ends round, is also called when everyone answers correctly
          const endRound = () => {
            if (roundEnded) return;
            roundEnded = true;
            activeRounds.delete(lobbyCode); // Clean up

            const results = getRoundResults(lobbyCode);
            if (results) {
              io.to(lobbyCode).emit("endFlashcard", results);
            }

            const lobby = wipeMiniStatus(lobbyCode);
            if (lobby) io.to(lobbyCode).emit("lobbyUpdated", lobby);

            // Wait 5 seconds to show results
            setTimeout(() => {
              const nextQuestionData = advanceToNextFlashcard(lobbyCode);

              if (nextQuestionData) {
                // Continue to next round
                runGameplayLoop(lobbyCode);
              } else {
                // Game over
                const finalLobby = getLobbyByCode(lobbyCode);
                if (finalLobby) {
                  finalLobby.status = "finished";
                  if (finalLobby.players[0]) {
                    finalLobby.players[0].wins += 1;
                  }
                  finalLobby.players = sortPlayersByMetric(finalLobby);
                  io.to(lobbyCode).emit("lobbyUpdated", finalLobby);
                  endGame(lobbyCode);
                }
                return;
              }
            }, 3000);
          };

          // Store round info, callback endRound is called if answers are given faster than round
          activeRounds.set(lobbyCode, { endRound, roundStartTime, roundEnded });

          setTimeout(() => {
            endRound();
          }, ROUND_DURATION);
        };

        runGameplayLoop(lobby.code);
      }
    }, 1000);
  });

  socket.on("answer", (text) => {
    const result = validateAnswer(socket.id, text);
    if (!result) return;

    if (result.isCorrect || result.lobby.settings.multipleChoice) {
      socket.emit("endGuess", result.timeTaken, result.isCorrect);
    }
    result.lobby.players = sortPlayersByMetric(result.lobby);
    io.to(result.lobby.code).emit("lobbyUpdated", result.lobby);

    // Check if all players have answered correctly
    const roundInfo = activeRounds.get(result.lobby.code);
    if (
      roundInfo &&
      !roundInfo.roundEnded &&
      allPlayersAnsweredCorrectly(result.lobby.code)
    ) {
      const elapsedTime = Date.now() - roundInfo.roundStartTime;
      const ROUND_DURATION = 10000;
      const MIN_DELAY_AFTER_ALL_ANSWERED = 1000;
      const timeUntilEnd = ROUND_DURATION - elapsedTime;
      const delay = Math.min(timeUntilEnd, MIN_DELAY_AFTER_ALL_ANSWERED);

      setTimeout(() => roundInfo.endRound(), delay);
    }
  });

  // Handle chat messages
  socket.on("sendChat", (msg) => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby) {
      console.log("Failed to send chat: lobby not found");
      return;
    }
    const player = lobby.players.find((p) => p.id === socket.id);
    if (!player) {
      console.log("Failed to send chat: player not found");
      return;
    }
    io.to(lobby.code).emit("chatMessage", {
      player: player.name,
      text: msg,
    });
  });

  // Signal to continue game
  socket.on("continueGame", () => {
    const lobby = getLobbyBySocket(socket.id);
    if (!lobby) {
      console.log("Failed to continue game: lobby not found");
      return;
    }

    if (lobby.leader !== socket.id) {
      console.log("Only leader can continue the game");
      return;
    }

    lobby.status = "waiting";
    lobby.players = sortPlayersByMetric(lobby);

    lobby.players.forEach((player) => {
      player.score = 0;
    });

    lobby.players = sortPlayersByMetric(lobby);
    io.to(lobby.code).emit("lobbyUpdated", lobby);
  });
});
httpServer.listen(3000, () => console.log("Server running on :3000"));
