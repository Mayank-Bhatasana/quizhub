import { useMemo, useEffect, useState, useRef } from "react";
import "prismjs/themes/prism-tomorrow.css";

// Dynamic Prism loader to ensure global window.Prism is set BEFORE language extensions load
let prismLoadedPromise: Promise<unknown> | null = null;

function loadPrism(): Promise<unknown> {
  if (prismLoadedPromise) return prismLoadedPromise;

  prismLoadedPromise = (async () => {
    const PrismModule = await import("prismjs");
    // Handle both ESM default export and CJS module exports
    const PrismObj = PrismModule.default || PrismModule;
    
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Prism = PrismObj;
    }

    // Dynamically import language extensions sequentially so window.Prism is guaranteed to exist
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-markup");
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-css");
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-javascript");
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-typescript");
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-sql");
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-python");
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-bash");
    // @ts-expect-error - untyped Prism components
    await import("prismjs/components/prism-json");
    
    return PrismObj;
  })();

  return prismLoadedPromise;
}

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";
  
  // Escape HTML tags to prevent XSS
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code Blocks: ```lang ... ```
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (_, codeContent) => {
    const trimmed = codeContent.trim();
    const lines = trimmed.split("\n");
    let lang = "";
    let finalCode = trimmed;
    if (lines.length > 0 && /^[a-zA-Z0-9#+-]+$/.test(lines[0])) {
      const parsedLang = lines[0].toLowerCase();
      lang = parsedLang === "js" ? "javascript" : parsedLang === "ts" ? "typescript" : parsedLang === "py" ? "python" : parsedLang;
      finalCode = lines.slice(1).join("\n");
    }
    
    const index = codeBlocks.length;
    codeBlocks.push(
      `<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto my-3 border border-slate-800 shadow-inner"><code class="language-${lang}">${finalCode}</code></pre>`
    );
    return `%%%CODEBLOCK${index}%%%`;
  });

  // Inline Code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-brand-600 px-1.5 py-0.5 rounded-md font-mono text-xs border border-slate-200">$1</code>');

  // Headers: # Header
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-black text-ink my-3">$1</h1>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-extrabold text-ink my-2">$1</h2>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-bold text-ink my-2">$1</h3>');

  // Bold: **bold** or __bold__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-ink">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong class="font-extrabold text-ink">$1</strong>');

  // Italic: *italic* or _italic_
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  // Bullet Lists: * item or - item
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li class="ml-4 list-disc text-muted mt-1">$1</li>');

  // Paragraphs / Newlines
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      if (p.startsWith("%%%CODEBLOCK") || p.startsWith("<h") || p.startsWith("<li")) {
        return p;
      }
      return `<p class="leading-relaxed mt-1">${p.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  // Restore Code Blocks
  html = html.replace(/%%%CODEBLOCK(\d+)%%%/g, (_, idx) => {
    return codeBlocks[parseInt(idx, 10)] || "";
  });

  return html;
}

export default function Markdown({
  content,
  className = "",
}: {
  content?: string;
  className?: string;
}) {
  const html = useMemo(() => parseMarkdownToHtml(content ?? ""), [content]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [prismLoaded, setPrismLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadPrism().then(() => {
      if (active) {
        setPrismLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && prismLoaded) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalPrism = (window as any).Prism;
      if (globalPrism && typeof globalPrism.highlightElement === "function") {
        // Only highlight <code> elements inside <pre> blocks so inline code
        // isn't swallowed by prism-tomorrow's dark background.
        containerRef.current
          .querySelectorAll("pre > code[class*='language-']")
          .forEach((el) => globalPrism.highlightElement(el));
      }
    }
  }, [html, prismLoaded]);

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
