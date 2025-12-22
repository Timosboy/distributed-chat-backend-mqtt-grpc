import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { ChatComposer } from "./components/ChatComposer";
import { useState } from "react";
import { submitQuery } from "./api/master";
import { pollUntilDone } from "./api/polling";
import { fetchLogs, LogEntry } from "./api/logs";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  replyToId?: string;
  replyToContent?: string;
  replyToRole?: "user" | "assistant";
  status?: "pending" | "done" | "error";

  logs?: {
    source: "master" | "worker";
    message: string;
    timestamp: number;
  }[];
}

function startLogPolling(
  sessionId: string,
  messageId: string,
  userMessageId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  let stopped = false;

  const poll = async () => {
    if (stopped) return;

    try {
      const logs: LogEntry[] = await fetchLogs(sessionId);

      if (logs.length > 0) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.status === "pending") {
              return { ...msg, logs };
            }
            if (msg.id === userMessageId) {
              return { ...msg, logs };
            }
            return msg;
          })
        );
      }
    } catch {}

    setTimeout(poll, 1000);
  };

  poll();

  return () => {
    stopped = true;
  };
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "¡Hola! ¿Cómo puedo ayudarte hoy?",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: "done",
    },
  ]);

  const [status, setStatus] = useState<"online" | "processing">("online");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      status: "done",
      replyToId: replyTarget?.id,
      replyToContent: replyTarget?.content,
      replyToRole: replyTarget?.role,
    };

    setMessages((prev) => [...prev, userMessage]);
    setReplyTarget(null);

    const placeholderId = `${Date.now()}-assistant`;
    const assistantPlaceholder: Message = {
      id: placeholderId,
      role: "assistant",
      content: "...",
      timestamp: new Date(),
      status: "pending",
      replyToId: userMessage.id,
      replyToContent: userMessage.content,
      replyToRole: "user",
    };

    setMessages((prev) => [...prev, assistantPlaceholder]);
    setStatus("processing");

    setTimeout(async () => {
      try {
        const { sessionId } = await submitQuery(content);

        const stopLogPolling = startLogPolling(
          sessionId,
          placeholderId,
          userMessage.id,
          setMessages
        );

        try {
          const result = await pollUntilDone(sessionId, {
            intervalMs: 1000,
            timeoutMs: 120000,
          });

          stopLogPolling();

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === placeholderId
                ? {
                    ...msg,
                    content: result.result ?? "(sin resultado)",
                    status: "done",
                  }
                : msg
            )
          );
        } catch (e: any) {
          stopLogPolling();

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === placeholderId
                ? {
                    ...msg,
                    content: `Error: ${
                      e?.message ?? "No se pudo obtener respuesta"
                    }`,
                    status: "error",
                  }
                : msg
            )
          );
        }
      } catch (e: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderId
              ? {
                  ...msg,
                  content: `Error: ${e?.message ?? "No se pudo enviar"}`,
                  status: "error",
                }
              : msg
          )
        );
      } finally {
        setStatus("online");
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <ChatHeader title="ChatGPT" status={status} />
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          onReply={(message) => setReplyTarget(message)}
        />
      </div>
      <ChatComposer
        onSend={handleSendMessage}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
      />
    </div>
  );
}
