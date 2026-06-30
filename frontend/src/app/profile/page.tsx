"use client";

import { motion } from "framer-motion";
import { 
  Zap, 
  Trophy, 
  Star, 
  Settings, 
  Share2, 
  MapPin, 
  Link as LinkIcon,
  Calendar,
  Grid,
  List,
  Edit3,
  Camera,
  Upload,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

const user = {
  name: "Promise Ibeh",
  username: "ibeh",
  bio: "Frontend Architect & UI Engineer. Building the future of social-learning platforms. 🚀",
  location: "Lagos, Nigeria",
  website: "skillnest.hub",
  joined: "May 2026",
  points: "24.8K",
  streak: 12,
  badges: 48,
  skills: ["React", "Next.js", "TypeScript", "Tailwind", "Supabase", "Framer Motion"]
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [userChallenges, setUserChallenges] = useState<any[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    skills: "",
    avatar_url: "",
    location: "",
    website: ""
  });
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const router = useRouter();

  const fetchFollowCounts = async (userId: string) => {
    // Followers count
    const { count: followers } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    
    // Following count
    const { count: following } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);
    
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };

  useEffect(() => {
    const detectLocation = async (userId: string, currentCity: string) => {
      if (currentCity && currentCity !== "The Metaverse") return;
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.city && data.country_name) {
          const loc = `${data.city}, ${data.country_name}`;
          await supabase.from('profiles').update({ location: loc }).eq('id', userId);
          setProfileData((prev: any) => ({ ...prev, location: loc }));
        }
      } catch (e) {
        console.error("Location detection failed", e);
      }
    };

    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        
        // Fetch Real Profile Data
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        // Calculate Streak based on active activity dates
        const { data: userActivities } = await supabase
          .from('activities')
          .select('created_at')
          .eq('user_id', session.user.id);
        
        let calculatedStreak = 0;
        if (userActivities && userActivities.length > 0) {
          const dates = Array.from(new Set(userActivities.map(a => new Date(a.created_at).toLocaleDateString('en-CA'))))
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          
          const todayStr = new Date().toLocaleDateString('en-CA');
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString('en-CA');

          if (dates[0] === todayStr || dates[0] === yesterdayStr) {
            let checkDate = new Date(dates[0]);
            while (true) {
              const checkDateStr = checkDate.toLocaleDateString('en-CA');
              if (dates.includes(checkDateStr)) {
                calculatedStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }
          }
        }

        if (profile) {
          if (profile.streak !== calculatedStreak) {
            await supabase
              .from('profiles')
              .update({ streak: calculatedStreak })
              .eq('id', session.user.id);
            profile.streak = calculatedStreak;
          }
          setProfileData(profile);
          setEditForm({
            full_name: profile.full_name || "",
            username: profile.username || "",
            bio: profile.bio || "",
            skills: profile.skills?.join(", ") || "",
            avatar_url: profile.avatar_url || "",
            location: profile.location || "",
            website: profile.website || ""
          });

          // Attempt to detect location if missing
          if (!profile.location) {
            detectLocation(session.user.id, profile.location);
          }

          // Fetch User Posts
          const { data: posts } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
          
          if (posts) setUserPosts(posts);

          // Fetch User Badges
          const { data: badges } = await supabase
            .from('user_badges')
            .select('*, badges(*)')
            .eq('user_id', session.user.id);
          
          if (badges) setUserBadges(badges);

          // Fetch User Challenges
          const { data: submissions } = await supabase
            .from('challenge_submissions')
            .select('*, challenges(*)')
            .eq('user_id', session.user.id);
          
          if (submissions) setUserChallenges(submissions);

          await fetchFollowCounts(session.user.id);
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

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied to clipboard!");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;

    const updatedProfile = {
      full_name: editForm.full_name,
      username: editForm.username.trim() || null,
      bio: editForm.bio,
      skills: editForm.skills.split(",").map(s => s.trim()).filter(s => s !== ""),
      avatar_url: editForm.avatar_url,
      location: editForm.location,
      website: editForm.website,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('profiles')
      .update(updatedProfile)
      .eq('id', sessionUser.id);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      setProfileData({ ...profileData, ...updatedProfile });
      setIsEditDialogOpen(false);
      toast.success("Profile updated successfully!");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionUser) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditForm({ ...editForm, avatar_url: publicUrl });
      toast.success("Photo uploaded successfully!");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Profile Header */}
      <section className="relative">
        <div className="h-48 w-full bg-gradient-to-br from-secondary/50 via-background to-secondary/30 rounded-[2rem] border border-border overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200&auto=format&fit=crop&q=60')] opacity-10 bg-cover bg-center" />
        </div>
        
        <div className="px-8 -mt-16 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="h-32 w-32 rounded-[2.5rem] bg-background border-8 border-background shadow-2xl overflow-hidden p-1 flex-shrink-0">
              <Avatar className="h-full w-full rounded-[2rem]">
                <AvatarImage src={profileData?.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-secondary text-3xl font-black">
                  {profileData?.full_name?.split(" ").map((n: any) => n[0]).join("") || "PI"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="pb-8">
              <h1 className="text-3xl font-black tracking-tighter">{profileData?.full_name || "Skill Legend"}</h1>
              <p className="text-muted-foreground font-bold text-sm">@{profileData?.username || "seeker"}</p>
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{followerCount}</span>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{followingCount}</span>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Following</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pb-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShareProfile}
              className="rounded-full border-white/10 hover:bg-white/5 font-black text-[9px] uppercase tracking-widest px-6 h-10"
            >
              Share
            </Button>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="rounded-full bg-white text-black hover:bg-white/90 font-black text-[9px] uppercase tracking-widest px-6 h-10"
                >
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/[0.05] text-white rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Edit Profile</DialogTitle>
                  <DialogDescription className="text-white/40 text-xs">
                    Make changes to your profile here. Click save when you're done.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center py-4">
                  <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <Avatar className={cn(
                      "h-24 w-24 rounded-[2rem] border-4 border-white/5 shadow-2xl transition-all",
                      isUploading ? "opacity-50" : "group-hover:scale-105"
                    )}>
                      <AvatarImage src={editForm.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-secondary text-2xl font-black">
                        {editForm.full_name?.split(" ").map((n: any) => n[0]).join("") || "PI"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <input 
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploading}
                    />
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile}>
                  <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 space-y-6 py-4 custom-scrollbar">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Full Name</label>
                      <Input 
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="bg-white/5 border-white/10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Username</label>
                      <Input 
                        value={editForm.username}
                        onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                        className="bg-white/5 border-white/10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Bio</label>
                      <Textarea 
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        className="bg-white/5 border-white/10 rounded-xl min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Skills (comma separated)</label>
                      <Input 
                        value={editForm.skills}
                        onChange={(e) => setEditForm({...editForm, skills: e.target.value})}
                        className="bg-white/5 border-white/10 rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Location</label>
                        <Input 
                          value={editForm.location}
                          onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                          placeholder="e.g. Lagos, Nigeria"
                          className="bg-white/5 border-white/10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Website</label>
                        <Input 
                          value={editForm.website}
                          onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                          placeholder="skillnest.hub"
                          className="bg-white/5 border-white/10 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="pt-6">
                    <Button type="submit" className="w-full rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] h-12">
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Info & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-10">
          <section className="space-y-4">
            <p className="text-sm font-medium leading-relaxed">{profileData?.bio || "No bio yet. Start your journey!"}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {profileData?.location || "The Metaverse"}
              </div>
              {profileData?.website && (
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5" /> 
                  <a href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {profileData.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Joined {new Date(profileData?.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Core Skills</h2>
            <div className="flex flex-wrap gap-2">
              {(profileData?.skills || []).map((skill: string) => (
                <Badge key={skill} variant="secondary" className="bg-secondary/30 border border-border font-bold text-[10px] px-3 py-1 rounded-lg">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>

          <Card className="premium-card bg-[#0A0A0A] border-white/[0.05] rounded-[2rem] overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white mb-1">Points</p>
                  <p className="text-xl font-black text-white">{profileData?.total_points || 0}</p>
                </div>
                <div className="border-x border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white mb-1">Streak</p>
                  <p className="text-xl font-black text-white">{profileData?.streak || 0}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white mb-1">Level</p>
                  <p className="text-xl font-black text-white">{profileData?.level || 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="bg-secondary/30 p-1 rounded-full border border-border mb-8">
              <TabsTrigger value="posts" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all text-xs flex items-center gap-2">
                <Grid className="h-3.5 w-3.5" /> Posts
              </TabsTrigger>
              <TabsTrigger value="challenges" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all text-xs flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5" /> Challenges
              </TabsTrigger>
              <TabsTrigger value="badges" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all text-xs flex items-center gap-2">
                <Star className="h-3.5 w-3.5" /> Badges
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="space-y-6">
              {userPosts.length > 0 ? userPosts.map((post) => (
                <Card key={post.id} className="premium-card p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black">{post.title || "Untitled Insight"}</h3>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {post.content.substring(0, 160)}...
                  </p>
                  
                  {(post.image_url || post.video_url) && (
                    <div className="rounded-xl overflow-hidden border border-white/5 aspect-video w-full max-w-sm relative group cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <Video className="h-8 w-8 text-white/20" />
                          <video src={post.video_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">0 Likes</span>
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">0 Comments</span>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-20 bg-secondary/10 rounded-[2rem] border-2 border-dashed border-border">
                  <Grid className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">You haven't shared any insights yet.</p>
                  <Link href="/skills">
                    <Button variant="link" className="mt-2 font-black text-foreground uppercase tracking-widest text-[10px]">Go to Skill Lab</Button>
                  </Link>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="challenges" className="space-y-4">
              {userChallenges.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {userChallenges.map((sub) => (
                    <Card key={sub.id} className="premium-card p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-secondary/30 flex items-center justify-center border border-border">
                          <Trophy className="h-6 w-6 text-foreground" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black">{sub.challenges?.title || "Untitled Challenge"}</h4>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Status: {sub.status}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full font-black text-[8px] uppercase tracking-widest px-4 border-border">
                        {sub.status === 'completed' ? 'Verified' : 'Pending'}
                      </Badge>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/10 rounded-[2rem] border-2 border-dashed border-border">
                  <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">Complete your first challenge to see it here!</p>
                  <Link href="/challenges">
                    <Button variant="link" className="mt-2 font-black text-foreground uppercase tracking-widest text-[10px]">Explore Challenges</Button>
                  </Link>
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              {userBadges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userBadges.map((ub) => (
                    <Card key={ub.id} className="premium-card p-6 text-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 mx-auto flex items-center justify-center border border-yellow-500/20">
                        <Star className="h-8 w-8 text-yellow-500" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest">{ub.badges?.name || "Skill Badge"}</h4>
                        <p className="text-[9px] font-bold text-muted-foreground mt-1 line-clamp-1">{ub.badges?.description || "Earned through excellence"}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/10 rounded-[2rem] border-2 border-dashed border-border">
                  <Star className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">Collect badges by completing expert challenges!</p>
                  <Link href="/challenges">
                    <Button variant="link" className="mt-2 font-black text-foreground uppercase tracking-widest text-[10px]">View Challenges</Button>
                  </Link>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
