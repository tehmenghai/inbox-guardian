import React from 'react';
import { Loader2, Zap } from 'lucide-react';

interface ScanningScreenProps {
  stage: string;
}

const ScanningScreen: React.FC<ScanningScreenProps> = ({ stage }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
        <div className="relative p-6 bg-white rounded-full shadow-xl border border-indigo-50">
          <Zap className="w-12 h-12 text-indigo-600 animate-pulse" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Inbox</h2>
      <p className="text-slate-500 animate-pulse">{stage}</p>
      
      <div className="mt-8 w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 rounded-full animate-[progress_2s_ease-in-out_infinite] w-1/2"></div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default ScanningScreen;
