import express from "express";
const app = express();

import mongoose from "mongoose";
import methodOverride from "method-override";

import path from "path";
import { fileURLToPath } from "url";

import http from "http";
import { Server } from "socket.io";

import passport from "passport";
import localStrategy from "passport-local";
import session from "express-session";
import user from "./models/user.js";

import configurePassport from "./config/passportConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameTimers = new Map();

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

mongoose.set("debug", true);
const uri = "mongodb+srv://Quim:Euna0se!@cluster0.wbapltt.mongodb.net/?retryWrites=true&w=majority&appName=dbw";
const local_uri = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.4.2";
const clientOptions = {
    serverApi: { version: "1", strict: true, deprecationErrors: true },
    serverSelectionTimeoutMS: 30000, // Increase timeout
};

console.log("Connecting to MongoDB...");
mongoose
    .connect(uri, clientOptions)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
    });

// * Auth Config
app.use(
    session({
        resave: false,
        saveUninitialized: false,
        secret: "your-secret-key",
    })
);

configurePassport();

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

import mainRoutes from "./routes/mainRoutes.js";
app.use("/", mainRoutes);

import getlobbyRoutes from "./routes/lobbyRoutes.js";
app.use("/lobby", getlobbyRoutes);

import userRouter from "./routes/userRoutes.js";
app.use(userRouter);

import gameRoutes from './routes/gameRoutes.js';
app.use('/game', gameRoutes);

import chatRoutes from "./routes/chatRoutes.js";
app.use("/chat", chatRoutes);

app.get('/intro', (req, res) => {
    res.render('game-intro', { user: req.user || {} });
});

import profileRoutes from "./routes/profileRoutes.js";
app.use("/profile", profileRoutes);
const server = http.createServer(app);
const io = new Server(server);

app.get('/api/lobby/exists', (req, res) => {
    const roomCode = req.query.code;
    const exists = lobbies.has(roomCode);

    res.json({
        exists: exists,
        roomCode: roomCode
    });
});

// Objeto para armazenar os lobbies
const lobbies = new Map();

// Object to store game rooms
const gameRooms = {};

io.on("connection", function (socket) {
    console.log(`user connected: ${socket.id}`);

    // Evento para entrar no lobby
    socket.on('joinLobby', ({ roomCode, user }) => {
        if (!lobbies.has(roomCode)) {
            // Criar novo lobby se não existir
            lobbies.set(roomCode, {
                players: [],
                maxPlayers: 12, // Definir o valor máximo de jogadores
                settings: {
                    rounds: 5,
                    drawTime: 60,
                    private: true
                },
                createdAt: new Date()
            });
        }

        const lobby = lobbies.get(roomCode);

        // Verificar se o jogador já está no lobby com base no userId
        const existingPlayer = lobby.players.find(p => p.userId === user.id);
        if (existingPlayer) {
            // Atualizar o socket.id do jogador para a nova conexão
            existingPlayer.id = socket.id;
            socket.join(roomCode); // Garantir que o socket esteja na sala
            updateLobby(roomCode); // Atualizar o lobby para todos
            return;
        }

        // Verificar se o lobby está cheio
        if (lobby.players.length >= lobby.maxPlayers) {
            socket.emit('lobbyFull');
            return;
        }

        // Adicionar jogador ao lobby
        const player = {
            id: socket.id,
            userId: user.id,
            username: user.username,
            profilePicture: user.profilePicture || '/images/default-avatar.png',
            ready: false
        };

        lobby.players.push(player);
        socket.join(roomCode);

        // Atualizar todos no lobby
        updateLobby(roomCode);

        // Enviar mensagem de sistema
        io.to(roomCode).emit('systemMessage', `${user.username} joined the lobby.`);
    });

    // Evento para mudar status de ready
    socket.on('toggleReady', ({ roomCode, userId }) => {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;

        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = !player.ready;
            updateLobby(roomCode);

            // Emit readiness status to all players in the lobby
            const allReady = lobby.players.every(p => p.ready);
            io.to(roomCode).emit('updateReadyStatus', { allReady });
        }
    });

    // Evento para sair do lobby
    socket.on('leaveLobby', ({ roomCode, userId }) => {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;

        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const player = lobby.players[playerIndex];
            lobby.players.splice(playerIndex, 1);

            socket.leave(roomCode);
            updateLobby(roomCode);

            io.to(roomCode).emit('systemMessage', `${player.username} left the lobby.`);

            // Se o lobby ficar vazio, removê-lo
            if (lobby.players.length === 0) {
                lobbies.delete(roomCode);
            }
        }
    });

    // Evento para atualizar configurações
    socket.on('updateSettings', ({ roomCode, settings }) => {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;

        // Apenas o primeiro jogador pode alterar as configurações
        if (lobby.players.length > 0 && lobby.players[0].id === socket.id) {
            lobby.settings = settings;
            updateLobby(roomCode);
        }
    });

    // Evento para enviar mensagem no chat
    socket.on('sendMessage', ({ roomCode, message, user }) => {
        // Envia a mensagem para todos exceto o remetente
        socket.to(roomCode).emit('newMessage', {
            username: user.username,
            message: message,
            isSelf: false
        });

        // Envia a mensagem apenas para o remetente (com isSelf=true)
        socket.emit('newMessage', {
            username: 'You',
            message: message,
            isSelf: true
        });
    });

    // Evento para iniciar o jogo
    socket.on('startGame', (roomCode, callback) => {
        const lobby = lobbies.get(roomCode);
        if (!lobby) {
            callback({ success: false, message: 'Lobby not found' });
            return;
        }

        // Verify room creator
        if (lobby.players.length === 0 || lobby.players[0].id !== socket.id) {
            callback({ success: false, message: 'Only the room creator can start the game' });
            return;
        }

        // Verify all players ready
        const allReady = lobby.players.every(player => player.ready);
        if (!allReady) {
            const notReadyPlayers = lobby.players.filter(p => !p.ready).map(p => p.username);
            callback({
                success: false,
                message: `The following players are not ready: ${notReadyPlayers.join(', ')}`
            });
            return;
        }

        // Verify minimum players
        if (lobby.players.length < 2) {
            callback({ success: false, message: 'Need at least 2 players to start' });
            return;
        }

        callback({ success: true });

        // Start the game with timer system
        socket.emit('startGameWithTimer', roomCode);
    });

    // Evento para obter jogadores do lobby
    socket.on('getLobbyPlayers', (roomCode, callback) => {
        const lobby = lobbies.get(roomCode);
        if (lobby) {
            callback(lobby.players.map(p => ({
                id: p.id,
                username: p.username,
                profilePicture: p.profilePicture
            })));
        } else {
            callback([]);
        }
    });

    // Evento para obter histórico de chat
    socket.on('getChatHistory', (roomCode, callback) => {
        // Aqui você precisaria implementar a lógica para armazenar e recuperar
        // o histórico de mensagens. Por enquanto, vamos retornar um array vazio
        callback([]);
    });

    // Evento para submeter resposta
    socket.on('submitResponse', ({ roomCode, userId, response }) => {
        // Lógica para processar a resposta do jogador
        console.log(`Player ${userId} submitted response: ${response}`);
        // Você pode emitir um evento para atualizar outros jogadores se necessário
        io.to(roomCode).emit('responseSubmitted', { userId, response });
    });

    // Handle joining game room
    socket.on('joinGameRoom', ({ roomCode, user }) => {
        socket.join(roomCode);

        // Initialize game room if it doesn't exist
        if (!gameRooms[roomCode]) {
            gameRooms[roomCode] = {
                players: [],
                chatHistory: [],
                gameState: {}
            };
        }

        const room = gameRooms[roomCode];

        // Add player if not already in room
        if (!room.players.some(p => p.id === socket.id)) {
            room.players.push({
                id: socket.id,
                userId: user.id,
                username: user.username,
                profilePicture: user.profilePicture,
                status: 'Playing'
            });
        }

        // Update all players in the room
        updateGameRoom(roomCode);
    });

    // Handle game messages
    socket.on('sendGameMessage', ({ roomCode, message, user }) => {
        const room = gameRooms[roomCode];
        if (room) {
            const chatMessage = {
                sender: user.username,
                content: message,
                type: 'other',
                timestamp: new Date()
            };

            room.chatHistory.push(chatMessage);

            // Broadcast to all in room except sender
            socket.to(roomCode).emit('newMessage', chatMessage);

            // Send to sender with different type
            socket.emit('newMessage', {
                ...chatMessage,
                sender: 'You',
                type: 'self'
            });
        }
    });

    // Helper function to update game room
    function updateGameRoom(roomCode) {
        const room = gameRooms[roomCode];
        if (room) {
            // Send updated player list to all in room
            io.to(roomCode).emit('updatePlayers', room.players);

            // Send chat history to all in room
            io.to(roomCode).emit('updateChat', room.chatHistory);
        }
    }

    // Lidar com desconexões
    socket.on('disconnect', () => {
        // Encontrar e remover o jogador de todos os lobbies
        for (const [roomCode, lobby] of lobbies) {
            const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = lobby.players[playerIndex];
                lobby.players.splice(playerIndex, 1);

                io.to(roomCode).emit('systemMessage', `${player.username} disconnected.`);
                updateLobby(roomCode);

                // Se o lobby ficar vazio, removê-lo
                if (lobby.players.length === 0) {
                    lobbies.delete(roomCode);
                }

                break;
            }
        }
    });

    // Handle game start with timer
    // Add this near the top with other game state variables
    const gameTimers = new Map();

    // Replace the existing game start/round handlers with these:

    // Handle game start
    socket.on('startGameWithTimer', (roomCode) => {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;

        // Clear any existing timer
        if (gameTimers.has(roomCode)) {
            clearInterval(gameTimers.get(roomCode));
            gameTimers.delete(roomCode);
        }

        // Initialize game state
        const gameState = {
            currentRound: 1,
            totalRounds: lobby.settings.rounds || 5,
            timePerRound: lobby.settings.drawTime || 60,
            isGameActive: true
        };

        // Notify all players
        io.to(roomCode).emit('gameStarted', {
            rounds: gameState.totalRounds,
            ideaTime: gameState.timePerRound
        });

        // Start the first round
        startRound(roomCode, gameState);
    });

    function startRound(roomCode, gameState) {
        let timeRemaining = gameState.timePerRound;

        // Update clients immediately
        io.to(roomCode).emit('nextRound', {
            roundNumber: gameState.currentRound,
            timeRemaining: timeRemaining
        });

        // Start the timer
        const timer = setInterval(() => {
            timeRemaining--;

            // Update all clients
            io.to(roomCode).emit('updateTimer', timeRemaining);

            if (timeRemaining <= 0) {
                clearInterval(timer);
                gameTimers.delete(roomCode);
                endRound(roomCode, gameState);
            }
        }, 1000);

        gameTimers.set(roomCode, timer);
    }

    function endRound(roomCode, gameState) {
        // Notify clients round ended
        io.to(roomCode).emit('roundEnded');

        if (gameState.currentRound < gameState.totalRounds) {
            // Prepare next round
            gameState.currentRound++;

            // Start next round after delay
            setTimeout(() => {
                startRound(roomCode, gameState);
            }, 5000); // 5 second delay between rounds
        } else {
            // Game over
            io.to(roomCode).emit('gameOver');
        }
    }

    // Function to end the game
    function endGame(roomCode) {
        const room = gameRooms[roomCode];
        if (!room) return;

        clearInterval(room.gameState.timer);
        room.gameState.isGameActive = false;

        // Notify clients the game is over
        io.to(roomCode).emit('gameOver');

        // Clean up after some time
        setTimeout(() => {
            delete gameRooms[roomCode];
        }, 60000); // Keep game data for 1 minute after game ends
    }

    // Handle player response submissions
    socket.on('submitResponse', ({ roomCode, userId, response }) => {
        const room = gameRooms[roomCode];
        if (!room) return;

        // Store the response
        if (!room.gameState.responses) {
            room.gameState.responses = {};
        }
        room.gameState.responses[userId] = response;

        // Notify other players (optional)
        io.to(roomCode).emit('playerResponded', { userId });
    });

    // Handle early round completion (if players finish before time)
    socket.on('allPlayersReady', (roomCode) => {
        const room = gameRooms[roomCode];
        if (!room || !room.gameState.isGameActive) return;

        // End round early if all players have submitted responses
        clearInterval(room.gameState.timer);
        endRound(roomCode);
    });

    // Função auxiliar para atualizar o estado do lobby para todos os jogadores
    function updateLobby(roomCode) {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;

        io.to(roomCode).emit('updateLobby', {
            players: lobby.players,
            maxPlayers: lobby.maxPlayers, // Certifique-se que está enviando isso
            settings: lobby.settings
        });
    }
});

const port = 3000;
server.listen(port, (err) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Server listening on PORT", port);
        console.log(`http://localhost:${port}`);
    }
});

// Redirecionar para a página de introdução do lobby
app.get('/play', (req, res) => {
    res.redirect('/lobby/intro');
});
