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

import { handleChatCompletion } from "./controllers/chatController.js";

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

function generatePrompts(count) {
    const prompts = [
        "Describe the weirdest invention you can imagine",
        "Write the opening line of a bizarre novel",
        "What would aliens think is our weirdest tradition?",
        "Invent a holiday that doesn't exist (but should)",
        "Create the worst possible social media feature",
        "Describe a world where one ridiculous thing is normal",
        "Write a funny job description for an unusual profession",
        "What would be the most useless superpower?",
        "Invent a ridiculous law that everyone must follow",
        "Describe a meal that would disgust everyone"
    ];
    
    // Shuffle and select the requested number
    return prompts.sort(() => 0.5 - Math.random()).slice(0, count);
}

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
    
        // Verificar se é o criador da sala
        if (lobby.players.length === 0 || lobby.players[0].id !== socket.id) {
            callback({ success: false, message: 'Only the room creator can start the game' });
            return;
        }
    
        // Verificar se todos estão prontos
        const allReady = lobby.players.every(player => player.ready);
        if (!allReady) {
            const notReadyPlayers = lobby.players.filter(p => !p.ready).map(p => p.username);
            callback({
                success: false,
                message: `The following players are not ready: ${notReadyPlayers.join(', ')}`
            });
            return;
        }
    
        // Verificar número mínimo de jogadores
        if (lobby.players.length < 2) {
            callback({ success: false, message: 'Need at least 2 players to start' });
            return;
        }
    
        callback({ success: true });
    
        // Emitir evento para todos os jogadores na sala para redirecionar
        io.to(roomCode).emit('redirectToGame', { roomCode });
    
        // Iniciar o jogo
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
        
        // Initialize room if it doesn't exist
        if (!gameRooms[roomCode]) {
            gameRooms[roomCode] = {
                players: [],
                chatHistory: [],
                gameState: {
                    status: 'waiting',
                    currentRound: 0,
                    totalRounds: 5,
                    timePerRound: 60,
                    prompts: generatePrompts(5),
                    responses: {},
                    responseChain: []
                }
            };
        }
        
        const room = gameRooms[roomCode];
        
        // Add player if not already in room
        if (!room.players.some(p => p.userId === user.id)) {
            room.players.push({
                id: socket.id,
                userId: user.id,
                username: user.username,
                profilePicture: user.profilePicture,
                status: 'waiting'
            });
        }
        
        updateGameRoom(roomCode);
        checkStartGame(roomCode);
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
        if (!room) return;
        
        io.to(roomCode).emit('updatePlayers', room.players);
        io.to(roomCode).emit('updateChat', room.chatHistory);
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
        const room = gameRooms[roomCode];
        if (!room) return;
        
        room.gameState = {
            status: 'playing',
            currentRound: 1,
            totalRounds: 5,
            timePerRound: 60,
            prompts: generatePrompts(5), // Gerar prompts para o jogo
            responses: {},
            responseChain: []
        };
        
        io.to(roomCode).emit('gameStarted', {
            rounds: 5,
            ideaTime: 60
        });
        
        startRound(roomCode);
    });
    

    function startRound(roomCode) {
        const room = gameRooms[roomCode];
        if (!room || room.gameState.status !== 'playing') return;
    
        // Clear any existing timer
        if (room.gameState.timer) {
            clearInterval(room.gameState.timer);
        }
    
        room.gameState.responses = {};
        const currentPrompt = room.gameState.prompts[room.gameState.currentRound - 1];
        
        io.to(roomCode).emit('newRound', {
            round: room.gameState.currentRound,
            prompt: currentPrompt,
            totalRounds: room.gameState.totalRounds
        });
    
        // Start timer
        let timeRemaining = room.gameState.timePerRound;
        io.to(roomCode).emit('updateTimer', timeRemaining);
        
        room.gameState.timer = setInterval(() => {
            timeRemaining--;
            io.to(roomCode).emit('updateTimer', timeRemaining);
            
            if (timeRemaining <= 0) {
                clearInterval(room.gameState.timer);
                // Mark non-responders
                room.players.forEach(player => {
                    if (room.gameState.responses[player.userId] === undefined) {
                        room.gameState.responses[player.userId] = "[NO RESPONSE]";
                    }
                });
                checkRoundCompletion(roomCode);
            }
        }, 1000);
    }
    

    function endRound(roomCode) {
        const room = gameRooms[roomCode];
        if (!room || room.gameState.status !== 'playing') return;
        
        // Collect responses
        const responses = room.players.map(player => ({
            username: player.username,
            response: room.gameState.responses[player.userId] || "[No response]"
        }));
        
        // Add to response chain
        room.gameState.responseChain.push({
            round: room.gameState.currentRound,
            prompt: room.gameState.prompts[room.gameState.currentRound - 1],
            responses: responses
        });
        
        io.to(roomCode).emit('roundEnded', responses);
        
        // Check if game is over
        if (room.gameState.currentRound >= room.gameState.totalRounds) {
            endGame(roomCode);
        } else {
            // Prepare next round
            room.gameState.currentRound++;
            
            // Wait before starting next round
            setTimeout(() => {
                startRound(roomCode);
            }, 10000);
        }
    }
    
    socket.on('playerReady', ({ roomCode, userId }) => {
        const room = gameRooms[roomCode];
        if (!room) return;
        
        const player = room.players.find(p => p.userId === userId);
        if (player) {
            player.status = 'ready';
            updateGameRoom(roomCode);
            
            // Check if all players are ready
            if (room.players.every(p => p.status === 'ready')) {
                startRound(roomCode);
            }
        }
    });

    function endGame(roomCode) {
        const room = gameRooms[roomCode];
        if (!room) return;
    
        room.gameState.status = 'finished';
        io.to(roomCode).emit('gameFinished', room.gameState.responseChain);
    }

    // Handle player response submissions
    socket.on('submitResponse', ({ roomCode, userId, response }) => {
        const room = gameRooms[roomCode];
        if (!room || room.gameState.status !== 'playing') return;
        
        room.gameState.responses[userId] = response;
        io.to(roomCode).emit('playerResponded', { userId });
        
        // Check if all players have responded
        const allResponded = room.players.every(player => 
            room.gameState.responses[player.userId] !== undefined
        );
        
        if (allResponded) {
            clearInterval(room.gameState.timer);
            checkRoundCompletion(roomCode);
        }
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

    function checkStartGame(roomCode) {
        const room = gameRooms[roomCode];
        if (!room) return;
    
        if (room.players.length >= 2 && room.gameState.status === 'waiting') {
            room.gameState.status = 'starting';
            io.to(roomCode).emit('gameStarting');
            
            // Start game after 5 seconds
            setTimeout(() => {
                if (room.players.length >= 2) {
                    startGame(roomCode);
                } else {
                    room.gameState.status = 'waiting';
                    io.to(roomCode).emit('gameWaiting', 2 - room.players.length);
                }
            }, 5000);
        } else {
            io.to(roomCode).emit('gameWaiting', 2 - room.players.length);
        }
    }

    function startGame(roomCode) {
        const room = gameRooms[roomCode];
        if (!room) return;
        
        room.gameState = {
            status: 'playing',
            currentRound: 1,
            totalRounds: 5,
            timePerRound: 60,
            prompts: room.gameState.prompts,
            responses: {},
            responseChain: []
        };
        
        io.to(roomCode).emit('gameStarted', {
            rounds: 5,
            ideaTime: 60
        });
        
        startRound(roomCode);
    }

    // Adicione esta função para verificar respostas
    function checkRoundCompletion(roomCode) {
        const room = gameRooms[roomCode];
        if (!room || room.gameState.status !== 'playing') return;
    
        // Save round responses
        room.gameState.responseChain.push({
            round: room.gameState.currentRound,
            responses: room.players.map(player => ({
                userId: player.userId,
                username: player.username,
                response: room.gameState.responses[player.userId]
            }))
        });
    
        // Check if game is over
        if (room.gameState.currentRound >= room.gameState.totalRounds) {
            endGame(roomCode);
        } else {
            // Next round
            room.gameState.currentRound++;
            setTimeout(() => startRound(roomCode), 2000);
        }
    }

// Função para avançar para próxima rodada
function nextRound(roomCode) {
    const room = gameRooms[roomCode];
    if (!room) return;

    // Salva as respostas da rodada atual
    room.gameState.responseChain.push({
        round: room.gameState.currentRound,
        responses: room.players.map(player => ({
            userId: player.userId,
            username: player.username,
            response: room.gameState.responses[player.userId]
        }))
    });

    // Prepara próxima rodada
    room.gameState.currentRound++;
    room.gameState.responses = {};
    
    startRound(roomCode);
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

app.post('/generate-story', async (req, res) => {
    try {
        const { roomCode } = req.body;
        const room = gameRooms[roomCode];
        
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        // Formata todas as respostas para o prompt
        const allResponses = room.gameState.responseChain.map(round => 
            `Round ${round.round}:\n${
                round.responses.map(r => `- ${r.username}: ${r.response}`).join('\n')
            }`
        ).join('\n\n');

        const prompt = `Create a creative and funny story in English combining these ideas:\n\n${allResponses}\n\nMake it coherent and entertaining.`;
        
        // Usa o controller existente do LM Studio
        req.body = { prompt }; // Prepara o request para o controller
        await handleChatCompletion(req, res); // Chama diretamente o controller
        
    } catch (error) {
        console.error('Error generating story:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate story',
            error: error.message
        });
    }
});

