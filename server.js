const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Ruta principal para comprobar que el servidor está funcionando
app.get("/", (req, res) => {
  res.send("Asistente IA WhatsApp funcionando correctamente.");
});

// Verificación del webhook de Meta
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Recepción de mensajes de WhatsApp
app.post("/webhook", (req, res) => {
  console.log("Mensaje recibido:", JSON.stringify(req.body, null, 2));

  res.sendStatus(200);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
