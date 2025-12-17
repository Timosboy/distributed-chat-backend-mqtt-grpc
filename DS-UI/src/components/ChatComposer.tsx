import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Message } from "../App";

interface ChatComposerProps {
  onSend: (message: string) => void;
  replyTarget?: Message | null;
  onCancelReply?: () => void;
}

export function ChatComposer({
  onSend,
  replyTarget,
  onCancelReply,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 2000;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Reply preview bar */}
      {replyTarget && (
        <div className="max-w-3xl mx-auto px-6 py-2 border-b border-gray-200 flex items-start gap-2">
          <div className="flex-1 text-sm">
            <div className="font-medium text-gray-900">
              Replying to{" "}
              {replyTarget.role === "user" ? "yourself" : "Assistant"}
            </div>
            <div className="text-gray-600 line-clamp-1">
              {replyTarget.content}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-4">
        <div className="flex items-end gap-3">
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled
            title="Attachments (coming soon)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent max-h-32"
              rows={1}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs text-gray-400">
            Press Enter to send, Shift + Enter for new line
          </span>
          <span
            className={`text-xs ${
              message.length >= maxLength ? "text-red-500" : "text-gray-400"
            }`}
          >
            {message.length} / {maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
