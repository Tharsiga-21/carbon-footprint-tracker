import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";

/**
 * Predefined quick question prompts.
 * @constant
 */
const QUICK_QUESTIONS = Object.freeze([
  "How can I reduce transport emissions?",
  "What food choices lower my footprint?",
  "How do I cut household energy use?",
]);

/**
 * Initial assistant greeting message.
 * @constant
 */
const INITIAL_MESSAGE = Object.freeze({
  role: "assistant",
  content: "Hi! Ask me anything about reducing your carbon footprint 🌱",
});

/**
 * API endpoint (Vite proxy compatible).
 * @constant
 */
const API_ENDPOINT = "/api/chat";

/**
 * AiAdvisor chat assistant for EcoTrace.
 * @param {{ emissions: object, inputs: object }} props
 */
export default function AiAdvisor({ emissions, inputs }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);

  /**
   * Scroll chat to latest message.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /**
   * Sends message to AI backend and updates chat state.
   * @param {string} text
   */
  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isLoading) return;

      const userMessage = { role: "user", content: text.trim() };

      const updatedMessages = [...messages, userMessage];

      setMessages(updatedMessages);
      setInputText("");
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? ""}${API_ENDPOINT}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: updatedMessages,
              emissions,
              inputs,
            }),
          }
        );

        if (!res.ok) {
          throw new Error("Request failed");
        }

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply || "No response." },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I couldn’t process that request right now. Please try again.",
            isError: true,
          },
        ]);
        setError("Message failed to send.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, emissions, inputs, isLoading]
  );

  return (
    <section>
      <div
        role="log"
        aria-live="polite"
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #ddd",
          padding: "12px",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
              margin: "8px 0",
              color: msg.isError ? "#c0392b" : "inherit",
            }}
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}

        {isLoading && (
          <div aria-label="AI is typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p style={{ color: "#c0392b" }}>{error}</p>}

      <div style={{ marginTop: "12px" }}>
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            disabled={isLoading}
            aria-label={q}
            onClick={() => sendMessage(q)}
          >
            {q}
          </button>
        ))}
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
        <input
          aria-label="Ask your eco-advisor"
          value={inputText}
          disabled={isLoading}
          onChange={(e) => setInputText(e.target.value)}
        />

        <button
          aria-label="Send message"
          disabled={!inputText.trim() || isLoading}
          onClick={() => sendMessage(inputText)}
        >
          Send
        </button>
      </div>

      <style>{`
        .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 4px;
          background: #666;
          border-radius: 50%;
          animation: blink 1.2s infinite ease-in-out;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .dot {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
