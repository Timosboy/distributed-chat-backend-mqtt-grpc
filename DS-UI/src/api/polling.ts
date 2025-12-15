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
    if (r?.status === "done") return r;

    if (Date.now() - started > timeoutMs) {
      throw new Error("Timeout esperando la respuesta del Master");
    }

    await new Promise((res) => setTimeout(res, intervalMs));
  }
}
