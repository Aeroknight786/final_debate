"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useUser } from "./UserProvider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const { userId, loading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentModule, setCurrentModule] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history and start program if needed
  useEffect(() => {
    if (!userId || initialized) return;

    async function init() {
      // Fetch existing messages
      const histRes = await fetch(`/api/chat?userId=${userId}`);
      const histData = await histRes.json();

      if (histData.messages && histData.messages.length > 0) {
        setMessages(
          histData.messages.map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      } else {
        // Start the program — get the opening message
        setSending(true);
        try {
          const startRes = await fetch("/api/chat", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          const startData = await startRes.json();
          if (startData.response) {
            setMessages([
              {
                id: "opening",
                role: "assistant",
                content: startData.response,
              },
            ]);
          }
        } catch (error) {
          console.error("Failed to start program:", error);
        }
        setSending(false);
      }

      // Fetch current module
      const userRes = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const userData = await userRes.json();
      setCurrentModule(userData.currentModule || "");

      setInitialized(true);
    }

    init();
  }, [userId, initialized]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending || !userId) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: trimmed }),
      });
      const data = await res.json();

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.response,
          },
        ]);
        if (data.moduleId) {
          setCurrentModule(data.moduleId);
        }
      }
    } catch (error) {
      console.error("Send failed:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Something went wrong. Take a moment, and try again when you're ready.",
        },
      ]);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted)" }}>
        <p>Loading...</p>
      </div>
    );
  }

  const moduleLabels: Record<string, string> = {
    module_0: "The Challenge",
    module_1: "The Trap",
    module_2: "Nicotine vs Meaning",
    module_3: "The Illusions of Relief",
    module_4: "What You Think You're Giving Up",
    module_5: "Why Prior Quits Failed",
    module_6: "The Last Cigarette Logic",
    module_7: "Final Ritual",
    module_8: "Freedom",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Module indicator */}
      <div
        className="px-6 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <span className="text-sm font-medium">
          {moduleLabels[currentModule] || "Getting started"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-md"
                    : "rounded-bl-md"
                }`}
                style={{
                  background:
                    msg.role === "user" ? "var(--accent)" : "var(--surface)",
                  color: msg.role === "user" ? "#fff" : "var(--foreground)",
                  border:
                    msg.role === "assistant"
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl rounded-bl-md px-4 py-3 border"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--muted)", animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--muted)", animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--muted)", animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="border-t px-6 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div
            className="flex items-end gap-3 rounded-xl border px-4 py-2"
            style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say what you think..."
              disabled={sending}
              rows={1}
              className="chat-input flex-1 bg-transparent resize-none outline-none text-[15px] py-1.5"
              style={{ color: "var(--foreground)" }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: "var(--muted)" }}>
            This is a coaching program, not medical advice. Shift+Enter for new line.
          </p>
        </form>
      </div>
    </div>
  );
}
