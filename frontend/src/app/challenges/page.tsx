"use client";

import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Zap, 
  Clock, 
  Trophy, 
  Target,
  ChevronRight,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


export default function ChallengesPage() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loadChallenges = async () => {
      let query = supabase
        .from('challenges')
        .select('*');
      
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }
      
      if (filter !== "all") {
        query = query.eq('difficulty', filter.toLowerCase());
      }

      const { data: realChallenges } = await query.order('created_at', { ascending: false });
      
      if (realChallenges) {
        setChallenges(realChallenges.map(c => ({
          id: c.id,
          title: c.title,
          category: c.category || "Skill Development",
          difficulty: c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1),
          points: c.points_reward,
          time: "Limited Time",
          image_url: c.image_url,
          status: "open"
        })));
      }
      setLoading(false);
    };

    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        loadChallenges();
      } else {
        window.location.href = "/login";
      }
    };
    initCheck();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionUser(session.user);
        loadChallenges();
      } else if (event === 'SIGNED_OUT') {
        window.location.href = "/login";
      }
    });

    return () => subscription.unsubscribe();
  }, [filter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
        <div className="max-w-xl">
          <Badge className="mb-2 bg-primary text-background text-[10px] uppercase tracking-widest px-3">Daily Quests</Badge>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter mb-2">Master New Skills</h1>
          <p className="text-muted-foreground font-medium text-sm">
            Choose a challenge that fits your level and start earning points today.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="rounded-full h-11 pl-10 bg-secondary/30 border-border font-bold text-xs" 
              placeholder="Search challenges..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full h-11 w-11 border-border bg-secondary/30"
            onClick={() => {
              setSearchQuery("");
              setFilter("all");
            }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-12" onValueChange={setFilter}>
        <TabsList className="bg-secondary/30 p-1 rounded-full border border-border">
          <TabsTrigger value="all" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all">All</TabsTrigger>
          <TabsTrigger value="easy" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all">Easy</TabsTrigger>
          <TabsTrigger value="medium" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all">Medium</TabsTrigger>
          <TabsTrigger value="hard" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all">Hard</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {challenges.length > 0 ? challenges.map((challenge, i) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="h-full"
            >
              <Link href={`/challenges/${challenge.id}`} className="group h-full block">
                <Card className="h-full flex flex-col relative overflow-hidden bg-[#0A0A0A] border-[1px] border-white/[0.08] group-hover:border-primary/50 transition-all duration-700 rounded-[1.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                  {/* Premium Background Effects */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <CardContent className="p-0 flex-1 flex flex-col relative z-10">
                    {/* Visual Header */}
                    {challenge.image_url && (
                      <div className="relative h-48 w-full overflow-hidden bg-secondary/50 flex items-center justify-center">
                        <img 
                          src={challenge.image_url} 
                          alt={challenge.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Zap className="h-12 w-12 text-white/5 absolute" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
                      </div>
                    )}

                    {/* TOP SECTION */}
                    <div className="p-6 pb-4">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest backdrop-blur-md transition-all duration-500",
                            challenge.difficulty === "Easy" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                            challenge.difficulty === "Medium" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                            "bg-red-500/10 border-red-500/20 text-red-400"
                          )}>
                            {challenge.difficulty}
                          </div>
                          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                            {challenge.category}
                          </div>
                        </div>
                        <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background transition-all duration-500">
                          <Zap className="h-4 w-4 fill-current" />
                        </div>
                      </div>

                      <h3 className="text-xl font-black leading-tight tracking-tight text-white mb-6 group-hover:text-primary transition-colors duration-500">
                        {challenge.title}
                      </h3>

                      {/* STATS GRID */}
                      <div className="grid grid-cols-2 gap-3 mb-8">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-white/[0.08] transition-all duration-500">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Trophy className="h-3 w-3 text-primary" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Reward</span>
                          </div>
                          <span className="text-sm font-black text-white">+{challenge.points} <span className="text-primary">XP</span></span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-white/[0.08] transition-all duration-500">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Clock className="h-3 w-3 text-orange-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Time</span>
                          </div>
                          <span className="text-sm font-black text-white">24h <span className="text-orange-500">Left</span></span>
                        </div>
                      </div>

                      {/* PROGRESS SECTION */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Progress</span>
                          <span className={cn(
                            "text-[9px] font-black tracking-widest",
                            challenge.difficulty === "Easy" ? "text-green-400" :
                            challenge.difficulty === "Medium" ? "text-orange-400" :
                            "text-red-400"
                          )}>
                            {challenge.difficulty === "Easy" ? "82%" : challenge.difficulty === "Medium" ? "45%" : "12%"}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: challenge.difficulty === "Easy" ? "82%" : challenge.difficulty === "Medium" ? "45%" : "12%" }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className={cn(
                              "h-full rounded-full",
                              challenge.difficulty === "Easy" ? "bg-green-500" :
                              challenge.difficulty === "Medium" ? "bg-orange-500" :
                              "bg-red-500"
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* FOOTER */}
                    <div className="mt-auto p-6 pt-0">
                      <div className="h-px w-full bg-white/5 mb-6" />
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map((u) => (
                            <Avatar key={u} className="h-7 w-7 border-2 border-[#0A0A0A] ring-1 ring-white/5">
                              <AvatarFallback className="bg-[#1A1A1A] text-white/40 text-[8px] font-black">U{u}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 group/btn">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover/btn:text-primary transition-colors">Start Now</span>
                          <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-background transition-all duration-500">
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center">
            <p className="text-muted-foreground font-medium italic">No challenges found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
