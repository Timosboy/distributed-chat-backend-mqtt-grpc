import OpenAI from "openai";
import { readApiKey } from "./secrets.js";

export async function callAI(prompt) {
  const apiKey = readApiKey();

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content;
}
