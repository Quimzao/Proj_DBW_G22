import express from "express"; 
const app = express();
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import homeRoutes from './routes/homeRoutes.js';
import formRoutes from "./routes/formRoute.js";
app.use("/bookForm", formRoutes);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

app.set("view engine", "ejs"); //método para configurar a nossa view engine para “ejs”
app.use(express.static(__dirname + "/public")); //é uma função middleware no framework Express.js para Node.js que serve arquivos estáticos, como imagens, arquivos CSS e JavaScript.
app.use(express.urlencoded({ extended: true })); //é uma função middleware do Express.js que é usada para analisar dados de formulários HTML que são enviados para o servidor.

app.use("/", homeRoutes);

app.listen(3000, (err) => {
    if (err)
    console.error(err);
    else
    console.log("Server listening on PORT", 3000);
    });