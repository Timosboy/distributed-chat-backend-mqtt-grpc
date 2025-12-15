import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { ChatComposer } from "./components/ChatComposer";
import { useState } from "react";
import { submitQuery } from "./api/master";
import { pollUntilDone } from "./api/polling";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "¡Hola! ¿Cómo puedo ayudarte hoy?",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
  ]);

  const [status, setStatus] = useState<"online" | "processing">("online");

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStatus("processing");

    try {
      const { sessionId } = await submitQuery(content);

      const result = await pollUntilDone(sessionId, {
        intervalMs: 1000,
        timeoutMs: 120000,
      });

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: result.result ?? "(sin resultado)",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      const assistantMessage: Message = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${e?.message ?? "No se pudo obtener respuesta"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setStatus("online");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <ChatHeader title="ChatGPT" status={status} />
      <MessageList messages={messages} />
      <ChatComposer
        onSend={handleSendMessage}
        disabled={status === "processing"}
      />
    </div>
  );
}
