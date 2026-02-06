import React from 'react';
import { Feature } from '../types';
import { Globe, Zap, Cpu, Shield, Layers, Code2 } from 'lucide-react';

const features: Feature[] = [
  {
    title: "Global Edge Network",
    description: "Deploy functions to 35+ regions in seconds. <50ms latency worldwide.",
    icon: <Globe className="w-6 h-6 text-cyan-400" />,
    colSpan: 2,
  },
  {
    title: "Instant Scale",
    description: "Handle millions of requests without cold starts.",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    colSpan: 1,
  },
  {
    title: "AI Native",
    description: "Built-in LLM orchestration pipelines.",
    icon: <Cpu className="w-6 h-6 text-purple-400" />,
    colSpan: 1,
  },
  {
    title: "Enterprise Security",
    description: "SOC2 Type II compliant. DDoS protection included.",
    icon: <Shield className="w-6 h-6 text-green-400" />,
    colSpan: 2,
  },
];

export const BentoGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-6">
      {features.map((feature, idx) => (
        <div 
          key={idx}
          className={`
            glass-panel rounded-2xl p-8 hover:bg-white/5 transition-all duration-300 group border border-white/5 hover:border-cyan-500/30
            ${feature.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}
          `}
        >
          <div className="mb-4 bg-white/5 w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            {feature.icon}
          </div>
          <h3 className="text-xl font-bold mb-2 text-white group-hover:text-cyan-400 transition-colors">
            {feature.title}
          </h3>
          <p className="text-gray-400 leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
};