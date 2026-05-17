"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share2, Zap, ArrowLeft, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionUser(session?.user);

      // Fetch Post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (postError) {
        toast.error("Post not found");
        router.push("/dashboard");
        return;
      }

      // Fetch Comments
      const { data: commentData } = await supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url)')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      // Fetch Likes Count
      const { count: likesCount } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', id);

      // Check if liked
      if (session?.user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', session.user.id)
          .maybeSingle();
        setLiked(!!likeData);
      }

      setPost({ ...postData, likes_count: likesCount || 0 });
      setComments(commentData || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: post?.title || 'Skillnest Post',
      text: post?.content?.substring(0, 100),
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } else {
        // Secure context check for navigator.clipboard
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
        } else {
          // Fallback for non-secure contexts
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
        console.error("Share error:", err);
        toast.error("Sharing not supported on this browser");
      }
    }
  };

  const handleLike = async () => {
    if (!sessionUser) return;
    try {
      if (liked) {
        await supabase.from('likes').delete().eq('post_id', id).eq('user_id', sessionUser.id);
        setLiked(false);
        setPost((prev: any) => ({ ...prev, likes_count: (prev.likes_count || 1) - 1 }));
      } else {
        await supabase.from('likes').insert({ post_id: id, user_id: sessionUser.id });
        setLiked(true);
        setPost((prev: any) => ({ ...prev, likes_count: (prev.likes_count || 0) + 1 }));
      }
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleCommentSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || !sessionUser) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: id,
          user_id: sessionUser.id,
          content: newComment,
          parent_id: replyingTo?.id || null
        })
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;

      setComments([...comments, data]);
      setNewComment("");
      setReplyingTo(null);
      toast.success(replyingTo ? "Reply added!" : "Comment added!");
    } catch (error: any) {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-6 gap-2 text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Button>

        <Card className="premium-card overflow-hidden bg-[#0A0A0A] border-white/[0.05] rounded-[32px] shadow-2xl">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-white/10">
                  <AvatarImage src={post.profiles?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-secondary font-black">
                    {post.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base font-bold">{post.profiles?.full_name}</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                    {new Date(post.created_at).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-5 w-5 text-white/40" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 space-y-6">
            <div className="space-y-4">
              {post.title && <h1 className="text-3xl font-black tracking-tighter leading-tight">{post.title}</h1>}
              <p className="text-white/70 text-lg leading-relaxed font-medium">
                {post.content}
              </p>
            </div>

            {post.image_url && (
              <div className="rounded-[24px] overflow-hidden border border-white/10 shadow-2xl">
                <img src={post.image_url} alt="Post content" className="w-full h-auto object-cover" />
              </div>
            )}

            {post.video_url && (
              <div className="rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-black">
                <video 
                  src={post.video_url} 
                  controls 
                  className="w-full h-auto max-h-[600px]"
                  poster={post.image_url || ""}
                />
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-white/[0.03]">
              <Button 
                variant="ghost" 
                onClick={handleLike}
                className={cn("gap-2 rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-widest transition-all", liked ? "text-red-500 bg-red-500/10" : "text-white/40 hover:bg-white/5")}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                {post.likes_count || 0} {liked ? "Liked" : "Like"}
              </Button>
              <Button 
                variant="ghost" 
                className="gap-2 rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-widest text-primary bg-primary/5 border border-primary/10"
              >
                <MessageCircle className="h-4 w-4" />
                {comments.length} Comments
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleShare}
                className="gap-2 rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-widest text-white/40 hover:bg-white/5"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </CardContent>

          <div className="bg-white/[0.01] border-t border-white/[0.03] p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-8">Discussion</h3>
            
            <div className="space-y-8">
              <AnimatePresence mode="popLayout">
                {comments.filter(c => !c.parent_id).map((comment, i) => (
                  <div key={comment.id} className="space-y-6">
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-4 group"
                    >
                      <Avatar className="h-10 w-10 border border-white/5 flex-shrink-0">
                        <AvatarImage src={comment.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs font-black">
                          {comment.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="bg-white/[0.03] rounded-[24px] p-5 border border-white/[0.05] group-hover:bg-white/[0.05] transition-colors relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{comment.profiles?.full_name}</span>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed font-medium">
                            {comment.content}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setReplyingTo({ id: comment.id, name: comment.profiles?.full_name })}
                            className="absolute -bottom-4 right-4 h-8 px-4 rounded-full bg-black border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-primary hover:border-primary/50 transition-all opacity-0 group-hover:opacity-100"
                          >
                            Reply
                          </Button>
                        </div>

                        {/* Nested Replies */}
                        <div className="pl-6 space-y-4 pt-2 border-l border-white/[0.03] ml-5">
                          {comments.filter(reply => {
                            // Show if immediate child
                            if (reply.parent_id === comment.id) return true;
                            
                            // Show if it's a reply to one of the children (recursive-ish flat display)
                            const isReplyToChild = comments.some(c => c.id === reply.parent_id && c.parent_id === comment.id);
                            // We can extend this for deeper levels if needed, but 2 levels of nesting is usually enough for UI
                            return isReplyToChild;
                          }).map((reply) => (
                            <div key={reply.id} className="flex gap-3 group/reply">
                              <Avatar className="h-8 w-8 border border-white/5 flex-shrink-0">
                                <AvatarImage src={reply.profiles?.avatar_url} />
                                <AvatarFallback className="text-[10px] font-black">
                                  {reply.profiles?.full_name?.split(" ").map((n: any) => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 bg-white/[0.02] rounded-[20px] p-4 border border-white/[0.03] relative group-hover/reply:bg-white/[0.04] transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{reply.profiles?.full_name}</span>
                                    {reply.parent_id !== comment.id && (
                                      <span className="text-[7px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">
                                        Replying to {comments.find(c => c.id === reply.parent_id)?.profiles?.full_name}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[7px] font-black text-white/10 uppercase tracking-widest">
                                    {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-white/70 leading-relaxed">
                                  {reply.content}
                                </p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setReplyingTo({ id: reply.id, name: reply.profiles?.full_name })}
                                  className="absolute -bottom-3 right-3 h-6 px-3 rounded-full bg-black border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/30 hover:text-primary hover:border-primary/50 transition-all opacity-0 group-hover/reply:opacity-100 shadow-xl"
                                >
                                  Reply
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </AnimatePresence>

              {comments.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <MessageCircle className="h-6 w-6 text-white/10" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/20">No comments yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Comment Box */}
            <div className="mt-12 pt-8 border-t border-white/[0.03]">
              {replyingTo && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 mb-4 animate-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Replying to {replyingTo.name}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setReplyingTo(null)}
                    className="h-6 px-2 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/20"
                  >
                    Cancel
                  </Button>
                </div>
              )}
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 border border-white/10">
                  <AvatarImage src={sessionUser?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs font-black">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Input 
                    placeholder="Add your voice to the discussion..." 
                    className="bg-white/[0.03] border-white/10 rounded-2xl h-14 text-sm px-6 focus-visible:ring-primary/20"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                    disabled={isSubmitting}
                  />
                  <Button 
                    size="icon" 
                    disabled={!newComment.trim() || isSubmitting}
                    onClick={() => handleCommentSubmit()}
                    className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-white text-black hover:bg-white/90 shadow-xl"
                  >
                    <Zap className="h-5 w-5 fill-current" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
