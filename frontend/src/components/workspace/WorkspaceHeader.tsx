"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  BookOpen, 
  Zap, 
  Clock, 
  Save, 
  Check, 
  UploadCloud, 
  HelpCircle,
  Trophy,
  Activity
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface WorkspaceHeaderProps {
  challenge: any;
  saveStatus: "saved" | "saving" | "unsaved";
  timeLeft: string;
  onSave: () => void;
  onSubmit: () => void;
  submitting: boolean;
  isReviewMode?: boolean;
  reviewUser?: any;
}

export default function WorkspaceHeader({
  challenge,
  saveStatus,
  timeLeft,
  onSave,
  onSubmit,
  submitting,
  isReviewMode,
  reviewUser
}: WorkspaceHeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <header className="w-full bg-[#0a0a0a] border-b border-white/5 px-6 h-16 flex items-center justify-between shrink-0 select-none">
      {/* Left Area: Navigation & Title */}
      <div className="flex items-center gap-4">
        <Link 
          href={isReviewMode ? "/admin" : `/challenges/${challenge.id}`} 
          className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">Code Lab</span>
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30 leading-none">{challenge.category || "Development"}</span>
          </div>
          <h2 className="text-sm font-black tracking-tight text-white leading-normal mt-0.5 max-w-[200px] sm:max-w-none truncate">
            {challenge.title}
          </h2>
        </div>
      </div>

      {/* Middle Area: Save Indicator & Drawer Trigger */}
      <div className="flex items-center gap-4">
        {/* Save indicator */}
        {!isReviewMode && (
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all text-[9px] font-black uppercase tracking-widest text-white/60"
          >
            {saveStatus === "saving" ? (
              <>
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Saving...</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="h-3 w-3 text-primary animate-pulse" />
                <span>Unsaved changes</span>
              </>
            )}
          </button>
        )}

        {/* Challenge Instructions Drawer Toggle */}
        <Button
          onClick={() => setIsDrawerOpen(true)}
          variant="outline"
          className="rounded-full h-8 px-4 border-white/10 text-white/60 hover:text-white bg-transparent gap-2 text-[9px] font-black uppercase tracking-widest"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Instructions
        </Button>
      </div>

      {/* Right Area: Timer & Main Actions */}
      <div className="flex items-center gap-4">
        {/* Countdown */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">{timeLeft || "No Limit"}</span>
        </div>

        {/* Submit Solution Button */}
        {isReviewMode ? (
           <div className="flex items-center gap-3 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20">
             <div className="h-4 w-4 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
               {reviewUser?.avatar_url ? (
                 <img src={reviewUser.avatar_url} className="w-full h-full object-cover" />
               ) : (
                 <span className="text-[8px] font-black">{reviewUser?.full_name?.charAt(0) || "U"}</span>
               )}
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
               Reviewing {reviewUser?.full_name || "User"}
             </span>
           </div>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="h-9 rounded-full bg-white hover:bg-white/95 text-black text-[9px] font-black uppercase tracking-widest px-6 gap-2 shadow-[0_10px_20px_rgba(255,255,255,0.05)] active:scale-95 transition-transform"
          >
            <UploadCloud className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Mission"}
          </Button>
        )}
      </div>

      {/* Collapsible Challenge Details Dialog Drawer */}
      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="bg-[#0c0c0c] border-white/5 rounded-[2.5rem] max-w-lg p-8 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/25 border-none text-primary text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5">
                {challenge.difficulty || "medium"}
              </Badge>
              <Badge variant="outline" className="border-white/10 text-white/40 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5">
                {challenge.category || "Skill development"}
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-white">{challenge.title}</DialogTitle>
            <DialogDescription className="text-white/45 text-xs font-semibold leading-relaxed pt-2">
              {challenge.description || "Master this quest by coding your solution directly in-browser."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6 max-h-[400px] overflow-y-auto pr-2">
            {/* Rules checklist */}
            <div className="space-y-4">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 ml-1">Submission Rules</span>
              <div className="grid gap-3">
                {(challenge.rules && challenge.rules.length > 0 ? challenge.rules : [
                  "Write clean, responsive HTML syntax.",
                  "Integrate CSS styles elegantly inside style templates.",
                  "Add JS interactivity inside source files.",
                  "Ensure external resources align correctly in paths."
                ]).map((rule: string, i: number) => (
                  <div key={i} className="flex items-start gap-4.5 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="h-5 w-5 rounded-lg bg-secondary flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</div>
                    <span className="text-xs font-bold text-white/70 leading-normal">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rewards Card */}
            <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Trophy className="h-5 w-5 fill-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Mission Bounty</h4>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Instantly Granted on Submission</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-primary">
                <Zap className="h-4 w-4 fill-primary animate-pulse" />
                <span className="text-sm font-black">+{challenge.points_reward || 500} XP</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
