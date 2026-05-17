"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trophy, Zap, Users, Star, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const [stats, setStats] = useState({
    users: "50k+",
    challenges: "120+",
    points: "1M+",
    badges: "15k+"
  });

  useEffect(() => {
    async function fetchGlobalStats() {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: challengeCount } = await supabase.from('challenges').select('*', { count: 'exact', head: true });
      const { data: profiles } = await supabase.from('profiles').select('total_points');
      const { count: badgeCount } = await supabase.from('user_badges').select('*', { count: 'exact', head: true });
      
      const totalPoints = profiles?.reduce((acc, p) => acc + (p.total_points || 0), 0) || 0;
      
      setStats({
        users: userCount ? (userCount > 1000 ? `${(userCount/1000).toFixed(1)}k+` : userCount.toString()) : "0",
        challenges: challengeCount?.toString() || "0",
        points: totalPoints > 1000000 ? `${(totalPoints/1000000).toFixed(1)}M+` : (totalPoints > 1000 ? `${(totalPoints/1000).toFixed(1)}k+` : totalPoints.toString()),
        badges: badgeCount ? (badgeCount > 1000 ? `${(badgeCount/1000).toFixed(1)}k+` : badgeCount.toString()) : "0"
      });
    }
    fetchGlobalStats();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 rounded-full border-border bg-secondary/30 text-xs font-semibold tracking-wider uppercase">
              ✨ The Future of Skill Development
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-5xl lg:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 leading-[1.1]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Level Up Your Skills <br className="hidden md:block" /> Through Challenges
          </motion.h1>
          
          <motion.p 
            className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Join a community of learners and creators. Learn. Compete. Grow. <br className="hidden sm:block" /> Earn exclusive rewards daily through interactive micro-tasks.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link href="/auth/signup">
              <Button size="lg" className="rounded-full px-8 h-12 text-base font-bold bg-foreground text-background hover:bg-foreground/90 transition-all group">
                Start Your Journey <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/challenges">
              <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base font-bold border-border hover:bg-secondary/50 transition-all">
                Explore Challenges
              </Button>
            </Link>
          </motion.div>

          {/* Stats Section */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 max-w-4xl mx-auto py-12 border-y border-border/50"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp} className="flex flex-col items-center">
              <span className="text-3xl font-black mb-1">{stats.users}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Active Users</span>
            </motion.div>
            <motion.div variants={fadeInUp} className="flex flex-col items-center">
              <span className="text-3xl font-black mb-1">{stats.challenges}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Challenges</span>
            </motion.div>
            <motion.div variants={fadeInUp} className="flex flex-col items-center">
              <span className="text-3xl font-black mb-1">{stats.points}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Points Earned</span>
            </motion.div>
            <motion.div variants={fadeInUp} className="flex flex-col items-center">
              <span className="text-3xl font-black mb-1">{stats.badges}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Badges Awarded</span>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black tracking-tight mb-4">Why Skill & Challenge Hub?</h2>
            <p className="text-muted-foreground">The ultimate platform for modern learners.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="premium-card p-8 bg-background"
            >
              <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center mb-6 shadow-xl">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Daily Micro-Challenges</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Stay consistent with short, impactful tasks designed to fit into your busy schedule.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="premium-card p-8 bg-background"
            >
              <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center mb-6 shadow-xl">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gamified Rewards</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Earn points, level up, and unlock exclusive digital badges as you master new skills.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="premium-card p-8 bg-background"
            >
              <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center mb-6 shadow-xl">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Community First</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Connect with peers, share your progress, and learn through collaborative challenges.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Daily Challenge Preview */}
      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <Badge className="mb-6 bg-primary text-background">Today's Spotlight</Badge>
              <h2 className="text-4xl lg:text-6xl font-black tracking-tight mb-8">Master Flexbox in <br /> 5 Minutes</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                This daily challenge focuses on one of the most essential skills in web development. 
                Complete it to earn 20 Points and a "Layout Master" badge.
              </p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Understand justify-content and align-items
                </li>
                <li className="flex items-center gap-3 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Build a responsive navbar layout
                </li>
                <li className="flex items-center gap-3 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Handle nested flex containers
                </li>
              </ul>
              <Button size="lg" className="rounded-full px-8 h-12 font-bold">Start Challenge</Button>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="premium-card overflow-hidden bg-secondary/20 border-border p-1"
              >
                <div className="bg-background rounded-[1.4rem] p-8">
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Level 12 • Intermediate</span>
                      <h4 className="text-2xl font-black">Flexbox Mastery</h4>
                    </div>
                    <Badge variant="secondary" className="h-8 px-4 font-bold">+20 PTS</Badge>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "65%" }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-foreground"
                      ></motion.div>
                    </div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <span>Progress</span>
                      <span>65% Completed</span>
                    </div>
                  </div>

                  <div className="mt-12 grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 rounded-xl bg-secondary/50 border border-dashed border-border flex items-center justify-center">
                        <Star className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-7xl font-black tracking-tighter mb-8 leading-[1.1]">Ready to transform <br /> your skills?</h2>
          <p className="text-background/60 text-lg lg:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Join thousands of professionals and hobbyists who are already building their future through daily challenges.
          </p>
          <Button size="lg" className="rounded-full px-12 h-14 text-lg font-black bg-background text-foreground hover:bg-background/90 transition-all">
            Join the Hub Now
          </Button>
        </div>
      </section>

      {/* Real Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="container mx-auto px-4 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm font-black tracking-tighter uppercase">
            © 2026 Skill & Challenge Hub. Built for the future.
          </div>
          <div className="flex gap-8 text-sm font-bold text-muted-foreground uppercase tracking-widest">
            <Link href="#" className="hover:text-foreground transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Instagram</Link>
            <Link href="#" className="hover:text-foreground transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
