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

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="rounded-2xl h-12 border-border bg-secondary/30 hover:bg-secondary/50 font-bold transition-all gap-2 group">
                <GithubIcon />
                <span className="hidden sm:inline">Github</span>
              </Button>
              <Button variant="outline" className="rounded-2xl h-12 border-border bg-secondary/30 hover:bg-secondary/50 font-bold transition-all gap-2 group">
                <GoogleIcon />
                <span className="hidden sm:inline">Google</span>
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black">
                <span className="bg-background px-4 text-muted-foreground">Or secure access</span>
              </div>
            </div>

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
                  <Link href="/forgot-password" size="sm" className="text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
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
                
                <Button 
                  type="button"
                  onClick={handleMagicLink}
                  disabled={magicLoading}
                  variant="ghost"
                  className="w-full rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  {magicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Magic Link"}
                </Button>
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

        {/* Temporary Debug Reset Button */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors opacity-50"
          >
            Emergency Reset (Clear Cache)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
