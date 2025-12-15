const mqtt = require("mqtt");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
// const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const uuidv4 = () => crypto.randomUUID();
const express = require("express");

const fs = require("fs");

let mqttClient = null;

// Configuración
const MQTT_BROKER = "mqtt://mosquitto:1883";
// const MQTT_BROKER = "mqtt://localhost:21702";
// const MQTT_BROKER = "mqtt://127.0.0.1:1883";
const GRPC_PORT = "0.0.0.0:50051";

// Estados en memoria
const workers = {};
const sessions = {};

// MQTT

function connectMQTT() {
  console.log("Intentando conectar a MQTT...");

  mqttClient = mqtt.connect(MQTT_BROKER, {
    reconnectPeriod: 2000,
    connectTimeout: 5000,
  });

  mqttClient.on("error", (err) => {
    console.error("Error MQTT:", err.message);
  });

  mqttClient.on("offline", () => {
    console.error("TT offline");
  });

  mqttClient.on("reconnect", () => {
    console.log("Reintentando conexión MQTT...");
  });

  mqttClient.on("connect", () => {
    console.log("Master conectado a MQTT");

    mqttClient.subscribe("upb/workers/register");
    mqttClient.subscribe("upb/workers/status");
  });

  mqttClient.on("message", (topic, message) => {
    const data = JSON.parse(message.toString());

    if (topic === "upb/workers/register") {
      workers[data.workerId] = { status: "idle", lastSeen: Date.now() };
      log(`Worker registrado: ${data.workerId}`);
    }

    if (topic === "upb/workers/status") {
      if (workers[data.workerId]) {
        workers[data.workerId].status = data.status;
        workers[data.workerId].lastSeen = Date.now();
      }
    }
  });
}

// gRPC
const protoPath = __dirname + "/../proto/callback.proto";
const packageDef = protoLoader.loadSync(protoPath);
const grpcObj = grpc.loadPackageDefinition(packageDef);
const callbackPackage = grpcObj.callback;

function SendResult(call, callback) {
  const data = call.request;

  sessions[data.sessionId] = {
    ...sessions[data.sessionId],
    result: data.result,
    workerId: data.workerId,
    status: "done",
  };

  log(`Resultado recibido de ${data.workerId} para sesión ${data.sessionId}`);

  callback(null, { message: "ACK" });
}

const grpcServer = new grpc.Server();
grpcServer.addService(callbackPackage.CallbackService.service, { SendResult });

grpcServer.bindAsync(
  GRPC_PORT,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("Error al bindear gRPC:", err);
      return;
    }
    console.log(`gRPC server activo en puerto ${port}`);
    // NO llamar a start()
  }
);

// API para UI
const app = express();
app.use(express.json());

app.post("/query", (req, res) => {
  const sessionId = uuidv4();
  const query = req.body.query;

  sessions[sessionId] = { query, status: "pending" };
  assignTask(sessionId, query);

  res.json({ sessionId });
});

app.get("/result/:id", (req, res) => {
  res.json(sessions[req.params.id] || {});
});

app.listen(3000, () => {
  console.log("API HTTP en puerto 3000");

  // Conectar a MQTT con delay (Swarm-friendly)
  setTimeout(() => {
    connectMQTT();
  }, 5000);
});

// Scheduler
function assignTask(sessionId, query) {
  const workerId = Object.keys(workers).find(
    (w) => workers[w].status === "idle"
  );

  if (!workerId) {
    log("No hay workers libres");
    return;
  }

  workers[workerId].status = "busy";

  const task = {
    workerId,
    sessionId,
    query,
    model: "gpt-4.1-mini",
    grpcCallback: "master:50051",
    timestamp: Date.now(),
  };

  mqttClient.publish("upb/workers/tasks", JSON.stringify(task));
  log(`Tarea enviada a ${workerId}`);
}

// Logs
function log(msg) {
  console.log(msg);
  mqttClient.publish("upb/logs", msg);
}
