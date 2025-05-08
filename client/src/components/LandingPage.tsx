
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import useWebSocket from '@/hooks/useWebSocket';

interface LandingPageProps {
  onCreateRoom: (username: string, roomCode: string) => void; // Callback for room creation
  onJoinRoom: (username: string, roomCode: string) => void; // Callback for room join
}

const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [username, setUsername] = useState('');
  const [joinMode, setJoinMode] = useState(false); // Toggle between create/join
  const [roomCode, setRoomCode] = useState(''); 
  const { toast } = useToast();
  const { sendMessage, subscribe, connect, isConnected } = useWebSocket();

  // Connect WebSocket on mount
  useEffect(() => {
    if (!isConnected) {
      connect().catch(err => console.error("LandingPage connect error:", err));
    }
  }, [connect, isConnected]);

  // Handle 'room-created' event
  useEffect(() => {
    const unsubscribe = subscribe('room-created', (data: any) => {
      if (data.roomCode && username) { 
        toast({
          title: "Room Created!",
          description: `Room code: ${data.roomCode}. Joining now...`,
        });
        onCreateRoom(username, data.roomCode);
      } else {
        toast({
          title: "Error",
          description: "Failed to create room or username not set.",
          variant: "destructive",
        });
      }
    });
    return unsubscribe; // Cleanup on unmount
  }, [subscribe, onCreateRoom, username, toast]);

  const handleCreateRoom = () => {
    if (!username) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue",
        variant: "destructive",
      });
      return;
    }
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Not connected to server. Please try again.",
        variant: "destructive",
      });
      return;
    }
    sendMessage('create-room', { customQuestion: 'Cats vs Dogs?' }); // Send create room message
  };

  const handleJoinRoom = () => {
    if (!username) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue",
        variant: "destructive",
      });
      return;
    }
    if (!roomCode) {
      toast({
        title: "Room code required",
        description: "Please enter a room code to join",
        variant: "destructive",
      });
      return;
    }
    onJoinRoom(username, roomCode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-purple bg-clip-text text-transparent">
            Poll Pulse
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create or join real-time poll rooms
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {joinMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-4">
                <Button 
                  onClick={handleJoinRoom}
                  className="gradient-purple rounded-xl h-12 font-medium"
                >
                  Join Poll Room
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setJoinMode(false)}
                >
                  Back to Main Menu
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <Button
                onClick={handleCreateRoom}
                className="gradient-purple rounded-xl h-12 font-medium"
              >
                Create Poll Room
              </Button>
              <Button
                variant="outline"
                onClick={() => setJoinMode(true)}
                className="rounded-xl h-12"
              >
                Join Poll Room
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
