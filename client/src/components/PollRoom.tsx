import React, { useState, useEffect } from 'react';
import VoteButton from './VoteButton';
import Timer from './Timer';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import useWebSocket from '@/hooks/useWebSocket';

interface PollRoomProps {
  username: string;
  roomCode: string;
  onBackToHome: () => void;
}

// Vote option key type
type VoteOptionKey = string; 

interface User {
  id: string;
  name: string;
  hasVoted: boolean;
}

interface VoteCounts {
  [option: string]: number; // Example: { cats: 0, dogs: 0 }
}

interface PollData {
  question: string;
  voteCounts: VoteCounts;
  remainingTime: number;
  votingEnded: boolean;
  users: User[];
}

const PollRoom: React.FC<PollRoomProps> = ({
  username,
  roomCode,
  onBackToHome,
}) => {
  const { sendMessage, subscribe, connect, isConnected } = useWebSocket();
  const { toast } = useToast();

  const voteStorageKey = `poll-vote-${roomCode}`; // localStorage key

  // Poll state
  const [pollData, setPollData] = useState<PollData>({
    question: "Loading question...",
    voteCounts: {},
    remainingTime: 60,
    votingEnded: false,
    users: []
  });
  const [currentUserHasVoted, setCurrentUserHasVoted] = useState<boolean>(false);
  const [winningOption, setWinningOption] = useState<string | null | 'tie'>(null);
  
  const voteOptions = Object.keys(pollData.voteCounts); // Derived from pollData

  // WebSocket connection & room join
  useEffect(() => {
    if (!isConnected) {
      connect()
        .then(socket => {
          if (socket) {
            sendMessage('join-room', { roomCode, username });
          }
        })
        .catch(err => {
          console.error("PollRoom connect error:", err);
          toast({ title: "Connection Error", description: "Could not connect to server.", variant: "destructive" });
        });
    } else {
      sendMessage('join-room', { roomCode, username });
    }
  }, [connect, isConnected, roomCode, username, sendMessage, toast]);

  // Handle WebSocket messages
  useEffect(() => {
    const storedVoteStatus = localStorage.getItem(voteStorageKey) === 'true'; // Load vote status
    setCurrentUserHasVoted(storedVoteStatus);

    // Subscribe to WebSocket events
    const subscriptions = [
      subscribe('join-success', (data: any) => { // On successful join
        toast({ title: "Joined Room!", description: `Welcome to room ${data.roomCode}` });
        
        setPollData({
          question: data.question || "Poll Question",
          voteCounts: data.voteCounts || {},
          remainingTime: data.remainingTime || 0,
          votingEnded: data.votingEnded || false,
          users: data.users || []
        });
        
        // Check backend vote status if not in localStorage
        if (!storedVoteStatus) {
          const self = (data.users || []).find((u: User) => u.name === username);
          if (self) setCurrentUserHasVoted(self.hasVoted);
        }
      }),
      
      subscribe('join-error', (data: { message: string }) => { // On join error
        toast({ title: "Join Error", description: data.message, variant: "destructive" });
        onBackToHome();
      }),

      subscribe('user-joined', (data: { userId: string, username: string }) => { // On user join
        toast({ description: `${data.username} joined the room.` });
        setPollData(prev => ({
          ...prev,
          users: [...prev.users, { id: data.userId, name: data.username, hasVoted: false }]
        }));
      }),

      subscribe('user-left', (data: { userId: string, username: string }) => { // On user leave
        toast({ description: `${data.username} left the room.` });
        setPollData(prev => ({
          ...prev,
          users: prev.users.filter(u => u.id !== data.userId)
        }));
      }),

      subscribe('vote-update', (data: { voteCounts: VoteCounts }) => { // On vote update
        setPollData(prev => ({
          ...prev,
          voteCounts: data.voteCounts
        }));
      }),
      
      subscribe('vote-success', (data: { message: string }) => { // On vote success
        toast({ title: "Vote Recorded", description: data.message });
        setCurrentUserHasVoted(true);
        localStorage.setItem(voteStorageKey, 'true');
      }),

      subscribe('vote-error', (data: { message: string }) => { // On vote error
        toast({ title: "Vote Error", description: data.message, variant: "destructive" });
      }),

      subscribe('timer-tick', (data: { remainingTime: number }) => { // On timer tick
        setPollData(prev => ({
          ...prev,
          remainingTime: data.remainingTime
        }));
      }),

      subscribe('voting-ended', () => { // On voting end
        toast({ title: "Voting Ended", description: "The poll is now closed." });
        
        setPollData(prev => ({
          ...prev,
          votingEnded: true
        }));

        // Determine winner
        setTimeout(() => {
          const counts = pollData.voteCounts;
          const options = Object.keys(counts);
          
          if (options.length === 0) {
            setWinningOption(null);
            return;
          }
          
          let maxVotes = Math.max(...options.map(opt => counts[opt] || 0));
          
          if (maxVotes === 0) { // No votes cast
            setWinningOption(null);
            return;
          }
          
          const winners = options.filter(opt => (counts[opt] || 0) === maxVotes);
          setWinningOption(winners.length > 1 ? 'tie' : winners[0]);
        }, 100);
      }),
      
      subscribe('disconnect', () => { // On disconnect
        toast({ title: "Disconnected", description: "Lost connection to the server.", variant: "destructive" });
      })
    ];

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe, toast, onBackToHome, username, voteStorageKey, pollData.voteCounts]);

  const handleVote = (option: VoteOptionKey) => {
    if (pollData.votingEnded || currentUserHasVoted) return;
    sendMessage('cast-vote', { roomCode, voteOption: option, username });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Room code copied!",
      description: "Share it with your friends to join the poll.",
    });
  };

  const renderVoteButtons = () => {
    if (voteOptions.length === 0) {
      return <p>{pollData.votingEnded ? "No poll options." : "Loading options..."}</p>;
    }

    const emojiMap: { [key: string]: string } = { // Emoji map for options
      cats: "🐱",
      dogs: "🐶",
    };

    return voteOptions.map((option) => (
      <VoteButton
        key={option}
        emoji={emojiMap[option.toLowerCase()] || "❓"}
        label={option.charAt(0).toUpperCase() + option.slice(1)}
        count={pollData.voteCounts[option] || 0}
        selected={currentUserHasVoted}
        isWinner={pollData.votingEnded && winningOption === option}
        disabled={pollData.votingEnded || currentUserHasVoted}
        onClick={() => handleVote(option)}
      />
    ));
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="glass rounded-3xl p-6 max-w-3xl mx-auto w-full flex-grow flex flex-col">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-purple bg-clip-text text-transparent">
            {pollData.question}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Room Code: {roomCode}
          </p>
          
          {currentUserHasVoted && (
            <div className="mt-3 py-1 px-4 rounded-full bg-primary/10 text-primary inline-block">
              You have voted.
            </div>
          )}
          
          {pollData.votingEnded && (
            <div className="mt-3 py-1 px-4 rounded-full bg-destructive/10 text-destructive inline-block">
              Voting Ended
            </div>
          )}
        </div>

        <Timer remainingTime={pollData.remainingTime} />

        <div className="flex-grow flex flex-col">
          <div className={cn(
            "flex justify-center gap-10 my-8",
            "md:flex-row",
            "flex-col items-center"
          )}>
            {renderVoteButtons()}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div 
              className="glass rounded-xl px-4 py-2 flex justify-between items-center w-full sm:w-auto gap-2 cursor-pointer"
              onClick={copyRoomCode}
            >
              <span className="text-sm font-medium">Copy Code: {roomCode}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 rounded-lg"
              >
                📋
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={onBackToHome}
              className="rounded-xl w-full sm:w-auto"
            >
              Exit Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollRoom;
