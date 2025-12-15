import { Message as MessageType } from "../App";
import { Bot, User } from "lucide-react";

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-gray-900" : "bg-gray-100"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-gray-600" />
        )}
      </div>
      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-gray-900 text-white rounded-tr-sm"
              : "bg-gray-50 text-gray-900 rounded-tl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="text-xs text-gray-400 px-1">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
