"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { LeftSidebar, RightSidebar } from "@/components/Sidebars";
import { cn } from "@/lib/utils";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isWorkspace = pathname?.includes("/workspace");
  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(pathname);
  
  const isAdminPage = pathname?.startsWith("/admin");
  const isUserDashboardPage = pathname?.startsWith("/user");
  const isMessagesPage = pathname?.startsWith("/messages");
  
  // Define pages where sidebars should be hidden
  const hideSidebars = [
    "/login", 
    "/register", 
    "/forgot-password",
    "/" 
  ].includes(pathname) || isWorkspace || isAdminPage || isUserDashboardPage || isMessagesPage;

  // Hide global navbar on auth pages, workspace page, admin pages, and user dashboard pages
  const hideNavbar = isAuthPage || isWorkspace || isAdminPage || isUserDashboardPage || isMessagesPage;

  return (
    <div className="flex flex-col min-h-screen">
      {!hideNavbar && <Navbar />}
      <div className={cn("flex flex-1", !hideNavbar && "pt-16")}>
        {!hideSidebars && <LeftSidebar />}
        <main className={cn(
          "flex-1 min-h-screen",
          !hideSidebars && "lg:ml-64 xl:mr-80"
        )}>
          {children}
        </main>
        {!hideSidebars && <RightSidebar />}
      </div>
    </div>
  );
}
