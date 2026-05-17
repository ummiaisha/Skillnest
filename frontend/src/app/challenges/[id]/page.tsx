"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Clock, 
  Trophy, 
  Upload, 
  Users, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Link as LinkIcon,
  Image as ImageIcon,
  Send,
  Star,
  CornerDownRight,
  X as CloseIcon,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const getTimeLeft = (endDate: string) => {
  if (!endDate) return "Limited time";
  const total = Date.parse(endDate) - Date.now();
  if (total <= 0) return "Challenge Ended";
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days} days ${hours}h remaining`;
  return `${hours} hours remaining`;
};

export default function ChallengeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  // Submission Form State
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionUser(session?.user || null);
      
      await fetchChallengeData(session?.user?.id);
      setLoading(false);
    };

    init();
  }, [id]);

  const fetchChallengeData = async (userId?: string) => {
    // 1. Fetch Challenge Details
    const { data: challengeData } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();
    
    if (challengeData) {
      setChallenge(challengeData);
      if (challengeData.end_date) {
        setTimeLeft(getTimeLeft(challengeData.end_date));
      }
    }

    // 2. Check Participation
    if (userId) {
      const { data: submission } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (submission) {
        setIsJoined(true);
        if (submission.status === 'completed') setIsCompleted(true);
      }
    }

    // 3. Fetch Participants
    const { data: submissions } = await supabase
      .from('challenge_submissions')
      .select('*, profiles(*)')
      .eq('challenge_id', id)
      .order('created_at', { ascending: false });
    
    if (submissions) {
      setParticipants(submissions.map(s => ({
        id: s.profiles?.id,
        name: s.profiles?.full_name || s.profiles?.username || "Unknown User",
        avatar: s.profiles?.avatar_url,
        status: s.status === 'completed' ? 'Completed' : 'In Progress'
      })));
    }

    // 4. Fetch Discussions
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('challenge_id', id)
      .order('created_at', { ascending: true }); // Ascending for logical flow
    
    if (commentsData) {
      setComments(commentsData);
    }
  };

  const handleJoin = async () => {
    if (!sessionUser) {
      toast.error("Please login to join challenges");
      return;
    }

    const { error } = await supabase
      .from('challenge_submissions')
      .insert({
        challenge_id: id,
        user_id: sessionUser.id,
        status: 'pending'
      });

    if (error) {
      toast.error("Failed to join challenge");
    } else {
      setIsJoined(true);
      toast.success("Challenge joined! Time to level up.");
      await fetchChallengeData(sessionUser.id);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionUser) return;

    setUploadingProof(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${sessionUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `proofs/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      setProofUrl(publicUrl);
      toast.success("Proof media uploaded!");
    } catch (error) {
      toast.error("Failed to upload proof");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitSubmission = async () => {
    if (!proofUrl && !proofText) {
      toast.error("Please provide a link or upload a screenshot as proof");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('challenge_submissions')
      .update({ 
        status: 'completed', 
        proof_url: proofUrl,
        proof_text: proofText,
        completed_at: new Date().toISOString() 
      })
      .eq('challenge_id', id)
      .eq('user_id', sessionUser.id);

    if (error) {
      toast.error("Failed to submit proof");
    } else {
      setIsCompleted(true);
      setIsSubmitDialogOpen(false);
      toast.success("Submission received! XP points awarded.");
      await fetchChallengeData(sessionUser.id);
    }
    setSubmitting(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !sessionUser) return;

    const { error } = await supabase
      .from('comments')
      .insert({
        challenge_id: id,
        user_id: sessionUser.id,
        content: newComment.trim(),
        parent_id: replyTo?.id || null
      });

    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
      setReplyTo(null);
      await fetchChallengeData(sessionUser.id);
      toast.success(replyTo ? "Reply posted!" : "Comment posted!");
    }
  };

  const startReply = (comment: any) => {
    setReplyTo({ id: comment.id, name: comment.profiles?.full_name || comment.profiles?.username });
    commentInputRef.current?.focus();
    // Smooth scroll to top of discussion section
    const discussionsTab = document.querySelector('[value="discussions"]');
    discussionsTab?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Organize comments into threads
  const mainComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!challenge) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-muted-foreground">Challenge not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
      <Link href="/challenges" className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all group">
        <ArrowLeft className="mr-3 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to challenges
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-16">
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-8">
              <Badge className="bg-foreground text-background font-black text-[10px] px-3 py-1 uppercase tracking-widest border-none">
                {challenge.category || 'Development'}
              </Badge>
              <Badge variant="outline" className="border-white/10 uppercase font-black text-[10px] px-3 py-1 tracking-widest text-muted-foreground">
                {challenge.difficulty}
              </Badge>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 leading-[0.9]">{challenge.title}</h1>
            <p className="text-white/50 text-xl leading-relaxed font-medium max-w-2xl">
              {challenge.description || "Master new skills through hands-on challenges and earn rewards."}
            </p>
          </section>

          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-8">Challenge Rules</h2>
            <div className="grid gap-4">
              {(challenge.rules && challenge.rules.length > 0 ? challenge.rules : [
                "Use only Vanilla CSS or Tailwind CSS",
                "Minimum backdrop-blur value of 12px",
                "Must include a subtle border (white/10%)",
                "Submission must be a screenshot or live link"
              ]).map((rule: string, i: number) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                  <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-black shrink-0 group-hover:scale-110 transition-transform">{i + 1}</div>
                  <span className="text-sm font-bold text-white/80 leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </section>

          <Tabs defaultValue="participants" className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 w-fit mb-8">
              <TabsTrigger value="participants" className="rounded-full px-10 data-[state=active]:bg-white data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest transition-all h-10">Participants</TabsTrigger>
              <TabsTrigger value="discussions" className="rounded-full px-10 data-[state=active]:bg-white data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest transition-all h-10">Discussions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="participants">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {participants.length > 0 ? participants.map((user, i) => (
                  <Link href={`/profile/${user.id}`} key={i} className="flex items-center gap-4 p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.05] transition-all group">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={user.avatar} className="object-cover" />
                      <AvatarFallback className="bg-secondary text-[10px] font-black">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-black leading-none group-hover:text-primary transition-colors">{user.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={cn("h-1 w-1 rounded-full", user.status === "Completed" ? "bg-green-500" : "bg-blue-500")} />
                        <p className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          user.status === "Completed" ? "text-green-500" : "text-blue-500"
                        )}>{user.status}</p>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No active participants. Be the first!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="discussions" className="space-y-8">
              <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/10 scroll-mt-20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Join the conversation</h3>
                  {replyTo && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest gap-2 pl-3 pr-1 py-1">
                      Replying to {replyTo.name}
                      <button onClick={() => setReplyTo(null)} className="hover:bg-primary/20 rounded-full p-0.5"><CloseIcon className="h-3 w-3" /></button>
                    </Badge>
                  )}
                </div>
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 border border-white/10">
                    <AvatarImage src={sessionUser?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-secondary text-xs font-black">
                      {sessionUser?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <Textarea 
                      ref={commentInputRef}
                      placeholder={replyTo ? `Write your reply to ${replyTo.name}...` : "Share your thoughts or ask a question..."}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="bg-transparent border-white/5 focus:border-white/20 rounded-2xl min-h-[100px] resize-none placeholder:text-white/20 font-medium"
                    />
                    <div className="flex justify-end gap-3">
                      {replyTo && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setReplyTo(null)}
                          className="rounded-full text-white/40 font-black text-[10px] uppercase tracking-widest px-6 hover:text-white"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button 
                        onClick={handlePostComment}
                        disabled={!newComment.trim() || !sessionUser}
                        className="rounded-full bg-white text-black font-black text-[10px] uppercase tracking-widest px-8 hover:bg-white/90"
                      >
                        <Send className="h-3 w-3 mr-2" />
                        {replyTo ? "Post Reply" : "Post Insight"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {mainComments.map((comment) => (
                  <div key={comment.id} className="space-y-6">
                    <div className="flex gap-4 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                      <Avatar className="h-10 w-10 border border-white/10 shrink-0">
                        <AvatarImage src={comment.profiles?.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-secondary text-xs font-black">{comment.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-black">{comment.profiles?.full_name || comment.profiles?.username}</p>
                            <span className="text-[10px] font-medium text-white/20">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => startReply(comment)}
                            className="h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-primary hover:bg-primary/5 transition-all"
                          >
                            Reply
                          </Button>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed font-medium">
                          {comment.content}
                        </p>
                      </div>
                    </div>

                    {/* Replies */}
                    <div className="ml-12 space-y-4 border-l border-white/5 pl-8">
                      {getReplies(comment.id).map((reply) => (
                        <div key={reply.id} className="flex gap-3 p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/5 group relative">
                          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/5" />
                          <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                            <AvatarImage src={reply.profiles?.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-secondary text-[10px] font-black">{reply.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black">{reply.profiles?.full_name || reply.profiles?.username}</p>
                              <span className="text-[9px] font-medium text-white/20">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-white/50 leading-relaxed font-medium">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
          <Card className="premium-card bg-[#0A0A0A] border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black tracking-tight">Rewards</CardTitle>
              <CardDescription className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Mission Assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/5 border border-white/10 group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <Zap className="h-4 w-4 fill-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[11px] leading-tight whitespace-nowrap">XP Points</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/20 truncate">Immediate Grant</p>
                  </div>
                </div>
                <span className="font-black text-[12px] text-primary ml-2 shrink-0">+{challenge.points_reward}</span>
              </div>
              
              <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[11px] leading-tight whitespace-nowrap">Design Badge</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/20 truncate">Verified Reward</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-white/10 font-black text-[7px] uppercase tracking-widest px-2 py-0.5 ml-2 shrink-0">Rare</Badge>
              </div>

              {!isJoined ? (
                <Button 
                  onClick={handleJoin}
                  className="w-full rounded-[1.2rem] h-16 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 mt-4"
                >
                  Join Challenge
                </Button>
              ) : isCompleted ? (
                <div className="p-6 rounded-[1.2rem] bg-green-500/10 border border-green-500/20 text-green-500 text-center animate-in zoom-in duration-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Mission Complete</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-[1.2rem] bg-primary/10 border border-primary/20 text-primary flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Participating</span>
                  </div>

                  <Link href={`/challenges/${id}/workspace`} className="block w-full">
                    <Button 
                      className="w-full rounded-[1.2rem] h-14 bg-primary text-background font-black uppercase tracking-widest text-[10px] hover:bg-primary/95 transition-all shadow-[0_15px_30px_rgba(255,255,255,0.02)] gap-2 active:scale-95"
                    >
                      <Code className="h-4 w-4" />
                      Launch Workspace
                    </Button>
                  </Link>
                  
                  <div className="flex items-center gap-3 my-2 select-none justify-center">
                    <div className="h-[1px] bg-white/5 flex-1" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">or submit proof</span>
                    <div className="h-[1px] bg-white/5 flex-1" />
                  </div>
                  
                  <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full rounded-[1.2rem] h-14 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-white/90 transition-all shadow-xl gap-2 active:scale-95"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Submit Proof
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0D0D0D] border-white/10 rounded-[2.5rem] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight">Submit Mission Proof</DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                          Upload a screenshot or provide a live link to verify your completion.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Live URL / Link</label>
                          <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                            <Input 
                              placeholder="https://github.com/your-project" 
                              className="bg-white/5 border-white/5 pl-12 h-14 rounded-2xl focus-visible:ring-primary/50"
                              value={proofText}
                              onChange={(e) => setProofText(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Media Proof (Image/Video)</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              onChange={handleProofUpload}
                              accept="image/*,video/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="h-32 rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] group-hover:border-primary/40 group-hover:bg-primary/[0.02] transition-all flex flex-col items-center justify-center gap-3">
                              {uploadingProof ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              ) : proofUrl ? (
                                <div className="flex items-center gap-3 text-green-500 font-bold text-xs">
                                  <CheckCircle2 className="h-5 w-5" /> File Ready
                                </div>
                              ) : (
                                <>
                                  <ImageIcon className="h-6 w-6 text-white/20" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Drop or Click to Upload</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleSubmitSubmission}
                          disabled={submitting || uploadingProof}
                          className="rounded-2xl w-full h-14 bg-primary text-background font-black uppercase tracking-widest text-xs hover:bg-primary/90"
                        >
                          {submitting ? "Processing..." : "Complete Mission"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
            <div className="flex items-center gap-4 text-white/40 group">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-primary transition-colors">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white/80">{timeLeft || "Limited time"}</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Time remaining</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/40 group">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-primary transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white/80">{participants.length} Active Participants</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Learning together</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
