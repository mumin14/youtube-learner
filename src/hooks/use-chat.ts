"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";

interface UseChatOptions {
  fileId?: number;
  conversationId?: number | null;
  onConversationUpdate?: (id: number) => void;
  attachmentText?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const { fileId, conversationId = null, onConversationUpdate, attachmentText } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(conversationId);
  const abortRef = useRef<AbortController | null>(null);
  const creatingRef = useRef(false);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Load messages when conversationId changes
  useEffect(() => {
    setActiveConversationId(conversationId);
    if (conversationId) {
      fetch(`/api/conversations/${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) {
            setMessages(
              data.messages.map((m: { role: "user" | "assistant"; content: string }) => ({
                role: m.role,
                content: m.content,
              }))
            );
          }
        })
        .catch(() => {});
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = { role: "user", content };
      const updatedMessages = [...messages, userMessage];

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "" },
      ]);
      setIsLoading(true);

      let assistantContent = "";

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, fileId, attachmentText }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to get response");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return copy;
          });
        }

        // Persist after stream completes
        if (assistantContent) {
          let convId = activeConversationId;

          // Create conversation if this is the first message
          if (!convId && !creatingRef.current) {
            creatingRef.current = true;
            try {
              const createRes = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId }),
              });
              const createData = await createRes.json();
              convId = createData.conversation?.id ?? null;
              if (convId) {
                setActiveConversationId(convId);
              }
            } finally {
              creatingRef.current = false;
            }
          }

          // Save messages
          if (convId) {
            await fetch(`/api/conversations/${convId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userMessage: content,
                assistantMessage: assistantContent,
              }),
            });
            onConversationUpdate?.(convId);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          };
          return copy;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, fileId, activeConversationId, onConversationUpdate, attachmentText]
  );

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveConversationId(null);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    clearChat,
    conversationId: activeConversationId,
  };
}
