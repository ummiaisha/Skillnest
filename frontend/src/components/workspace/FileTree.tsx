"use client";

import React, { useState } from "react";
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileCode, 
  Plus, 
  FolderPlus, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkspaceFile {
  type: "file" | "folder";
  content?: string;
}

export type FileMap = Record<string, WorkspaceFile>;

interface FileTreeProps {
  files: FileMap;
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onDelete: (path: string) => void;
  onOpenPackageHub?: () => void;
}

export default function FileTree({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onOpenPackageHub
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "": true
  });
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  
  // State for showing inline inputs when creating new files/folders
  const [newFileInputFolder, setNewFileInputFolder] = useState<string | null>(null);
  const [newFolderNameInputFolder, setNewFolderNameInputFolder] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  // Get file icon based on file extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
        return <FileCode className="h-4 w-4 text-orange-500 shrink-0" />;
      case "css":
        return <FileCode className="h-4 w-4 text-blue-500 shrink-0" />;
      case "js":
      case "jsx":
        return <FileCode className="h-4 w-4 text-yellow-500 shrink-0" />;
      case "ts":
      case "tsx":
        return <FileCode className="h-4 w-4 text-sky-400 shrink-0" />;
      case "py":
        return <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />;
      default:
        return <File className="h-4 w-4 text-white/40 shrink-0" />;
    }
  };

  // Build structural node tree from flat paths
  const buildTree = () => {
    const root: any = { files: [], folders: {} };

    Object.keys(files).forEach((path) => {
      const parts = path.split("/");
      let current = root;

      for (let i = 0; i < parts.length - 1; i++) {
        const folderPart = parts[i];
        if (!current.folders[folderPart]) {
          current.folders[folderPart] = { files: [], folders: {}, fullPath: parts.slice(0, i + 1).join("/") };
        }
        current = current.folders[folderPart];
      }

      const lastPart = parts[parts.length - 1];
      if (files[path].type === "folder") {
        if (!current.folders[lastPart]) {
          current.folders[lastPart] = { files: [], folders: {}, fullPath: path };
        }
      } else {
        current.files.push({ name: lastPart, path });
      }
    });

    return root;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleStartRename = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPath(path);
    setEditingName(path.split("/").pop() || "");
  };

  const handleRenameSubmit = (oldPath: string) => {
    if (!editingName.trim()) return;
    const parts = oldPath.split("/");
    parts[parts.length - 1] = editingName.trim();
    const newPath = parts.join("/");
    onRename(oldPath, newPath);
    setEditingPath(null);
  };

  const handleCreateFileSubmit = (folderPath: string) => {
    if (!newItemName.trim()) {
      setNewFileInputFolder(null);
      return;
    }
    const fullPath = folderPath ? `${folderPath}/${newItemName.trim()}` : newItemName.trim();
    onCreateFile(fullPath);
    setNewItemName("");
    setNewFileInputFolder(null);
  };

  const handleCreateFolderSubmit = (folderPath: string) => {
    if (!newItemName.trim()) {
      setNewFolderNameInputFolder(null);
      return;
    }
    const fullPath = folderPath ? `${folderPath}/${newItemName.trim()}` : newItemName.trim();
    onCreateFolder(fullPath);
    setNewItemName("");
    setNewFolderNameInputFolder(null);
  };

  // Recursive element renderer
  const renderNode = (node: any, folderName = "", depth = 0, currentPath = "") => {
    const isExpanded = expandedFolders[currentPath];

    return (
      <div key={currentPath || "root"} className="select-none">
        {/* Render Folder Header (omit for true root node) */}
        {currentPath && (
          <div 
            onClick={() => toggleFolder(currentPath)}
            className={cn(
              "group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-all text-xs font-black text-white/60 hover:text-white",
              depth > 0 && "ml-2"
            )}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0 text-white/30" /> : <ChevronRight className="h-3 w-3 shrink-0 text-white/30" />}
              {isExpanded ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />}
              
              {editingPath === currentPath ? (
                <input 
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRenameSubmit(currentPath)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(currentPath)}
                  className="bg-white/10 border border-white/20 text-white px-1.5 py-0.5 rounded text-[11px] focus:outline-none"
                />
              ) : (
                <span className="truncate">{folderName}</span>
              )}
            </div>

            {/* Folder Actions */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFolder(currentPath); setNewFileInputFolder(currentPath); }}
                className="hover:text-primary p-0.5"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFolder(currentPath); setNewFolderNameInputFolder(currentPath); }}
                className="hover:text-primary p-0.5"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={(e) => handleStartRename(currentPath, e)}
                className="hover:text-primary p-0.5"
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(currentPath); }}
                className="hover:text-red-400 p-0.5"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Folder Content (Nested Subfolders & Files) */}
        {(currentPath === "" || isExpanded) && (
          <div className="space-y-0.5">
            {/* New File Inline Input */}
            {newFileInputFolder === currentPath && (
              <div 
                className="flex items-center gap-2 px-3 py-1 ml-2" 
                style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}
              >
                <File className="h-3.5 w-3.5 text-white/40" />
                <input
                  autoFocus
                  placeholder="filename.html"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={() => handleCreateFileSubmit(currentPath)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFileSubmit(currentPath)}
                  className="bg-white/10 border border-white/20 text-white px-1.5 py-0.5 rounded text-[11px] w-32 focus:outline-none"
                />
              </div>
            )}

            {/* New Folder Inline Input */}
            {newFolderNameInputFolder === currentPath && (
              <div 
                className="flex items-center gap-2 px-3 py-1 ml-2"
                style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}
              >
                <Folder className="h-3.5 w-3.5 text-primary" />
                <input
                  autoFocus
                  placeholder="folder_name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={() => handleCreateFolderSubmit(currentPath)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolderSubmit(currentPath)}
                  className="bg-white/10 border border-white/20 text-white px-1.5 py-0.5 rounded text-[11px] w-32 focus:outline-none"
                />
              </div>
            )}

            {/* Subfolders */}
            {Object.keys(node.folders).map((fName) =>
              renderNode(node.folders[fName], fName, currentPath ? depth + 1 : 0, node.folders[fName].fullPath)
            )}

            {/* Files */}
            {node.files.map((file: any) => (
              <div
                key={file.path}
                onClick={() => onSelectFile(file.path)}
                className={cn(
                  "group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-all text-xs font-semibold",
                  activeFile === file.path ? "bg-primary/10 border border-primary/20 text-white font-black" : "text-white/50 hover:text-white/80"
                )}
                style={{ paddingLeft: `${(currentPath ? depth + 1 : 0) * 12 + 20}px` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getFileIcon(file.name)}
                  {editingPath === file.path ? (
                    <input 
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRenameSubmit(file.path)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(file.path)}
                      className="bg-white/10 border border-white/20 text-white px-1.5 py-0.5 rounded text-[11px] focus:outline-none"
                    />
                  ) : (
                    <span className="truncate">{file.name}</span>
                  )}
                </div>

                {/* File Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity shrink-0">
                  <button 
                    onClick={(e) => handleStartRename(file.path, e)}
                    className="hover:text-primary p-0.5 text-white/40 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(file.path); }}
                    className="hover:text-red-400 p-0.5 text-white/40 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="space-y-4 pr-1">
      {/* Root Addition Buttons */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 pb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Workspace Files</span>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-md hover:bg-white/5"
            onClick={() => setNewFileInputFolder("")}
            title="New File"
          >
            <Plus className="h-3.5 w-3.5 text-white/60" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-md hover:bg-white/5"
            onClick={() => setNewFolderNameInputFolder("")}
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5 text-white/60" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-md hover:bg-white/5"
            onClick={() => onOpenPackageHub && onOpenPackageHub()}
            title="NPM Package Hub"
          >
            <Package className="h-3.5 w-3.5 text-white/60" />
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-220px)] space-y-1">
        {renderNode(tree)}
      </div>
    </div>
  );
}
