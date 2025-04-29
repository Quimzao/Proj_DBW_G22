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

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

mongoose.set("debug", true);
const uri = "mongodb+srv://Quim:Euna0se!@cluster0.wbapltt.mongodb.net/?retryWrites=true&w=majority&appName=dbw";
const local_uri ="mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.4.2";
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

import lobbyinicialRoutes from "./routes/lobbyinicialRoutes.js";
app.use("/lobbyinicial", lobbyinicialRoutes);

import lobbyfinderRoutes from "./routes/lobbyfinderRoutes.js";
app.use("/lobbyfinder", lobbyfinderRoutes);

import getlobbyRoutes from "./routes/lobbyRoutes.js";
app.use("/lobby", getlobbyRoutes);

import userRouter from "./routes/userRoutes.js";
app.use(userRouter);

app.get('/intro', (req, res) => {
    res.render('game-intro'); // Certifique-se de que o arquivo EJS existe
});

import profileRoutes from "./routes/profileRoutes.js";
app.use("/profile", profileRoutes);
const server = http.createServer(app);
const io = new Server(server);

// Objeto para armazenar os lobbies
const lobbies = new Map();

io.on("connection", function (socket) {
    console.log(`user connected: ${socket.id}`);
    
    // Evento para entrar no lobby
    socket.on('joinLobby', ({ roomCode, user }) => {
        // Verificar se o lobby existe
        if (!lobbies.has(roomCode)) {
            // Criar novo lobby se não existir
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
        
        // Verificar se o lobby está cheio
        if (lobby.players.length >= lobby.maxPlayers) {
            socket.emit('lobbyFull');
            return;
        }
        
        // Verificar se o jogador já está no lobby
        const existingPlayer = lobby.players.find(p => p.id === socket.id);
        if (existingPlayer) {
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
        
        // Verificar se quem está tentando iniciar é o primeiro jogador
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
        
        // Notificar todos que o jogo está começando
        io.to(roomCode).emit('gameStarting', { 
            roomCode: roomCode,
            settings: lobby.settings
        });
    });
    
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
    
    // Função auxiliar para atualizar o estado do lobby para todos os jogadores
    function updateLobby(roomCode) {
        const lobby = lobbies.get(roomCode);
        if (!lobby) return;
        
        io.to(roomCode).emit('updateLobby', {
            players: lobby.players,
            playerCount: `${lobby.players.length}/${lobby.maxPlayers}`,
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
