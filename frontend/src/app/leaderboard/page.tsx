"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  Award,
  Zap,
  Star,
  ChevronRight,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Mock data removed. State 'players' is now used for dynamic content.

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasLoadedAll, setHasLoadedAll] = useState(false);
  const router = useRouter();

  const loadAllPlayers = async () => {
    const { data: leaderboardData, error } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false });

    if (leaderboardData) {
      setPlayers(leaderboardData.map((p, i) => ({
        id: p.id,
        rank: i + 1,
        name: p.full_name || p.username || "Anonymous",
        username: p.username || `@user_${p.id.slice(0, 4)}`,
        points: p.total_points > 1000 ? (p.total_points / 1000).toFixed(1) + "K" : p.total_points,
        level: p.level || 1,
        streak: p.streak || 0,
        avatar_url: p.avatar_url,
        avatar: p.full_name ? p.full_name.split(" ").map((n: string) => n[0]).join("") : "U",
        status: "online"
      })));
      setHasLoadedAll(true);
    }
  };

  useEffect(() => {
    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        setLoading(false);
      } else {
        router.push("/login");
      }
    };
    initCheck();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionUser(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const fetchSearchedPlayers = async () => {
      if (!searchQuery) {
        // Fetch Real Leaderboard
        const { data: leaderboardData } = await supabase
          .from('profiles')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(10);
        
        if (leaderboardData) {
          setPlayers(leaderboardData.map((p, i) => ({
            id: p.id,
            rank: i + 1,
            name: p.full_name || p.username || "Anonymous",
            username: p.username || `@user_${p.id.slice(0, 4)}`,
            points: p.total_points > 1000 ? (p.total_points / 1000).toFixed(1) + "K" : p.total_points,
            level: p.level || 1,
            streak: p.streak || 0,
            avatar_url: p.avatar_url,
            avatar: p.full_name ? p.full_name.split(" ").map((n: string) => n[0]).join("") : "U",
            status: "online"
          })));
        }
        return;
      }

      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .order('total_points', { ascending: false });

      if (matchedProfiles) {
        setPlayers(matchedProfiles.map((p, i) => ({
          id: p.id,
          rank: i + 1,
          name: p.full_name || p.username || "Anonymous",
          username: p.username || `@user_${p.id.slice(0, 4)}`,
          points: p.total_points > 1000 ? (p.total_points / 1000).toFixed(1) + "K" : p.total_points,
          level: p.level || 1,
          streak: p.streak || 0,
          avatar_url: p.avatar_url,
          avatar: p.full_name ? p.full_name.split(" ").map((n: string) => n[0]).join("") : "U",
          status: "online"
        })));
      }
    };

    const timer = setTimeout(fetchSearchedPlayers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
      {/* Header */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/30 border border-border">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Global Rankings</span>
        </div>
        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Skill Legends</h1>
        <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto">
          The top 1% of creators and developers in the Skillnest community.
        </p>
      </section>

      {/* Podium */}
      <section className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 items-end max-w-3xl mx-auto pt-12">
        {players.slice(0, 3).sort((a, b) => a.rank === 1 ? -1 : b.rank === 1 ? 1 : a.rank - b.rank).map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "relative flex flex-col items-center",
              user.rank === 1 ? "order-2 z-10" : user.rank === 2 ? "order-1" : "order-3"
            )}
          >
            <div className={cn(
              "relative mb-4 sm:mb-6",
              user.rank === 1 ? "h-20 w-20 sm:h-28 sm:w-28 md:h-32 md:w-32" : "h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24"
            )}>
              <Avatar className="h-full w-full border-2 sm:border-4 border-foreground shadow-2xl">
                <AvatarImage src={user.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-secondary text-base sm:text-2xl font-black">{user.avatar}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -top-2 sm:-top-4 left-1/2 -translate-x-1/2 h-5 w-5 sm:h-7 sm:w-7 rounded-full flex items-center justify-center border-2 sm:border-4 border-background",
                user.rank === 1 ? "bg-yellow-500" : user.rank === 2 ? "bg-slate-300" : "bg-amber-600"
              )}>
                <span className="font-black text-background text-[10px] sm:text-sm">{user.rank}</span>
              </div>
            </div>

            <Link href={`/profile/${user.id}`} className="text-center space-y-1 block hover:opacity-80 transition-opacity w-full px-1">
              <h3 className="font-black text-xs sm:text-base md:text-lg truncate">{user.name}</h3>
              <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">{user.points} XP</p>
              <div className="flex items-center justify-center gap-0.5 sm:gap-1 mt-1 sm:mt-2">
                <Zap className="h-2 w-2 sm:h-3 sm:w-3 fill-foreground" />
                <span className="text-[8px] sm:text-[10px] font-black">{user.streak}D STREAK</span>
              </div>
            </Link>

            <div className={cn(
              "mt-4 sm:mt-6 w-full rounded-t-2xl sm:rounded-t-3xl border-x border-t border-border bg-secondary/10",
              user.rank === 1 ? "h-16 sm:h-24 md:h-32" : user.rank === 2 ? "h-12 sm:h-18 md:h-24" : "h-8 sm:h-12 md:h-16"
            )}></div>
          </motion.div>
        ))}
      </section>

      {/* List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Community Rankings</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full h-10 pl-9 bg-secondary/30 border-border text-xs font-bold"
              placeholder="Find user..."
            />
          </div>
        </div>

        <div className="space-y-3">
          {(searchQuery ? players : players.slice(3))
            .filter(user =>
              user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.username.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/profile/${user.id}`}>
                  <Card className="premium-card group hover:bg-secondary/10 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <span className="w-6 text-center font-black text-muted-foreground group-hover:text-foreground transition-colors italic">
                          #{user.rank}
                        </span>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={user.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-secondary text-[10px] font-black">{user.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-sm leading-none">{user.name}</p>
                            <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-widest">{user.streak} day streak</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="font-black text-sm">{user.points}</p>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Total XP</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
        </div>
      </section>

      {!hasLoadedAll && players.length >= 10 && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={loadAllPlayers}
            variant="outline"
            className="rounded-full px-8 font-black text-[10px] uppercase tracking-widest border-border group"
          >
            View All Users <ChevronRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      )}
    </div>
  );
}
