
import React, { useState } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import LandingPage from '../components/LandingPage';
import PollRoom from '../components/PollRoom';

const Index = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inRoom, setInRoom] = useState(false);

  // Create room: use backend-generated code
  const handleCreateRoom = (name: string, newRoomCode: string) => {
    setUsername(name);
    setRoomCode(newRoomCode); 
    setInRoom(true);
  };

  // Join room: preserve room code case
  const handleJoinRoom = (name: string, code: string) => {
    setUsername(name);
    setRoomCode(code); 
    setInRoom(true);
  };

  const handleBackToHome = () => {
    setInRoom(false);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <ThemeToggle />
        
        {inRoom && username && roomCode ? (
          <PollRoom
            username={username}
            roomCode={roomCode}
            onBackToHome={handleBackToHome}
          />
        ) : (
          <LandingPage
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default Index;
