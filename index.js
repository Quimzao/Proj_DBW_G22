// Import required modules and dependencies
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

// Setup __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize game timers map
const gameTimers = new Map();

// Express app configuration
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// MongoDB connection setup
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

// Session and authentication configuration
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

// Import and use route modules
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

import historyRoutes from './routes/historyRoutes.js';
app.use('/history', historyRoutes);

// Route for the game intro page
app.get('/intro', (req, res) => {
    res.render('game-intro', { user: req.user || {} });
});

import profileRoutes from "./routes/profileRoutes.js";
app.use("/profile", profileRoutes);

// Create HTTP server and Socket.io server
const server = http.createServer(app);
const io = new Server(server);

// API endpoint to check if a lobby exists
app.get('/api/lobby/exists', (req, res) => {
    const roomCode = req.query.code;
    const exists = lobbies.has(roomCode);

    res.json({
        exists: exists,
        roomCode: roomCode
    });
});

// In-memory storage for lobbies and game rooms
const lobbies = new Map();
const gameRooms = {};
const storyVotes = {};// { roomCode: { userId: { up: 0, down: 0 } } }

// Helper function to generate random prompts for the game
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

// Socket.io connection handler for real-time game logic
io.on("connection", function (socket) {
    console.log(`user connected: ${socket.id}`);

    // Handle joining a lobby
    socket.on('joinLobby', ({ roomCode, user }) => {
        if (!lobbies.has(roomCode)) {
            // Create new lobby if it doesn't exist
            lobbies.set(roomCode, {
                players: [],
                maxPlayers: 12,
                settings: {
                    rounds: 5,
                    drawTime: 60,
                    private: true
                },
                createdAt: new Date()
            });
        }

        const lobby = lobbies.get(roomCode);

        // Check if player is already in the lobby
        const existingPlayer = lobby.players.find(p => p.userId === user.id);
        if (existingPlayer) {
            existingPlayer.id = socket.id;
            socket.join(roomCode); 
            updateLobby(roomCode);
            return;
        }

        // Check if lobby is full
        if (lobby.players.length >= lobby.maxPlayers) {
            socket.emit('lobbyFull');
            return;
        }

        // Add player to lobby
        const player = {
            id: socket.id,
            userId: user.id,
            username: user.username,
            profilePicture: user.profilePicture || '/images/default-avatar.png',
            ready: false
        };

        lobby.players.push(player);
        socket.join(roomCode);

        updateLobby(roomCode);

        // Notify all players in the lobby
        io.to(roomCode).emit('systemMessage', `${user.username} joined the lobby.`);
    });

    // Handle toggling ready status
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

    // Handle leaving the lobby
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

            // Remove lobby if empty
            if (lobby.players.length === 0) {
                lobbies.delete(roomCode);
            }
        }
    });

    // Handle updating lobby settings (only host can change)
    socket.on('updateSettings', ({ roomCode, settings }) => {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;

        // Only the host can change settings
        if (lobby.players.length > 0 && lobby.players[0].id === socket.id) {
            // Merge settings, including problem
            lobby.settings = { ...lobby.settings, ...settings };
            updateLobby(roomCode);
        }
    });

    // Handle sending chat messages in the lobby
    socket.on('sendMessage', ({ roomCode, message, user }) => {
        // Send to all except sender
        socket.to(roomCode).emit('newMessage', {
            username: user.username,
            message: message,
            isSelf: false
        });

        // Send to sender with isSelf=true
        socket.emit('newMessage', {
            username: 'You',
            message: message,
            isSelf: true
        });
    });

    // Handle starting the game (only host can start)
    socket.on('startGame', (data, callback) => {
        const { roomCode, timePerRound, problem } = data; // Extract problem from data
        const lobby = lobbies.get(roomCode);

        if (!lobby) {
            callback({ success: false, message: 'Lobby not found' });
            return;
        }

        // Only host can start
        if (lobby.players.length === 0 || lobby.players[0].id !== socket.id) {
            callback({ success: false, message: 'Only the room creator can start the game' });
            return;
        }

        // Verify if all players are ready
        const allReady = lobby.players.every(player => player.ready);
        if (!allReady) {
            const notReadyPlayers = lobby.players.filter(p => !p.ready).map(p => p.username);
            callback({
                success: false,
                message: `The following players are not ready: ${notReadyPlayers.join(', ')}`
            });
            return;
        }

        // Verify minimum number of players
        if (lobby.players.length < 2) {
            callback({ success: false, message: 'Need at least 2 players to start' });
            return;
        }

        // Initialize game room if not exists
        if (!gameRooms[roomCode]) {
            gameRooms[roomCode] = {
                players: [],
                chatHistory: [],
                gameState: {
                    status: 'waiting',
                    currentRound: 0,
                    totalRounds: 5,
                    timePerRound: timePerRound || lobby.settings.drawTime || 60,
                    prompts: generatePrompts(5),
                    responses: {},
                    responseChain: []
                }
            };
        }

        const room = gameRooms[roomCode];
        room.problem = problem || ''; // Use the problem from the client
        callback({ success: true });

        // Notify all players to redirect to game
        io.to(roomCode).emit('redirectToGame', { roomCode });

        // Pass problem to game room
        gameRooms[roomCode].problem = problem || '';

        // Emit to all sockets in the room to start game with timer
        io.to(roomCode).emit('startGameWithTimer', roomCode);
    });

    // Handle request for lobby players (for not-ready popup)
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

    // Handle request for chat history (not implemented)
    socket.on('getChatHistory', (roomCode, callback) => {
        callback([]);
    });

    // Handle player response submission (for game rounds)
    socket.on('submitResponse', ({ roomCode, userId, response }) => {
        // Log response for debugging
        console.log(`Player ${userId} submitted response: ${response}`);
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
                    timePerRound: room.gameState.timePerRound || 60,
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

    // Handle sending chat messages in the game room
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

            // Send to sender with type 'self'
            socket.emit('newMessage', {
                ...chatMessage,
                sender: 'You',
                type: 'self'
            });
        }
    });

    // Helper function to update game room state for all players
    function updateGameRoom(roomCode) {
        const room = gameRooms[roomCode];
        if (!room) return;

        io.to(roomCode).emit('updatePlayers', room.players);
        io.to(roomCode).emit('updateChat', room.chatHistory);
    }
    socket.on('disconnect', () => {
        // Handle player disconnects: remove from lobbies and update state
        for (const [roomCode, lobby] of lobbies) {
            const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = lobby.players[playerIndex];
                lobby.players.splice(playerIndex, 1);

                io.to(roomCode).emit('systemMessage', `${player.username} disconnected.`);
                updateLobby(roomCode);

                if (lobby.players.length === 0) {
                    lobbies.delete(roomCode);
                }

                break;
            }
        }
    });

    // Handle game start with timer
    const gameTimers = new Map();


    // Handle game start
    socket.on('startGameWithTimer', (roomCode) => {
        const room = gameRooms[roomCode];
        if (!room) return;

        // Custom round prompts
        const roundPrompts = [
            "Give a title for your solution",
            "What is a solution to the problem?",
            "Give a radical solution",
            "How can we implement the solution?",
            "What difficulties might come from the solution?"
        ];

        room.gameState = {
            status: 'playing',
            currentRound: 1,
            totalRounds: 5,
            timePerRound: room.gameState.timePerRound || 60,
            prompts: roundPrompts,
            responses: {},
            responseChain: [],
            problem: room.problem || ''
        };

        io.to(roomCode).emit('gameStarted', {
            rounds: 5,
            ideaTime: room.gameState.timePerRound,
            problem: room.problem || ''
        });

        startRound(roomCode);
    });

    // Voting logic for stories
    socket.on('voteStory', ({ roomCode, userId, vote }) => {
        if (!storyVotes[roomCode]) {
            storyVotes[roomCode] = {};
        }
        if (!storyVotes[roomCode][userId]) {
            storyVotes[roomCode][userId] = { up: 0, down: 0 };
        }

        const voterId = socket.id; 

        // Track previous votes to prevent double voting
        if (!storyVotes[roomCode][userId].voters) {
            storyVotes[roomCode][userId].voters = {};
        }

        // Remove previous vote if exists
        if (storyVotes[roomCode][userId].voters[voterId]) {
            const previousVote = storyVotes[roomCode][userId].voters[voterId];
            storyVotes[roomCode][userId][previousVote]--;
        }

        // Register new vote
        storyVotes[roomCode][userId][vote]++;
        storyVotes[roomCode][userId].voters[voterId] = vote;

        // Update all players with new vote counts
        io.to(roomCode).emit('updateVotes', {
            userId,
            upvotes: storyVotes[roomCode][userId].up,
            downvotes: storyVotes[roomCode][userId].down
        });
    });

    socket.on('updateVotes', ({ userId, upvotes, downvotes }) => {
        // Update vote counts in UI
        const playerStory = document.querySelector(`.player-story[data-user-id="${userId}"]`);
        if (playerStory) {
            playerStory.querySelector('.vote-count[data-type="up"]').textContent = upvotes;
            playerStory.querySelector('.vote-count[data-type="down"]').textContent = downvotes;
        }

        // Update leaderboard in gameState if it exists
        if (gameState.leaderboard) {
            const playerIndex = gameState.leaderboard.findIndex(p => p.userId === userId);
            if (playerIndex !== -1) {
                gameState.leaderboard[playerIndex].upvotes = upvotes;
                gameState.leaderboard[playerIndex].downvotes = downvotes;
                gameState.leaderboard[playerIndex].score = upvotes - downvotes;

                // Re-sort leaderboard
                gameState.leaderboard.sort((a, b) => b.score - a.score);
            }
        }
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
            totalRounds: room.gameState.totalRounds,
            problem: room.gameState.problem // Send the problem
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

    async function endGame(roomCode) {
        const room = gameRooms[roomCode];
        if (!room) return;

        room.gameState.status = 'finished';

        if (!storyVotes[roomCode]) {
            storyVotes[roomCode] = {};
        }

        const playerStories = {};
        const playerScores = {};
        const axios = (await import('axios')).default;

        // Prepare all player prompts
        const playerPrompts = room.players.map(player => {
            if (!storyVotes[roomCode][player.userId]) {
                storyVotes[roomCode][player.userId] = { up: 0, down: 0 };
            }

            const responses = room.gameState.responseChain.map(round => {
                const response = round.responses.find(r => r.userId === player.userId);
                return response && response.response !== "[SKIPPED]" ? response.response : null;
            }).filter(Boolean);

            if (responses.length === 0) {
                playerStories[player.userId] = "No responses submitted.";
                return;
            }
            return {
                userId: player.userId,
                username: player.username,
                prompt: `Write a creative and entertaining paragraph based on these responses from ${player.username}:\n\n` +
                    responses.map((r, i) => `Round ${i + 1}: ${r}`).join('\n') +
                    `\n\nMake it coherent and fun.`
            };
        });

        // Generate stories in parallel
        await Promise.all(
            playerPrompts
                .filter(Boolean)
                .map(async ({ userId, username, prompt }) => {
                    try {
                        const response = await axios.post('http://localhost:3000/chat', { prompt });
                        let story;
                        if (response.data.success) {
                            story = response.data.choices[0].message.content;
                            playerStories[userId] = story;
                        } else {
                            story = "Failed to generate story.";
                            playerStories[userId] = story;
                        }

                        // Get upvotes/downvotes
                        const votes = storyVotes[roomCode][userId] || { up: 0, down: 0 };

                        // Calculate score
                        playerScores[userId] = {
                            username: username,
                            score: votes.up - votes.down,
                            upvotes: votes.up,
                            downvotes: votes.down,
                            userId: userId
                        };

                        // Save to user history
                        await user.findOneAndUpdate(
                            { _id: userId },
                            {
                                $push: {
                                    gameHistory: {
                                        date: new Date(),
                                        roomCode,
                                        prompt,
                                        generatedText: story,
                                        upvotes: votes.up,
                                        downvotes: votes.down,
                                        score: votes.up - votes.down
                                    }
                                }
                            }
                        );
                    } catch (err) {
                        console.error('Error generating story:', err);
                        playerStories[userId] = "Failed to generate story.";
                        playerScores[userId] = {
                            username: username,
                            score: 0,
                            upvotes: 0,
                            downvotes: 0,
                            userId: userId
                        };
                    }
                })
        );

        // Sort players by score
        const sortedPlayers = Object.values(playerScores)
            .sort((a, b) => b.score - a.score);

        room.gameState.playerStories = playerStories;
        room.gameState.leaderboard = sortedPlayers;

        io.to(roomCode).emit('gameFinished', {
            playerStories,
            leaderboard: sortedPlayers,
            votes: storyVotes[roomCode] // Send current votes
        });
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

    // Handle player leaving the game
    function updateLobby(roomCode) {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;

        io.to(roomCode).emit('updateLobby', {
            players: lobby.players,
            maxPlayers: lobby.maxPlayers, // Confirm max players
            settings: lobby.settings,
            hostId: lobby.players[0]?.id
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

        // Custom round prompts
        const roundPrompts = [
            "Give a title for your solution",
            "What is a solution to the problem?",
            "Give a radical solution",
            "How can we implement the solution?",
            "What difficulties might come from the solution?"
        ];

        room.gameState = {
            status: 'playing',
            currentRound: 1,
            totalRounds: 5,
            timePerRound: room.gameState.timePerRound || 60,
            prompts: roundPrompts,
            responses: {},
            responseChain: []
        };

        io.to(roomCode).emit('gameStarted', {
            rounds: 5,
            ideaTime: room.gameState.timePerRound,
            problem: room.problem || ''
        });

        startRound(roomCode);
    }

    // Function to check if all players have completed the round
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

    // Function to handle next round
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

        room.gameState.currentRound++;
        room.gameState.responses = {};

        startRound(roomCode);
    }


});

// Start the server on port 3000
const port = 3000;
server.listen(port, (err) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Server listening on PORT", port);
        console.log(`http://localhost:${port}`);
    }
});

// Redirect /play to the lobby intro page
app.get('/play', (req, res) => {
    res.redirect('/lobby/intro');
});

// Endpoint to generate a story using all player responses and LM Studio controller
app.post('/generate-story', async (req, res) => {
    try {
        const { roomCode } = req.body;
        const room = gameRooms[roomCode];

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        const problemText = room.gameState.problem ? `Problem: ${room.gameState.problem}\n\n` : '';


        // Format all responses for the prompt
        const allResponses = room.gameState.responseChain.map(round =>
            `Round ${round.round}:\n${round.responses.map(r => `- ${r.username}: ${r.response}`).join('\n')
            }`
        ).join('\n\n');

        const prompt = `${problemText}Create a  structured text to solve the problem using these ideas:\n\n${allResponses}\n\nMake it coherent and make one for each players responses.`;

        // Use the LM Studio controller to generate the story
        req.body = { prompt }; 
        await handleChatCompletion(req, res);

    } catch (error) {
        console.error('Error generating story:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate story',
            error: error.message
        });
    }
});

// Endpoint to save game history for all players after a game
app.post('/save-history', async (req, res) => {
    try {
        const { roomCode } = req.body;
        const room = gameRooms[roomCode];
        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

        // Save each player's story to their history
        for (const player of room.players) {
            const userId = player.userId;
            const story = room.gameState.playerStories?.[userId] || "No story generated.";
            const votes = (storyVotes[roomCode] && storyVotes[roomCode][userId]) || { up: 0, down: 0 };
            const prompt = room.gameState.prompts ? room.gameState.prompts.join('\n') : '';

            await User.findOneAndUpdate(
                { _id: userId },
                {
                    $push: {
                        gameHistory: {
                            date: new Date(),
                            roomCode,
                            prompt,
                            generatedText: story,
                            upvotes: votes.up,
                            downvotes: votes.down
                        }
                    }
                }
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving game history:', err);
        res.status(500).json({ success: false, message: 'Failed to save history' });
    }
});