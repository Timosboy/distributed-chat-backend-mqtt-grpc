import { Message } from "./Message";
import { Message as MessageType } from "../App";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: MessageType[];
  onReply?: (message: MessageType) => void;
}

export function MessageList({ messages, onReply }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <Message key={message.id} message={message} onReply={onReply} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
