"use client";

import { motion } from "framer-motion";
import { 
  Zap, 
  Trophy, 
  Target, 
  BarChart2, 
  Award, 
  Calendar,
  Flame,
  Star,
  ArrowUpRight,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

// Types and Constants will be managed within the component state or effects

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        
        // 1. Fetch Real Profile Stats
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setProfileData(profile);
          setSkills(profile.skills?.map((s: string, i: number) => ({
            name: s,
            progress: 100, // Show as mastered if in profile for now
            color: i % 2 === 0 ? "bg-foreground" : "bg-foreground/60"
          })) || []);
        }

        // 2. Fetch Achievements (Badges)
        const { data: userBadges } = await supabase
          .from('user_badges')
          .select('*, badges(*)')
          .eq('user_id', session.user.id)
          .order('awarded_at', { ascending: false });
        
        if (userBadges && userBadges.length > 0) {
          setAchievements(userBadges.map(ub => ({
            title: ub.badges.name,
            date: new Date(ub.awarded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            icon: ub.badges.image_url ? null : Star,
            image: ub.badges.image_url,
            color: "text-yellow-500"
          })));
        } else {
          setAchievements([]);
        }
        
        setLoading(false);
      } else {
        window.location.href = "/login";
      }
    };
    initCheck();

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionUser(session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        window.location.href = "/login";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      {/* Header */}
      <section className="space-y-4">
        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Your Progress</h1>
        <p className="text-muted-foreground font-medium text-lg max-w-xl">
          Visualizing your journey from student to master. Every point counts.
        </p>
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Points", value: profileData?.total_points?.toLocaleString() || "0", icon: Zap, trend: "+12%", color: "text-yellow-500" },
          { label: "Current Streak", value: `${profileData?.streak || 0} Days`, icon: Flame, trend: "Personal Best", color: "text-orange-500" },
          { label: "Level", value: `Level ${profileData?.level || 1}`, icon: Trophy, trend: "Pro Rank", color: "text-purple-500" },
          { label: "Skills", value: profileData?.skills?.length || 0, icon: Target, trend: "Specialized", color: "text-blue-500" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="premium-card h-full group hover:border-foreground/50 transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl bg-secondary/50 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="rounded-lg border-border font-black text-[9px] uppercase tracking-widest text-muted-foreground">{stat.trend}</Badge>
                </div>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Analytics Card */}
        <Card className="lg:col-span-2 premium-card">
          <CardHeader className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <CardTitle className="text-2xl font-black">Skill Distribution</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">Growth across categories</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <BarChart2 className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[300px] w-full bg-secondary/20 rounded-3xl border border-border flex items-end justify-between p-8 gap-4 overflow-hidden relative">
              {/* Fake Chart Visualization */}
              {[40, 70, 45, 90, 65, 80, 55].map((height, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 1, ease: "easeOut" }}
                  className="w-full bg-foreground rounded-t-xl relative group"
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] font-black px-2 py-1 rounded-lg">
                    {height}%
                  </div>
                </motion.div>
              ))}
              <div className="absolute inset-0 grid grid-rows-4 pointer-events-none px-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="border-t border-border/50 w-full" />)}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Skill Progress */}
        <Card className="premium-card">
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-black">Top Skills</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Mastery level</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-8">
            {skills.map((skill, i) => (
              <div key={skill.name} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold">{skill.name}</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{skill.progress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.progress}%` }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 1.5 }}
                    className={cn("h-full", skill.color)}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest border-border mt-4">
              View Detailed Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-8">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Achievements</h2>
        <div className="space-y-4">
          {achievements.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-6 rounded-3xl bg-secondary/10 border border-border group hover:bg-secondary/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl bg-background border border-border group-hover:scale-110 transition-transform", item.color)}>
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-5 w-5 object-contain" />
                  ) : (
                    <item.icon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{item.title}</h4>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{item.date}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

