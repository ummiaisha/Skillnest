"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, RefreshCw, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileMap } from "./FileTree";

interface LivePreviewProps {
  files: FileMap;
  triggerCompile: number;
}

export default function LivePreview({ files, triggerCompile }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"render" | "console">("render");
  const [iframeLogs, setIframeLogs] = useState<string[]>([]);

  // Bundle flat files map into a single HTML document
  const compileProject = () => {
    try {
      // Find root HTML file or default to first HTML file, otherwise fallback to boilerplate
      const rootHtmlPath = Object.keys(files).find(p => p.toLowerCase() === "index.html") || 
                           Object.keys(files).find(p => p.endsWith(".html")) || "";
      
      const htmlFile = files[rootHtmlPath];
      let docContent = htmlFile?.content || `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { background: #0c0c0c; color: #a1a1a1; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            h2 { font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>No index.html template detected.</h2>
          <p style="font-size: 10px; color: #555;">Create index.html to begin previewing your project.</p>
        </body>
        </html>
      `;

      // Helper to resolve files from absolute or relative paths
      const getFileContentByPath = (refPath: string, basePath: string): string => {
        // Normalize referenced path
        let targetPath = refPath.trim();
        if (targetPath.startsWith("./")) {
          targetPath = targetPath.slice(2);
        }
        
        // If referencing relative folder, try combining
        if (basePath.includes("/")) {
          const baseDir = basePath.substring(0, basePath.lastIndexOf("/"));
          const combined = `${baseDir}/${targetPath}`;
          if (files[combined]) return files[combined].content || "";
        }

        // Direct fallback matches
        if (files[targetPath]) return files[targetPath].content || "";

        // Broad scan fallback (finding by simple filename match)
        const fileName = targetPath.split("/").pop();
        const fallbackPath = Object.keys(files).find(p => p.endsWith(`/${fileName}`) || p === fileName);
        if (fallbackPath && files[fallbackPath]) {
          return files[fallbackPath].content || "";
        }
        
        return "";
      };

      // 1. Inline stylesheet references
      const linkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
      docContent = docContent.replace(linkRegex, (match, href) => {
        const cssContent = getFileContentByPath(href, rootHtmlPath);
        return `<style data-inlined-from="${href}">\n${cssContent}\n</style>`;
      });

      // 2. Inline script references
      let hasJSX = false;
      const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
      docContent = docContent.replace(scriptRegex, (match, src) => {
        const jsContent = getFileContentByPath(src, rootHtmlPath);
        const isJSX = src.endsWith(".jsx") || src.endsWith(".tsx") || jsContent.includes("React.") || jsContent.includes("ReactDOM.") || /<[A-Z][A-Za-z0-9]*\s*\/?>/.test(jsContent);
        if (isJSX) hasJSX = true;
        return `<script ${isJSX ? 'type="text/babel" ' : ''}data-inlined-from="${src}">\n${jsContent}\n</script>`;
      });

      // 3. Inject console interceptor and React/Babel CDNs inside iframe
      const reactCDNs = hasJSX ? `
        <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      ` : "";

      const interceptor = `
        ${reactCDNs}
        <script>
          (function() {
            var _log = console.log;
            var _error = console.error;
            var _warn = console.warn;
            
            window.parent.postMessage({ type: 'CONSOLE_CLEAR' }, '*');
            
            console.log = function() {
              var args = Array.prototype.slice.call(arguments).map(function(arg) {
                return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
              });
              window.parent.postMessage({ type: 'CONSOLE_LOG', data: args.join(' ') }, '*');
              _log.apply(console, arguments);
            };

            console.error = function() {
              var args = Array.prototype.slice.call(arguments).map(function(arg) {
                return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
              });
              window.parent.postMessage({ type: 'CONSOLE_ERROR', data: args.join(' ') }, '*');
              _error.apply(console, arguments);
            };

            window.onerror = function(message, source, lineno, colno, error) {
              window.parent.postMessage({ type: 'CONSOLE_ERROR', data: message + ' (Line ' + lineno + ')' }, '*');
            };
          })();
        </script>
      `;
      
      docContent = docContent.replace("<head>", `<head>\n${interceptor}`);

      setErrorLog(null);
      return docContent;
    } catch (err: any) {
      setErrorLog(err.message || "Failed to build live bundle");
      return "";
    }
  };

  // Re-compile project on dependency updates
  const handleRefresh = () => {
    const doc = compileProject();
    if (!doc || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const blob = new Blob([doc], { type: "text/html" });
    iframe.src = URL.createObjectURL(blob);
  };

  // Listen to visual logs from inside dynamic preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "CONSOLE_CLEAR") {
        setIframeLogs([]);
      } else if (msg.type === "CONSOLE_LOG") {
        setIframeLogs(prev => [...prev, `[INFO] ${msg.data}`].slice(-50));
      } else if (msg.type === "CONSOLE_ERROR") {
        setIframeLogs(prev => [...prev, `[ERROR] ${msg.data}`].slice(-50));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [files, triggerCompile]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header controls */}
      <div className="flex items-center justify-between bg-white/[0.02] border-b border-white/5 px-4 h-11 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("render")}
            className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${
              activeTab === "render" 
                ? "bg-white text-black font-black" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Live Preview
          </button>
          <button
            onClick={() => setActiveTab("console")}
            className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${
              activeTab === "console" 
                ? "bg-white text-black font-black" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Iframe Logs ({iframeLogs.length})
          </button>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          className="h-7 w-7 rounded-md hover:bg-white/5 text-white/50 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Frame Rendering / Console display */}
      <div className="flex-1 min-h-0 bg-[#0a0a0a] relative">
        {errorLog && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-950/20 backdrop-blur-sm z-10 gap-3 border border-red-500/10">
            <AlertTriangle className="h-8 w-8 text-red-500 animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Compilation Failed</span>
            <p className="text-[9px] text-red-300 font-bold max-w-xs leading-relaxed">{errorLog}</p>
          </div>
        )}

        {activeTab === "render" ? (
          <iframe 
            ref={iframeRef}
            title="Skillnest Live Engine"
            sandbox="allow-scripts"
            className="w-full h-full border-none bg-white"
          />
        ) : (
          <div className="w-full h-full overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1.5 text-white/60 bg-[#0a0a0a]">
            {iframeLogs.length > 0 ? iframeLogs.map((log, i) => {
              const isError = log.startsWith("[ERROR]");
              return (
                <div 
                  key={i} 
                  className={`p-1.5 rounded border ${
                    isError 
                      ? "bg-red-500/5 border-red-500/10 text-red-400" 
                      : "bg-white/[0.01] border-white/5 text-white/80"
                  }`}
                >
                  {log}
                </div>
              );
            }) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <HelpCircle className="h-8 w-8 text-white/5 mb-2" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Console Logs Empty</span>
                <span className="text-[8px] text-white/10 font-bold max-w-xs mt-1 leading-normal">
                  Interact with buttons and elements inside Live Preview to trigger logger statements.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
