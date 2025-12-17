import { Message as MessageType } from "../App";
import { Bot, User, Reply } from "lucide-react";

interface MessageProps {
  message: MessageType;
  onReply?: (message: MessageType) => void;
}

export function Message({ message, onReply }: MessageProps) {
  const isUser = message.role === "user";

  const workerLogs = message.logs?.filter((l) => l.source === "worker") ?? [];
  const masterLogs = message.logs?.filter((l) => l.source === "master") ?? [];

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div
      className={`relative flex gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
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

      {/* Burbuja + meta */}
      <div
        className={`relative flex flex-col gap-1 max-w-[70%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-gray-900 text-white rounded-tr-sm"
              : "bg-gray-50 text-gray-900 rounded-tl-sm"
          }`}
        >
          {message.replyToId && (
            <div
              className={`mb-2 pb-2 border-l-2 pl-2 text-xs opacity-70 ${
                isUser ? "border-gray-400" : "border-gray-300"
              }`}
            >
              <div className="font-medium">
                {message.replyToRole === "user" ? "You" : "Assistant"}
              </div>
              <div className="line-clamp-2">{message.replyToContent}</div>
            </div>
          )}

          <p className="whitespace-pre-wrap">
            {message.status === "pending" ? (
              <span className="animate-pulse">{message.content}</span>
            ) : (
              message.content
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-gray-400">
            {formatTime(message.timestamp)}
          </span>
          {onReply && message.status === "done" && (
            <button
              onClick={() => onReply(message)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              title="Reply"
            >
              <Reply className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* MASTER logs — Usuario → derecha */}
      {isUser && masterLogs.length > 0 && (
        <div className="absolute right-full ml-4 top-2 flex flex-col gap-1 text-xs text-gray-400 whitespace-nowrap">
          {masterLogs.map((log, i) => (
            <div key={i}>
              [{log.source}] {log.message}
            </div>
          ))}
        </div>
      )}

      {/* WORKER logs — Asistente → izquierda */}
      {!isUser && workerLogs.length > 0 && (
        <div className="absolute left-full mr-4 top-2 flex flex-col gap-1 text-xs text-blue-400 text-left whitespace-nowrap">
          {workerLogs.map((log, i) => (
            <div key={i}>
              [{log.source}] {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
