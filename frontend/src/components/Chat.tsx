import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";

interface ChatMessage {
  player: string;
  text: string;
  timestamp: number;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleChatMessage = (msg: { player: string; text: string }) => {
      setMessages((prev) => [
        ...prev,
        { player: msg.player, text: msg.text, timestamp: Date.now() },
      ]);
    };

    socket.on("chatMessage", handleChatMessage);

    return () => {
      socket.off("chatMessage", handleChatMessage);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      socket.emit("sendChat", inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-vanilla">
      {/* Header */}
      <div className="flex justify-center border-b-3 border-coffee p-4 bg-vanilla">
        <h2 className="font-bold text-xl text-coffee uppercase tracking-wide">
          Chat
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-vanilla [&::-webkit-scrollbar-thumb]:bg-coffee [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-vanilla">
        {messages.length === 0 ? (
          <div className="text-coffee/50 text-sm font-bold text-center mt-4 uppercase">
            No messages yet
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`${
                msg.player === "System"
                  ? "text-center text-coffee/60 italic text-sm"
                  : ""
              }`}
            >
              {msg.player === "System" ? (
                <div className="font-bold uppercase">{msg.text}</div>
              ) : (
                <div className="w-full min-w-0">
                  <div className="text-sm font-bold text-coffee whitespace-normal wrap-break-words">
                    <span className="text-coffee/70">{msg.player}:</span>{" "}
                    {msg.text}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t-3 border-coffee p-4 bg-vanilla">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="TYPE MESSAGE..."
            maxLength={200}
            className="w-full px-3 py-2 border-2 border-coffee bg-white/50 text-coffee placeholder-coffee/30 focus:outline-none focus:bg-white font-bold text-sm"
          />
        </form>
      </div>
    </div>
  );
}
