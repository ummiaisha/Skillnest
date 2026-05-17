"use client";

import { motion } from "framer-motion";
import { 
  Plus, 
  ArrowLeft, 
  Zap, 
  Target, 
  Clock, 
  Shield, 
  Sparkles,
  ChevronRight,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewChallengePage() {
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const router = useRouter();
  
  // Form State
  const [title, setTitle] = useState("New Challenge Title");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Web Dev");
  const [difficulty, setDifficulty] = useState("easy");
  const [points, setPoints] = useState("10");
  const [time, setTime] = useState("24h");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleDeploy = async () => {
    if (!title || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setDeploying(true);
    const { error } = await supabase
      .from('challenges')
      .insert({
        title,
        description,
        difficulty,
        points_reward: parseInt(points)
      });

    if (error) {
      toast.error("Failed to deploy challenge: " + error.message);
    } else {
      toast.success("Challenge forged successfully!");
      router.push("/admin/challenges");
    }
    setDeploying(false);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-6">
            <Link href="/admin/challenges">
              <Button variant="ghost" className="h-12 w-12 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white hover:text-black transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                  Admin Hub
                </Badge>
                <div className="h-1 w-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Creator Mode</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter">Forge New Challenge</h1>
            </div>
          </div>
          <Button 
            onClick={handleDeploy}
            disabled={deploying}
            className="h-14 px-8 rounded-full bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
          >
            {deploying ? "Deploying..." : "Deploy Challenge"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form Side */}
          <div className="lg:col-span-7 space-y-12">
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-xl font-black tracking-tight">Core Configuration</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Challenge Title</label>
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter high-impact title..."
                    className="h-14 bg-white/[0.02] border-white/5 rounded-2xl focus:border-primary/50 transition-all font-bold px-6"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Category</label>
                  <Input 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-14 bg-white/[0.02] border-white/5 rounded-2xl focus:border-primary/50 transition-all font-bold px-6"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Difficulty</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-14 bg-white/[0.02] border-white/5 rounded-2xl focus:border-primary/50 transition-all font-bold px-6 outline-none appearance-none"
                  >
                    <option value="easy" className="bg-[#0A0A0A]">Easy</option>
                    <option value="medium" className="bg-[#0A0A0A]">Medium</option>
                    <option value="hard" className="bg-[#0A0A0A]">Hard</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Reward (XP)</label>
                  <Input 
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="h-14 bg-white/[0.02] border-white/5 rounded-2xl focus:border-primary/50 transition-all font-bold px-6"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                </div>
                <h2 className="text-xl font-black tracking-tight">Challenge Briefing</h2>
              </div>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the mission details..."
                className="min-h-[200px] bg-white/[0.02] border-white/5 rounded-3xl focus:border-primary/50 transition-all font-medium p-8 leading-relaxed text-lg"
              />
            </section>
          </div>

          {/* Preview Side */}
          <div className="lg:col-span-5">
            <div className="sticky top-12 space-y-8">
              <div className="flex items-center justify-between ml-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Real-time Preview</span>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Live Sync Active
                </span>
              </div>

              {/* Redesigned Premium Card Preview */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[36px] blur-2xl opacity-50" />
                <Card className="relative overflow-hidden bg-[#0A0A0A] border-[1px] border-white/[0.08] rounded-[32px] shadow-2xl">
                  <CardContent className="p-0">
                    <div className="p-8 pb-4">
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] backdrop-blur-md">
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/80">
                              {category}
                            </span>
                          </div>
                          <Badge variant="outline" className="border-white/[0.05] text-white/40 text-[9px] font-black uppercase tracking-widest bg-transparent">
                            {difficulty}
                          </Badge>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                          <Zap className="h-4 w-4" />
                        </div>
                      </div>

                      <h3 className="text-2xl font-black leading-tight tracking-tight text-white mb-8 min-h-[4rem]">
                        {title}
                      </h3>

                      <div className="flex flex-wrap gap-3 mb-10">
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="p-1 rounded-lg bg-primary/10 text-primary">
                            <Target className="h-3 w-3" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30 leading-none mb-1">Reward</span>
                            <span className="text-xs font-black text-white/90">+{points} XP</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="p-1 rounded-lg bg-orange-500/10 text-orange-500">
                            <Clock className="h-3 w-3" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30 leading-none mb-1">Time Left</span>
                            <span className="text-xs font-black text-white/90">{time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40">Saturation</span>
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest">Preview Mode</span>
                        </div>
                        <div className="h-[3px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-1/3" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto p-8 pt-6 border-t border-white/[0.03] bg-gradient-to-b from-transparent to-white/[0.01]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-3">
                            {[1, 2, 3].map((u) => (
                              <div key={u} className="relative">
                                <Avatar className="h-9 w-9 border-[3px] border-[#0A0A0A]">
                                  <AvatarFallback className="text-[9px] font-black bg-[#1A1A1A] text-white/60">U{u}</AvatarFallback>
                                </Avatar>
                              </div>
                            ))}
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Initial Seekers</span>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary/60 font-medium leading-relaxed italic text-center">
                  "Every challenge you forge becomes a beacon for the community. Design with impact."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
