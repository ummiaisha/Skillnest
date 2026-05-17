"use client";

import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  ChevronRight,
  Filter,
  Zap,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ManageChallengesPage() {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<any[]>([]);

  const fetchChallenges = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setChallenges(data.map(c => ({
        id: c.id,
        title: c.title,
        difficulty: c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1),
        points: c.points_reward,
        participants: 0, // In a real app, this would be a join/count
        status: "Active" // Default for now
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (error) {
      toast.error("Failed to delete challenge");
    } else {
      toast.success("Challenge deleted");
      fetchChallenges();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div></div>;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black px-3 py-1 uppercase tracking-widest">
              Admin Hub
            </Badge>
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resources</span>
          </div>
          <h1 className="text-4xl lg:text-7xl font-black tracking-tighter mb-4">Manage Challenges</h1>
          <p className="text-muted-foreground font-medium text-xl max-w-2xl">Create, edit, and monitor your system-wide skill quests with precision control.</p>
        </div>
        <Link href="/admin/challenges/new">
          <Button className="rounded-full h-16 px-10 font-black bg-white text-black hover:bg-white/90 shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all uppercase tracking-widest text-xs">
            <Plus className="mr-2 h-5 w-5" /> Create New Quest
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="h-12 pl-12 rounded-2xl bg-secondary/30 border-border focus:ring-foreground" placeholder="Search by title or category..." />
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-border">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-border">
            <Calendar className="mr-2 h-4 w-4" /> Date
          </Button>
        </div>
      </div>

      <Card className="premium-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/20 border-b border-border">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Challenge Name</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Difficulty</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rewards</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Participants</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((challenge, i) => (
                  <motion.tr 
                    key={challenge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/5 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                          <Zap className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-base">{challenge.title}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant="outline" className="rounded-full px-3 py-0.5 font-bold uppercase tracking-widest text-[9px]">
                        {challenge.difficulty}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 font-black text-sm">+{challenge.points} XP</td>
                    <td className="px-8 py-6 font-bold text-muted-foreground">{challenge.participants.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        challenge.status === 'Active' ? 'bg-green-500/10 text-green-500' : 
                        challenge.status === 'Draft' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          challenge.status === 'Active' ? 'bg-green-500' : 
                          challenge.status === 'Draft' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        {challenge.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 mt-2 p-2">
                          <Link href={`/challenges/${challenge.id}`}>
                            <DropdownMenuItem className="rounded-lg font-bold gap-2 cursor-pointer">
                              <Eye className="h-4 w-4" /> View Public
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem className="rounded-lg font-bold gap-2">
                            <Edit className="h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(challenge.id)}
                            className="rounded-lg font-bold gap-2 text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 flex justify-between items-center px-8">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Showing {challenges.length} of {challenges.length} challenges</p>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6" disabled>Prev</Button>
          <Button variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
