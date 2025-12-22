const mqtt = require("mqtt");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const crypto = require("crypto");
const express = require("express");

const uuidv4 = () => crypto.randomUUID();

const MQTT_BROKER = "mqtt://mosquitto:1883";
const GRPC_ADDR = "0.0.0.0:50051";

const app = express();
app.use(express.json());

const workers = new Map();
const sessions = new Map();
const pendingQueue = [];

let mqttClient = null;

/* ===================== LOGS ===================== */

const sessionLogs = new Map();

function logEvent({ sessionId, source, message }) {
  if (!sessionId) {
    console.log(`[${source}] [system] ${message}`);
    return;
  }

  const entry = {
    sessionId,
    source,
    message,
    timestamp: Date.now(),
  };

  if (!sessionLogs.has(sessionId)) {
    sessionLogs.set(sessionId, []);
  }

  sessionLogs.get(sessionId).push(entry);

  console.log(`[${source}] [${sessionId}] ${message}`);
}

/* ===================== MQTT ===================== */

function connectMQTT() {
  mqttClient = mqtt.connect(MQTT_BROKER, {
    reconnectPeriod: 2000,
    connectTimeout: 5000,
  });

  mqttClient.on("connect", () => {
    console.log("Master conectado a MQTT");
    mqttClient.subscribe("upb/workers/register");
    mqttClient.subscribe("upb/workers/status");
    mqttClient.subscribe("upb/logs");
  });

  mqttClient.on("message", (topic, message) => {
    const data = JSON.parse(message.toString());

    if (topic === "upb/logs") {
      logEvent({
        sessionId: data.sessionId,
        source: data.source,
        message: data.message,
      });
    }

    if (topic === "upb/workers/register") {
      workers.set(data.workerId, {
        status: "idle",
        lastSeen: Date.now(),
      });
      logEvent({
        sessionId: null,
        source: "MQTT",
        message: `Worker registrado: ${data.workerId}`,
      });
      tryAssignTasks();
    }

    if (topic === "upb/workers/status") {
      if (workers.has(data.workerId)) {
        workers.get(data.workerId).status = data.status;
        workers.get(data.workerId).lastSeen = Date.now();
      }
    }
  });
}

/* ===================== gRPC ===================== */

const PROTO_PATH = "/app/proto/callback.proto";

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObj = grpc.loadPackageDefinition(packageDef);
const callbackPackage = grpcObj.callback;

function SendResult(call, callback) {
  const { sessionId, query, result, workerId } = call.request;

  if (sessions.has(sessionId)) {
    sessions.set(sessionId, {
      ...sessions.get(sessionId),
      status: "DONE",
      result,
    });
  }

  logEvent({
    sessionId,
    source: "master",
    message: `Resultado recibido de ${workerId}`,
  });

  if (workers.has(workerId)) {
    workers.get(workerId).status = "idle";
  }

  tryAssignTasks();
  callback(null, { message: "ACK" });
}

const grpcServer = new grpc.Server();
grpcServer.addService(callbackPackage.CallbackService.service, { SendResult });

grpcServer.bindAsync(GRPC_ADDR, grpc.ServerCredentials.createInsecure(), () =>
  console.log("gRPC activo en 50051")
);

/* ===================== HTTP API ===================== */

app.post("/query", (req, res) => {
  const id = uuidv4();
  const { query, userId } = req.body;
  const finalUserId = userId || "anonymous";

  sessions.set(id, {
    userId: finalUserId,
    status: "PENDING",
    result: null,
  });

  logEvent({
    sessionId: id,
    source: "master",
    message: `Consulta recibida del usuario ${finalUserId}`,
  });

  pendingQueue.push({
    sessionId: id,
    userId: finalUserId,
    query: req.body.query,
  });

  tryAssignTasks();
  res.json({ sessionId: id });
});

app.get("/result/:id", (req, res) => {
  if (!sessions.has(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }

  const session = sessions.get(req.params.id);
  res.json(session);
});

app.get("/logs/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  console.log("LOGS ENDPOINT CALLED FOR:", sessionId);
  console.log("SESSIONLOGS KEYS AT ENDPOINT:", [...sessionLogs.keys()]);

  res.json(sessionLogs.get(sessionId) || []);
});

app.listen(3000, () => {
  console.log("API HTTP en 3000");
  setTimeout(connectMQTT, 3000);
});

/* ===================== Scheduler ===================== */

function tryAssignTasks() {
  for (const [workerId, worker] of workers) {
    if (worker.status !== "idle") continue;
    if (pendingQueue.length === 0) break;

    const task = pendingQueue.shift();
    worker.status = "busy";

    sessions.get(task.sessionId).status = "RUNNING";

    logEvent({
      sessionId: task.sessionId,
      source: "master",
      message: `Tarea enviada a ${workerId} (user: ${task.userId})`,
    });

    sendTask(workerId, task.sessionId, task.userId, task.query);

    if (pendingQueue.length > 0 && !hasIdleWorker()) {
      logEvent({
        sessionId: pendingQueue[0].sessionId,
        source: "master",
        message: "No hay workers disponibles, tarea en cola",
      });
    }
  }
}

function sendTask(workerId, sessionId, userId, query) {
  const payload = {
    workerId,
    sessionId,
    userId,
    query,
    model: "gpt-4.1-mini",
    grpcCallback: "master:50051",
    timestamp: Date.now(),
  };

  mqttClient.publish("upb/workers/tasks", JSON.stringify(payload));
}

function hasIdleWorker() {
  for (const [, worker] of workers) {
    if (worker.status === "idle") return true;
  }
  return false;
}
