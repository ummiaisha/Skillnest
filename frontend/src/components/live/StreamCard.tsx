"use client";

/**
 * StreamCard.tsx
 * TikTok-style card for displaying a live stream in the feed.
 */

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Radio, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const CATEGORY_COLORS: Record<string, string> = {
  Coding: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  Design: "bg-purple-500/20 text-purple-400 border-purple-500/20",
  Gaming: "bg-green-500/20 text-green-400 border-green-500/20",
  Business: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  Fashion: "bg-pink-500/20 text-pink-400 border-pink-500/20",
  Music: "bg-orange-500/20 text-orange-400 border-orange-500/20",
  default: "bg-white/10 text-white/60 border-white/10",
};

interface StreamCardProps {
  stream: {
    id: string;
    title: string;
    category: string;
    tags: string[];
    thumbnail_url?: string;
    viewer_count: number;
    started_at: string;
    host?: {
      full_name: string;
      username: string;
      avatar_url: string;
    };
  };
  index?: number;
}

export default function StreamCard({ stream, index = 0 }: StreamCardProps) {
  const categoryColor =
    CATEGORY_COLORS[stream.category] || CATEGORY_COLORS.default;

  const elapsed = () => {
    const diff = Date.now() - new Date(stream.started_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative"
    >
      <Link href={`/live/${stream.id}`}>
        <div className="relative aspect-video rounded-[1.5rem] overflow-hidden bg-[#0A0A0A] border border-white/[0.06] shadow-2xl cursor-pointer">
          {/* Thumbnail */}
          {stream.thumbnail_url ? (
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary/40 via-background to-secondary/20 flex items-center justify-center">
              <Radio className="h-12 w-12 text-white/10" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* LIVE Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 rounded-full px-2.5 py-1 shadow-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">Live</span>
          </div>

          {/* Viewer count */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
            <Eye className="h-3 w-3 text-white/60" />
            <span className="text-[10px] font-black text-white/80">
              {stream.viewer_count > 999
                ? `${(stream.viewer_count / 1000).toFixed(1)}K`
                : stream.viewer_count}
            </span>
          </div>

          {/* Time elapsed */}
          <div className="absolute top-10 right-3 text-[9px] text-white/40 font-black">
            {elapsed()}
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Category + Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-[9px] font-black uppercase tracking-widest border ${categoryColor} px-2 py-0.5`}>
                <Zap className="h-2.5 w-2.5 mr-1 inline" />
                {stream.category}
              </Badge>
              {stream.tags?.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[9px] text-white/40 font-bold">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h3 className="text-sm font-black text-white leading-tight line-clamp-2">
              {stream.title}
            </h3>

            {/* Host info */}
            {stream.host && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-white/20">
                  <AvatarImage src={stream.host.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-[8px] font-black bg-secondary">
                    {stream.host.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-bold text-white/70">
                  {stream.host.full_name || stream.host.username}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
