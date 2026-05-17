"use client";

/**
 * /live/page.tsx
 * TikTok-style live streams feed page.
 * Displays all active live streams with real-time viewer counts.
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, Search, SlidersHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import StreamCard from "@/components/live/StreamCard";

const CATEGORIES = ["All", "Coding", "Design", "Gaming", "Business", "Fashion", "Music", "Education"];

export default function LiveFeedPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
      await fetchStreams();
    };
    init();

    // Auto-refresh every 30 seconds for viewer counts
    const interval = setInterval(fetchStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStreams = async () => {
    const { data } = await supabase
      .from("live_streams")
      .select(`
        *,
        host:profiles!host_id(full_name, username, avatar_url)
      `)
      .eq("status", "live")
      .order("viewer_count", { ascending: false });

    if (data) setStreams(data);
    setLoading(false);
  };

  // Subscribe to real-time stream updates
  useEffect(() => {
    const channel = supabase
      .channel("live-streams-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        fetchStreams();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredStreams = streams.filter((s) => {
    const matchesCategory = activeCategory === "All" || s.category === activeCategory;
    const matchesSearch =
      !search ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.host?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Radio className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter">Live Now</h1>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {streams.length} active stream{streams.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="flex items-center gap-2 bg-secondary/30 border border-border rounded-2xl px-4 py-2 flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search streams..."
                  className="bg-transparent text-sm outline-none w-full placeholder-muted-foreground font-medium"
                />
              </div>
              {/* Go Live Button */}
              <Link href="/live/start">
                <Button className="rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest h-10 px-5 shadow-lg shadow-red-500/20 shrink-0">
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Go Live
                </Button>
              </Link>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat
                    ? "bg-foreground text-background shadow-lg"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stream Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-video rounded-[1.5rem] bg-secondary/20 animate-pulse" />
            ))}
          </div>
        ) : filteredStreams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div className="h-20 w-20 rounded-[2rem] bg-secondary/20 border border-border flex items-center justify-center">
              <Radio className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black mb-2">No Streams Live</h2>
              <p className="text-muted-foreground text-sm font-medium">
                {search || activeCategory !== "All"
                  ? "No streams match your filter. Try a different category."
                  : "Be the first to go live and share your skills!"}
              </p>
            </div>
            <Link href="/live/start">
              <Button className="rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest h-12 px-8">
                <Radio className="h-4 w-4 mr-2" />
                Start Streaming
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStreams.map((stream, i) => (
              <StreamCard key={stream.id} stream={stream} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
