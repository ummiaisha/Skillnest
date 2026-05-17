"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

// Workspace components
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import FileTree, { FileMap, WorkspaceFile } from "@/components/workspace/FileTree";
import CodeEditor from "@/components/workspace/CodeEditor";
import LivePreview from "@/components/workspace/LivePreview";
import ConsolePanel from "@/components/workspace/ConsolePanel";

export default function WorkspacePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewId = searchParams.get('review');
  const isReviewMode = !!reviewId;

  // Core App states
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [reviewUser, setReviewUser] = useState<any>(null);
  const [challenge, setChallenge] = useState<any>(null);
  
  // Workspace File System States
  const [files, setFiles] = useState<FileMap>({});
  const [activeFile, setActiveFile] = useState<string>("");
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  
  // UX states
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [timeLeft, setTimeLeft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [triggerCompile, setTriggerCompile] = useState(0);
  
  // Hoisted Package modal states
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [customPackage, setCustomPackage] = useState("");

  const popularPackages = [
    { name: "Tailwind CSS", desc: "Premium Utility-first CSS", tag: '<script src="https://cdn.tailwindcss.com"></script>' },
    { name: "FontAwesome Icons", desc: "Interactive rich symbols catalog", tag: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">' },
    { name: "Canvas Confetti", desc: "Celebrate success and milestones", tag: '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>' },
    { name: "Chart.js", desc: "Premium charts and data rendering", tag: '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' },
    { name: "Three.js", desc: "High-performance 3D graphics", tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>' },
    { name: "GSAP (GreenSock)", desc: "Premium UI animations library", tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>' }
  ];

  // Load challenge & files data
  useEffect(() => {
    const initWorkspace = async () => {
      // 1. Authenticate user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to access the workspace");
        router.push("/login");
        return;
      }
      setSessionUser(session.user);

      // 2. Fetch challenge meta details
      const { data: challengeData, error: challengeErr } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id)
        .single();
      
      if (challengeErr || !challengeData) {
        toast.error("Challenge not found");
        router.push("/challenges");
        return;
      }
      setChallenge(challengeData);

      // Simple time delta countdown
      if (challengeData.end_date) {
        const total = Date.parse(challengeData.end_date) - Date.now();
        if (total > 0) {
          const days = Math.floor(total / (1000 * 60 * 60 * 24));
          const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
          setTimeLeft(days > 0 ? `${days}d ${hours}h` : `${hours}h remaining`);
        } else {
          setTimeLeft("Challenge Ended");
        }
      }

      // 3. Fetch/Create Submission Record to load persisted workspace state
      let submissionQuery = supabase
        .from("challenge_submissions")
        .select("*, profiles:user_id(full_name, username)")
        .eq("challenge_id", id);
        
      if (isReviewMode) {
        submissionQuery = submissionQuery.eq("id", reviewId);
      } else {
        submissionQuery = submissionQuery.eq("user_id", session.user.id);
      }
      
      const { data: submissionData, error: submissionErr } = await submissionQuery.maybeSingle();

      let currentFiles: FileMap = {};

      if (submissionData) {
        currentFiles = (submissionData.workspace_files as FileMap) || {};
        if (isReviewMode && submissionData.profiles) {
          setReviewUser(submissionData.profiles);
        }
      } else if (!isReviewMode) {
        // Automatically register participation ONLY if not reviewing
        await supabase
          .from("challenge_submissions")
          .insert({
            challenge_id: id,
            user_id: session.user.id,
            status: "pending",
            workspace_files: {}
          });
      }

      // If no files are registered in workspace, bootstrap boilerplate templates
      if (Object.keys(currentFiles).length === 0) {
        const isPython = challengeData.difficulty === "hard" || challengeData.title.toLowerCase().includes("python");
        
        if (isPython) {
          currentFiles = {
            "main.py": {
              type: "file",
              content: `# Welcome to the Skillnest Python Workspace!\n# Complete the challenge goals here.\n\ndef solve_problem():\n    print("Starting problem analysis...")\n    # Write your logic here\n    print("All tests passed beautifully!")\n\nsolve_problem()\n`
            }
          };
        } else {
          currentFiles = {
            "index.html": {
              type: "file",
              content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${challengeData.title}</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main class="card">
    <h1>${challengeData.title}</h1>
    <p>Complete the mission using glassmorphism styling rules.</p>
    <button id="action-btn">Action Button</button>
  </main>
  
  <script src="js/main.js"></script>
</body>
</html>`
            },
            "css/styles.css": {
              type: "file",
              content: `/* Sleek Dark Glassmorphism Styling */
body {
  background: #09090b;
  color: #fafafa;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  overflow: hidden;
}

.card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px border rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 3rem;
  border-radius: 2rem;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
}

h1 {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  margin-bottom: 1rem;
}

p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 2rem;
}

button {
  background: #ffffff;
  color: #000000;
  border: none;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  padding: 1rem 2.5rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1);
}

button:active {
  transform: translateY(0);
}`
            },
            "js/main.js": {
              type: "file",
              content: `// Interaction Scripts
document.getElementById("action-btn").addEventListener("click", () => {
  console.log("Action button clicked!");
  alert("Glassmorphism dynamic scripts linked successfully!");
});`
            }
          };
        }
      }

      setFiles(currentFiles);

      // Open first available file by default
      const firstFile = Object.keys(currentFiles).find(p => currentFiles[p].type === "file");
      if (firstFile) {
        setActiveFile(firstFile);
        setOpenTabs([firstFile]);
      }

      setLoading(false);
    };

    initWorkspace();
  }, [id]);

  // Periodic autosave handler (saves files to DB every 15 seconds if modified)
  useEffect(() => {
    if (saveStatus !== "unsaved" || !sessionUser || isReviewMode) return;
    
    const interval = setTimeout(() => {
      saveWorkspaceData();
    }, 15000);

    return () => clearTimeout(interval);
  }, [files, saveStatus, sessionUser, isReviewMode]);

  // Listen to Ctrl+S shortcut to save instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!isReviewMode) {
          saveWorkspaceData();
          toast.success("Workspace saved instantly!");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [files, sessionUser, isReviewMode]);

  // Save current workspace state to Supabase
  const saveWorkspaceData = async () => {
    if (!sessionUser || isReviewMode) return;
    setSaveStatus("saving");
    
    const { error } = await supabase
      .from("challenge_submissions")
      .update({
        workspace_files: files
      })
      .eq("challenge_id", id)
      .eq("user_id", sessionUser.id);

    if (error) {
      toast.error("Failed to auto-save code. Retrying...");
      setSaveStatus("unsaved");
    } else {
      setSaveStatus("saved");
    }
  };

  // Submit current code workspace as proof of completion
  const handleSubmitSubmission = async () => {
    if (!sessionUser) return;
    setSubmitting(true);
    
    await saveWorkspaceData();

    const { error } = await supabase
      .from("challenge_submissions")
      .update({
        status: "pending",
        proof_text: `Completed inside in-browser Code Workspace. Total files: ${Object.keys(files).filter(k => files[k].type === "file").length}`
      })
      .eq("challenge_id", id)
      .eq("user_id", sessionUser.id);

    if (error) {
      toast.error("Submission failed. Please try again.");
    } else {
      toast.success("Solution submitted! Awaiting admin review for XP.");
      
      // Log participation activity
      await supabase.from("activities").insert({
        user_id: sessionUser.id,
        type: "Challenge Submitted",
        content: `Submitted workspace challenge for review: ${challenge?.title}`,
        metadata: { challenge_id: id }
      });

      router.push(`/challenges/${id}`);
    }
    setSubmitting(false);
  };

  // File tree operations
  const handleSelectFile = (path: string) => {
    setActiveFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
  };

  const handleCreateFile = (path: string) => {
    if (files[path]) {
      toast.error("File already exists");
      return;
    }
    setFiles(prev => ({
      ...prev,
      [path]: { type: "file", content: "" }
    }));
    setSaveStatus("unsaved");
    handleSelectFile(path);
  };

  const handleCreateFolder = (path: string) => {
    if (files[path]) {
      toast.error("Folder already exists");
      return;
    }
    setFiles(prev => ({
      ...prev,
      [path]: { type: "folder" }
    }));
    setSaveStatus("unsaved");
  };

  const handleRename = (oldPath: string, newPath: string) => {
    if (files[newPath]) {
      toast.error("Path already exists");
      return;
    }

    setFiles(prev => {
      const next = { ...prev };
      
      // Rename nested files recursively if node is a folder
      if (prev[oldPath].type === "folder") {
        Object.keys(prev).forEach((p) => {
          if (p === oldPath) {
            next[newPath] = prev[oldPath];
            delete next[oldPath];
          } else if (p.startsWith(`${oldPath}/`)) {
            const nestedNewPath = p.replace(oldPath, newPath);
            next[nestedNewPath] = prev[p];
            delete next[p];
          }
        });
      } else {
        next[newPath] = prev[oldPath];
        delete next[oldPath];
      }

      return next;
    });

    // Update active tab pointers
    setOpenTabs(prev => prev.map(t => {
      if (t === oldPath) return newPath;
      if (t.startsWith(`${oldPath}/`)) return t.replace(oldPath, newPath);
      return t;
    }));

    if (activeFile === oldPath) {
      setActiveFile(newPath);
    } else if (activeFile.startsWith(`${oldPath}/`)) {
      setActiveFile(activeFile.replace(oldPath, newPath));
    }

    setSaveStatus("unsaved");
  };

  const handleDelete = (path: string) => {
    setFiles(prev => {
      const next = { ...prev };
      if (prev[path].type === "folder") {
        Object.keys(prev).forEach((p) => {
          if (p === path || p.startsWith(`${path}/`)) {
            delete next[p];
          }
        });
      } else {
        delete next[path];
      }
      return next;
    });

    // Clean active tabs
    setOpenTabs(prev => prev.filter(t => t !== path && !t.startsWith(`${path}/`)));
    if (activeFile === path || activeFile.startsWith(`${path}/`)) {
      setActiveFile("");
    }

    setSaveStatus("unsaved");
  };

  const handleChangeContent = (path: string, content: string) => {
    setFiles(prev => ({
      ...prev,
      [path]: { ...prev[path], content }
    }));
    setSaveStatus("unsaved");
  };

  const handleCloseTab = (path: string) => {
    const nextTabs = openTabs.filter(t => t !== path);
    setOpenTabs(nextTabs);
    
    if (activeFile === path) {
      setActiveFile(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : "");
    }
  };

  const handleInstallPackage = (scriptTag: string, packageName: string) => {
    const htmlPath = Object.keys(files).find(p => p.toLowerCase() === "index.html") || "";
    if (!htmlPath || !files[htmlPath]) {
      toast.error("index.html not found. Package injection requires a root index.html file.");
      return;
    }

    const htmlFile = files[htmlPath];
    const htmlContent = htmlFile.content || "";

    if (htmlContent.includes(packageName) || htmlContent.includes(scriptTag)) {
      toast.error(`${packageName} is already installed!`);
      return;
    }

    let newContent = htmlContent;
    const headIndex = htmlContent.toLowerCase().indexOf("</head>");
    if (headIndex !== -1) {
      newContent = htmlContent.slice(0, headIndex) + `  ${scriptTag}\n` + htmlContent.slice(headIndex);
    } else {
      const bodyIndex = htmlContent.toLowerCase().indexOf("</body>");
      if (bodyIndex !== -1) {
        newContent = htmlContent.slice(0, bodyIndex) + `  ${scriptTag}\n` + htmlContent.slice(bodyIndex);
      } else {
        newContent = htmlContent + `\n${scriptTag}`;
      }
    }

    setFiles(prev => ({
      ...prev,
      [htmlPath]: {
        ...htmlFile,
        content: newContent
      }
    }));

    setSaveStatus("unsaved");
    setTriggerCompile(prev => prev + 1);
    toast.success(`${packageName} package added successfully!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Syncing Sandbox Environment...</span>
      </div>
    );
  }

  const activeExt = activeFile.split(".").pop()?.toLowerCase();
  const isPython = activeExt === "py";

  return (
    <div className="flex flex-col h-screen bg-[#070707] text-white overflow-hidden">
      {/* Dynamic Header */}
      <WorkspaceHeader 
        challenge={challenge}
        saveStatus={saveStatus}
        timeLeft={timeLeft}
        onSave={saveWorkspaceData}
        onSubmit={handleSubmitSubmission}
        submitting={submitting}
        isReviewMode={isReviewMode}
        reviewUser={reviewUser}
      />

      {/* Main Panel Tri-Split Layout */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Side: Directory Structure (File Tree) */}
        <div className="w-64 shrink-0 bg-[#0d0d0d]/80 border border-white/5 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-4 shadow-2xl">
          <FileTree 
            files={files}
            activeFile={activeFile}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRename={handleRename}
            onDelete={handleDelete}
            onOpenPackageHub={() => setIsPackageModalOpen(true)}
          />
        </div>

        {/* Center Side: Monaco Code Editor */}
        <div className="flex-1 min-w-0 h-full">
          <CodeEditor 
            activeFile={activeFile}
            fileContent={activeFile ? files[activeFile].content || "" : ""}
            openTabs={openTabs}
            onChangeContent={handleChangeContent}
            onSelectTab={handleSelectFile}
            onCloseTab={handleCloseTab}
          />
        </div>

        {/* Right Side: Preview Frame / Sandbox Console depending on active selection */}
        <div className="w-[450px] shrink-0 h-full">
          {isPython ? (
            <ConsolePanel 
              activeFile={activeFile}
              fileContent={files[activeFile]?.content || ""}
              onExecuteLocal={() => {}}
            />
          ) : (
            <LivePreview 
              files={files}
              triggerCompile={triggerCompile}
            />
          )}
        </div>
      </div>

      {/* Absolute Package Installer Modal (Hoisted to viewport level so it is NOT pressed) */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">NPM Package Hub</h3>
              </div>
              <button 
                onClick={() => setIsPackageModalOpen(false)}
                className="text-white/40 hover:text-white text-xs font-black p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-white/50 leading-relaxed font-semibold">
              Select a premium package or search any module from NPM. It will be injected directly into index.html's head!
            </p>

            {/* Popular Libraries Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
              {popularPackages.map((pkg) => (
                <button
                  key={pkg.name}
                  onClick={() => {
                    handleInstallPackage(pkg.tag, pkg.name);
                    setIsPackageModalOpen(false);
                  }}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-primary/30 hover:bg-white/[0.04] rounded-xl text-left transition-all group"
                >
                  <p className="text-[11px] font-black text-white/80 group-hover:text-primary transition-colors">{pkg.name}</p>
                  <p className="text-[9px] text-white/30 truncate mt-0.5">{pkg.desc}</p>
                </button>
              ))}
            </div>

            <div className="border-t border-white/5 pt-4 space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Custom NPM Package Name</label>
              <div className="flex gap-2">
                <input 
                  placeholder="e.g. lodash, animejs, pixi.js"
                  value={customPackage}
                  onChange={(e) => setCustomPackage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customPackage.trim()) {
                      const cleanName = customPackage.trim().toLowerCase();
                      const tag = `<script src="https://unpkg.com/${cleanName}"></script>`;
                      handleInstallPackage(tag, cleanName);
                      setCustomPackage("");
                      setIsPackageModalOpen(false);
                    }
                  }}
                  className="flex-1 bg-white/[0.02] border border-white/5 focus:border-white/20 rounded-xl px-3 py-2 text-xs placeholder:text-white/10 font-semibold text-white/80 focus:outline-none"
                />
                <Button 
                  onClick={() => {
                    if (customPackage.trim()) {
                      const cleanName = customPackage.trim().toLowerCase();
                      const tag = `<script src="https://unpkg.com/${cleanName}"></script>`;
                      handleInstallPackage(tag, cleanName);
                      setCustomPackage("");
                      setIsPackageModalOpen(false);
                    }
                  }}
                  className="bg-primary text-background hover:bg-primary/90 font-black text-xs px-4 rounded-xl"
                >
                  Install
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
