import React, { useEffect } from 'react';
import { CheckCircle2, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SuccessScreenProps {
  onHome: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ onHome }) => {
  
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in-up">
      <div className="mb-6 bg-green-100 p-6 rounded-full">
         <CheckCircle2 className="w-20 h-20 text-green-600" />
      </div>
      
      <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Inbox Detox Complete!</h1>
      <p className="text-lg text-slate-600 max-w-md mb-8">
        You've successfully cleaned up your selected emails. Your inbox is lighter, and the AI has learned from your preferences.
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-slate-800">120MB</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Storage Saved</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-slate-800">14m</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Time Saved</div>
         </div>
      </div>

      <button 
        onClick={onHome}
        className="group flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl"
      >
        <Home className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        Return to Dashboard
      </button>
    </div>
  );
};

export default SuccessScreen;
