"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Send, User, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUser(session.user);

      // Fetch messages where current user is sender or receiver to get unique conversed users
      const { data: userMessages } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
        
      const conversedUserIds = new Set<string>();
      if (userMessages) {
        userMessages.forEach(msg => {
          if (msg.sender_id !== session.user.id) conversedUserIds.add(msg.sender_id);
          if (msg.receiver_id !== session.user.id) conversedUserIds.add(msg.receiver_id);
        });
      }

      // If opening a chat from a profile, add them to the list
      const searchParams = new URLSearchParams(window.location.search);
      const queryUserId = searchParams.get('userId');
      if (queryUserId) conversedUserIds.add(queryUserId);

      const idsArray = Array.from(conversedUserIds);

      if (idsArray.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", idsArray);
          
        if (profiles) {
          setUsers(profiles);
          // Auto-select if arriving from profile
          if (queryUserId) {
            const selected = profiles.find(p => p.id === queryUserId);
            if (selected) setSelectedUser(selected);
          }
        }
      }
    };
    init();
  }, []);

  // Search for new users to chat with
  useEffect(() => {
    if (!currentUser) return;

    const searchGlobalUsers = async () => {
      if (searchQuery.length < 2) {
        setGlobalSearchResults([]);
        return;
      }

      const { data: matchedProfiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .neq("id", currentUser.id)
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(5);

      if (matchedProfiles) {
        const activeIds = new Set(users.map(u => u.id));
        const filteredResults = matchedProfiles.filter(p => !activeIds.has(p.id));
        setGlobalSearchResults(filteredResults);
      }
    };

    const timer = setTimeout(searchGlobalUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser, users]);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`messages_${currentUser.id}_${selectedUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUser.id}`, // Listen for messages sent to me
        },
        (payload) => {
          // If the message is from the selected user, add it to the view
          if (payload.new.sender_id === selectedUser.id) {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${currentUser.id}`, // Listen for messages I send (across multiple devices)
        },
        (payload) => {
          // If I sent a message to the selected user, add it
          if (payload.new.receiver_id === selectedUser.id) {
            setMessages((prev) => {
              // Avoid duplicates if we already added it optimistically
              if (!prev.find(m => m.id === payload.new.id)) {
                return [...prev, payload.new];
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedUser]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedUser) return;

    const tempMessage = {
      id: crypto.randomUUID(),
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      read: false
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    // Send to DB
    await supabase.from("messages").insert([
      {
        id: tempMessage.id,
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: tempMessage.content,
      }
    ]);
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
    (u.username?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar - Contacts List */}
      <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col shrink-0 ${selectedUser ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-8 w-8 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left h-4 w-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </Button>
            <h2 className="text-xl font-bold">Messages</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-background/50 border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Active Chats Section */}
          <div className="space-y-1">
            {filteredUsers.length > 0 && (
              <>
                <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                  Active Chats
                </div>
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50 ${selectedUser?.id === user.id ? 'bg-secondary/50' : ''}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.full_name || user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">Tap to chat</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Global Search / Start New Chat Section */}
          <div className="mt-4 space-y-1">
            {globalSearchResults.length > 0 && (
              <>
                <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/30 border-t border-border/30 pt-4">
                  Find New Creators
                </div>
                {globalSearchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setUsers(prev => [user, ...prev]);
                      setSelectedUser(user);
                      setSearchQuery("");
                      setGlobalSearchResults([]);
                    }}
                    className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50"
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.full_name || user.username}</p>
                      <p className="text-xs text-blue-500 font-bold truncate">Start new conversation</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {filteredUsers.length === 0 && globalSearchResults.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No users found</div>
          )}
        </div>
      </div>

      {/* Right Area - Active Chat */}
      <div className={`flex-1 min-w-0 flex flex-col bg-background ${selectedUser ? "flex" : "hidden md:flex"}`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border bg-card px-6 flex items-center gap-4 shrink-0 shadow-sm z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedUser(null)} 
                className="h-8 w-8 rounded-full md:hidden mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-10 w-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-bold">{selectedUser.full_name || selectedUser.username}</h3>
                <p className="text-xs text-green-500 font-medium">Available</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
                    <p>Start a conversation with {selectedUser.full_name || selectedUser.username}</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === currentUser.id;
                  
                  return (
                    <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-br-sm' 
                            : 'bg-secondary text-foreground rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-card border-t border-border shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  className="flex-1 bg-background border-border rounded-full px-6"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="rounded-full w-10 h-10 p-0 shrink-0 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-4">
              <div className="h-20 w-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Your Messages</h3>
              <p>Select a user from the sidebar to start chatting.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
