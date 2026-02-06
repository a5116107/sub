import React, { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, Command, MoreHorizontal } from 'lucide-react';

const CODE_LINES = [
  "import { NexusClient } from '@nexus/sdk';",
  "",
  "const nexus = new NexusClient({",
  "  apiKey: process.env.NEXUS_KEY,",
  "  region: 'us-east-1'",
  "});",
  "",
  "// Deploy edge function",
  "const deployment = await nexus.edge.deploy({",
  "  entry: './api/handler.ts',",
  "  runtime: 'v8-isolate',",
  "  env: { DB_URL: 'postgres://...' }",
  "});",
  "",
  "console.log(`Deployed: ${deployment.url}`);"
];

export const Terminal: React.FC = () => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (currentLineIndex >= CODE_LINES.length) return;

    const currentLine = CODE_LINES[currentLineIndex] || "";

    const timeout = setTimeout(() => {
      if (charIndex < currentLine.length) {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          if (newLines[currentLineIndex] === undefined) newLines[currentLineIndex] = ""; 
          newLines[currentLineIndex] = currentLine.substring(0, charIndex + 1);
          return newLines;
        });
        setCharIndex(prev => prev + 1);
      } else {
        setDisplayedLines(prev => {
            const newLines = [...prev];
            newLines[currentLineIndex] = currentLine;
            return newLines;
        });
        setCurrentLineIndex(prev => prev + 1);
        setCharIndex(0);
      }
    }, 20 + Math.random() * 20); // Faster typing for better UX

    return () => clearTimeout(timeout);
  }, [charIndex, currentLineIndex]);

  const highlightCode = (code: string | undefined | null) => {
    if (!code || typeof code !== 'string') return '';
    return code
      .replace(/import|const|await|return/g, '<span class="text-purple-400 font-bold">$&</span>')
      .replace(/from/g, '<span class="text-purple-400 font-bold">$&</span>')
      .replace(/'[^']*'/g, '<span class="text-green-400">$&</span>')
      .replace(/\/\/.*$/g, '<span class="text-gray-500 italic">$&</span>')
      .replace(/`[^`]*`/g, (match) => `<span class="text-yellow-300">${match}</span>`)
      .replace(/new|process|env/g, '<span class="text-cyan-400">$&</span>')
      .replace(/NexusClient/g, '<span class="text-yellow-400 font-bold">$&</span>');
  };

  return (
    <div className="w-full max-w-lg mx-auto rounded-xl overflow-hidden bg-[#0A0A0C] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative group transform hover:-translate-y-1 transition-transform duration-500">
      
      {/* IDE Header */}
      <div className="bg-[#151518] px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono bg-black/20 px-3 py-1 rounded-md border border-white/5">
          <Command className="w-3 h-3" />
          <span>deploy.ts — Nexus SDK</span>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-600" />
      </div>

      {/* Code Area */}
      <div className="p-6 font-mono text-[13px] leading-6 overflow-hidden min-h-[320px] bg-[#0A0A0C]/90 relative backdrop-blur-sm">
        {/* Line Numbers */}
        <div className="absolute left-0 top-6 bottom-0 w-12 flex flex-col items-end pr-4 text-gray-700 select-none">
           {Array.from({length: 15}).map((_, i) => <div key={i}>{i+1}</div>)}
        </div>

        <div className="pl-10">
          {displayedLines.map((line, i) => (
            <div key={i} className="flex relative">
              <span className="text-gray-300 whitespace-pre">
                <span dangerouslySetInnerHTML={{ __html: highlightCode(line) }} />
                {i === currentLineIndex && <span className="animate-pulse inline-block w-2 h-4 bg-cyan-500 ml-1 align-middle shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>}
              </span>
            </div>
          ))}
        </div>
        
        {/* Ambient Glow */}
        <div className="absolute top-[-20%] right-[-20%] w-[300px] h-[300px] bg-purple-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[200px] h-[200px] bg-cyan-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen" />
      </div>
      
      {/* Status Bar */}
      <div className="bg-[#151518] px-4 py-1.5 flex items-center justify-between border-t border-white/5 text-[10px] text-gray-500 font-mono">
         <div className="flex items-center gap-3">
            <span>TypeScript</span>
            <span>UTF-8</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            <span>Connected to Edge</span>
         </div>
      </div>
    </div>
  );
};