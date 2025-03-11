import express from "express"; 
const app = express();
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import mainRoutes from './routes/mainRoutes.js';
import loginRoutes from './routes/loginRoutes.js';
import signupRoutes from './routes/signupRoutes.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

app.set("view engine", "ejs"); //método para configurar a nossa view engine para “ejs”
app.use(express.static(__dirname + "/public")); //é uma função middleware no framework Express.js para Node.js que serve arquivos estáticos, como imagens, arquivos CSS e JavaScript.
app.use(express.urlencoded({ extended: true })); //é uma função middleware do Express.js que é usada para analisar dados de formulários HTML que são enviados para o servidor.
app.use("/", mainRoutes); //é uma função middleware do Express.js que é usada para analisar dados de formulários HTML que são enviados para o servidor.
app.use("/signup", signupRoutes); //é uma função middleware do Express.js que é usada para analisar dados de formulários HTML que são enviados para o servidor.
app.use("/login", loginRoutes); //é uma função middleware do Express.js que é usada para analisar dados de formulários HTML que são enviados para o servidor.

app.listen(3000, (err) => {
    if (err)
    console.error(err);
    else
    console.log("Server listening on PORT", 3000);
    });