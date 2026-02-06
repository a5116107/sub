import React from 'react';

export const NetworkMap = () => {
  // Coordinates are relative to a 100x100 coordinate system
  const regions = [
    { id: 'iad', x: 28, y: 35, name: 'Washington DC' },
    { id: 'sfo', x: 18, y: 38, name: 'San Francisco' },
    { id: 'lhr', x: 48, y: 25, name: 'London' },
    { id: 'fra', x: 52, y: 28, name: 'Frankfurt' },
    { id: 'sin', x: 78, y: 55, name: 'Singapore' },
    { id: 'hkg', x: 80, y: 45, name: 'Hong Kong' },
    { id: 'tyo', x: 88, y: 38, name: 'Tokyo' },
    { id: 'syd', x: 92, y: 82, name: 'Sydney' },
    { id: 'gru', x: 32, y: 72, name: 'São Paulo' },
    { id: 'bom', x: 68, y: 48, name: 'Mumbai' },
  ];

  return (
    <div className="relative w-full aspect-[2/1] md:aspect-[2.5/1] bg-[#08080A] rounded-2xl overflow-hidden border border-white/5 shadow-2xl group">
       {/* Background Grid - Tech Feel */}
       <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
          {/* Subtle scanning line */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-[20%] w-full animate-[scan_4s_ease-in-out_infinite] opacity-30 pointer-events-none" />
       </div>
       
       {/* Connecting Lines */}
       <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
             <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0, 240, 255, 0)" />
                <stop offset="50%" stopColor="rgba(0, 240, 255, 0.3)" />
                <stop offset="100%" stopColor="rgba(0, 240, 255, 0)" />
             </linearGradient>
          </defs>
          {/* Trans-Atlantic */}
          <path d="M28 35 Q 38 20 48 25" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" className="animate-pulse" />
          {/* US Cross Country */}
          <path d="M18 38 L28 35" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
          {/* EU Interconnect */}
          <path d="M48 25 L52 28" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
          {/* EU to Asia */}
          <path d="M52 28 Q 65 35 68 48" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" className="opacity-50" />
          <path d="M68 48 L78 55" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
          {/* Asia Interconnect */}
          <path d="M78 55 L80 45" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
          <path d="M80 45 L88 38" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
          {/* Pacific */}
          <path d="M88 38 Q 95 35 18 38" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" className="opacity-20" strokeDasharray="4 4" />
          {/* South connections */}
          <path d="M88 38 L92 82" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" className="opacity-30" />
          <path d="M28 35 L32 72" fill="none" stroke="url(#line-gradient)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" className="opacity-50" />
       </svg>

       {/* Region Points */}
       {regions.map(r => (
          <div key={r.id} className="absolute group/node" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
             <div className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                {/* Core Dot */}
                <div className="w-1.5 h-1.5 bg-white rounded-full z-10 box-content shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                
                {/* Ping Effect */}
                <div className="absolute w-6 h-6 bg-nexus-primary/30 rounded-full animate-ping opacity-75"></div>
                <div className="absolute w-12 h-12 bg-nexus-primary/10 rounded-full animate-pulse"></div>
                
                {/* Hover Tooltip */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0A0A0C]/90 border border-nexus-primary/30 px-3 py-1.5 rounded-md text-xs text-white opacity-0 group-hover/node:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none z-20 backdrop-blur-md shadow-xl transform translate-y-2 group-hover/node:translate-y-0">
                   <div className="font-bold">{r.name}</div>
                   <div className="text-[10px] text-nexus-primary">Latency: &lt;10ms</div>
                </div>
             </div>
          </div>
       ))}

       {/* Overlay Gradient for depth */}
       <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-transparent to-transparent pointer-events-none"></div>
    </div>
  );
};