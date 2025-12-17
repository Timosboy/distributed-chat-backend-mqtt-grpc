import "dotenv/config";
import { connectMQTT } from "./mqtt.js";
import { callAI } from "./ai.js";
import { sendCallback } from "./grpcClient.js";

const WORKER_ID = process.env.WORKER_ID;
const client = connectMQTT(process.env.MQTT_BROKER);

/* REGISTRO */
client.on("connect", () => {
  const payload = {
    workerId: WORKER_ID,
    status: "idle",
    timestamp: Date.now()
  };

  client.publish("upb/workers/register", JSON.stringify(payload));
  client.subscribe("upb/workers/tasks");
});

/* RECEPCIÓN DE TAREAS */
client.on("message", async (topic, message) => {
  if (topic !== "upb/workers/tasks") return;

  const task = JSON.parse(message.toString());

  if (task.workerId !== WORKER_ID) return;

  console.log("📥 Tarea recibida:", task);

  /* BUSY */
  client.publish("upb/workers/status", JSON.stringify({
    workerId: WORKER_ID,
    status: "busy"
  }));

  /* IA */
  const aiResponse = await callAI(task.query);

  /* SIMULAR DELAY */
  await new Promise(r => setTimeout(r, 5000));

  /* CALLBACK gRPC */
  await sendCallback(task.grpcCallback, {
    workerId: WORKER_ID,
    sessionId: task.sessionId,
    query: task.query,
    result: aiResponse,
    apiKey: "",
    duration: 5000,
    timestamp: task.timestamp
  });

  /* IDLE */
  client.publish("upb/workers/status", JSON.stringify({
    workerId: WORKER_ID,
    status: "idle"
  }));
});
