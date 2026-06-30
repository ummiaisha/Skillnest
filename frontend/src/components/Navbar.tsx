"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Search, User, Menu, LogIn, UserPlus, LogOut, Lightbulb, Trophy, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{posts: any[], challenges: any[], users: any[]}>({ posts: [], challenges: [], users: [] });
  const [showResults, setShowResults] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ posts: [], challenges: [], users: [] });
        return;
      }

      // Search Posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title')
        .ilike('title', `%${searchQuery}%`)
        .limit(3);

      // Search Challenges
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id, title')
        .ilike('title', `%${searchQuery}%`)
        .limit(3);

      // Search Users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(3);

      setSearchResults({ 
        posts: posts || [], 
        challenges: challenges || [], 
        users: users || [] 
      });
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged out successfully");
      router.push("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 bg-black rounded-xl flex items-center justify-center overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-500 relative">
              <img 
                src="/logo.svg" 
                alt="Skillnest Logo" 
                className="w-full h-full object-contain p-1"
              />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Skillnest</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/challenges" className="text-sm font-medium hover:text-primary transition-colors">Challenges</Link>
            <Link href="/skills" className="text-sm font-medium hover:text-primary transition-colors">Skill Feed</Link>
            <Link href="/leaderboard" className="text-sm font-medium hover:text-primary transition-colors">Leaderboard</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div ref={searchRef} className="hidden sm:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="h-9 w-64 rounded-full border border-border bg-secondary/50 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
            />

            {showResults && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 w-80 mt-2 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] shadow-2xl p-4 z-[100] overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                <div className="relative space-y-6">
                  {/* POSTS */}
                  {searchResults.posts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Skill Posts</p>
                      {searchResults.posts.map(post => (
                        <Link 
                          key={post.id} 
                          href={`/post/${post.id}`}
                          onClick={() => { setShowResults(false); setSearchQuery(""); }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background transition-colors">
                            <Lightbulb className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors truncate">{post.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* CHALLENGES */}
                  {searchResults.challenges.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Challenges</p>
                      {searchResults.challenges.map(challenge => (
                        <Link 
                          key={challenge.id} 
                          href={`/challenges/${challenge.id}`}
                          onClick={() => { setShowResults(false); setSearchQuery(""); }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-background transition-colors">
                            <Trophy className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors truncate">{challenge.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* USERS */}
                  {searchResults.users.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Community</p>
                      {searchResults.users.map(u => (
                        <Link 
                          key={u.id} 
                          href={`/profile/${u.id}`}
                          onClick={() => { setShowResults(false); setSearchQuery(""); }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <Avatar className="h-8 w-8 border border-white/10 group-hover:scale-105 transition-transform">
                            <AvatarImage src={u.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-secondary text-[10px] font-black">
                              {u.full_name?.split(" ").map((n: any) => n[0]).join("") || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{u.full_name}</span>
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">@{u.username}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.posts.length === 0 && searchResults.challenges.length === 0 && searchResults.users.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">No results found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-secondary animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={profile?.avatar_url} alt="User" className="object-cover" />
                    <AvatarFallback className="bg-secondary text-[10px] font-black">
                      {profile?.full_name?.split(" ").map((n: any) => n[0]).join("") || "PI"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 border-border/50 bg-background/95 backdrop-blur-xl shadow-xl">
                <div className="px-3 py-2 border-b border-border/50 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My Account</p>
                  <p className="text-sm font-bold truncate mt-1">{profile?.full_name || user?.email}</p>
                </div>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold">
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <Menu className="h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                {profile?.role === 'admin' && (
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 font-bold text-yellow-500 focus:text-yellow-500">
                    <Link href="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Admin Hub
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem 
                  className="rounded-xl cursor-pointer py-2.5 font-bold text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="font-bold rounded-xl h-9 text-xs">
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Sign In
                </Link>
              </Button>
              <Button asChild className="font-black rounded-xl h-9 text-xs bg-foreground text-background hover:bg-foreground/90 transition-all shadow-md px-4">
                <Link href="/register" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Join Now
                </Link>
              </Button>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-white/80 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden border-b border-border bg-[#050505]/95 backdrop-blur-2xl overflow-hidden z-40"
          >
            <div className="container mx-auto px-6 py-8 flex flex-col gap-6">
              {/* Mobile Search */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search anything..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  className="h-12 w-full rounded-2xl border border-white/5 bg-white/[0.02] pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-white/20 font-bold"
                />
                
                {showResults && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#0A0A0A] border border-white/[0.08] rounded-[2rem] shadow-2xl p-4 z-[100] max-h-72 overflow-y-auto">
                    <div className="relative space-y-6">
                      {/* POSTS */}
                      {searchResults.posts.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Skill Posts</p>
                          {searchResults.posts.map(post => (
                            <Link 
                              key={post.id} 
                              href={`/post/${post.id}`}
                              onClick={() => { setShowResults(false); setSearchQuery(""); setMobileMenuOpen(false); }}
                              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                            >
                              <Lightbulb className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold text-white/80 truncate">{post.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* CHALLENGES */}
                      {searchResults.challenges.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Challenges</p>
                          {searchResults.challenges.map(challenge => (
                            <Link 
                              key={challenge.id} 
                              href={`/challenges/${challenge.id}`}
                              onClick={() => { setShowResults(false); setSearchQuery(""); setMobileMenuOpen(false); }}
                              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                            >
                              <Trophy className="h-4 w-4 text-orange-500" />
                              <span className="text-xs font-bold text-white/80 truncate">{challenge.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* USERS */}
                      {searchResults.users.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Community</p>
                          {searchResults.users.map(u => (
                            <Link 
                              key={u.id} 
                              href={`/profile/${u.id}`}
                              onClick={() => { setShowResults(false); setSearchQuery(""); setMobileMenuOpen(false); }}
                              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                            >
                              <Avatar className="h-7 w-7 border border-white/10">
                                <AvatarImage src={u.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-secondary text-[8px] font-black">
                                  {u.full_name?.split(" ").map((n: any) => n[0]).join("") || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-bold text-white/80">@{u.username}</span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {searchResults.posts.length === 0 && searchResults.challenges.length === 0 && searchResults.users.length === 0 && (
                        <p className="text-center text-[10px] font-black uppercase tracking-widest text-white/20 italic py-4">No results found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/25 px-2 mb-1">Navigation</p>
                <Link href="/challenges" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] hover:bg-white/5 border border-white/5 font-bold text-sm text-white/80 transition-colors">
                  <span className="flex items-center gap-3"><Trophy className="h-4 w-4 text-orange-500" /> Challenges</span>
                </Link>
                <Link href="/skills" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] hover:bg-white/5 border border-white/5 font-bold text-sm text-white/80 transition-colors">
                  <span className="flex items-center gap-3"><Lightbulb className="h-4 w-4 text-primary" /> Skill Feed</span>
                </Link>
                <Link href="/leaderboard" className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] hover:bg-white/5 border border-white/5 font-bold text-sm text-white/80 transition-colors">
                  <span className="flex items-center gap-3"><User className="h-4 w-4 text-green-500" /> Leaderboard</span>
                </Link>
              </div>

              {/* User Account Controls */}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                {user ? (
                  <>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/25 px-2 mb-1">Account ({profile?.full_name || user?.email})</p>
                    <Link href="/profile" className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.01] hover:bg-white/5 border border-white/5 font-bold text-sm text-white/80 transition-colors">
                      <User className="h-4 w-4" /> My Profile
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.01] hover:bg-white/5 border border-white/5 font-bold text-sm text-white/80 transition-colors">
                      <Menu className="h-4 w-4" /> User Dashboard
                    </Link>
                    {profile?.role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.01] hover:bg-white/5 border border-yellow-500/10 text-yellow-500 font-bold text-sm transition-colors">
                        <Shield className="h-4 w-4" /> Admin Hub
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/5 hover:bg-destructive/10 border border-destructive/10 text-destructive font-bold text-sm text-left transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Log Out
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Button variant="ghost" asChild className="font-bold rounded-2xl h-12 text-sm border border-white/5">
                      <Link href="/login" className="flex items-center justify-center gap-2">
                        <LogIn className="h-4 w-4" /> Sign In
                      </Link>
                    </Button>
                    <Button asChild className="font-black rounded-2xl h-12 text-sm bg-white text-black hover:bg-white/90">
                      <Link href="/register" className="flex items-center justify-center gap-2">
                        <UserPlus className="h-4 w-4" /> Join Now
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
