"use client";

/**
 * ReactionBubbles.tsx
 * Floating emoji reactions that animate upward when users react to a live stream.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

const EMOJIS = ["❤️", "🔥", "🎉", "👏", "💯", "⚡", "🚀", "🤩"];

interface Bubble {
  id: string;
  emoji: string;
  x: number; // horizontal position %
}

interface ReactionBubblesProps {
  streamId: string;
  currentUserId: string | null;
}

export default function ReactionBubbles({ streamId, currentUserId }: ReactionBubblesProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState("❤️");
  const [cooldown, setCooldown] = useState(false);

  // Subscribe to real-time reactions from others
  useEffect(() => {
    const channel = supabase
      .channel(`stream-reactions-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stream_reactions",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          spawnBubble(payload.new.emoji || "❤️");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const spawnBubble = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = 10 + Math.random() * 80; // 10-90% horizontal
    setBubbles((prev) => [...prev, { id, emoji, x }]);

    // Remove after animation
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 2500);
  };

  const handleReact = async () => {
    if (cooldown || !currentUserId) return;

    // Local bubble immediately
    spawnBubble(selectedEmoji);

    // Cooldown to prevent spam
    setCooldown(true);
    setTimeout(() => setCooldown(false), 800);

    // Save to Supabase
    try {
      await supabase.from("stream_reactions").insert({
        stream_id: streamId,
        user_id: currentUserId,
        emoji: selectedEmoji,
      });
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  return (
    <div className="relative">
      {/* Floating Bubbles Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {bubbles.map((bubble) => (
            <motion.div
              key={bubble.id}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -200, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              style={{ left: `${bubble.x}%`, bottom: "0px", position: "absolute" }}
              className="text-2xl select-none"
            >
              {bubble.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction Controls */}
      <div className="flex flex-col items-center gap-2">
        {/* Emoji picker row */}
        <div className="flex gap-1 flex-wrap justify-center">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setSelectedEmoji(emoji)}
              className={`text-lg p-1 rounded-xl transition-all hover:scale-125 ${
                selectedEmoji === emoji ? "bg-white/20 scale-110" : "hover:bg-white/10"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Send reaction button */}
        <button
          onClick={handleReact}
          disabled={cooldown || !currentUserId}
          className={`px-6 py-2 rounded-2xl font-black text-sm transition-all ${
            cooldown
              ? "bg-white/10 text-white/30 scale-95"
              : "bg-white/20 text-white hover:bg-white/30 hover:scale-105 active:scale-95"
          }`}
        >
          {selectedEmoji} React
        </button>
      </div>
    </div>
  );
}
