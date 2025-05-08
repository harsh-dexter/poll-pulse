
import React from 'react';

interface TimerProps {
  remainingTime: number; // Seconds from backend
}

const INITIAL_DURATION = 60; // For visual consistency

const Timer: React.FC<TimerProps> = ({ remainingTime }) => {
  const circumference = 2 * Math.PI * 45; // Radius 45
  // Progress for visual (based on initial duration)
  const progressRatio = Math.max(0, Math.min(1, remainingTime / INITIAL_DURATION));
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="flex flex-col items-center mt-6 mb-4">
      <div className="relative w-24 h-24">
        {/* Background */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="opacity-20"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transform -rotate-90 origin-center transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">⏳ {remainingTime < 0 ? 0 : remainingTime}s</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium">
        {remainingTime > 0 ? "Time remaining to vote" : "Voting ended"}
      </p>
    </div>
  );
};

export default Timer;
