import { fetchResult, SessionResult } from "./master";

export async function pollUntilDone(
  sessionId: string,
  {
    intervalMs = 1000,
    timeoutMs = 60000,
  }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<SessionResult> {
  const started = Date.now();

  while (true) {
    const r = await fetchResult(sessionId);

    if (!r) {
      throw new Error("Sesión no encontrada");
    }

    if (r.status === "DONE") {
      return r;
    }

    if (r.status === "FAILED") {
      throw new Error("La tarea falló en el worker");
    }

    if (Date.now() - started > timeoutMs) {
      throw new Error("Timeout esperando la respuesta del Master");
    }

    await new Promise((res) => setTimeout(res, intervalMs));
  }
}
