export interface LogEntry {
  source: "master" | "worker";
  message: string;
  timestamp: number;
}

export async function fetchLogs(sessionId: string): Promise<LogEntry[]> {
  const res = await fetch(`/logs/${sessionId}`);
  if (!res.ok) {
    throw new Error("No se pudieron obtener logs");
  }
  return res.json();
}
