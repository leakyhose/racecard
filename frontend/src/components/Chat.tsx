import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";

interface ChatMessage {
  player: string;
  id: string;
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
    const handleChatMessage = (msg: {
      player: string;
      id: string;
      text: string;
    }) => {
      setMessages((prev) =>
        prev.concat({
          player: msg.player,
          id: msg.id,
          text: msg.text,
          timestamp: Date.now(),
        }),
      );
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 [direction:rtl] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-coffee/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-coffee/40 [&::-webkit-scrollbar]:absolute [&::-webkit-scrollbar]:left-0">
        <div className="flex flex-col space-y-1 [direction:ltr] min-h-full pt-0.5">
          <div className="grow" />
          {messages.length === 0 ? (
            <div className="text-coffee/40 text-sm font-bold text-center italic py-2">
              no messages yet
            </div>
          ) : (
            messages.map((msg, index) => {
              const showPlayerName =
                index === 0 || messages[index - 1].id !== msg.id;
              return (
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
                    <div className="flex flex-col items-start px-1">
                      {showPlayerName && (
                        <div className="text-xs font-bold text-terracotta">
                          {msg.player}
                        </div>
                      )}
                      <div className="text-xs font-medium text-coffee wrap-break-word leading-snug">
                        {msg.text}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="pt-0">
        <form
          onSubmit={handleSubmit}
          className="relative group rounded-xl bg-coffee"
        >
          <input
            id="chat-input"
            type="text"
            autoComplete="off"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Send a message..."
            maxLength={200}
            autoFocus
            className="w-full pl-4 pr-4 py-2.5 bg-vanilla border-2 border-coffee rounded-xl text-coffee placeholder:text-coffee/30 -translate-y-0.5 transition-transform duration-100 ease-out hover:-translate-y-1 focus:-translate-y-1 font-bold text-sm outline-none focus:shadow-[inset_0_0_0_1px_var(--color-powder)]"
          />
        </form>
      </div>
    </div>
  );
}
