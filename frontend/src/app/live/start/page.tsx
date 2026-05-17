"use client";

/**
 * /live/start/page.tsx
 * Creator page: set up and broadcast a live stream using browser WebRTC (no external SDK needed for MVP).
 * Uses Supabase to store stream metadata. Browser MediaDevices API for camera/mic/screen.
 */

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Radio,
  Camera,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  X,
  Loader2,
  ArrowLeft,
  StopCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import LiveChat from "@/components/live/LiveChat";
import ReactionBubbles from "@/components/live/ReactionBubbles";

const CATEGORIES = ["Coding", "Design", "Gaming", "Business", "Fashion", "Music", "Education", "Other"];

export default function StartStreamPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // Form state (pre-stream setup)
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Coding");
  const [tagsInput, setTagsInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // Stream state
  const [isLive, setIsLive] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  // Media controls
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUserId(session.user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) setProfile(data);
    };
    init();
    // Preview camera on mount
    startCamera();
    return () => stopAllTracks();
  }, []);

  // Poll viewer count while live
  useEffect(() => {
    if (!streamId) return;
    const interval = setInterval(async () => {
      const { count } = await supabase
        .from("stream_viewers")
        .select("*", { count: "exact", head: true })
        .eq("stream_id", streamId);
      setViewerCount(count || 0);
      // Update in DB
      await supabase.from("live_streams").update({ viewer_count: count || 0 }).eq("id", streamId);
    }, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error("Camera/mic access denied. Please allow in browser settings.");
    }
  };

  const stopAllTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const toggleCamera = () => {
    const videoTracks = streamRef.current?.getVideoTracks();
    videoTracks?.forEach((t) => { t.enabled = !t.enabled; });
    setCameraOn((prev) => !prev);
  };

  const toggleMic = () => {
    const audioTracks = streamRef.current?.getAudioTracks();
    audioTracks?.forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((prev) => !prev);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Switch back to camera
      stopAllTracks();
      await startCamera();
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = screenStream;
        if (videoRef.current) videoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);
        screenStream.getVideoTracks()[0].addEventListener("ended", () => {
          startCamera();
          setIsScreenSharing(false);
        });
      } catch {
        toast.error("Screen share cancelled.");
      }
    }
  };

  const handleGoLive = async () => {
    if (!title.trim()) { toast.error("Please add a stream title."); return; }
    if (!currentUserId) { toast.error("Not logged in."); return; }

    setIsStarting(true);
    try {
      const roomName = `stream_${currentUserId}_${Date.now()}`;
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      const { data, error } = await supabase
        .from("live_streams")
        .insert({
          host_id: currentUserId,
          title: title.trim(),
          category,
          tags,
          thumbnail_url: thumbnailUrl || null,
          status: "live",
          viewer_count: 0,
          room_name: roomName,
        })
        .select()
        .single();

      if (error) throw error;
      setStreamId(data.id);
      setIsLive(true);
      toast.success("You're live! 🔴");

      // Log activity
      await supabase.from("activities").insert({
        user_id: currentUserId,
        type: "Live Stream",
        content: `Started a live stream: "${title}"`,
        metadata: { stream_id: data.id },
      });
    } catch (err: any) {
      toast.error("Failed to start stream: " + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndStream = async () => {
    if (!streamId) return;
    await supabase.from("live_streams").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    }).eq("id", streamId);

    // Remove all viewers
    await supabase.from("stream_viewers").delete().eq("stream_id", streamId);

    stopAllTracks();
    toast.success("Stream ended.");
    router.push("/live");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A] shrink-0">
        <Link href="/live" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-bold">Back to Feed</span>
        </Link>

        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Live</span>
              <Eye className="h-3 w-3 text-red-400 ml-1" />
              <span className="text-[10px] font-black text-red-400">{viewerCount}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="h-5 w-5 rounded-full object-cover" alt="" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-black">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
            )}
            <span className="text-[10px] font-black text-white/60">{profile?.username || "you"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Video Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video */}
          <div className="relative flex-1 bg-black min-h-0">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!cameraOn && !isScreenSharing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <VideoOff className="h-12 w-12 text-white/20" />
              </div>
            )}

            {/* Reaction bubbles overlay */}
            {isLive && streamId && (
              <div className="absolute bottom-20 left-0 right-0 h-40 pointer-events-none">
                <ReactionBubbles streamId={streamId} currentUserId={currentUserId} />
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="px-6 py-4 bg-[#0A0A0A] border-t border-white/5 flex items-center justify-between flex-wrap gap-4">
            {/* Media Toggles */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleCamera}
                className={`h-10 w-10 rounded-2xl flex items-center justify-center border transition-all ${
                  cameraOn
                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    : "bg-red-500/20 border-red-500/30 text-red-400"
                }`}
                title={cameraOn ? "Turn off camera" : "Turn on camera"}
              >
                {cameraOn ? <Camera className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>

              <button
                onClick={toggleMic}
                className={`h-10 w-10 rounded-2xl flex items-center justify-center border transition-all ${
                  micOn
                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    : "bg-red-500/20 border-red-500/30 text-red-400"
                }`}
                title={micOn ? "Mute" : "Unmute"}
              >
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold transition-all ${
                  isScreenSharing
                    ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Monitor className="h-4 w-4" />
                {isScreenSharing ? "Stop Sharing" : "Share Screen"}
              </button>
            </div>

            {/* Go Live / End Stream */}
            {!isLive ? (
              <Button
                onClick={handleGoLive}
                disabled={isStarting || !title.trim()}
                className="h-12 px-8 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-red-500/30"
              >
                {isStarting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
                ) : (
                  <><Radio className="h-4 w-4 mr-2" /> Go Live</>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleEndStream}
                className="h-12 px-8 rounded-2xl bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white font-black uppercase tracking-widest text-xs border border-white/10 hover:border-red-500/30 transition-all"
              >
                <StopCircle className="h-4 w-4 mr-2" /> End Stream
              </Button>
            )}
          </div>
        </div>

        {/* Right Panel: Setup OR Chat */}
        <div className="w-80 shrink-0 border-l border-white/5 flex flex-col bg-[#0A0A0A]">
          {!isLive ? (
            /* Setup Panel */
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <h2 className="text-lg font-black mb-1">Stream Setup</h2>
                <p className="text-xs text-white/40 font-bold">Configure your stream before going live.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Stream Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Building a Full-Stack App Live"
                  className="bg-white/5 border-white/5 rounded-xl h-11 font-bold text-sm"
                  maxLength={80}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl h-11 font-bold px-3 text-white outline-none text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0A0A0A]">{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Tags (comma separated)</label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="react, nextjs, beginner"
                  className="bg-white/5 border-white/5 rounded-xl h-11 font-bold text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Thumbnail URL (optional)</label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-white/5 border-white/5 rounded-xl h-11 font-bold text-sm"
                />
              </div>

              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] text-red-400/80 font-bold leading-relaxed">
                  📡 Your stream will be visible to all Skillnest members once you click "Go Live". Make sure your title and category are set correctly.
                </p>
              </div>
            </div>
          ) : (
            /* Live Chat Panel */
            streamId && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 min-h-0">
                  <LiveChat streamId={streamId} currentUserId={currentUserId} />
                </div>
                <div className="p-4 border-t border-white/5">
                  <ReactionBubbles streamId={streamId} currentUserId={currentUserId} />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
