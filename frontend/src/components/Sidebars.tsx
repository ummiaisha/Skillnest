"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Trophy, 
  Lightbulb, 
  BarChart2, 
  User, 
  Settings,
  ShieldCheck,
  TrendingUp,
  Award,
  Zap,
  MoreHorizontal,
  MessageSquare,
  Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

const navItems = [
  { label: "Home Feed", href: "/dashboard", icon: Home },
  { label: "Challenges", href: "/challenges", icon: Trophy },
  { label: "Skill Posts", href: "/skills", icon: Lightbulb },
  { label: "Leaderboard", href: "/leaderboard", icon: TrendingUp },
  { label: "Progress", href: "/progress", icon: BarChart2 },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Go Live", href: "/live", icon: Radio },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
];

export function LeftSidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [showEliteBadge, setShowEliteBadge] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile();
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('eliteStudioBadgeSeen');
      if (!seen) {
        setShowEliteBadge(true);
      }
    }
  }, []);

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-64px)] hidden lg:flex flex-col border-r border-border bg-background/50 backdrop-blur-xl p-6 overflow-y-auto z-40">
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          if (item.label === "Admin") {
            if (profile?.role !== 'admin' && (profile?.total_points || 0) < 10000) return null;
          }
          
          let displayLabel = item.label;
          let DisplayIcon = item.icon;
          let displayHref = item.href;
          let isNewEliteFeature = false;
          
          if (item.label === "Admin" && profile?.role !== 'admin' && (profile?.total_points || 0) >= 10000) {
            displayLabel = "Elite Studio";
            DisplayIcon = Zap;
            displayHref = "/user";
            isNewEliteFeature = showEliteBadge;
          }

          const handleLinkClick = () => {
            if (isNewEliteFeature) {
              localStorage.setItem('eliteStudioBadgeSeen', 'true');
              setShowEliteBadge(false);
            }
          };

          return (
            <Link key={item.href} href={displayHref} className="relative block" onClick={handleLinkClick}>
              {isNewEliteFeature && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full z-10 shadow-lg animate-pulse">
                  NEW
                </span>
              )}
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-4 rounded-2xl h-12 px-4 font-bold text-sm tracking-tight transition-all",
                  item.label === "Go Live"
                    ? pathname === "/live"
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600"
                      : "text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30"
                    : pathname === displayHref
                      ? "bg-foreground text-background shadow-lg hover:bg-foreground/90"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <DisplayIcon className={cn("h-5 w-5", item.label === "Go Live" && "animate-pulse")} />
                {displayLabel}
                {item.label === "Go Live" && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}

export function RightSidebar() {
  const [performers, setPerformers] = useState<any[]>([]);
  const [trendingSkills, setTrendingSkills] = useState<any[]>([]);
  const [spotlightChallenge, setSpotlightChallenge] = useState<any>(null);

  useEffect(() => {
    const fetchTrendingData = async () => {
      // 1. Fetch Top Performers
      const { data: performersData } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(3);
      if (performersData) setPerformers(performersData);

      // 2. Fetch Trending Skills
      const { data: skillsData } = await supabase
        .from('profiles')
        .select('skills');
      
      if (skillsData) {
        const counts: any = {};
        skillsData.forEach(p => {
          p.skills?.forEach((s: string) => {
            counts[s] = (counts[s] || 0) + 1;
          });
        });
        const sorted = Object.entries(counts)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 4)
          .map(([name, count]) => ({ name, count }));
        setTrendingSkills(sorted.length > 0 ? sorted : [
          { name: "TypeScript", count: 100 },
          { name: "Python", count: 50 },
          { name: "AWS", count: 33 },
          { name: "Docker", count: 25 }
        ]);
      }

      // 3. Fetch Spotlight (Latest Challenge)
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (challengeData) setSpotlightChallenge(challengeData);
    };
    fetchTrendingData();
  }, []);

  return (
    <aside className="fixed right-0 top-16 w-80 h-[calc(100vh-64px)] hidden xl:flex flex-col border-l border-border bg-background/50 backdrop-blur-xl p-8 overflow-y-auto space-y-12 z-40">
      {/* Trending Skills */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Trending Skills</h3>
        <div className="space-y-4">
          {trendingSkills.map((skill, i) => (
            <div key={skill.name} className="flex items-center justify-between group cursor-pointer">
              <span className="font-bold text-sm group-hover:translate-x-1 transition-transform">{skill.name}</span>
              <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground">
                <Zap className="h-3 w-3 fill-foreground text-foreground" /> {Math.floor(100 / (i + 1))}K
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Performers */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Top Performers</h3>
        <div className="space-y-4">
          {performers.map((user, i) => (
            <Link key={user.id} href={`/profile/${user.id}`} className="flex items-center gap-3 group">
              <div className="relative">
                <Avatar className="h-10 w-10 border border-border group-hover:scale-105 transition-transform">
                  <AvatarImage src={user.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-[10px] font-black">
                    {user.full_name?.split(" ").map((n: any) => n[0]).join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center text-[8px] font-black border border-background">
                  {i + 1}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold leading-none group-hover:text-foreground transition-colors">{user.full_name || user.username}</p>
                <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-widest">
                  {user.total_points > 1000 ? (user.total_points / 1000).toFixed(1) + "K" : user.total_points} XP
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Daily Spotlight */}
      {spotlightChallenge && (
        <section className="relative group">
          <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative bg-[#0A0A0A] rounded-[2rem] p-8 border border-white/[0.08] group-hover:border-primary/40 transition-all duration-500 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="h-20 w-20 text-primary rotate-12" />
            </div>
            
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Daily Spotlight</h3>
            <div className="space-y-6">
              <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h4 className="font-black text-xl leading-tight text-white mb-3 group-hover:text-primary transition-colors">{spotlightChallenge.title}</h4>
                <p className="text-xs text-white/40 font-medium leading-relaxed">
                  {spotlightChallenge.description?.substring(0, 80)}...
                </p>
              </div>
              <Link href={`/challenges/${spotlightChallenge.id}`} className="block pt-2">
                <Button className="w-full rounded-2xl font-black text-[10px] uppercase tracking-widest bg-primary text-background hover:bg-primary/90 h-12 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all active:scale-95">
                  Start Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
