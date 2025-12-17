import { Message as MessageType } from "../App";
import { Bot, User, Reply } from "lucide-react";

interface MessageProps {
  message: MessageType;
  onReply?: (message: MessageType) => void;
}

export function Message({ message, onReply }: MessageProps) {
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
      <div
        className={`flex flex-col gap-1 max-w-[70%] ${
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

        {message.logs && message.logs.length > 0 && (
          <div
            className={`mt-1 space-y-1 px-1 ${
              isUser ? "text-right items-end" : "text-left items-start"
            }`}
          >
            {message.logs.map((log, i) => (
              <div
                key={i}
                className={`text-xs leading-snug ${
                  log.source === "master" ? "text-gray-400" : "text-blue-400"
                }`}
              >
                [{log.source}] {log.message}
              </div>
            ))}
          </div>
        )}
        <div className="text-red-500 text-xs">
          DEBUG LOG COUNT: {message.logs?.length ?? 0}
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
    </div>
  );
}
