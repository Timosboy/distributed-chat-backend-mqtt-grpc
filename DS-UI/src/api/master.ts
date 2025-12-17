const BASE_URL = import.meta.env.VITE_MASTER_URL ?? "";

export async function submitQuery(
  query: string
): Promise<{ sessionId: string }> {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("submitQuery failed");
  return res.json();
}

export type SessionStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export interface SessionResult {
  status: SessionStatus;
  result?: string;
}
export async function fetchResult(sessionId: string): Promise<SessionResult> {
  const res = await fetch(`${BASE_URL}/result/${sessionId}`);
  if (!res.ok) throw new Error("fetchResult failed");
  return res.json();
}
