"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  Trophy, 
  Target, 
  ShieldAlert,
  ArrowLeft,
  Search,
  Trash2,
  Plus,
  Check,
  Crown,
  Settings,
  Sparkles,
  Terminal,
  Layers,
  Server,
  Database,
  Activity,
  Globe,
  Lock,
  Cpu,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "users" | "challenges" | "security" | "settings">("overview");
  const router = useRouter();

  // Overview stats
  const [stats, setStats] = useState([
    { label: "Total Users", value: "0", trend: "Registered profiles", icon: Users, up: true },
    { label: "Total Challenges", value: "0", trend: "Active quests", icon: Trophy, up: true },
    { label: "Pending Reviews", value: "0", trend: "Awaiting approval", icon: Server, up: false },
    { label: "Total XP Awarded", value: "0", trend: "Across all users", icon: Database, up: true },
  ]);

  const [logs, setLogs] = useState<any[]>([]);

  // Users Management
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");

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

  const handleAction = (action: string) => {
    toast.success(`${action} initiated successfully.`);
  };

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
          challenges:challenge_id (points_reward, title)
        `)
        .eq('challenge_id', challengeId)
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
        .select('points_reward, title')
        .eq('id', challengeId)
        .single();
        
      if (!challenge) return toast.error("Challenge not found.");

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
          if (profile.role !== 'admin') {
            toast.error("Access Denied: Requires Admin.");
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
    // 1. Fetch Users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false });
    if (profiles) setUsersList(profiles);

    // 2. Fetch Challenges
    const { data: challenges } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });
    if (challenges) setChallengesList(challenges);

    // 3. Calculate Real Stats
    if (profiles && challenges) {
      const totalUsers = profiles.length;
      const totalChallenges = challenges.length;
      const totalXP = profiles.reduce((sum: number, p: any) => sum + (p.total_points || 0), 0);

      // Fetch pending submissions count
      const { count: pendingCount } = await supabase
        .from('challenge_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats([
        { label: "Total Users", value: totalUsers.toLocaleString(), trend: "Registered profiles", icon: Users, up: true },
        { label: "Total Challenges", value: totalChallenges.toLocaleString(), trend: "Active quests", icon: Trophy, up: true },
        { label: "Pending Reviews", value: (pendingCount ?? 0).toString(), trend: "Awaiting approval", icon: Server, up: (pendingCount ?? 0) === 0 },
        { label: "Total XP Awarded", value: totalXP.toLocaleString(), trend: "Across all users", icon: Database, up: true },
      ]);
    }

    // 4. Fetch Activities (Logs)
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);
    
    if (activities) {
      setLogs(activities.map(log => ({
        event: log.type,
        details: log.content,
        time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'success'
      })));
    }
  };

  useEffect(() => {
    if (!loading) fetchData();
  }, [loading]);

  // User Actions
  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (!error) {
      toast.success(`User role updated to ${newRole}!`);
      fetchData();
    } else {
      toast.error("Failed to update user role.");
    }
  };

  const handleGrantXP = async (userId: string, currentPoints: number) => {
    const newPoints = currentPoints + 500;
    const newLevel = Math.floor(newPoints / 500) + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ total_points: newPoints, level: newLevel })
      .eq('id', userId);
    
    if (!error) {
      toast.success("Awarded +500 XP to user!");
      fetchData();
    } else {
      toast.error("Failed to award XP.");
    }
  };

  // Challenge Actions
  const handleDeleteChallenge = async (id: string) => {
    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id);
    
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
        rules: rulesArray
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
  const filteredUsers = usersList.filter(u => 
    (u.full_name?.toLowerCase() || "").includes(userSearch.toLowerCase()) || 
    (u.username?.toLowerCase() || "").includes(userSearch.toLowerCase())
  );

  const filteredChallenges = challengesList.filter(c => 
    (c.title?.toLowerCase() || "").includes(challengeSearch.toLowerCase()) || 
    (c.category?.toLowerCase() || "").includes(challengeSearch.toLowerCase())
  );

  return (
    <div className="flex w-full max-w-full min-h-screen bg-[#050505] text-white">
      {/* 🛡️ Custom Admin Side Navigation */}
      <aside className="w-64 border-r border-white/[0.05] bg-[#0A0A0A] p-6 hidden md:flex flex-col gap-6 justify-between shrink-0 font-sans min-h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center shadow-lg">
              {adminProfile?.avatar_url ? (
                <img src={adminProfile.avatar_url} alt="" className="object-cover w-full h-full" />
              ) : (
                <span className="text-xs font-black text-white">
                  {adminProfile?.full_name?.split(" ").map((n: any) => n[0]).join("").toUpperCase() || "A"}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight uppercase leading-none truncate max-w-[130px]" title={adminProfile?.full_name || "Admin Hub"}>
                {adminProfile?.full_name || "Admin Hub"}
              </h2>
              <span className="text-[9px] font-black tracking-widest text-white/30 uppercase mt-1 block">Level 1 Authority</span>
            </div>
          </div>
          
          <nav className="space-y-1">
            {[
              { id: "overview", label: "Executive Overview", icon: Layers },
              { id: "analytics", label: "Enterprise Analytics", icon: Activity },
              { id: "users", label: "Global User Matrix", icon: Globe },
              { id: "challenges", label: "Quest Deployment", icon: Trophy },
              { id: "security", label: "System Firewall", icon: Lock },
              { id: "settings", label: "Core Configuration", icon: Cpu },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3.5 h-12 px-4 rounded-2xl font-bold text-sm tracking-tight transition-all text-left ${
                    isActive 
                      ? "bg-white text-black shadow-lg" 
                      : "text-white/40 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Authority Status</span>
            </div>
            <p className="text-[10px] text-white/60 font-bold leading-normal">You are logged in as a fully authorized super administrator or Elite Member (10k+ XP).</p>
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
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12 overflow-y-auto">
        
        {/* Mobile Horizontal Tabs Selector */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none border-b border-white/[0.05]">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "analytics", label: "Analytics", icon: Activity },
            { id: "users", label: "Users", icon: Globe },
            { id: "challenges", label: "Quests", icon: Trophy },
            { id: "security", label: "Firewall", icon: Lock },
            { id: "settings", label: "Config", icon: Cpu },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 h-10 px-4 rounded-xl font-bold text-xs shrink-0 transition-all ${
                  isActive 
                    ? "bg-white text-black shadow-lg" 
                    : "bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Dynamic Headers based on selected tab */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter mb-2 flex items-center gap-3">
              <Button 
                onClick={() => router.push('/dashboard')}
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-full border border-white/10 hover:bg-white/5 md:hidden shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span>
                {activeTab === "overview" && "Executive Overview"}
                {activeTab === "analytics" && "Enterprise Analytics"}
                {activeTab === "users" && "Global User Matrix"}
                {activeTab === "challenges" && "Quest Deployment"}
                {activeTab === "security" && "System Firewall"}
                {activeTab === "settings" && "Core Configuration"}
              </span>
            </h1>
            <p className="text-white/40 font-medium">
              {activeTab === "overview" && "Live operations and critical system health logs."}
              {activeTab === "analytics" && "Deep-dive business intelligence and revenue metrics."}
              {activeTab === "users" && "Search, promote, grant experience, or audit user profiles."}
              {activeTab === "challenges" && "Create new coding missions, edit levels, or remove modules."}
              {activeTab === "security" && "Safety control, encryption status, and network defense."}
              {activeTab === "settings" && "Platform-wide operational variables and configurations."}
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <Badge variant="outline" className="h-10 px-4 rounded-full border-white/5 bg-[#0A0A0A] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Server Live</span>
            </Badge>
            <Button onClick={fetchData} variant="outline" className="h-10 rounded-full border-white/10 hover:bg-white/5 font-bold">Sync Database</Button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-8 -mx-4 px-4 sm:-mx-8 sm:px-8 no-scrollbar scroll-smooth">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "analytics", label: "Analytics", icon: Activity },
            { id: "users", label: "Users", icon: Globe },
            { id: "challenges", label: "Quests", icon: Trophy },
            { id: "security", label: "Security", icon: Lock },
            { id: "settings", label: "Settings", icon: Cpu },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 h-10 px-4 rounded-xl font-bold text-xs tracking-tight transition-all whitespace-nowrap shrink-0 ${
                  isActive 
                    ? "bg-white text-black shadow-lg" 
                    : "text-white/40 hover:text-white bg-white/[0.02] border border-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === "overview" && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="premium-card p-6 bg-white/[0.02] border-white/5 rounded-3xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-[10px] font-black ${stat.up ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.trend}
                    </span>
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{stat.label}</h3>
                  <p className="text-3xl font-black">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-1 border-white/5 bg-[#0A0A0A] rounded-[2rem] overflow-hidden">
                <CardHeader className="p-6 sm:p-8 pb-4">
                  <CardTitle className="text-xl font-black">Quick Actions</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-white/40">Navigate to key sections</CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pt-4 space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('users')}
                    className="w-full justify-start h-14 rounded-2xl border-white/5 px-6 group transition-all"
                  >
                    <Users className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm">Manage Users</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('challenges')}
                    className="w-full justify-start h-14 rounded-2xl border-white/5 px-6 group transition-all"
                  >
                    <Trophy className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm">Manage Quests</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('challenges')}
                    className="w-full justify-start h-14 rounded-2xl border-white/5 px-6 group transition-all"
                  >
                    <ShieldAlert className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm">Review Submissions</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchData}
                    className="w-full justify-start h-14 rounded-2xl border-white/5 px-6 group transition-all"
                  >
                    <Sparkles className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm">Refresh All Data</span>
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-8">
                <section className="p-6 sm:p-8 bg-[#0A0A0A] border border-white/5 rounded-[2rem]">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2.5">
                      <Terminal className="h-5 w-5 text-white/40" />
                      <h2 className="text-2xl font-black tracking-tight text-white">Health Monitor Logs</h2>
                    </div>
                    <Badge className="bg-green-500 text-black font-black uppercase tracking-widest text-[9px] px-2.5 py-1">Stable</Badge>
                  </div>
                  <div className="space-y-3">
                    {logs.map((log, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.02] transition-all min-w-0">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-xs uppercase tracking-tight text-white/80 truncate">{log.event}</h4>
                            <p className="text-[11px] text-white/40 font-medium break-words">{log.details}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 shrink-0 self-start sm:self-auto">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: USERS ==================== */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="relative h-14 w-full md:w-96 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center px-4">
              <Search className="h-4 w-4 text-white/40 mr-3" />
              <input 
                type="text"
                placeholder="Search username or name..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder-white/20 text-white"
              />
            </div>

            <div className="border border-white/5 bg-[#0A0A0A] rounded-[2rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                      <th className="p-6">User</th>
                      <th className="p-6">Role</th>
                      <th className="p-6 text-center">XP</th>
                      <th className="p-6 text-center">Level</th>
                      <th className="p-6 text-center">Streak</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="p-6 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-xs font-black">{u.full_name?.split(" ").map((n: any) => n[0]).join("") || "U"}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-sm text-white leading-none mb-1">{u.full_name || "Skillnester"}</p>
                            <p className="text-[10px] text-white/40 font-bold">@{u.username || "user"}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <Badge className={u.role === 'admin' ? "bg-white text-black font-black uppercase tracking-widest text-[8px]" : "bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[8px]"}>
                            {u.role || 'user'}
                          </Badge>
                        </td>
                        <td className="p-6 text-center font-black text-sm">{u.total_points || 0}</td>
                        <td className="p-6 text-center font-black text-sm">{u.level || 1}</td>
                        <td className="p-6 text-center font-black text-sm">{u.streak || 0} 🔥</td>
                        <td className="p-6 text-right space-x-2">
                          <Button 
                            onClick={() => handleToggleAdmin(u.id, u.role || 'user')}
                            variant="outline" 
                            className="h-8 rounded-xl text-[9px] border-white/5 hover:bg-white/5 font-black uppercase tracking-widest"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                          </Button>
                          <Button 
                            onClick={() => handleGrantXP(u.id, u.total_points || 0)}
                            variant="outline" 
                            className="h-8 rounded-xl text-[9px] border-white/5 hover:bg-white/5 font-black uppercase tracking-widest"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            +500 XP
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: CHALLENGES ==================== */}
        {activeTab === "challenges" && (
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
                        
                        {sub.proof_url && (
                          <div className="p-4 rounded-2xl bg-[#050505] border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Live Demo / Repository</p>
                            <a href={sub.proof_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-bold text-sm truncate block">
                              {sub.proof_url}
                            </a>
                          </div>
                        )}
                        
                        {sub.proof_text && (
                          <div className="p-4 rounded-2xl bg-[#050505] border border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Solution Explanation</p>
                            <p className="text-sm text-white/80 whitespace-pre-wrap">{sub.proof_text}</p>
                          </div>
                        )}
                        
                        {sub.workspace_files && Object.keys(sub.workspace_files).length > 0 && (
                           <div className="p-4 rounded-2xl bg-[#050505] border border-white/5 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Submitted Code Files</p>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                              {Object.entries(sub.workspace_files).map(([path, file]: any) => (
                                file.type === "file" && (
                                  <div key={path} className="rounded-xl border border-white/10 overflow-hidden bg-black">
                                    <div className="bg-white/5 px-4 py-2 border-b border-white/10 text-[10px] font-black text-white/60">
                                      {path}
                                    </div>
                                    <pre className="p-4 text-xs text-white/80 overflow-x-auto whitespace-pre-wrap">
                                      <code>{file.content}</code>
                                    </pre>
                                  </div>
                                )
                              ))}
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
                          <Button 
                            onClick={() => router.push(`/challenges/${sub.challenge_id}/workspace?review=${sub.id}`)}
                            variant="outline"
                            className="h-10 px-6 rounded-xl border-white/10 text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Review in Workspace
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

          </div>
        )}


        {/* ==================== TAB 4: SECURITY & FLAGS ==================== */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-white/5 bg-[#0A0A0A] rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8">
                <CardTitle className="text-xl font-black">Flagged Reports</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-white/40">User-reported issues awaiting review</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <ShieldAlert className="h-7 w-7 text-white/20" />
                  </div>
                  <p className="font-black text-sm text-white/40 uppercase tracking-widest">No flagged reports</p>
                  <p className="text-xs text-white/20 font-bold mt-2">All clear — no active reports to review.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card bg-[#0A0A0A] border-white/5 p-8 rounded-[2rem]">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black">System Security</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Shields</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {[
                  { label: "IP Rate Limiting", desc: "Active on logins and saves", active: true },
                  { label: "AI Plagiarism Check", desc: "Monaco submission scan active", active: true },
                  { label: "Strict RLS Policies", desc: "Supabase authentication guard active", active: true },
                ].map((shield, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/[0.02]">
                    <div>
                      <p className="text-xs font-black">{shield.label}</p>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{shield.desc}</p>
                    </div>
                    <Badge className="bg-green-500 text-black font-black uppercase tracking-widest text-[8px]">Armed</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 5: ANALYTICS ==================== */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <Card className="premium-card bg-[#0A0A0A] border-white/5 rounded-[2rem] p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black">User Signups by Month</h2>
                  <p className="text-white/40 text-sm font-bold">Based on profile creation dates in the database</p>
                </div>
              </div>
              {usersList.length > 0 ? (
                <div className="overflow-x-auto pb-4 no-scrollbar">
                  <div className="h-64 flex items-end gap-2 justify-between min-w-[600px]">
                    {(() => {
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const counts = new Array(12).fill(0);
                      const now = new Date();
                      usersList.forEach((u: any) => {
                        if (u.created_at) {
                          const d = new Date(u.created_at);
                          const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
                          if (monthsAgo >= 0 && monthsAgo < 12) {
                            counts[11 - monthsAgo]++;
                          }
                        }
                      });
                      const max = Math.max(...counts, 1);
                      return counts.map((count, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full relative group cursor-pointer" style={{ height: "240px", display: "flex", alignItems: "flex-end" }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(count / max) * 100}%` }}
                              transition={{ delay: i * 0.05 }}
                              className="w-full bg-white/10 hover:bg-white rounded-t-xl transition-all relative"
                            >
                              {count > 0 && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black px-2 py-0.5 rounded-lg text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {count} users
                                </div>
                              )}
                            </motion.div>
                          </div>
                          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{months[(new Date().getMonth() - 11 + i + 12) % 12]}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-white/20 font-bold">Loading data...</div>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="premium-card bg-[#0A0A0A] border-white/5 p-8 rounded-[2rem]">
                <CardTitle className="text-lg font-black mb-6">XP Distribution</CardTitle>
                <div className="space-y-4">
                  {[
                    { label: "0 XP (New)", count: usersList.filter((u: any) => (u.total_points || 0) === 0).length },
                    { label: "1–500 XP", count: usersList.filter((u: any) => (u.total_points || 0) > 0 && (u.total_points || 0) <= 500).length },
                    { label: "501–2000 XP", count: usersList.filter((u: any) => (u.total_points || 0) > 500 && (u.total_points || 0) <= 2000).length },
                    { label: "2001+ XP", count: usersList.filter((u: any) => (u.total_points || 0) > 2000).length },
                  ].map((tier, i) => {
                    const max = Math.max(...[0,1,2,3].map(j => usersList.filter((u: any) => {
                      const p = u.total_points || 0;
                      if (j === 0) return p === 0;
                      if (j === 1) return p > 0 && p <= 500;
                      if (j === 2) return p > 500 && p <= 2000;
                      return p > 2000;
                    }).length), 1);
                    return (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <span className="font-bold text-sm text-white/60 w-24 shrink-0">{tier.label}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(tier.count / max) * 100}%` }} />
                        </div>
                        <span className="font-black text-sm w-8 text-right">{tier.count}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card className="premium-card bg-[#0A0A0A] border-white/5 p-8 rounded-[2rem]">
                <CardTitle className="text-lg font-black mb-6">Challenge Difficulty Split</CardTitle>
                <div className="space-y-4">
                  {[
                    { label: "Easy", count: challengesList.filter((c: any) => c.difficulty === 'easy').length, color: "bg-green-500" },
                    { label: "Medium", count: challengesList.filter((c: any) => c.difficulty === 'medium').length, color: "bg-yellow-500" },
                    { label: "Hard", count: challengesList.filter((c: any) => c.difficulty === 'hard').length, color: "bg-red-500" },
                  ].map((tier, i) => {
                    const total = Math.max(challengesList.length, 1);
                    return (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <span className="font-bold text-sm text-white/60 w-16 shrink-0">{tier.label}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${tier.color} rounded-full transition-all`} style={{ width: `${(tier.count / total) * 100}%` }} />
                        </div>
                        <span className="font-black text-sm w-8 text-right">{tier.count}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: SETTINGS ==================== */}
        {activeTab === "settings" && (
          <div className="max-w-3xl space-y-8">
            <Card className="premium-card bg-[#0A0A0A] border-white/5 p-8 rounded-[2rem]">
              <CardTitle className="text-xl font-black mb-2">Global Environment Variables</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-8">Requires Level 1 Authorization to edit</CardDescription>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Maintenance Mode</label>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div>
                      <p className="font-bold text-sm">Disable Public Access</p>
                      <p className="text-xs text-white/40 font-medium">Only admins will be able to log in.</p>
                    </div>
                    <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">API Rate Limiting</label>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div>
                      <p className="font-bold text-sm">Strict Rate Limit</p>
                      <p className="text-xs text-white/40 font-medium">Cap API requests to 100/min per IP.</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                      <div className="w-4 h-4 bg-black rounded-full absolute top-1 right-1" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Registration</label>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div>
                      <p className="font-bold text-sm">Allow New Signups</p>
                      <p className="text-xs text-white/40 font-medium">Open the platform to new users.</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                      <div className="w-4 h-4 bg-black rounded-full absolute top-1 right-1" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-end gap-4">
              <Button variant="outline" className="h-12 px-8 rounded-full font-black border-white/10 text-white/60">Discard Changes</Button>
              <Button className="h-12 px-8 rounded-full bg-white text-black font-black shadow-[0_0_20px_rgba(255,255,255,0.2)]">Save Configuration</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
