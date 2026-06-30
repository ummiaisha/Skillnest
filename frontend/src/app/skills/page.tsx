"use client";

import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  Heart, 
  Share2, 
  Bookmark,
  Lightbulb,
  ExternalLink,
  Code,
  Image as ImageIcon,
  Video,
  X,
  Loader2,
  Edit3,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Types and Constants will be managed within the component state or effects

export default function SkillPostsPage() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", image_url: "", video_url: "" });
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const router = useRouter();

  const handleToggleLike = async (postId: string) => {
    if (!sessionUser) {
      toast.error("Please log in to like posts");
      return;
    }

    const isLiked = likedPosts.has(postId);
    
    // Optimistic update
    const newLikedPosts = new Set(likedPosts);
    if (isLiked) newLikedPosts.delete(postId);
    else newLikedPosts.add(postId);
    setLikedPosts(newLikedPosts);

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', sessionUser.id);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: sessionUser.id });
      }
      fetchPosts(); // Refresh counts
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      setLikedPosts(likedPosts);
    }
  };

  const fetchPosts = async (filter = "latest", pageNum = 1, search = "", category: string | null = null) => {
    const pageSize = 6;
    let query = supabase
      .from('posts')
      .select('*, profiles(*)', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (filter === "latest") {
      query = query.order('created_at', { ascending: false });
    } else if (filter === "trending") {
      query = query.order('created_at', { ascending: false });
    } else if (filter === "following" && sessionUser) {
      const { data: followData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', sessionUser.id);
      
      const followingIds = followData?.map(f => f.following_id) || [];
      query = query.in('user_id', followingIds);
    }

    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data: postsData, error, count } = await query.range(from, to);
    
    if (postsData) {
      const countsMap: any = { likes: {}, comments: {} };
      try {
        const { data: likeCounts } = await supabase.rpc('get_post_likes_counts');
        const { data: commentCounts } = await supabase.rpc('get_post_comments_counts');
        
        likeCounts?.forEach((c: any) => countsMap.likes[c.post_id] = c.count);
        commentCounts?.forEach((c: any) => countsMap.comments[c.post_id] = c.count);
      } catch (e) {
        console.error("Error fetching interaction counts:", e);
      }

      let mappedPosts = postsData.map(p => ({
        id: p.id,
        user_id: p.user_id,
        author: { 
          name: p.profiles?.full_name || "Unknown", 
          avatar: p.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("") || "U",
          avatar_url: p.profiles?.avatar_url,
          bio: p.profiles?.bio || "Skillnest Member"
        },
        title: p.title || "Untitled Insight",
        excerpt: p.content.substring(0, 150) + (p.content.length > 150 ? "..." : ""),
        content: p.content,
        category: "General",
        image_url: p.image_url,
        video_url: p.video_url,
        likes: countsMap.likes[p.id] || 0,
        comments: countsMap.comments[p.id] || 0,
        readTime: `${Math.max(1, Math.ceil(p.content.split(' ').length / 200))} min read`,
        date: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
      }));

      if (filter === "trending") {
        mappedPosts = mappedPosts.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
      }

      if (pageNum === 1) {
        setPosts(mappedPosts);
      } else {
        setPosts(prev => [...prev, ...mappedPosts]);
      }
      
      setHasMore(count ? (from + postsData.length) < count : false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!sessionUser) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    toast.info(`Preparing ${type} upload...`);
    e.target.value = '';

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large (max 50MB)");
      setUploadingMedia(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${sessionUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

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
        throw uploadError;
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      if (isEditDialogOpen) {
        setEditingPost((prev: any) => ({
          ...prev,
          image_url: type === 'image' ? publicUrl : "",
          video_url: type === 'video' ? publicUrl : ""
        }));
      } else {
        setNewPost(prev => ({
          ...prev,
          image_url: type === 'image' ? publicUrl : "",
          video_url: type === 'video' ? publicUrl : ""
        }));
      }
      toast.success(`${type === 'image' ? 'Image' : 'Video'} attached!`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;

    const { error } = await supabase.from('posts').insert({
      user_id: sessionUser.id,
      title: newPost.title,
      content: newPost.content,
      image_url: newPost.image_url || null,
      video_url: newPost.video_url || null
    });

    if (error) {
      toast.error("Failed to share insight: " + error.message);
    } else {
      toast.success("Insight shared with the community!");
      setIsCreateDialogOpen(false);
      setNewPost({ title: "", content: "", image_url: "", video_url: "" });
      fetchPosts();
      
      // Log activity
      await supabase.from('activities').insert({
        user_id: sessionUser.id,
        type: 'Knowledge Shared',
        content: `Published a new insight: ${newPost.title}`,
        metadata: { 
          status: 'success',
          image: newPost.image_url || null,
          video: newPost.video_url || null
        }
      });
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser || !editingPost) return;

    const { error } = await supabase
      .from('posts')
      .update({
        title: editingPost.title,
        content: editingPost.content,
        image_url: editingPost.image_url || null,
        video_url: editingPost.video_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingPost.id)
      .eq('user_id', sessionUser.id);

    if (error) {
      toast.error("Failed to update insight: " + error.message);
    } else {
      toast.success("Insight updated successfully!");
      setIsEditDialogOpen(false);
      setEditingPost(null);
      fetchPosts(activeTab, page, searchQuery, selectedCategory);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', sessionUser.id);

    if (error) {
      toast.error("Failed to delete post: " + error.message);
    } else {
      toast.success("Post deleted successfully!");
      fetchPosts(activeTab, page, searchQuery, selectedCategory);
    }
  };

  useEffect(() => {
    // 1. Initial Check
    const initCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUser(session.user);
        setLoading(false);
      } else {
        window.location.href = "/login";
      }
    };
    initCheck();
    
    const fetchUserLikes = async (userId: string) => {
      const { data } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId);
      if (data) {
        setLikedPosts(new Set(data.map(l => l.post_id)));
      }
    };

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchUserLikes(session.user.id);
      }
      setPage(1);
      fetchPosts(activeTab, 1, searchQuery, selectedCategory);
    };

    loadData();
  }, [activeTab, searchQuery, selectedCategory]);

  useEffect(() => {
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
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/30 border border-border">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Community Knowledge</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Skill Lab</h1>
          <p className="text-muted-foreground font-medium text-lg max-w-lg">
            Insights, tutorials, and roadmaps shared by the Skillnest creator community.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-14 bg-foreground text-background font-black uppercase tracking-widest text-xs px-8 hover:bg-foreground/90 transition-all shadow-xl gap-2">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] bg-[#0A0A0A] border-white/[0.05] text-white rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Share Insight</DialogTitle>
              <DialogDescription className="text-white/40 text-xs">
                Contribute to the Skillnest knowledge base.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePost} className="space-y-6 py-4">
              <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 space-y-6 py-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Topic Title</label>
                  <Input 
                    placeholder="e.g. How I mastered React Server Components"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    className="bg-white/5 border-white/10 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Content</label>
                  <Textarea 
                    placeholder="Share your experience or tutorial..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    className="bg-white/5 border-white/10 rounded-xl min-h-[200px]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Attach Media</label>
                  <div className="flex gap-4">
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
                      onChange={(e) => handleMediaUpload(e, 'video')}
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                      className="hidden"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      disabled={uploadingMedia}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("rounded-xl h-11 px-4 gap-2 border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold", newPost.image_url && "border-primary/50 text-primary")}
                    >
                      <ImageIcon className="h-4 w-4" />
                      Upload Image
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      disabled={uploadingMedia}
                      onClick={() => videoInputRef.current?.click()}
                      className={cn("rounded-xl h-11 px-4 gap-2 border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold", newPost.video_url && "border-primary/50 text-primary")}
                    >
                      <Video className="h-4 w-4" />
                      Upload Video
                    </Button>
                  </div>

                  {uploadingMedia && (
                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl mt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div className="flex-1">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-black text-white">{uploadProgress}%</span>
                    </div>
                  )}

                  {newPost.image_url && !uploadingMedia && (
                    <div className="relative w-32 aspect-video rounded-xl overflow-hidden border border-white/10 mt-2 group">
                      <img src={newPost.image_url} alt="Uploaded preview" className="object-cover w-full h-full" />
                      <button 
                        type="button"
                        onClick={() => setNewPost(prev => ({ ...prev, image_url: "" }))}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}

                  {newPost.video_url && !uploadingMedia && (
                    <div className="relative w-32 aspect-video rounded-xl overflow-hidden border border-white/10 mt-2 group bg-black flex items-center justify-center">
                      <video src={newPost.video_url} className="object-contain w-full h-full" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="h-5 w-5 text-white/50" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setNewPost(prev => ({ ...prev, video_url: "" }))}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={uploadingMedia}
                  className="w-full rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] h-12 disabled:opacity-50"
                >
                  {uploadingMedia ? "Uploading Media..." : "Publish Insight"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      {/* Controls */}
      <section className="flex flex-col md:flex-row gap-4 items-center justify-between pt-8 border-t border-border/50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-secondary/30 p-1 rounded-full border border-border">
            <TabsTrigger value="latest" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all text-xs">Latest</TabsTrigger>
            <TabsTrigger value="trending" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all text-xs">Trending</TabsTrigger>
            <TabsTrigger value="following" className="rounded-full px-8 data-[state=active]:bg-foreground data-[state=active]:text-background font-bold transition-all text-xs">Following</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              className="rounded-full h-11 pl-10 bg-secondary/30 border-border text-xs font-bold focus-visible:ring-primary/20 transition-all" 
              placeholder="Search topics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant={selectedCategory ? "default" : "outline"}
            size="icon" 
            className={cn(
              "rounded-full h-11 w-11 border-border bg-secondary/30 transition-all",
              selectedCategory && "bg-foreground text-background"
            )}
            onClick={() => {
              // Quick toggle for a demo category or clearing
              if (selectedCategory) setSelectedCategory(null);
              else setSelectedCategory("web"); // Simple category filter demo
            }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {posts.length > 0 ? posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="premium-card h-full flex flex-col group overflow-hidden">
              <CardHeader className="p-0 border-b border-border/50">
                {post.image_url ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : post.video_url ? (
                  <div className="aspect-video w-full overflow-hidden bg-black flex items-center justify-center relative group">
                    <video 
                      src={post.video_url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                      muted
                      playsInline
                    />
                    <Video className="absolute h-8 w-8 text-white/50" />
                  </div>
                ) : null}
                <div className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-6 w-full">
                    <Badge variant="outline" className="border-border font-black text-[10px] uppercase tracking-widest px-3 py-1">
                      {post.category}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{post.date}</span>
                      {sessionUser && post.user_id === sessionUser.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-white/5 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground hover:text-white" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#0A0A0A] border-white/10 text-white rounded-xl">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingPost(post);
                                setIsEditDialogOpen(true);
                              }}
                              className="cursor-pointer font-bold text-xs hover:bg-white/5"
                            >
                              <Edit3 className="h-3.5 w-3.5 mr-2" />
                              Edit Insight
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeletePost(post.id)}
                              className="cursor-pointer font-bold text-xs text-red-500 hover:bg-red-500/10 focus:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete Insight
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                <h3 
                  onClick={() => router.push(`/post/${post.id}`)}
                  className="text-2xl font-black leading-tight group-hover:text-primary transition-colors cursor-pointer"
                >
                  {post.title}
                </h3>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 pt-0 flex-1">
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-3 pt-6 border-t border-border/50">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={post.author.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-secondary text-[10px] font-black">{post.author.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-black leading-none">{post.author.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{post.author.bio}</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 bg-secondary/10 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    onClick={() => handleToggleLike(post.id)}
                    className={cn(
                      "flex items-center gap-1.5 cursor-pointer transition-colors",
                      likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", likedPosts.has(post.id) && "fill-current")} />
                    <span className="text-[10px] font-black">{post.likes}</span>
                  </div>
                  <div 
                    onClick={() => router.push(`/post/${post.id}`)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-[10px] font-black">{post.comments}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{post.readTime}</span>
              </CardFooter>
            </Card>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center">
            <p className="text-muted-foreground font-medium italic">No insights shared yet. Be the first!</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8">
          <Button 
            variant="outline" 
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchPosts(activeTab, nextPage);
            }}
            className="rounded-full px-8 font-black text-[10px] uppercase tracking-widest border-border group"
          >
            Browse More Posts
          </Button>
        </div>
      )}
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setEditingPost(null);
      }}>
        <DialogContent className="sm:max-w-[525px] bg-[#0A0A0A] border-white/[0.05] text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Insight</DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              Update your shared insight in the knowledge base.
            </DialogDescription>
          </DialogHeader>
          {editingPost && (
            <form onSubmit={handleUpdatePost} className="space-y-6 py-4">
              <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4 space-y-6 py-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Topic Title</label>
                  <Input 
                    placeholder="e.g. How I mastered React Server Components"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                    className="bg-white/5 border-white/10 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Content</label>
                  <Textarea 
                    placeholder="Share your experience or tutorial..."
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                    className="bg-white/5 border-white/10 rounded-xl min-h-[200px]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Attach Media</label>
                  <div className="flex gap-4">
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
                      onChange={(e) => handleMediaUpload(e, 'video')}
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                      className="hidden"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      disabled={uploadingMedia}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("rounded-xl h-11 px-4 gap-2 border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold", editingPost.image_url && "border-primary/50 text-primary")}
                    >
                      <ImageIcon className="h-4 w-4" />
                      Upload Image
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      disabled={uploadingMedia}
                      onClick={() => videoInputRef.current?.click()}
                      className={cn("rounded-xl h-11 px-4 gap-2 border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold", editingPost.video_url && "border-primary/50 text-primary")}
                    >
                      <Video className="h-4 w-4" />
                      Upload Video
                    </Button>
                  </div>

                  {uploadingMedia && (
                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl mt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div className="flex-1">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-black text-white">{uploadProgress}%</span>
                    </div>
                  )}

                  {editingPost.image_url && !uploadingMedia && (
                    <div className="relative w-32 aspect-video rounded-xl overflow-hidden border border-white/10 mt-2 group">
                      <img src={editingPost.image_url} alt="Uploaded preview" className="object-cover w-full h-full" />
                      <button 
                        type="button"
                        onClick={() => setEditingPost({...editingPost, image_url: ""})}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}

                  {editingPost.video_url && !uploadingMedia && (
                    <div className="relative w-32 aspect-video rounded-xl overflow-hidden border border-white/10 mt-2 group bg-black flex items-center justify-center">
                      <video src={editingPost.video_url} className="object-contain w-full h-full" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="h-5 w-5 text-white/50" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditingPost({...editingPost, video_url: ""})}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={uploadingMedia}
                  className="w-full rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] h-12 disabled:opacity-50"
                >
                  {uploadingMedia ? "Uploading Media..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
