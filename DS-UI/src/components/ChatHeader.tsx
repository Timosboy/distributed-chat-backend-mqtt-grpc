import { MoreVertical } from "lucide-react";

interface ChatHeaderProps {
  title: string;
  status: "online" | "processing";
}

export function ChatHeader({ title, status }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <h1 className="text-gray-900">{title}</h1>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              status === "online" ? "bg-green-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          <span className="text-xs text-gray-600">
            {status === "online" ? "Online" : "Processing"}
          </span>
        </div>
      </div>
      <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
