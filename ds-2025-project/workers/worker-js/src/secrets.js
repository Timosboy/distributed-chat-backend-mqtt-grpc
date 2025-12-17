import fs from "fs";

export function readApiKey() {
  try {
    return fs.readFileSync("/run/secrets/openai_api_key", "utf8").trim();
  } catch (err) {
    console.error("❌ No se encontró el secret openai_api_key");
    process.exit(1);
  }
}

