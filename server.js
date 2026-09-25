const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

    console.log(
      "Respuesta de Meta:",
      JSON.stringify(resultado, null, 2)
    );

  } catch (error) {
    console.error("Error enviando mensaje:", error);
  }
}

// Consultar a OpenAI
async function consultarOpenAI(textoUsuario) {
  try {
    const respuesta = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5",
          instructions:
            "Eres un asistente virtual amable, claro y útil que atiende clientes por WhatsApp. Responde en español. Sé breve y natural. No inventes información que no conozcas.",
          input: textoUsuario
        })
      }
    );

    const resultado = await respuesta.json();

    console.log(
      "Respuesta de OpenAI:",
      JSON.stringify(resultado, null, 2)
    );

    if (!respuesta.ok) {
      console.error("Error de OpenAI:", resultado);
      return "Disculpa, en este momento no puedo responder. Intenta nuevamente en unos minutos.";
    }

    if (resultado.output_text) {
      return resultado.output_text;
    }

    // Extraer texto si la respuesta viene dentro de output
    const textos = [];

    for (const elemento of resultado.output || []) {
      for (const contenido of elemento.content || []) {
        if (contenido.type === "output_text" && contenido.text) {
          textos.push(contenido.text);
        }
      }
    }

    if (textos.length > 0) {
      return textos.join("\n");
    }

    return "Disculpa, no pude generar una respuesta.";

  } catch (error) {
    console.error("Error conectando con OpenAI:", error);

    return "Disculpa, tuve un problema temporal. Intenta nuevamente.";
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
    const entrada = req.body.entry?.[0];
    const cambios = entrada?.changes?.[0];
    const valor = cambios?.value;
    const mensaje = valor?.messages?.[0];

    if (!mensaje) {
      return;
    }

    const numeroUsuario = mensaje.from;

    // Durante las pruebas solo aceptamos nuestro número
    if (numeroUsuario !== "51930887441") {
      console.log(
        "Mensaje ignorado. Número no autorizado:",
        numeroUsuario
      );
      return;
    }

    if (mensaje.type === "text") {

      const textoRecibido = mensaje.text?.body || "";

      console.log(
        "Mensaje del usuario:",
        textoRecibido
      );

      console.log(
        "Número del usuario:",
        numeroUsuario
      );

      // Consultar a OpenAI
      const respuestaIA = await consultarOpenAI(
        textoRecibido
      );

      console.log(
        "Respuesta de la IA:",
        respuestaIA
      );

      // Enviar respuesta de OpenAI a WhatsApp
      await enviarMensajeWhatsApp(
        numeroUsuario,
        respuestaIA
      );
    }

  } catch (error) {
    console.error(
      "Error procesando mensaje:",
      error
    );
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Servidor funcionando en el puerto ${PORT}`
  );
});
