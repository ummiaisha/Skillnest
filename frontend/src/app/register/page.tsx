"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Sign up user
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
        },
        emailRedirectTo: window.location.origin + "/dashboard",
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      if (data.session) {
        toast.success("Account created! Welcome to the hub.");
        window.location.href = "/dashboard";
      } else {
        toast.success("Account created! Please check your email for a verification link.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-foreground/5 rounded-full blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>

        <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-8 text-center pt-12 px-8">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center mb-6 shadow-xl">
              <UserPlus className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter">Create Your Account</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              Join the Hub and start your skill transformation today.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <form onSubmit={handleRegister} className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="full-name">Full Name</label>
                  <Input 
                    id="full-name" 
                    placeholder="John Doe" 
                    className="rounded-xl h-12 bg-secondary/30 border-border focus:ring-foreground transition-all"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="username">Username</label>
                  <Input 
                    id="username" 
                    placeholder="johndoe" 
                    className="rounded-xl h-12 bg-secondary/30 border-border focus:ring-foreground transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="email">Email Address</label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  className="rounded-xl h-12 bg-secondary/30 border-border focus:ring-foreground transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="password">Password</label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Minimum 6 characters"
                  className="rounded-xl h-12 bg-secondary/30 border-border focus:ring-foreground transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-2 px-1">
                <input type="checkbox" id="terms" className="rounded border-border bg-secondary/30" required />
                <label htmlFor="terms" className="text-xs text-muted-foreground font-medium">
                  I agree to the <Link href="/terms" className="text-foreground font-bold hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-foreground font-bold hover:underline">Privacy Policy</Link>.
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl h-12 font-black text-base mt-2 bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xl"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Free Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-secondary/20 border-t border-border py-6 flex justify-center">
            <p className="text-sm text-muted-foreground font-medium">
              Already a member?{" "}
              <Link href="/login" className="text-foreground font-black hover:underline underline-offset-4">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
