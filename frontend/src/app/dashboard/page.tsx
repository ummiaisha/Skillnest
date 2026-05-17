"use client";

import { motion } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Zap,
  Trophy,
  Lightbulb,
  Star,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  Send,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stories } from "@/components/Stories";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Dashboard uses real-time activities from Supabase.

export default function HomeFeedPage() {
  const [postContent, setPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [recentChallenges, setRecentChallenges] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [isSkillPickerOpen, setIsSkillPickerOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const router = useRouter();

  const fetchActivities = async (userId?: string) => {
    let query = supabase
      .from('activities')
      .select('*, profiles(*)');

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching activities:", error);
      return;
    }

    if (data) {
      const countsMap: any = { likes: {}, comments: {} };
      
      try {
        const { data: likeCounts } = await supabase.rpc('get_post_likes_counts');
        const { data: commentCounts } = await supabase.rpc('get_post_comments_counts');
        
        likeCounts?.forEach((c: any) => countsMap.likes[c.post_id] = c.count);
        commentCounts?.forEach((c: any) => countsMap.comments[c.post_id] = c.count);
      } catch (e) {
        console.error("Error fetching counts:", e);
      }

      if (userId) {
        const { data: userLikes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', userId);
        if (userLikes) {
          setLikedPosts(new Set(userLikes.map(l => l.post_id)));
        }
      }

      setActivities(data.map(a => ({
        id: a.metadata?.post_id || a.id,
        activity_id: a.id,
        user: { 
          id: a.profiles?.id || "",
          name: a.profiles?.full_name || "Skillnester",
          avatar: a.profiles?.avatar_url || "",
          initials: a.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("") || "SN"
        },
        type: a.type,
        title: a.content && a.content !== "0" ? a.content : "",
        content: a.metadata?.description || "",
        time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        likes: countsMap.likes[a.metadata?.post_id || a.id] || 0,
        comments: countsMap.comments[a.metadata?.post_id || a.id] || 0,
        xp: a.metadata?.xp || 0,
        image: a.metadata?.image,
        video: a.metadata?.video,
        skill: a.metadata?.skill
      })));
    }
  };

  useEffect(() => {
    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        
        // Fetch Real Profile Stats
        const { data: profile } = await supabase
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
        }

        // Fetch Recent Challenges
        const { data: challenges } = await supabase
          .from('challenges')
          .select('*')
          .limit(3);
        
        if (challenges) {
          setRecentChallenges(challenges.map(c => ({
            id: c.id,
            title: c.title,
            difficulty: c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1),
            points: c.points_reward,
            image_url: c.image_url
          })));
        }

        await fetchActivities(session.user.id);
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
    navigator.clipboard.writeText(`https://skillnest.dev/${profileData?.username || 'user'}`);
    toast.success("Profile link copied to clipboard!");
  };
  
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    if (!sessionUser) {
      toast.error("Authentication required. Please log in again.");
      console.error("Upload failed: No sessionUser found");
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    toast.info(`Preparing ${type} upload...`);

    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';

    // File size check (e.g., 50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large (max 50MB)");
      setUploadingMedia(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${sessionUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log("Starting upload:", { filePath, size: file.size, type: file.type || 'application/octet-stream' });

    // Start simulated progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) return 95;
        const increment = prev < 60 ? 7 : prev < 85 ? 3 : 1;
        return prev + increment;
      });
    }, 400);

    try {
      const { data, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        });

      if (uploadError) {
        clearInterval(progressInterval);
        console.error("Supabase Storage Error:", uploadError);
        throw uploadError;
      }

      if (!data) {
        clearInterval(progressInterval);
        throw new Error("Upload failed: No data returned from Supabase");
      }

      // Finish progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Short delay to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      if (type === 'image') {
        setSelectedImage(publicUrl);
        setSelectedVideo(null);
      } else {
        setSelectedVideo(publicUrl);
        setSelectedImage(null);
      }
      toast.success(`${type === 'image' ? 'Image' : 'Video'} attached!`);
    } catch (error: any) {
      console.error("Upload process error details:", error);
      const errorMessage = error?.message || error?.error_description || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      
      if (error.name !== 'AbortError' && !errorMessage.toLowerCase().includes('abort')) {
        toast.error("Upload failed. Please check your connection and try again.");
      }
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleCancelUpload = () => {
    setUploadingMedia(false);
    setUploadProgress(0);
    toast.info("Upload hidden. It may still finish in the background.");
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || !sessionUser) return;
    setIsPosting(true);
    
    try {
      // 1. Insert into posts
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: sessionUser.id,
          title: selectedSkill ? `Update on ${selectedSkill}` : "Dashboard Update",
          content: postContent,
          image_url: selectedImage,
          video_url: selectedVideo
        })
        .select()
        .single();

      if (postError) throw postError;

      // 2. Log as activity
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          user_id: sessionUser.id,
          type: selectedSkill ? 'Skill Progress' : 'Knowledge Shared',
          content: selectedSkill 
            ? `Developing my skills in ${selectedSkill}: ${postContent.substring(0, 30)}...` 
            : `Shared an update: ${postContent.substring(0, 50)}...`,
          metadata: { 
            description: postContent, 
            post_id: post.id,
            image: selectedImage,
            video: selectedVideo,
            skill: selectedSkill
          }
        });

      if (activityError) throw activityError;

      setPostContent("");
      setSelectedImage(null);
      setSelectedVideo(null);
      setSelectedSkill(null);
      toast.success("Update shared to the hub!");
      
      // Refresh feed
      await fetchActivities(sessionUser.id);
    } catch (error: any) {
      toast.error("Failed to share: " + error.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!sessionUser) return;
    
    const isLiked = likedPosts.has(postId);
    const newLikedPosts = new Set(likedPosts);
    
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', sessionUser.id).eq('post_id', postId);
        newLikedPosts.delete(postId);
      } else {
        await supabase.from('likes').insert({ user_id: sessionUser.id, post_id: postId });
        newLikedPosts.add(postId);
      }
      setLikedPosts(newLikedPosts);
      // Optional: Update local activities count
      setActivities(prev => prev.map(a => a.id === postId ? { ...a, likes: isLiked ? a.likes - 1 : a.likes + 1 } : a));
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleSharePost = async (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Skillnest Post',
          url: url
        });
      } else {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          toast.success("Post link copied!");
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            toast.success("Link copied!");
          } catch (err) {
            toast.error("Please copy the URL manually");
          }
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error("Sharing not supported");
      }
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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-8">
          {/* Stories Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Live Highlights</h2>
              <div className="h-[1px] flex-1 mx-4 bg-white/5" />
            </div>
            <Stories />
          </section>

          {/* Create Post Bar */}
          <Card className="premium-card p-6 bg-[#0A0A0A] border-white/[0.05] rounded-[32px] shadow-2xl">
            <div className="flex gap-4">
              <Avatar className="h-12 w-12 border border-white/10 ring-2 ring-white/5">
                <AvatarImage src={profileData?.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-secondary text-xs font-black">
                  {profileData?.full_name?.split(" ").map((n: any) => n[0]).join("") || "PI"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-6">
                <textarea
                  placeholder="Share your progress, a new skill, or ask a question..."
                  className="w-full bg-transparent border-none focus:ring-0 text-base font-medium resize-none h-24 placeholder:text-white/20"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                />
                {uploadingMedia && (
                  <div className="flex flex-col items-center gap-3 p-6 bg-white/[0.02] border border-white/10 rounded-[2rem] mt-4 animate-in fade-in zoom-in duration-500">
                    <div className="relative h-20 w-20">
                      <svg className="h-full w-full -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          className="text-white/5"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={226.2}
                          strokeDashoffset={uploadProgress <= 0 ? 220 : 226.2 - (226.2 * uploadProgress) / 100}
                          strokeLinecap="round"
                          className={cn("text-white transition-all duration-500 ease-out", uploadProgress <= 0 && "animate-pulse")}
                        />
                      </svg>
                      <button 
                        onClick={handleCancelUpload}
                        className="absolute inset-0 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors group"
                      >
                        <X className="h-6 w-6 text-white/20 group-hover:text-white transition-colors" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white tabular-nums tracking-tighter">{uploadProgress}%</p>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">Uploading Insight</p>
                    </div>
                  </div>
                )}
                {selectedImage && !uploadingMedia && (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 mt-4 group">
                    <img src={selectedImage} alt="Preview" className="object-cover w-full h-full" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {selectedVideo && !uploadingMedia && (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 mt-4 group">
                    <video src={selectedVideo} className="object-cover w-full h-full" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Video className="h-6 w-6 text-white/50" />
                    </div>
                    <button 
                      onClick={() => setSelectedVideo(null)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {selectedSkill && (
                  <div className="mt-4">
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest gap-2">
                      <Star className="h-3 w-3" /> {selectedSkill}
                      <button onClick={() => setSelectedSkill(null)} className="hover:text-white">×</button>
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-white/[0.03]">
                  <div className="flex gap-2">
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleMediaUpload(e, 'image')}
                      accept="image/*"
                      className="hidden"
                    />
                    <input 
                      type="file"
                      ref={videoInputRef}
                      onChange={(e) => {
                        console.log("Video input changed");
                        handleMediaUpload(e, 'video');
                      }}
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                      className="hidden"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={uploadingMedia}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("rounded-2xl h-11 px-4 gap-2 transition-all", selectedImage ? "bg-blue-500/10 text-blue-500" : "text-white/40 hover:text-white hover:bg-white/[0.05]")}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                        Image
                      </span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={uploadingMedia}
                      onClick={() => videoInputRef.current?.click()}
                      className={cn("rounded-2xl h-11 px-4 gap-2 transition-all", selectedVideo ? "bg-purple-500/10 text-purple-500" : "text-white/40 hover:text-white hover:bg-white/[0.05]")}
                    >
                      <Video className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                        Video
                      </span>
                    </Button>
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsSkillPickerOpen(!isSkillPickerOpen)}
                        className={cn("rounded-2xl h-11 px-4 gap-2 transition-all", selectedSkill ? "bg-yellow-500/10 text-yellow-500" : "text-white/40 hover:text-white hover:bg-white/[0.05]")}
                      >
                        <Star className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Skill</span>
                      </Button>
                      
                      {isSkillPickerOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                          {["React", "Next.js", "TypeScript", "Supabase", "UI Design"].map((skill) => (
                            <button
                              key={skill}
                              onClick={() => {
                                setSelectedSkill(skill);
                                setIsSkillPickerOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 rounded-xl hover:bg-white/5 text-xs font-bold transition-colors"
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreatePost}
                    disabled={(!postContent.trim() && !selectedImage && !selectedVideo) || isPosting || uploadingMedia}
                    className="bg-white text-black hover:bg-white/90 rounded-2xl font-black text-[10px] uppercase tracking-widest px-8 h-11 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50"
                  >
                    {isPosting ? "Posting..." : uploadingMedia ? "Uploading..." : "Share Update"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          
          <div className="space-y-6">
            {activities.map((post, i) => (
              <motion.div
                key={post.activity_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="premium-card overflow-hidden">
                  {post.user && (
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          className="h-10 w-10 border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => post.user.id && router.push(`/profile/${post.user.id}`)}
                        >
                          <AvatarImage src={post.user.avatar} className="object-cover" />
                          <AvatarFallback className="bg-secondary text-[10px] font-black">{post.user.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p 
                            className="text-sm font-bold leading-none hover:underline cursor-pointer transition-colors hover:text-white/80"
                            onClick={() => post.user.id && router.push(`/profile/${post.user.id}`)}
                          >
                            {post.user.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{post.time}</p>
                            {post.skill && (
                              <>
                                <div className="h-1 w-1 rounded-full bg-white/20" />
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] px-2 py-0.5 uppercase tracking-widest">
                                  {post.skill}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </CardHeader>
                  )}

                  <CardContent className={cn("p-6 pt-0", !post.user && "pt-6")}>
                    {post.title && <h3 className="font-black text-xl mb-3 tracking-tight">{post.title}</h3>}
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {post.content}
                    </p>
                    
                    {post.image && (
                      <div className="rounded-2xl overflow-hidden border border-border mb-4 aspect-video relative group cursor-pointer">
                        <img src={post.image} alt="Post content" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}

                    {post.video && (
                      <div className="rounded-2xl overflow-hidden border border-border mb-4 aspect-video relative group bg-black">
                        <video 
                          src={post.video} 
                          controls 
                          className="w-full h-full object-contain"
                          poster={post.image || ""}
                        />
                      </div>
                    )}
                  </CardContent>

                  {post.user && (
                    <CardFooter className="p-4 border-t border-white/[0.03] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleToggleLike(post.id)}
                          className={cn("gap-2 rounded-xl hover:bg-white/5 font-black text-[10px] uppercase tracking-widest transition-all", likedPosts.has(post.id) ? "text-red-500 bg-red-500/10" : "text-white/40")}
                        >
                          <Heart className={cn("h-4 w-4", likedPosts.has(post.id) && "fill-current")} /> {post.likes}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => router.push(`/post/${post.id}`)}
                          className="gap-2 rounded-xl hover:bg-white/5 font-black text-[10px] uppercase tracking-widest text-white/40"
                        >
                          <MessageCircle className="h-4 w-4" /> {post.comments}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSharePost(post.id)}
                          className="rounded-xl hover:bg-white/5 text-white/40"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {post.xp > 0 && (
                        <Badge variant="outline" className="bg-foreground text-background border-none font-black text-[8px] px-2 py-0.5 uppercase tracking-widest flex items-center gap-1">
                          <Zap className="h-2 w-2" /> +{post.xp} XP
                        </Badge>
                      )}
                    </CardFooter>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>


        {/* Right Sidebar: Stats & Community */}
        <div className="lg:col-span-4 space-y-8">
          {/* User Stats Card */}
          <Card className="premium-card bg-[#0A0A0A] border-white/[0.05] rounded-[32px] overflow-hidden">
            <div className="p-6 border-b border-white/[0.03]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Your Identity</h2>
                  <p className="text-xl font-black text-white">{profileData?.full_name || 'Your Profile'}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleShareProfile}
                    className="h-10 w-10 rounded-full border border-white/10 hover:bg-white/5"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/profile')}
                    className="h-10 w-10 rounded-full border border-white/10 hover:bg-white/5"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white mb-1">Points</p>
                  <p className="text-3xl font-black text-white">{profileData?.total_points || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white mb-1">Streak</p>
                  <p className="text-xl font-black text-white">{profileData?.streak || 0} 🔥</p>
                </div>
              </div>
              {(() => {
                const points = profileData?.total_points || 0;
                const currentLevel = Math.floor(points / 500) + 1;
                const nextLevelXP = currentLevel * 500;
                const prevLevelXP = (currentLevel - 1) * 500;
                const xpEarnedInCurrentLevel = points - prevLevelXP;
                const progressPercent = Math.min((xpEarnedInCurrentLevel / 500) * 100, 100);
                
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-white">Level {currentLevel}</span>
                      <span className="text-white/60">Next Level: {nextLevelXP} XP</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                  </div>
                );
              })()}
              <Button 
                onClick={() => router.push('/profile')}
                className="w-full bg-white text-black hover:bg-white/90 rounded-2xl font-black text-[10px] uppercase tracking-widest h-12 mt-4"
              >
                Go to Profile
              </Button>
            </div>
          </Card>

          {/* Trending Skills */}
          <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Trending Skills</h2>
            <div className="space-y-2">
              {[
                { name: "Next.js 15", users: "120K", grow: true },
                { name: "Tailwind CSS v4", users: "105K", grow: true },
                { name: "Supabase SSR", users: "90K", grow: true },
              ].map((skill, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all cursor-pointer group">
                  <span className="text-sm font-bold group-hover:translate-x-1 transition-transform">{skill.name}</span>
                  <Badge variant="outline" className="rounded-lg border-white/10 font-black text-[9px] uppercase tracking-widest">{skill.users}</Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Challenges Section */}
          {recentChallenges.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Active Quests</h2>
              <div className="space-y-4">
                {recentChallenges.map((challenge) => (
                  <Card key={challenge.id} className="premium-card bg-[#0A0A0A] border-white/[0.05] rounded-3xl overflow-hidden group cursor-pointer hover:border-primary/30 transition-all">
                    <div className="flex gap-4 p-4">
                      {challenge.image_url && (
                        <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-white/5 bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center">
                          <img 
                            src={challenge.image_url} 
                            alt="" 
                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <Zap className="h-6 w-6 text-white/10 absolute" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/20 text-primary px-2 py-0">
                            {challenge.difficulty}
                          </Badge>
                          <span className="text-[8px] font-black text-white/40">+{challenge.points} XP</span>
                        </div>
                        <h4 className="text-sm font-black text-white truncate group-hover:text-primary transition-colors">
                          {challenge.title}
                        </h4>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/40 w-1/3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Daily Spotlight */}
          <Card className="relative overflow-hidden rounded-[32px] bg-[#0A0A0A] text-white border border-white/5 shadow-2xl group cursor-pointer h-[320px]">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800" 
                className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" 
                alt=""
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
            </div>
            
            <CardHeader className="relative z-10 p-8">
              <Badge className="w-fit bg-primary text-background border-none text-[8px] font-black uppercase tracking-widest mb-4 px-3 py-1">Daily Spotlight</Badge>
              <CardTitle className="text-3xl font-black tracking-tighter leading-none group-hover:text-primary transition-colors duration-500">Mastering Glassmorphism</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-8 pt-0">
              <p className="text-sm font-medium text-white/60 leading-relaxed max-w-[200px]">
                Create a premium glass card using Tailwind CSS in 5 minutes.
              </p>
            </CardContent>
            <CardFooter className="relative z-10 p-8 pt-0 mt-auto">
              <Button className="w-full bg-white text-black hover:bg-primary hover:text-background rounded-2xl font-black text-[10px] uppercase tracking-widest h-12 transition-all duration-500">
                Start Now
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
