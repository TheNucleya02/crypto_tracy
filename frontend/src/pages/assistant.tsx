import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Plus, MessageSquare, Trash2, Sparkles, TrendingUp, Wallet, ChartLine as LineChart, Newspaper, Clock, Eraser } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useThreads,
  useCreateThread,
  useDeleteThread,
  useMessages,
  useSendChatMessage,
  useClearThread,
} from "@/hooks/useMarketData";
import { cn, timeAgo } from "@/lib/utils";
import type { ChatMessage } from "@/types";

const SUGGESTED_PROMPTS = [
  { icon: TrendingUp, label: "Analyze Bitcoin's trend", prompt: "Give me a detailed analysis of BTC right now" },
  { icon: Wallet, label: "Review my portfolio", prompt: "How is my portfolio doing?" },
  { icon: LineChart, label: "Market overview", prompt: "What's the broader market sentiment today?" },
  { icon: Newspaper, label: "Ethereum news", prompt: "Tell me about ETH and recent news" },
];

export default function Assistant() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAssistantText, setPendingAssistantText] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: threads = [], isLoading: threadsLoading } = useThreads();
  const createThread = useCreateThread();
  const deleteThread = useDeleteThread();
  const clearThread = useClearThread();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(activeThreadId);
  const sendChatMessage = useSendChatMessage(activeThreadId);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAssistantText]);

  const startNewChat = useCallback(async () => {
    const created = await createThread.mutateAsync("New conversation");
    setActiveThreadId(created.id);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [createThread]);

  // Auto-select first thread
  useEffect(() => {
    if (!activeThreadId && threads.length > 0 && !createThread.isPending) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId, createThread.isPending]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      let threadId = activeThreadId;

      if (!threadId) {
        const created = await createThread.mutateAsync(text.slice(0, 40) || "New conversation");
        threadId = created.id;
        setActiveThreadId(threadId);
      }

      setInput("");
      setIsStreaming(true);
      setPendingAssistantText("");

      try {
        const result = await sendChatMessage.mutateAsync(text);
        const response = result.response;

        // Simulate streaming for a nice UX
        const words = response.split(" ");
        let acc = "";
        for (let i = 0; i < words.length; i++) {
          acc += (i === 0 ? "" : " ") + words[i];
          setPendingAssistantText(acc);
          await new Promise((r) => setTimeout(r, 18));
        }
        setPendingAssistantText("");
      } catch (e) {
        const err = e instanceof Error ? e.message : "Something went wrong";
        setPendingAssistantText(err);
      } finally {
        setIsStreaming(false);
      }
    },
    [activeThreadId, sendChatMessage, createThread, isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClearThread = async () => {
    if (!activeThreadId) return;
    await clearThread.mutateAsync({ id: activeThreadId, title: "New conversation" });
    setPendingAssistantText("");
    setIsStreaming(false);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Thread history sidebar */}
      <Card className="hidden lg:flex flex-col w-[260px] shrink-0 overflow-hidden">
        <div className="p-4">
          <Button onClick={startNewChat} className="w-full" variant="outline">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <Separator />
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            History
          </span>
          {threads.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{threads.length}</span>
          )}
        </div>
        <ScrollArea className="flex-1 px-2 pb-2">
          {threadsLoading ? (
            <div className="space-y-2 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <ul className="space-y-1 pb-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveThreadId(t.id)}
                    className={cn(
                      "group w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                      t.id === activeThreadId ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(t.updated_at || t.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread.mutate(t.id, {
                          onSuccess: () => {
                            if (activeThreadId === t.id) setActiveThreadId(null);
                          },
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </Card>

      {/* Chat panel */}
      <Card className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 md:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-500 shadow-md shadow-primary/30 shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{activeThread?.title || "AI Market Assistant"}</div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                <span className="text-[11px] text-muted-foreground">Powered by live data</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!activeThreadId && (
              <Button onClick={startNewChat} size="sm" variant="ghost" className="lg:hidden">
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {activeThreadId && (
              <Button
                onClick={handleClearThread}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                disabled={isStreaming}
              >
                <Eraser className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          {messagesLoading && activeThreadId ? (
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-4 w-32" />
            </div>
          ) : messages.length === 0 && !pendingAssistantText ? (
            <div className="h-full flex flex-col items-center justify-center px-6 py-8 overflow-y-auto scrollbar-thin">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 shadow-xl shadow-primary/30 mb-5">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-center">Ask me about the crypto market</h2>
              <p className="mt-1.5 text-sm text-muted-foreground text-center max-w-md">
                Get AI-powered insights on prices, news, sentiment, and your portfolio.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {SUGGESTED_PROMPTS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => sendMessage(s.prompt)}
                    disabled={isStreaming}
                    className="group flex items-start gap-3 rounded-xl border border-border p-3.5 text-left hover:border-primary/40 hover:bg-accent/40 transition-all disabled:opacity-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.prompt}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full scrollbar-thin">
              <div className="px-4 md:px-6 py-6 space-y-6 max-w-3xl mx-auto">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {pendingAssistantText && (
                  <MessageBubble
                    message={{
                      id: "pending",
                      role: "assistant",
                      content: pendingAssistantText,
                      timestamp: new Date().toISOString(),
                    }}
                    streaming
                  />
                )}
                {isStreaming && !pendingAssistantText && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 md:p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card focus-within:ring-1 focus-within:ring-ring transition-shadow px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a coin, your portfolio, or the market..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50 max-h-32 py-1.5"
                style={{ minHeight: "24px" }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="h-8 w-8 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              AI-generated insights using live CoinGecko data. Not financial advice.
            </p>
          </form>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 animate-slide-in", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-gradient-to-br from-primary to-emerald-500 text-white shadow-sm shadow-primary/30"
        )}
      >
        {isUser ? (
          <span className="text-xs font-semibold">U</span>
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "flex-1 min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "bg-muted/60 text-foreground rounded-tl-md"
        )}
      >
        {isUser ? (
          <p className="mb-0">{message.content}</p>
        ) : (
          <div className={cn("markdown-body", streaming && "after:inline-block after:ml-0.5 after:h-3.5 after:w-0.5 after:bg-foreground after:align-middle after:animate-pulse")}>
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-semibold mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                pre: ({ children }) => <pre className="bg-black/20 rounded-lg p-2 overflow-x-auto my-2 text-xs font-mono">{children}</pre>,
                a: ({ children, href }) => <a href={href} className="underline text-primary hover:text-primary/80" target="_blank" rel="noopener noreferrer">{children}</a>,
                hr: () => <hr className="my-2 border-border/50" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-500 text-white shadow-sm shadow-primary/30">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-muted/60 px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse-dot" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse-dot" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
