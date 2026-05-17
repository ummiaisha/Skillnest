"use client";

/**
 * LiveChat.tsx
 * Real-time chat component for live streams using Supabase Realtime.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

interface LiveChatProps {
  streamId: string;
  currentUserId: string | null;
}

export default function LiveChat({ streamId, currentUserId }: LiveChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("stream_comments")
        .select("*, profiles:user_id(full_name, username, avatar_url)")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };
    fetchMessages();
  }, [streamId]);

  // Subscribe to real-time messages
  useEffect(() => {
    const channel = supabase
      .channel(`stream-chat-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stream_comments",
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          // Fetch the user profile for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, username, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          const newMsg: Message = {
            ...(payload.new as Message),
            profiles: profile || undefined,
          };
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || isSending) return;

    const message = input.trim();
    setInput("");
    setIsSending(true);

    try {
      await supabase.from("stream_comments").insert({
        stream_id: streamId,
        user_id: currentUserId,
        message,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]/80 backdrop-blur-xl border-l border-white/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 shrink-0">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
          Live Chat
        </span>
        <span className="ml-auto text-[10px] font-black text-white/30">{messages.length} msgs</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2"
            >
              <Avatar className="h-6 w-6 shrink-0 border border-white/10">
                <AvatarImage src={msg.profiles?.avatar_url} className="object-cover" />
                <AvatarFallback className="text-[8px] font-black bg-secondary">
                  {msg.profiles?.full_name?.charAt(0) || <User className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-white/50 mr-1">
                  {msg.profiles?.username || "user"}
                </span>
                <span className="text-xs text-white/80 break-words">{msg.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/5 shrink-0">
        {currentUserId ? (
          <div className="flex items-center gap-2 bg-white/5 rounded-2xl px-3 py-2 border border-white/5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Say something..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none font-medium"
              maxLength={200}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="h-7 w-7 rounded-xl bg-white text-black flex items-center justify-center disabled:opacity-30 hover:scale-105 transition-transform shrink-0"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-white/30 font-bold py-2">
            Sign in to chat
          </p>
        )}
      </div>
    </div>
  );
}
