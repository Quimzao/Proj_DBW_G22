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

import dashboardRoutes from "./routes/dashboardRouters.js";
app.use("/dashboard", dashboardRoutes);

import userRouter from "./routes/userRoutes.js";
app.use(userRouter);

const server = http.createServer(app);
const io = new Server(server);

io.on("connection", function (socket) {
    console.log(`user connected: ${socket.id}`);
    socket.on("chat", function (msg) {
        const paraCliente = {
            socketID: socket.id,
            mensagem: msg,
        };
        io.sockets.emit("clientChat", paraCliente);
    });
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
