const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Página principal
app.get("/", (req, res) => {
  res.send("Asistente IA WhatsApp funcionando correctamente.");
});

// Verificación del webhook de Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Enviar mensaje por WhatsApp
async function enviarMensajeWhatsApp(numero, texto) {
  try {
    const respuesta = await fetch(
      `https://graph.facebook.com/v26.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: numero,
          type: "text",
          text: {
            body: texto
          }
        })
      }
    );

    const resultado = await respuesta.json();

    console.log("Respuesta de Meta:", JSON.stringify(resultado, null, 2));

  } catch (error) {
    console.error("Error enviando mensaje:", error);
  }
}

// Recibir mensajes de WhatsApp
app.post("/webhook", async (req, res) => {

  console.log(
    "Mensaje recibido:",
    JSON.stringify(req.body, null, 2)
  );

  // Respondemos inmediatamente a Meta
  res.sendStatus(200);

  try {
    const cambio = req.body?.entry?.[0]?.changes?.[0]?.value;
    const mensaje = cambio?.messages?.[0];

    if (!mensaje) {
      return;
    }

    const numeroUsuario = mensaje.from;

    if (mensaje.type === "text") {

      const textoRecibido = mensaje.text?.body || "";

      console.log("Mensaje del usuario:", textoRecibido);
      console.log("Número del usuario:", numeroUsuario);

      await enviarMensajeWhatsApp(
        numeroUsuario,
        "Hola 👋 Soy el asistente virtual. Recibí tu mensaje correctamente. Pronto podré ayudarte automáticamente."
      );
    }

  } catch (error) {
    console.error("Error procesando mensaje:", error);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
