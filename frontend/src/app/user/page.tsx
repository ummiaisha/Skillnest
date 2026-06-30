"use client";

import { motion } from "framer-motion";
import { 
  Trophy, 
  ArrowLeft,
  Search,
  Trash2,
  Plus,
  Check,
  ExternalLink,
  Zap,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function UserDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"quests">("quests");
  const router = useRouter();

  // Challenges Management
  const [challengesList, setChallengesList] = useState<any[]>([]);
  const [challengeSearch, setChallengeSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    category: "Frontend",
    difficulty: "easy",
    points_reward: 500,
    image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60",
    rules: ""
  });
  
  // Submissions State
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [challengeSubmissions, setChallengeSubmissions] = useState<any[]>([]);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);

  const handleViewSubmissions = async (challengeId: string) => {
    setSelectedChallengeId(challengeId);
    setChallengeSubmissions([]); // Clear previous
    setIsSubmissionsOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`
          *,
          profiles:user_id (full_name, username, avatar_url),
          challenges!inner (points_reward, title, author_id)
        `)
        .eq('challenge_id', challengeId)
        .eq('challenges.author_id', sessionUser.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        setChallengeSubmissions(data);
      }
    } catch (err: any) {
      toast.error("Failed to load submissions: " + err.message);
    }
  };

  const handleApproveSubmission = async (subId: string, userId: string, challengeId: string) => {
    try {
      // 1. Get the challenge details for the points
      const { data: challenge } = await supabase
        .from('challenges')
        .select('points_reward, title, author_id')
        .eq('id', challengeId)
        .single();
        
      if (!challenge) return toast.error("Challenge not found.");
      if (challenge.author_id !== sessionUser.id) return toast.error("You are not the author of this challenge.");

      // 2. Mark submission as completed
      const { error: subError } = await supabase
        .from('challenge_submissions')
        .update({ status: 'completed' })
        .eq('id', subId);
        
      if (subError) throw subError;

      // 3. Grant XP to user
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("id", userId)
        .single();
      
      await supabase
        .from("profiles")
        .update({
          total_points: (profile?.total_points || 0) + (challenge.points_reward || 500)
        })
        .eq("id", userId);

      // 4. Log activity
      await supabase.from("activities").insert({
        user_id: userId,
        type: "Challenge Completed",
        content: `Your submission for '${challenge.title}' was approved! +${challenge.points_reward || 500} XP`,
        metadata: { challenge_id: challengeId }
      });

      toast.success("Submission approved and XP granted!");
      
      // Refresh submissions UI
      setChallengeSubmissions(prev => prev.map(sub => sub.id === subId ? { ...sub, status: 'completed' } : sub));
    } catch (err: any) {
      toast.error("Failed to approve: " + err.message);
    }
  };

  useEffect(() => {
    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        
        // Fetch Admin's own profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          if (profile.role !== 'admin' && profile.total_points < 10000) {
            toast.error("Access Denied: Requires 10,000+ XP.");
            window.location.href = "/dashboard";
            return;
          }
          setAdminProfile(profile);
        }
        
        setLoading(false);
      } else {
        window.location.href = "/login";
      }
    };
    initCheck();
  }, []);

  const fetchData = async () => {
    if (!sessionUser) return;
    // 2. Fetch Challenges ONLY authored by this user
    const { data: challenges } = await supabase
      .from('challenges')
      .select('*')
      .eq('author_id', sessionUser.id)
      .order('created_at', { ascending: false });
    if (challenges) setChallengesList(challenges);
  };

  useEffect(() => {
    if (!loading && sessionUser) fetchData();
  }, [loading, sessionUser]);

  // Challenge Actions
  const handleDeleteChallenge = async (id: string) => {
    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id)
      .eq('author_id', sessionUser.id);
    
    if (!error) {
      toast.success("Challenge deleted successfully!");
      fetchData();
    } else {
      toast.error("Failed to delete challenge.");
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    const rulesArray = newChallenge.rules.split('\n').filter(r => r.trim() !== '');
    
    const { error } = await supabase
      .from('challenges')
      .insert({
        title: newChallenge.title,
        description: newChallenge.description,
        category: newChallenge.category,
        difficulty: newChallenge.difficulty,
        points_reward: Number(newChallenge.points_reward),
        image_url: newChallenge.image_url,
        rules: rulesArray,
        author_id: sessionUser.id
      });

    if (!error) {
      toast.success("Challenge created successfully!");
      setIsCreateOpen(false);
      setNewChallenge({
        title: "",
        description: "",
        category: "Frontend",
        difficulty: "easy",
        points_reward: 500,
        image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60",
        rules: ""
      });
      fetchData();
    } else {
      toast.error("Failed to create challenge.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
      </div>
    );
  }

  // Filter lists
  const filteredChallenges = challengesList.filter(c => 
    (c.title?.toLowerCase() || "").includes(challengeSearch.toLowerCase()) || 
    (c.category?.toLowerCase() || "").includes(challengeSearch.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      {/* 🛡️ Custom Admin Side Navigation */}
      <aside className="w-64 border-r border-white/[0.05] bg-[#0A0A0A] p-6 hidden md:flex flex-col gap-6 justify-between shrink-0 font-sans min-h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center shadow-lg">
              {adminProfile?.avatar_url ? (
                <img src={adminProfile.avatar_url} alt="" className="object-cover w-full h-full" />
              ) : (
                <span className="text-xs font-black text-white">
                  {adminProfile?.full_name?.split(" ").map((n: any) => n[0]).join("").toUpperCase() || "E"}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight uppercase leading-none truncate max-w-[130px]" title={adminProfile?.full_name || "Elite Hub"}>
                {adminProfile?.full_name || "Elite Hub"}
              </h2>
              <span className="text-[9px] font-black tracking-widest text-white/30 uppercase mt-1 block">Elite Authority</span>
            </div>
          </div>
          
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("quests")}
              className="w-full flex items-center gap-3.5 h-12 px-4 rounded-2xl font-bold text-sm tracking-tight transition-all text-left bg-white text-black shadow-lg"
            >
              <Zap className="h-4 w-4" />
              Quest Development
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Authority Status</span>
            </div>
            <p className="text-[10px] text-white/60 font-bold leading-normal">You are logged in as an Elite Member (10k+ XP).</p>
          </div>

          <Button 
            onClick={() => router.push('/dashboard')}
            variant="ghost" 
            className="w-full justify-start h-12 rounded-2xl px-4 text-white/40 hover:text-white hover:bg-white/5 border border-white/[0.03] font-bold text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-3" />
            Back to dashboard
          </Button>
        </div>
      </aside>

      {/* 🖥️ Main Dashboard Workspace */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto flex flex-col min-h-0">
        
        {/* Tab: Quest Development */}
        {activeTab === "quests" && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <h1 className="text-4xl lg:text-6xl font-black tracking-tighter mb-2">
                  Quest Development
                </h1>
                <p className="text-white/40 font-medium">
                  Create new coding missions, edit levels, or remove modules.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="h-10 px-4 rounded-full border-white/5 bg-[#0A0A0A] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Server Live</span>
                </Badge>
                <Button onClick={fetchData} variant="outline" className="h-10 rounded-full border-white/10 hover:bg-white/5 font-bold">Sync Database</Button>
              </div>
            </div>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative h-14 w-full md:w-96 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center px-4">
              <Search className="h-4 w-4 text-white/40 mr-3" />
              <input 
                type="text"
                placeholder="Search challenges by title..."
                value={challengeSearch}
                onChange={e => setChallengeSearch(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder-white/20 text-white"
              />
            </div>

            {/* Create Challenge Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-6 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-white/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Challenge
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] bg-[#0A0A0A] border-white/5 text-white rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Publish Mission</DialogTitle>
                  <DialogDescription className="text-white/40">Create a brand-new coding challenge for the community.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateChallenge} className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Challenge Title</label>
                    <Input 
                      required 
                      value={newChallenge.title} 
                      onChange={e => setNewChallenge({...newChallenge, title: e.target.value})}
                      placeholder="e.g. Next.js App Router Master" 
                      className="bg-white/5 border-white/5 rounded-xl h-12 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Description</label>
                    <Textarea 
                      required 
                      value={newChallenge.description} 
                      onChange={e => setNewChallenge({...newChallenge, description: e.target.value})}
                      placeholder="Explain the rules and goals of the mission..." 
                      className="bg-white/5 border-white/5 rounded-xl h-24 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 flex flex-col">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Category</label>
                      <select 
                        value={newChallenge.category} 
                        onChange={e => setNewChallenge({...newChallenge, category: e.target.value})}
                        className="w-full bg-white/5 border border-white/5 rounded-xl h-12 font-bold px-3 text-white outline-none"
                      >
                        <option value="Frontend" className="bg-[#0A0A0A]">Frontend</option>
                        <option value="Backend" className="bg-[#0A0A0A]">Backend</option>
                        <option value="CSS Wizardry" className="bg-[#0A0A0A]">CSS Wizardry</option>
                        <option value="JavaScript" className="bg-[#0A0A0A]">JavaScript</option>
                      </select>
                    </div>
                    <div className="space-y-1 flex flex-col">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Difficulty</label>
                      <select 
                        value={newChallenge.difficulty} 
                        onChange={e => setNewChallenge({...newChallenge, difficulty: e.target.value})}
                        className="w-full bg-white/5 border border-white/5 rounded-xl h-12 font-bold px-3 text-white outline-none"
                      >
                        <option value="easy" className="bg-[#0A0A0A]">Easy</option>
                        <option value="medium" className="bg-[#0A0A0A]">Medium</option>
                        <option value="hard" className="bg-[#0A0A0A]">Hard</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40">XP Reward</label>
                      <Input 
                        required 
                        type="number"
                        value={newChallenge.points_reward} 
                        onChange={e => setNewChallenge({...newChallenge, points_reward: Number(e.target.value)})}
                        placeholder="e.g. 500" 
                        className="bg-white/5 border-white/5 rounded-xl h-12 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Image URL</label>
                      <Input 
                        required 
                        value={newChallenge.image_url} 
                        onChange={e => setNewChallenge({...newChallenge, image_url: e.target.value})}
                        className="bg-white/5 border-white/5 rounded-xl h-12 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Instructions / Rules (one per line)</label>
                    <Textarea 
                      value={newChallenge.rules} 
                      onChange={e => setNewChallenge({...newChallenge, rules: e.target.value})}
                      placeholder="Create a robust file layout...&#10;Implement active routes...&#10;Validate responsive margins..." 
                      className="bg-white/5 border-white/5 rounded-xl h-20 font-bold"
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-white/90">
                    Submit & Deploy
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.length === 0 && (
              <div className="col-span-3 text-center py-12 border border-white/5 rounded-3xl bg-white/[0.02]">
                <Trophy className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-black text-white/60 mb-2">No Quests Deployed Yet</h3>
                <p className="text-white/40 text-sm">You haven't created any coding challenges for the community yet.</p>
              </div>
            )}
            {filteredChallenges.map((c) => (
              <div key={c.id} className="premium-card p-6 bg-white/[0.02] border-white/5 rounded-3xl space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[8px]">
                      {c.category || 'Frontend'}
                    </Badge>
                    <Badge className={c.difficulty === 'hard' ? "bg-red-500/20 text-red-500 font-black uppercase tracking-widest text-[8px]" : c.difficulty === 'medium' ? "bg-yellow-500/20 text-yellow-500 font-black uppercase tracking-widest text-[8px]" : "bg-green-500/20 text-green-500 font-black uppercase tracking-widest text-[8px]"}>
                      {c.difficulty}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-white/40 line-clamp-3 leading-relaxed font-bold">{c.description}</p>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-white/[0.02]">
                  <span className="text-xs font-black text-white/80">{c.points_reward || 500} XP</span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleViewSubmissions(c.id)}
                      variant="outline" 
                      className="h-9 px-4 rounded-xl border-white/5 hover:bg-white/5 font-black uppercase tracking-widest text-[9px]"
                    >
                      <Users className="h-3 w-3 mr-2" />
                      View Answers
                    </Button>
                    <Button 
                      onClick={() => handleDeleteChallenge(c.id)}
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-500 text-white/40"
                    >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Submissions Dialog */}
          <Dialog open={isSubmissionsOpen} onOpenChange={setIsSubmissionsOpen}>
            <DialogContent className="sm:max-w-[700px] bg-[#0A0A0A] border-white/5 text-white rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Community Answers</DialogTitle>
                <DialogDescription className="text-white/40">Review all community submissions for this challenge.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {challengeSubmissions.length === 0 ? (
                  <p className="text-center text-white/40 font-bold py-8">No answers submitted yet.</p>
                ) : (
                  challengeSubmissions.map((sub) => (
                    <div key={sub.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                          {sub.profiles?.avatar_url ? (
                            <img src={sub.profiles.avatar_url} alt="" className="object-cover w-full h-full" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              <span className="text-xs font-black">{sub.profiles?.full_name?.charAt(0) || "U"}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-sm">{sub.profiles?.full_name || "User"}</h4>
                          <p className="text-[10px] font-bold text-white/40">@{sub.profiles?.username || "user"}</p>
                        </div>
                        <Badge className="ml-auto bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[8px]">
                          {sub.status || "completed"}
                        </Badge>
                      </div>
                      
                      {/* Submission Proof */}
                      {sub.proof_text && (
                        <div className="mt-4 border border-white/10 rounded-2xl overflow-hidden bg-black/50">
                          <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                            Submission Proof
                          </div>
                          <div className="p-4">
                            <p className="text-xs text-white/80">{sub.proof_text}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2 pt-2">
                        {sub.status === 'pending' && (
                          <Button 
                            onClick={() => handleApproveSubmission(sub.id, sub.user_id, sub.challenge_id)}
                            className="h-10 px-6 rounded-xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-[10px]"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve & Grant XP
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
          </div>
        )} {/* end activeTab === quests */}

      </main>
    </div>
  );
}