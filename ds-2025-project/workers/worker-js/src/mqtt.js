import mqtt from "mqtt";

export function connectMQTT(brokerUrl) {
  const client = mqtt.connect(brokerUrl);

  client.on("connect", () => {
    console.log("✅ Worker conectado a MQTT");
  });

  client.on("error", (err) => {
    console.error("❌ Error MQTT:", err.message);
  });

  return client;
}
