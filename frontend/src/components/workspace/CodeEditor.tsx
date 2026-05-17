"use client";

import React, { useEffect, useState, useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { FileCode, X, Play, Code, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Configure monaco loader to load from a public CDN if local scripts are blocked
loader.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs" } });

let htmlProviderRegistered = false;
let cssProviderRegistered = false;

interface CodeEditorProps {
  activeFile: string;
  fileContent: string;
  openTabs: string[];
  onChangeContent: (path: string, content: string) => void;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export default function CodeEditor({
  activeFile,
  fileContent,
  openTabs,
  onChangeContent,
  onSelectTab,
  onCloseTab
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [editorLanguage, setEditorLanguage] = useState("javascript");

  // Detect language based on active file extension
  useEffect(() => {
    if (!activeFile) return;
    const ext = activeFile.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
        setEditorLanguage("html");
        break;
      case "css":
        setEditorLanguage("css");
        break;
      case "js":
      case "jsx":
        setEditorLanguage("javascript");
        break;
      case "ts":
      case "tsx":
        setEditorLanguage("typescript");
        break;
      case "py":
        setEditorLanguage("python");
        break;
      case "json":
        setEditorLanguage("json");
        break;
      default:
        setEditorLanguage("plaintext");
    }
  }, [activeFile]);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    if (!htmlProviderRegistered) {
      htmlProviderRegistered = true;

      // Register custom Emmet-like HTML snippets
      monaco.languages.registerCompletionItemProvider("html", {
        triggerCharacters: ["!"],
        provideCompletionItems: (model: any, position: any) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const suggestions: any[] = [];

          // Check if line ends with "!"
          if (textUntilPosition.trim() === "!") {
            suggestions.push({
              label: "!",
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: "HTML5 Boilerplate Template",
              insertText: [
                "<!DOCTYPE html>",
                '<html lang="en">',
                "<head>",
                '    <meta charset="UTF-8">',
                '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                "    <title>${1:Document}</title>",
                "</head>",
                "<body>",
                "    $0",
                "</body>",
                "</html>"
              ].join("\n"),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: new monaco.Range(
                position.lineNumber,
                position.column - 1,
                position.lineNumber,
                position.column
              ),
            });
          }

          // Add other popular HTML snippets!
          const words = textUntilPosition.trim().split(/\s+/);
          const lastWord = words[words.length - 1] || "";

          if (lastWord) {
            const htmlTags = [
              { label: "div", doc: "HTML div element", insert: "<div>\n\t$0\n</div>" },
              { label: "span", doc: "HTML span element", insert: "<span>$0</span>" },
              { label: "a", doc: "HTML link element", insert: '<a href="${1:#}">$0</a>' },
              { label: "img", doc: "HTML image element", insert: '<img src="${1:}" alt="${2:}" />$0' },
              { label: "ul", doc: "HTML unordered list", insert: "<ul>\n\t<li>$1</li>\n\t$0\n</ul>" },
              { label: "li", doc: "HTML list item", insert: "<li>$0</li>" },
              { label: "button", doc: "HTML button element", insert: '<button class="$1">$0</button>' },
              { label: "input", doc: "HTML input element", insert: '<input type="${1:text}" placeholder="${2:}" class="$3" />$0' },
              { label: "link:css", doc: "HTML CSS Link stylesheet", insert: '<link rel="stylesheet" href="${1:style.css}">$0' },
              { label: "script:src", doc: "HTML Script tag with source link", insert: '<script src="${1:script.js}"></script>$0' },
              { label: "style", doc: "HTML embedded style block", insert: "<style>\n\t$0\n</style>" },
              { label: "script", doc: "HTML embedded javascript block", insert: "<script>\n\t$0\n</script>" },
            ];

            htmlTags.forEach((tag) => {
              if (tag.label.startsWith(lastWord)) {
                suggestions.push({
                  label: tag.label,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  documentation: tag.doc,
                  insertText: tag.insert,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column - lastWord.length,
                    position.lineNumber,
                    position.column
                  ),
                });
              }
            });
          }

          return { suggestions };
        },
      });
    }

    if (!cssProviderRegistered) {
      cssProviderRegistered = true;

      // Also register standard Emmet-like CSS snippets!
      monaco.languages.registerCompletionItemProvider("css", {
        provideCompletionItems: (model: any, position: any) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const words = textUntilPosition.trim().split(/\s+/);
          const lastWord = words[words.length - 1] || "";
          const suggestions: any[] = [];

          if (lastWord) {
            const cssSnippets = [
              { label: "df", doc: "display: flex", insert: "display: flex;$0" },
              { label: "dg", doc: "display: grid", insert: "display: grid;$0" },
              { label: "fd", doc: "flex-direction: column", insert: "flex-direction: ${1:column};$0" },
              { label: "jc", doc: "justify-content: center", insert: "justify-content: ${1:center};$0" },
              { label: "ai", doc: "align-items: center", insert: "align-items: ${1:center};$0" },
              { label: "gp", doc: "gap: px", insert: "gap: ${1:16}px;$0" },
              { label: "bg", doc: "background: color", insert: "background: ${1:#000};$0" },
              { label: "ff", doc: "font-family", insert: "font-family: ${1:sans-serif};$0" },
              { label: "fs", doc: "font-size", insert: "font-size: ${1:14}px;$0" },
              { label: "fw", doc: "font-weight", insert: "font-weight: ${1:bold};$0" },
              { label: "tc", doc: "color: text", insert: "color: ${1:#fff};$0" },
              { label: "pd", doc: "padding", insert: "padding: ${1:16}px;$0" },
              { label: "mg", doc: "margin", insert: "margin: ${1:16}px;$0" },
              { label: "br", doc: "border-radius", insert: "border-radius: ${1:8}px;$0" },
              { label: "w", doc: "width", insert: "width: ${1:100%};$0" },
              { label: "h", doc: "height", insert: "height: ${1:100%};$0" },
              { label: "tac", doc: "text-align: center", insert: "text-align: center;$0" },
            ];

            cssSnippets.forEach((snip) => {
              if (snip.label.startsWith(lastWord)) {
                suggestions.push({
                  label: snip.label,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  documentation: snip.doc,
                  insertText: snip.insert,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column - lastWord.length,
                    position.lineNumber,
                    position.column
                  ),
                });
              }
            });
          }

          return { suggestions };
        }
      });
    }

    // Auto close HTML tags
    editor.onDidChangeModelContent((event: any) => {
      // We only run this if the active language is HTML
      if (editor.getModel()?.getLanguageId() !== "html") return;

      const changes = event.changes;
      if (changes.length !== 1) return;

      const change = changes[0];
      // Check if user just typed ">"
      if (change.text !== ">") return;

      const position = editor.getPosition();
      if (!position) return;

      // Get text on the current line up to the typed ">"
      const model = editor.getModel();
      if (!model) return;

      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      // Find the last opening tag in the text before the cursor
      const match = textBeforeCursor.match(/<([a-zA-Z1-6\-]+)(?:\s+[^>]*)*>$/);
      if (!match) return;

      const tagName = match[1];
      
      // Self-closing tags in HTML should not be auto-closed
      const selfClosingTags = [
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"
      ];
      if (selfClosingTags.includes(tagName.toLowerCase())) return;

      const closingTag = `</${tagName}>`;

      // Insert the closing tag immediately after the cursor
      setTimeout(() => {
        const selection = editor.getSelection();
        if (!selection) return;

        editor.executeEdits("auto-close-tag", [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
            text: closingTag,
            forceMoveMarkers: true,
          },
        ]);

        // Put the cursor back between the opening and closing tag
        editor.setPosition(position);
      }, 0);
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      onChangeContent(activeFile, value);
    }
  };

  const getFileName = (path: string) => {
    return path.split("/").pop() || path;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Tabs Row */}
      <div className="flex items-center justify-between bg-white/[0.02] border-b border-white/5 px-2 h-11 overflow-x-auto scrollbar-none shrink-0">
        <div className="flex items-center gap-1">
          {openTabs.map((tab) => {
            const isActive = tab === activeFile;
            return (
              <div
                key={tab}
                onClick={() => onSelectTab(tab)}
                className={cn(
                  "group flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider cursor-pointer border-r border-white/5 transition-all select-none",
                  isActive 
                    ? "bg-[#0d0d0d] text-primary border-t-2 border-t-primary" 
                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.01]"
                )}
              >
                <FileCode className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-white/20")} />
                <span>{getFileName(tab)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded-full hover:bg-white/5 transition-all shrink-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        
        {/* Language & Settings Badge */}
        {activeFile && (
          <div className="flex items-center gap-2 mr-2 shrink-0">
            {/* Format Button */}
            <button
              onClick={() => {
                if (editorRef.current) {
                  editorRef.current.trigger("anyString", "editor.action.formatDocument");
                  toast.success("Code formatted perfectly!");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 hover:border-primary/20 transition-all select-none group"
              title="Format Document (Shift+Alt+F)"
            >
              <Sparkles className="h-3 w-3 text-primary animate-pulse group-hover:scale-110 transition-transform" />
              <span>Format</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 select-none">
              <Code className="h-3 w-3" />
              <span>{editorLanguage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div className="flex-1 min-h-0 relative">
        {activeFile ? (
          <Editor
            height="100%"
            language={editorLanguage}
            value={fileContent}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            loading={
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Booting Editor Engine...</span>
              </div>
            }
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "var(--font-mono), Menlo, Monaco, Consolas, Courier New, monospace",
              fontWeight: "600",
              lineHeight: 20,
              padding: { top: 16, bottom: 16 },
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              tabSize: 2,
              wordWrap: "on",
              automaticLayout: true,
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[#0a0a0a]">
            <Code className="h-16 w-16 text-white/5 mb-4 animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-2">No Active File</h3>
            <p className="text-[10px] text-white/20 font-bold max-w-xs leading-relaxed">
              Create a new file in the directory panel or select an existing one to start writing code.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
