import express from "express";
import mongoose from "mongoose"; // Use import instead of require
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url";
import mainRoutes from "./routes/mainRoutes.js";
import loginRoutes from "./routes/loginRoutes.js";
import signupRoutes from "./routes/signupRoutes.js";
import lobbyinicialRoutes from "./routes/lobbyinicialRoutes.js";
import lobbyfinderRoutes from "./routes/lobbyfinderRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use("/", mainRoutes);
app.use("/signup", signupRoutes);
app.use("/login", loginRoutes);
app.use("/lobbyinicial", lobbyinicialRoutes);
app.use("/lobbyfinder", lobbyfinderRoutes);
app.use(methodOverride("_method"));

app.listen(5000, (err) => {
    if (err) console.error(err);
    else console.log("Server listening on PORT", 5000);
});

mongoose
    .connect(
        "mongodb+srv://mongo:hOpUEjD1mVlOUogx@testdb.quoisku.mongodb.net/?retryWrites=true&w=majority",
        { useUnifiedTopology: true, useNewUrlParser: true }
    )
    .then(() => {
        console.log("Connected");
    })
    .catch((err) => {
        console.log(err);
    });
