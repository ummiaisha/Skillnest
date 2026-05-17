"use client";

/**
 * /live/[streamId]/page.tsx
 * Stream viewer page. Shows the stream video, live chat, and reactions.
 * Uses browser-based viewing (host streams via their camera, viewers see live feed metadata).
 */

import React, { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  Radio,
  Share2,
  Flag,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import LiveChat from "@/components/live/LiveChat";
import ReactionBubbles from "@/components/live/ReactionBubbles";

export default function StreamViewerPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = use(params);
  const router = useRouter();

  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      // Fetch stream details
      const { data: streamData } = await supabase
        .from("live_streams")
        .select(`*, host:profiles!host_id(id, full_name, username, avatar_url, bio)`)
        .eq("id", streamId)
        .single();

      if (!streamData) {
        toast.error("Stream not found or has ended.");
        router.push("/live");
        return;
      }

      setStream(streamData);
      setViewerCount(streamData.viewer_count || 0);

      // Register as viewer
      if (userId) {
        await supabase.from("stream_viewers").upsert({
          stream_id: streamId,
          user_id: userId,
          joined_at: new Date().toISOString(),
        });

        // Check follow status
        if (streamData.host_id !== userId) {
          const { data: followData } = await supabase
            .from("followers")
            .select("*")
            .eq("follower_id", userId)
            .eq("following_id", streamData.host_id)
            .maybeSingle();
          setIsFollowing(!!followData);
        }
      }

      setLoading(false);
    };
    init();

    return () => {
      // Remove viewer on unmount
      if (currentUserId) {
        supabase.from("stream_viewers").delete()
          .eq("stream_id", streamId)
          .eq("user_id", currentUserId);
      }
    };
  }, [streamId]);

  // Real-time viewer count updates
  useEffect(() => {
    const channel = supabase
      .channel(`stream-viewer-count-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as any;
            setViewerCount(updated.viewer_count || 0);
            if (updated.status === "ended") {
              toast.info("Stream has ended.");
              router.push("/live");
            }
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const handleFollow = async () => {
    if (!currentUserId || !stream?.host_id) return;
    if (isFollowing) {
      await supabase.from("followers").delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", stream.host_id);
      setIsFollowing(false);
      toast.success("Unfollowed.");
    } else {
      await supabase.from("followers").insert({
        follower_id: currentUserId,
        following_id: stream.host_id,
      });
      setIsFollowing(true);
      toast.success(`Following ${stream.host?.full_name}!`);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Stream link copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground" />
      </div>
    );
  }

  if (!stream) return null;

  const elapsed = () => {
    const diff = Date.now() - new Date(stream.started_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Top Nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#0A0A0A] shrink-0">
        <Link href="/live" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-bold">Live Feed</span>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={handleShare} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-red-400 transition-colors">
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Stream Video Area */}
          <div className="relative bg-black w-full aspect-video max-h-[60vh]">
            {/* Note: In a full implementation, this would show the broadcaster's stream via WebRTC.
                For the MVP, we show the stream info with a placeholder. */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-background to-secondary/10 flex flex-col items-center justify-center gap-4">
              <div className="h-20 w-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                <Radio className="h-10 w-10 text-white/20 animate-pulse" />
              </div>
              <p className="text-white/30 text-sm font-bold text-center px-4">
                Stream is live — real-time video via WebRTC requires a signaling server.<br />
                <span className="text-[10px] text-white/20">Use LiveKit or Agora for production video streaming.</span>
              </p>
            </div>

            {/* Overlays */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-red-500 rounded-full px-3 py-1 shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Live · {elapsed()}</span>
              </div>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <Eye className="h-3.5 w-3.5 text-white/60" />
              <span className="text-sm font-black text-white">{viewerCount}</span>
            </div>
          </div>

          {/* Stream Info */}
          <div className="p-6 space-y-4 border-b border-white/5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-0">
                <Badge className="bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[9px]">
                  <Zap className="h-2.5 w-2.5 mr-1 inline" />
                  {stream.category}
                </Badge>
                <h1 className="text-xl font-black tracking-tight">{stream.title}</h1>
                {stream.tags?.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {stream.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] text-white/40 font-bold">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Host Card */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <Link href={`/profile/${stream.host?.id}`} className="flex items-center gap-3 group">
                <Avatar className="h-10 w-10 border border-white/10 group-hover:scale-105 transition-transform">
                  <AvatarImage src={stream.host?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-sm font-black">
                    {stream.host?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-black group-hover:text-white transition-colors">
                    {stream.host?.full_name || "Creator"}
                  </p>
                  <p className="text-[10px] text-white/40 font-bold">@{stream.host?.username}</p>
                </div>
              </Link>
              {currentUserId && stream.host?.id !== currentUserId && (
                <Button
                  onClick={handleFollow}
                  className={`h-9 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    isFollowing
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          {/* Reactions section on mobile */}
          <div className="p-6 border-b border-white/5 lg:hidden">
            <ReactionBubbles streamId={streamId} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Right: Chat + Reactions */}
        <div className="w-80 shrink-0 hidden lg:flex flex-col border-l border-white/5 min-h-0">
          <div className="flex-1 min-h-0">
            <LiveChat streamId={streamId} currentUserId={currentUserId} />
          </div>
          <div className="p-4 border-t border-white/5 relative">
            <ReactionBubbles streamId={streamId} currentUserId={currentUserId} />
          </div>
        </div>
      </div>
    </div>
  );
}
