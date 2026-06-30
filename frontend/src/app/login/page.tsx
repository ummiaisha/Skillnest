"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      // Small delay to ensure session is stored
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) return toast.error("Please enter your email first.");
    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
      }
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Magic link sent! Check your email.");
    }
    setMagicLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-foreground/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/10 rounded-full blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>

        <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-1 pb-8 text-center pt-12">
            <CardTitle className="text-4xl font-black tracking-tighter">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground font-medium text-sm">
              Access your personalized skill-learning hub.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 px-8 pb-8">

            <form onSubmit={handleLogin} className="grid gap-5">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="email">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="rounded-2xl h-12 pl-12 bg-secondary/30 border-border focus:ring-foreground transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="rounded-2xl h-12 pl-12 pr-12 bg-secondary/30 border-border focus:ring-foreground transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  className="w-full rounded-2xl h-14 font-black text-xs uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xl group"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>

                {/* <Button 
                  type="button"
                  onClick={handleMagicLink}
                  disabled={magicLoading}
                  variant="ghost"
                  className="w-full rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  {magicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Magic Link"}
                </Button> */}
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-secondary/10 border-t border-border py-8 flex justify-center">
            <p className="text-xs text-muted-foreground font-bold">
              New to the platform?{" "}
              <Link href="/register" className="text-foreground font-black hover:underline underline-offset-4 uppercase tracking-widest">
                Create Account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
