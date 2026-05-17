"use client";

/**
 * PersonalWorkspace.tsx
 * A standalone coding environment embedded in the User Elite Dashboard.
 * Reuses existing FileTree, CodeEditor, LivePreview, ConsolePanel components.
 * Projects are saved to Supabase `user_workspaces` table.
 */

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderPlus,
  FilePlus,
  Save,
  Play,
  ChevronDown,
  Loader2,
  FolderOpen,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Dynamically import heavy components to avoid SSR issues
const FileTree = dynamic(() => import("@/components/workspace/FileTree"), { ssr: false });
const CodeEditor = dynamic(() => import("@/components/workspace/CodeEditor"), { ssr: false });
const LivePreview = dynamic(() => import("@/components/workspace/LivePreview"), { ssr: false });
const ConsolePanel = dynamic(() => import("@/components/workspace/ConsolePanel"), { ssr: false });

import type { FileMap } from "@/components/workspace/FileTree";

/** Convert our simple string map to the FileMap the FileTree component expects */
const toFileMap = (files: Record<string, string>): FileMap =>
  Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k, { type: "file" as const, content: v }])
  );

// Default starter files for a new project
const DEFAULT_FILES: Record<string, string> = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Project</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <h1>Hello, Skillnest! 🚀</h1>
    <p>Start building your project here.</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
  "style.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background: #0a0a0a;
  color: #fff;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
}

p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
}`,
  "script.js": `// Your JavaScript goes here
console.log("Project loaded successfully!");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready.");
});`,
};

interface WorkspaceProject {
  id: string;
  name: string;
  files: Record<string, string>;
  updated_at: string;
}

interface PersonalWorkspaceProps {
  userId: string;
}

export default function PersonalWorkspace({ userId }: PersonalWorkspaceProps) {
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activeProject, setActiveProject] = useState<WorkspaceProject | null>(null);
  const [files, setFiles] = useState<Record<string, string>>(DEFAULT_FILES);
  const [activeFile, setActiveFile] = useState("index.html");
  const [openTabs, setOpenTabs] = useState<string[]>(["index.html"]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showProjects, setShowProjects] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);

  // Fetch user's saved projects
  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("user_workspaces")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (data) setProjects(data);
  }, [userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Load a project's files
  const loadProject = (project: WorkspaceProject) => {
    setActiveProject(project);
    const projectFiles = project.files as Record<string, string>;
    setFiles(projectFiles);
    const fileNames = Object.keys(projectFiles);
    const firstFile = fileNames[0] || "";
    setActiveFile(firstFile);
    setOpenTabs([firstFile]);
    setShowProjects(false);
    toast.success(`Loaded "${project.name}"`);
  };

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreatingProject(true);
    try {
      const { data, error } = await supabase
        .from("user_workspaces")
        .insert({
          user_id: userId,
          name: newProjectName.trim(),
          files: DEFAULT_FILES,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setProjects((prev) => [data, ...prev]);
        loadProject(data);
        setNewProjectName("");
        toast.success(`Project "${data.name}" created!`);
      }
    } catch (err: any) {
      toast.error("Failed to create project: " + err.message);
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Save current project
  const handleSave = async () => {
    if (!activeProject) {
      // Auto-create a project if none selected
      const { data, error } = await supabase
        .from("user_workspaces")
        .insert({
          user_id: userId,
          name: "Untitled Project",
          files,
        })
        .select()
        .single();
      if (!error && data) {
        setActiveProject(data);
        toast.success("Project saved!");
        fetchProjects();
      }
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_workspaces")
        .update({ files, updated_at: new Date().toISOString() })
        .eq("id", activeProject.id);

      if (error) throw error;
      toast.success("Saved!");
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a project
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("user_workspaces")
      .delete()
      .eq("id", id);

    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
        setFiles(DEFAULT_FILES);
        setActiveFile("index.html");
        setOpenTabs(["index.html"]);
      }
      toast.success("Project deleted.");
    }
  };

  // File operations
  const handleFileChange = (path: string, content: string) => {
    setFiles((prev) => ({ ...prev, [path]: content }));
  };

  const handleSelectTab = (path: string) => {
    setActiveFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
  };

  const handleCloseTab = (path: string) => {
    const newTabs = openTabs.filter((t) => t !== path);
    setOpenTabs(newTabs);
    if (activeFile === path) {
      setActiveFile(newTabs[newTabs.length - 1] || "");
    }
  };

  const handleAddFile = () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    setFiles((prev) => ({ ...prev, [name]: "" }));
    handleSelectTab(name);
    setNewFileName("");
    setShowNewFile(false);
  };

  const handleSelectFile = (path: string) => {
    handleSelectTab(path);
  };

  // Run JS/Python via Judge0 (public endpoint)
  const handleRunCode = async () => {
    const ext = activeFile.split(".").pop()?.toLowerCase();
    if (!["js", "py"].includes(ext || "")) {
      setConsoleOutput(["// HTML/CSS projects auto-render in the preview panel."]);
      setConsoleOpen(true);
      return;
    }

    setIsRunning(true);
    setConsoleOutput(["Running..."]);
    setConsoleOpen(true);

    try {
      const languageId = ext === "py" ? 71 : 63; // Python 3 or Node.js
      const response = await fetch("https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          "X-RapidAPI-Key": process.env.NEXT_PUBLIC_JUDGE0_API_KEY || "demo",
        },
        body: JSON.stringify({
          language_id: languageId,
          source_code: files[activeFile] || "",
        }),
      });

      const result = await response.json();
      const output = result.stdout || result.stderr || result.compile_output || "No output.";
      setConsoleOutput(output.split("\n"));
    } catch (err: any) {
      setConsoleOutput([`Error: ${err.message}`, "Tip: Add NEXT_PUBLIC_JUDGE0_API_KEY to .env.local"]);
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProject, files]);

  const isHtmlProject = activeFile.endsWith(".html") ||
    Object.keys(files).some((f) => f.endsWith(".html"));

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded-2xl overflow-hidden border border-white/5">
      {/* Workspace Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0A0A0A] border-b border-white/5 gap-4 flex-wrap">
        {/* Project Selector */}
        <div className="relative">
          <button
            onClick={() => setShowProjects(!showProjects)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs font-black text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">
              {activeProject?.name || "No Project"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>

          <AnimatePresence>
            {showProjects && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-1 w-64 bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
              >
                {/* Create New Project */}
                <div className="p-3 border-b border-white/5">
                  <div className="flex gap-2">
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                      placeholder="New project name..."
                      className="h-8 text-xs bg-white/5 border-white/5 rounded-xl flex-1"
                    />
                    <Button
                      onClick={handleCreateProject}
                      disabled={isCreatingProject}
                      size="sm"
                      className="h-8 px-3 rounded-xl bg-white text-black text-xs font-black"
                    >
                      {isCreatingProject ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {/* Project List */}
                <div className="max-h-56 overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-center text-xs text-white/30 py-6 font-bold">No projects yet.</p>
                  ) : (
                    projects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => loadProject(p)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer group border-b border-white/[0.03]"
                      >
                        <div>
                          <p className="text-xs font-black text-white">{p.name}</p>
                          <p className="text-[10px] text-white/30 font-bold">
                            {Object.keys(p.files).length} files
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-white/30 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-2">
          {showNewFile ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFile();
                  if (e.key === "Escape") setShowNewFile(false);
                }}
                placeholder="filename.html"
                className="h-7 text-xs bg-white/5 border-white/5 rounded-xl w-36"
              />
              <Button onClick={handleAddFile} size="sm" className="h-7 px-3 rounded-xl text-xs">Add</Button>
              <Button onClick={() => setShowNewFile(false)} variant="ghost" size="sm" className="h-7 px-2 rounded-xl text-xs">Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFile(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <FilePlus className="h-3.5 w-3.5" />
              New File
            </button>
          )}

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-[10px] font-black text-green-400 hover:bg-green-500/20 transition-all"
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File Tree */}
        <div className="w-48 shrink-0 border-r border-white/5 overflow-y-auto">
          <FileTree
            files={toFileMap(files)}
            activeFile={activeFile}
            onSelectFile={handleSelectFile}
            onCreateFile={(name: string) => {
              setFiles((prev) => ({ ...prev, [name]: "" }));
              handleSelectTab(name);
            }}
            onCreateFolder={(name: string) => {
              setFiles((prev) => ({ ...prev, [name + "/.gitkeep"]: "" }));
            }}
            onDelete={(name: string) => {
              const newFiles = { ...files };
              delete newFiles[name];
              setFiles(newFiles);
              handleCloseTab(name);
            }}
            onRename={(oldName: string, newName: string) => {
              const content = files[oldName] || "";
              const newFiles = { ...files };
              delete newFiles[oldName];
              newFiles[newName] = content;
              setFiles(newFiles);
              handleCloseTab(oldName);
              handleSelectTab(newName);
            }}
          />
        </div>

        {/* Center: Editor + Console */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex-1 min-h-0">
            <CodeEditor
              activeFile={activeFile}
              fileContent={files[activeFile] || ""}
              openTabs={openTabs}
              onChangeContent={handleFileChange}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
            />
          </div>

          {/* Console Panel */}
          <AnimatePresence>
            {consoleOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 160 }}
                exit={{ height: 0 }}
                className="border-t border-white/5 overflow-hidden"
              >
                <ConsolePanel
                  output={consoleOutput}
                  onClear={() => setConsoleOutput([])}
                  isRunning={isRunning}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Live Preview (HTML projects only) */}
        {isHtmlProject && (
          <div className="w-96 shrink-0 border-l border-white/5 overflow-hidden">
            <LivePreview files={files} activeFile={activeFile} />
          </div>
        )}
      </div>
    </div>
  );
}
