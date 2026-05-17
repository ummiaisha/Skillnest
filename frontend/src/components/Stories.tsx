"use client";

import { motion } from "framer-motion";
import { Plus, Zap, Trophy, Lightbulb, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Info } from "lucide-react";

export function Stories() {
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      const { data } = await supabase
        .from('activities')
        .select('*, profiles(full_name, avatar_url, bio, total_points)')
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (data) {
        // Group activities by user_id to prevent duplicates
        const userGroups: { [key: string]: any } = {};
        data.forEach(activity => {
          const userId = activity.user_id;
          if (!userGroups[userId]) {
            userGroups[userId] = {
              user_id: userId,
              profiles: activity.profiles,
              activities: [],
              created_at: activity.created_at,
            };
          }
          userGroups[userId].activities.push(activity);
        });

        // Convert to array and sort by the most recent activity timestamp
        const sortedGroups = Object.values(userGroups).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setActivities(sortedGroups);
      }
    };
    fetchRecentActivities();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Challenge Joined': return Zap;
      case 'Challenge Completed': return Trophy;
      case 'Knowledge Shared': return Lightbulb;
      case 'Badge Unlocked': return Star;
      default: return Zap;
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {activities.map((group, i) => {
        const firstActivity = group?.activities?.[0] || {};
        const PrimaryIcon = getIcon(firstActivity.type);

        return (
          <Dialog key={group.user_id}>
            <DialogTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedActivity(group)}
                className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="h-16 w-16 rounded-full p-[2px] bg-gradient-to-tr from-foreground via-muted-foreground to-background/50 transition-transform group-hover:scale-105 active:scale-95 shadow-lg relative">
                  <div className="h-full w-full rounded-full bg-background border-2 border-background flex items-center justify-center relative">
                    <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center">
                      {group.profiles?.avatar_url ? (
                        <img src={group.profiles.avatar_url} alt="User" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-sm font-black">{group.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("") || "U"}</span>
                      )}
                    </div>
                    {/* Layered Multi-Badges: Up to 3 overlapping badges showing different achievements */}
                    <div className="absolute -bottom-1 -right-1 flex -space-x-1">
                      {Array.from(new Set((group?.activities || []).map((a: any) => a.type)))
                        .slice(0, 3)
                        .map((type: any, idx: number) => {
                          const Icon = getIcon(type);
                          return (
                            <div 
                              key={type} 
                              className="h-5 w-5 bg-foreground rounded-full border border-background flex items-center justify-center shadow-xl shrink-0"
                              style={{ zIndex: 10 - idx }}
                            >
                              <Icon className="h-2.5 w-2.5 text-background fill-background" />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors w-16 text-center truncate">
                  {group.profiles?.full_name?.split(" ")[0] || "Member"}
                </span>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/[0.05] text-white rounded-[2.5rem] shadow-2xl overflow-hidden p-0">
              <DialogHeader className="sr-only">
                <DialogTitle>Highlight from {group.profiles?.full_name}</DialogTitle>
                <DialogDescription>Check out their latest achievements on Skillnest.</DialogDescription>
              </DialogHeader>
              
              <div className="relative h-32 bg-gradient-to-br from-foreground/10 to-background flex items-end justify-center">
                <div className="absolute top-6 left-6">
                  <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center shadow-xl">
                    <PrimaryIcon className="h-5 w-5 text-background" />
                  </div>
                </div>
                <Avatar className="h-24 w-24 border-4 border-[#0A0A0A] translate-y-12 shadow-2xl">
                  <AvatarImage src={group.profiles?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-lg font-black">
                    {group.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="pt-16 pb-8 px-8 text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">{group.profiles?.full_name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">{group.profiles?.bio || 'Skillnest Explorer'}</p>
                </div>

                {/* Grouped activities list inside Dialog */}
                <div className="max-h-[250px] overflow-y-auto pr-1 space-y-3">
                  {(group?.activities || []).map((act: any) => {
                    const Icon = getIcon(act.type);
                    return (
                      <div key={act.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-3 text-left">
                        <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center shrink-0 shadow-lg">
                          <Icon className="h-3.5 w-3.5 text-background fill-background" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[7px] font-black uppercase tracking-widest text-white/50">
                              {act.type}
                            </span>
                            <span className="text-[8px] font-bold text-white/20">
                              {new Date(act.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs font-black text-white leading-normal mt-1">{act.content}</p>
                          
                          {act.metadata?.video && (
                            <div className="rounded-xl overflow-hidden border border-white/5 aspect-video w-full bg-black mt-2">
                              <video src={act.metadata.video} controls className="w-full h-full object-contain" />
                            </div>
                          )}

                          {act.metadata?.image && !act.metadata?.video && (
                            <div className="rounded-xl overflow-hidden border border-white/5 aspect-video w-full mt-2">
                              <img src={act.metadata.image} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {act.metadata?.description && (
                            <p className="text-[10px] text-white/40 font-medium leading-relaxed italic mt-1">"{act.metadata.description}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                    <Calendar className="h-3 w-3" />
                    Latest: {new Date(group.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                    <Info className="h-3 w-3" />
                    {group.profiles?.total_points || 0} XP
                  </div>
                </div>

                <Link href={`/profile/${group.user_id}`}>
                  <Button className="w-full h-12 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-white/90">
                    View Full Profile
                  </Button>
                </Link>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
