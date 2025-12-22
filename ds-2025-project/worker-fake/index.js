const mqtt = require("mqtt");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// =====================
// Configuración
// =====================
const WORKER_ID = process.env.WORKER_ID || "worker-fake-1";
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://mosquitto:1883";
const GRPC_TARGET = process.env.GRPC_TARGET || "master:50051";

function emitLog(mqttClient, { sessionId, message }) {
  const entry = {
    sessionId,
    source: "worker",
    message,
    timestamp: Date.now(),
  };

  mqttClient.publish("upb/logs", JSON.stringify(entry));
}

// =====================
// MQTT
// =====================
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("✅ Worker fake conectado a MQTT");

  // Registrarse
  mqttClient.publish(
    "upb/workers/register",
    JSON.stringify({ workerId: WORKER_ID }),
    { retain: true, qos: 1 }
  );

  mqttClient.subscribe("upb/workers/tasks");
});

// =====================
// gRPC client
// =====================
const protoPath = __dirname + "/../master/proto/callback.proto";
const packageDef = protoLoader.loadSync(protoPath);
const grpcObj = grpc.loadPackageDefinition(packageDef);
const callbackPackage = grpcObj.callback;

const grpcClient = new callbackPackage.CallbackService(
  GRPC_TARGET,
  grpc.credentials.createInsecure()
);

// =====================
// Manejo de tareas
// =====================
mqttClient.on("message", async (topic, message) => {
  try {
    if (topic !== "upb/workers/tasks") return;

    const task = JSON.parse(message.toString());
    const { sessionId, query, workerId } = task;

    if (task.workerId !== WORKER_ID) return;

    emitLog(mqttClient, {
      sessionId,
      message: "Tarea recibida del Master, comenzando procesamiento...",
    });

    // Marcar busy
    mqttClient.publish(
      "upb/workers/status",
      JSON.stringify({ workerId: WORKER_ID, status: "busy" })
    );

    const start = Date.now();
    let result;
    const fs = require("fs");
    let apiKey = null;

    try {
      apiKey = fs.readFileSync("/run/secrets/openai_api_key", "utf8").trim();
      console.log("OpenAI API Key cargada desde Docker Secret");
    } catch (err) {
      console.error("No se pudo cargar la OpenAI API Key:", err.message);
    }

    emitLog(mqttClient, {
      sessionId,
      message: "Procesando consulta, esperando...",
    });

    result = await callOpenAI(apiKey, task.model, task.query);

    async function callOpenAI(apiKey, model, prompt) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model ?? "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`OpenAI HTTP ${r.status}: ${txt}`);
      }

      const data = await r.json();
      return data.choices?.[0]?.message?.content ?? "";
    }

    emitLog(mqttClient, {
      sessionId,
      message: "Resultado generado correctamente",
    });
    emitLog(mqttClient, {
      sessionId,
      message: "Enviado resultado de regreso al Master",
    });

    try {
      // (Opcional) simular un poquito de demora como el fake anterior
      await new Promise((res) => setTimeout(res, 2000));

      // Llamada real a OpenAI usando la apiKey que viene en la tarea MQTT
      result = await callOpenAI(apiKey, task.model, task.query);
    } catch (err) {
      result = `Error llamando a OpenAI: ${err?.message ?? String(err)}`;
      emitLog(mqttClient, {
        sessionId,
        message: `Error en worker: ${err.message}`,
      });
    }

    const duration = `${((Date.now() - start) / 1000).toFixed(2)}s`;

    // Callback gRPC al Master (misma estructura que tu proto)
    grpcClient.SendResult(
      {
        workerId: WORKER_ID,
        sessionId: task.sessionId,
        query: task.query,
        result,
        duration,
        timestamp: task.timestamp,
      },
      (err, response) => {
        if (err) {
          console.error("❌ Error gRPC:", err.message);
        } else {
          console.log(result);
          console.log("✅ Resultado enviado al Master:", response?.message);
        }

        // Marcar idle al final (haya o no error)
        mqttClient.publish(
          "upb/workers/status",
          JSON.stringify({ workerId: WORKER_ID, status: "idle" })
        );
      }
    );
  } catch (e) {
    console.error("❌ Error procesando mensaje:", e?.message ?? String(e));

    mqttClient.publish(
      "upb/workers/status",
      JSON.stringify({ workerId: WORKER_ID, status: "idle" })
    );
  }
});
