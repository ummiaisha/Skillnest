"use client";

import { motion } from "framer-motion";
import { 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  Ban, 
  Mail, 
  User, 
  ArrowUpDown,
  Filter,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const users = [
  { id: 1, name: "Alex Rivers", email: "alex@example.com", role: "Admin", points: "24,850", status: "Active" },
  { id: 2, name: "Sarah Chen", email: "sarah@example.com", role: "User", points: "22,120", status: "Active" },
  { id: 3, name: "John Smith", email: "john@example.com", role: "User", points: "20,450", status: "Active" },
  { id: 4, name: "Aishatu Abubakar", email: "aishatu@example.com", role: "Admin", points: "18,920", status: "Active" },
  { id: 5, name: "Evil Troll", email: "troll@example.com", role: "User", points: "0", status: "Banned" },
];

export default function ManageUsersPage() {
  return (
    <div className="container mx-auto px-4 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
        <div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter mb-4">Manage Users</h1>
          <p className="text-muted-foreground font-medium text-lg">Oversee community members and their permissions.</p>
        </div>
        <Button variant="outline" className="rounded-full h-12 px-8 font-black border-border hover:bg-secondary/50 shadow-sm">
          <Mail className="mr-2 h-5 w-5" /> Bulk Email
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="h-12 pl-12 rounded-2xl bg-secondary/30 border-border focus:ring-foreground" placeholder="Search by name, email or role..." />
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-border">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-border">
            <ArrowUpDown className="mr-2 h-4 w-4" /> Sort
          </Button>
        </div>
      </div>

      <Card className="premium-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/20 border-b border-border">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">User</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Email</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Role</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total XP</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/5 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-border group-hover:scale-110 transition-transform">
                          <AvatarFallback className="bg-foreground text-background font-black text-xs">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-base">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-medium text-muted-foreground text-sm">{user.email}</td>
                    <td className="px-8 py-6">
                      <Badge className={`rounded-lg px-3 py-1 font-black uppercase tracking-widest text-[9px] ${
                        user.role === 'Admin' ? 'bg-foreground text-background shadow-lg' : 'bg-secondary text-foreground'
                      }`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 font-black text-sm tracking-tight">{user.points} XP</td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        user.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2 p-2">
                          <DropdownMenuItem className="rounded-lg font-bold gap-2">
                            <User className="h-4 w-4" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg font-bold gap-2">
                            <Mail className="h-4 w-4" /> Send Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <DropdownMenuItem className="rounded-lg font-bold gap-2">
                            <ShieldCheck className="h-4 w-4" /> Promote to Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg font-bold gap-2 text-destructive">
                            <Ban className="h-4 w-4" /> Ban User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 flex justify-between items-center px-8">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Showing 5 of 1,240 users</p>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6" disabled>Prev</Button>
          <Button variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6">Next</Button>
        </div>
      </div>
    </div>
  );
}
