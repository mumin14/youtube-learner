"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { YouTubePlayer } from "@/components/youtube-player";
import { ChatHistorySidebar } from "@/components/chat-history-sidebar";
import { useAppView } from "@/components/app-shell";
import type { ConversationSummary } from "@/types";

/** Strip markdown syntax from plain text */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")       // ## headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/\*([^*]+)\*/g, "$1")     // *italic*
    .replace(/__([^_]+)__/g, "$1")     // __bold__
    .replace(/_([^_]+)_/g, "$1")       // _italic_
    .replace(/`([^`]+)`/g, "$1");      // `code`
}

/** Parses AI message content and renders video timestamp links as clickable buttons */
function MessageContent({ content }: { content: string }) {
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; seconds: number } | null>(null);

  // Pattern: **[Watch at MM:SS](video_id:abc123,t:154)**
  const parts = content.split(/(\*\*\[Watch at [^\]]+\]\(video_id:[^)]+\)\*\*)/g);

  const toggleVideo = useCallback((videoId: string, seconds: number) => {
    setActiveVideo((prev) =>
      prev?.videoId === videoId && prev.seconds === seconds ? null : { videoId, seconds }
    );
  }, []);

  return (
    <div className="space-y-2">
      <div className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          const match = part.match(/\*\*\[Watch at ([^\]]+)\]\(video_id:([^,]+),t:(\d+)\)\*\*/);
          if (match) {
            const [, label, videoId, seconds] = match;
            const sec = parseInt(seconds);
            return (
              <button
                key={i}
                onClick={() => toggleVideo(videoId, sec)}
                className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-medium transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch at {label}
              </button>
            );
          }
          return <span key={i}>{stripMarkdown(part)}</span>;
        })}
      </div>
      {activeVideo && (
        <YouTubePlayer
          videoId={activeVideo.videoId}
          start={activeVideo.seconds}
          className="max-w-md"
        />
      )}
    </div>
  );
}

interface SourceFile {
  id: number;
  original_name: string;
  source_type: string;
  status: string;
}

export function AskAiTab() {
  const { focusFileId, clearFocusFile } = useAppView();
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>(undefined);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<{ filename: string; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(() => {
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations ?? []))
      .catch(() => {});
  }, []);

  const onConversationUpdate = useCallback(
    (id: number) => {
      setActiveConversationId(id);
      refreshConversations();
    },
    [refreshConversations]
  );

  const { messages, sendMessage, isLoading, clearChat } = useChat({
    fileId: selectedFileId,
    conversationId: activeConversationId,
    onConversationUpdate,
    attachmentText: attachment?.text,
  });

  useEffect(() => {
    fetch("/api/files")
      .then((res) => res.json())
      .then((data) => setSourceFiles(data.files?.filter((f: SourceFile) => f.status === "completed") ?? []))
      .catch(() => {});
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When navigating from upload tab with "Ask AI" button
  useEffect(() => {
    if (focusFileId !== null) {
      setSelectedFileId(focusFileId);
      setActiveConversationId(null);
      clearFocusFile();
    }
  }, [focusFileId, clearFocusFile]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    clearChat();
  };

  const handleDeleteConversation = async (id: number) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (activeConversationId === id) {
      handleNewChat();
    }
    refreshConversations();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-attachment", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to parse file");
        return;
      }
      const data = await res.json();
      setAttachment({ filename: data.filename, text: data.text });
    } catch {
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      {/* Chat history sidebar */}
      <ChatHistorySidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
      />

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center space-y-5 max-w-md">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-foreground">How can I help you?</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "What are the main topics covered?",
                    "Summarize the key concepts",
                    "What should I learn first?",
                    "Explain the most important ideas",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs border border-border rounded-full px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      {msg.role === "user" ? "Y" : "AI"}
                    </div>
                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted/60 rounded-tl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <MessageContent content={msg.content} />
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                      {msg.role === "assistant" &&
                        msg.content === "" &&
                        isLoading && (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="mt-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label htmlFor="source-select" className="text-xs text-muted-foreground">Source:</label>
              <select
                id="source-select"
                value={selectedFileId ?? ""}
                onChange={(e) => setSelectedFileId(e.target.value ? Number(e.target.value) : undefined)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              >
                <option value="">All documents</option>
                {sourceFiles.map((f) => (
                  <option key={f.id} value={f.id}>{f.original_name}</option>
                ))}
              </select>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear conversation
              </button>
            )}
          </div>
          {attachment && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {attachment.filename}
                <button
                  onClick={() => setAttachment(null)}
                  className="ml-1 hover:text-blue-900"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your content..."
              className="w-full resize-none rounded-full border border-border bg-card pl-12 pr-24 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 min-h-[48px] max-h-[120px] shadow-sm"
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-full w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                title="Attach PDF, Word, or text file"
              >
                {isUploading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleListening}
                className={`rounded-full w-8 h-8 flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="rounded-full w-8 h-8 bg-coral text-coral-foreground hover:bg-coral/90"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
