
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface VoteButtonProps {
  emoji: string;
  label: string;
  count: number;
  selected?: boolean;
  disabled?: boolean;
  isWinner?: boolean; // For winner emphasis
  onClick: () => void;
}

const VoteButton: React.FC<VoteButtonProps> = ({
  emoji,
  label,
  count,
  selected = false,
  disabled = false,
  isWinner = false, // Winner state
  onClick,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    setIsAnimating(true);
    onClick();
    
    setTimeout(() => { // Reset animation
      setIsAnimating(false);
    }, 700);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "w-32 h-32 md:w-40 md:h-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300",
          selected ? "neumorphic-inset text-primary" : "neumorphic hover:scale-105",
          disabled && !selected && "opacity-50 cursor-not-allowed hover:scale-100",
          isAnimating && "animate-bounce",
          isWinner && !disabled && "border-4 border-yellow-400 scale-105 shadow-lg shadow-yellow-400/50" // Winner styling
        )}
      >
        <span className={cn("text-5xl md:text-6xl mb-2", !disabled && !selected && "emoji-wiggle")}>
          {emoji}
        </span>
        <span className="font-bold text-lg">{label}</span>
      </button>
      <div className="mt-4 text-center">
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm text-muted-foreground">votes</div>
      </div>
    </div>
  );
};

export default VoteButton;
