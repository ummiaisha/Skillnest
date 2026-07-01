"use client";

import { motion } from "framer-motion";
import { 
  Zap, 
  Trophy, 
  Star, 
  Share2, 
  MapPin, 
  Link as LinkIcon,
  Calendar,
  Grid,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [userChallenges, setUserChallenges] = useState<any[]>([]);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchFollowCounts = async () => {
    // Followers count
    const { count: followers } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id);
    
    // Following count
    const { count: following } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', id);
    
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user.id === id) {
        setIsCurrentUser(true);
      } else if (session) {
        // Check if following
        const { data: followData } = await supabase
          .from('followers')
          .select('*')
          .eq('follower_id', session.user.id)
          .eq('following_id', id)
          .maybeSingle();
        
        if (followData) setIsFollowing(true);
      }

      await fetchFollowCounts();

      // 1. Fetch Profile Data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profile) {
        setProfileData(profile);

        // 2. Fetch User Posts
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false });
        
        if (posts) setUserPosts(posts);

        // 3. Fetch User Badges
        const { data: badges } = await supabase
          .from('user_badges')
          .select('*, badges(*)')
          .eq('user_id', id);
        
        if (badges) setUserBadges(badges);

        // 4. Fetch User Challenges
        const { data: submissions } = await supabase
          .from('challenge_submissions')
          .select('*, challenges(*)')
          .eq('user_id', id);
        
        if (submissions) setUserChallenges(submissions);
      } else {
        toast.error("User not found");
      }
      
      setLoading(false);
    };

    fetchUserData();
  }, [id]);

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied to clipboard!");
  };

  const handleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to follow members");
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow: delete database record
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', id);

        if (error) throw error;

        setIsFollowing(false);
        toast.success(`Unfollowed ${profileData.full_name}`);
      } else {
        // Follow: insert database record
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: session.user.id,
            following_id: id
          });

        if (error) throw error;

        setIsFollowing(true);
        toast.success(`Following ${profileData.full_name}`);

        // Activity Log
        await supabase.from('activities').insert({
          user_id: session.user.id,
          type: 'Social Connection',
          content: `Started following ${profileData.full_name}`,
          metadata: { target_user_id: id }
        });
      }

      await fetchFollowCounts();
    } catch (error: any) {
      toast.error("Action failed: " + error.message);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-black">User Not Found</h1>
        <Link href="/dashboard">
          <Button variant="outline" className="rounded-full font-black uppercase tracking-widest text-[10px]">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-12">
      <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to network
      </Link>

      {/* Profile Header */}
      <section className="relative">
        <div className="h-48 w-full bg-gradient-to-br from-secondary/50 via-background to-secondary/30 rounded-[2.5rem] border border-border overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200&auto=format&fit=crop&q=60')] opacity-10 bg-cover bg-center" />
        </div>
        
        <div className="px-4 -mt-14 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="h-24 w-24 rounded-[2rem] bg-background border-4 border-background shadow-2xl overflow-hidden p-1 flex-shrink-0">
              <Avatar className="h-full w-full rounded-[1.5rem]">
                <AvatarImage src={profileData?.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-secondary text-3xl font-black">
                  {profileData?.full_name?.split(" ").map((n: any) => n[0]).join("") || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="pb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter">{profileData?.full_name || "Skill Legend"}</h1>
                {isCurrentUser && <Badge className="bg-foreground text-background text-[8px] uppercase tracking-tighter">You</Badge>}
              </div>
              <p className="text-muted-foreground font-bold text-xs">@{profileData?.username || "seeker"}</p>
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
          
          <div className="flex gap-1.5 pb-6 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShareProfile}
              className="rounded-full border-white/10 hover:bg-white/5 font-black text-[9px] uppercase tracking-widest px-4 h-8"
            >
              Share
            </Button>
            {isCurrentUser ? (
              <Link href="/profile">
                <Button 
                  className="rounded-full bg-white text-black hover:bg-white/90 font-black text-[9px] uppercase tracking-widest px-4 h-8"
                >
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <>
                <Link href={`/messages?userId=${id}`}>
                  <Button 
                    variant="outline"
                    className="rounded-full font-black text-[9px] uppercase tracking-widest px-4 h-8 border-white/10 hover:bg-white/5 transition-all"
                  >
                    <MessageSquare className="h-3 w-3 mr-2" /> Message
                  </Button>
                </Link>
                <Button 
                  onClick={handleFollow}
                  disabled={isFollowLoading}
                  className={cn(
                    "rounded-full font-black text-[9px] uppercase tracking-widest px-4 h-8 transition-all",
                    isFollowing 
                      ? "bg-secondary text-foreground hover:bg-secondary/80" 
                      : "bg-white text-black hover:bg-white/90"
                  )}
                >
                  {isFollowLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Info & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-10">
          <section className="space-y-4">
            <p className="text-sm font-medium leading-relaxed">{profileData?.bio || "Exploring the Skillnest ecosystem."}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Earth
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <LinkIcon className="h-3.5 w-3.5" /> skillnest.dev
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Joined {new Date(profileData?.created_at).toLocaleDateString()}
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
              {(!profileData?.skills || profileData.skills.length === 0) && (
                <p className="text-[10px] text-muted-foreground italic">Skills pending discovery...</p>
              )}
            </div>
          </section>

          <Card className="premium-card bg-[#0A0A0A] border-white/[0.05] rounded-[2.5rem] overflow-hidden">
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
                <Card key={post.id} className="premium-card p-6 space-y-4 rounded-[2rem] bg-[#0A0A0A] border-white/[0.05]">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black">{post.title || "Untitled Insight"}</h3>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {post.content.substring(0, 160)}...
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">0 Likes</span>
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">0 Comments</span>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-20 bg-secondary/10 rounded-[2.5rem] border-2 border-dashed border-border">
                  <Grid className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">No shared insights yet.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="challenges" className="space-y-4">
              {userChallenges.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {userChallenges.map((sub) => (
                    <Card key={sub.id} className="premium-card p-6 flex items-center justify-between rounded-[2rem] bg-[#0A0A0A] border-white/[0.05]">
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
                        {sub.status === 'completed' ? 'Verified' : 'In Progress'}
                      </Badge>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/10 rounded-[2.5rem] border-2 border-dashed border-border">
                  <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">This member hasn't completed any challenges yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              {userBadges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userBadges.map((ub) => (
                    <Card key={ub.id} className="premium-card p-6 text-center space-y-4 rounded-[2rem] bg-[#0A0A0A] border-white/[0.05]">
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
                <div className="text-center py-20 bg-secondary/10 rounded-[2.5rem] border-2 border-dashed border-border">
                  <Star className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">Collecting badges through hard work and mastery.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
