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
      setMessages(prev => prev.concat({
          player: msg.player,
          text: msg.text,
          timestamp: Date.now()
        }));
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
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col space-y-2 mask-[linear-gradient(to_bottom,transparent,black_1.5rem)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-coffee/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40">
        <div className="grow" />
        {messages.length === 0 ? (
          <div className="text-center text-xs italic text-coffee/50 px-1">
            Empty chat. Say hi!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`${
                msg.player === "System" ? "text-center my-1" : ""
              }`}
            >
              {msg.player === "System" ? (
                <span className="text-xs font-medium text-coffee/50 italic px-1">
                  {msg.text}
                </span>
              ) : (
                <div className="flex flex-col items-start mb-1 px-1">
                  <div className="text-xs font-bold text-coffee/70 mb-0.5">
                    {msg.player}
                  </div>
                  <div className="text-xs font-medium text-coffee wrap-break-word leading-snug">
                    {msg.text}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-0">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            maxLength={200}
            className="w-full pl-4 pr-10 py-2.5 bg-white/80 border-2 border-coffee/10 rounded-xl text-coffee placeholder:text-coffee/30 focus:outline-none focus:border-coffee/30 focus:bg-white transition-all font-bold text-sm shadow-sm"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-coffee/40 hover:text-coffee disabled:opacity-30 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
