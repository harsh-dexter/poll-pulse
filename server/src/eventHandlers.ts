import { WebSocket, WebSocketServer } from 'ws';
import * as RoomManager from './roomManager';
import type { Room, User } from './roomManager';

// Send JSON to client
function sendToClient(client: WebSocket, type: string, payload: unknown) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type, payload }));
  }
}

// Broadcast JSON to room
function broadcastToRoom(roomCode: string, type: string, payload: unknown, excludeClient?: WebSocket) {
  const clients = RoomManager.getRoomClients(roomCode);
  if (clients) {
    clients.forEach(client => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        sendToClient(client, type, payload);
      }
    });
  }
}

// Timer event callbacks
function onTimerTick(roomCode: string, remainingTime: number) {
  broadcastToRoom(roomCode, 'timer-tick', { remainingTime });
}

function onTimerEnd(roomCode: string) {
  broadcastToRoom(roomCode, 'voting-ended', { roomCode, message: 'Voting has ended.' });
}

export function handleCreateRoom(ws: WebSocket & { id: string }, payload: { customQuestion?: string } | undefined) {
  const room = RoomManager.createNewRoom(payload?.customQuestion);
  // Client sends 'join-room' after this

  sendToClient(ws, 'room-created', {
    roomCode: room.roomCode,
    question: room.question,
    voteCounts: room.voteCounts,
    remainingTime: room.remainingTime,
    votingEnded: room.votingEnded,
  });
}

export function handleJoinRoom(ws: WebSocket & { id: string }, payload: { roomCode?: string; username?: string }) {
  const { roomCode, username } = payload;

  if (!roomCode || !username) {
    sendToClient(ws, 'join-error', { message: 'Room code and username are required.' });
    return;
  }

  const room = RoomManager.getRoomByCode(roomCode);
  if (!room) {
    sendToClient(ws, 'join-error', { message: 'Room not found.' });
    return;
  }

  if (room.votingEnded) {
    sendToClient(ws, 'join-error', { message: 'Voting has already ended for this room.' });
    return;
  }
  
  // ws.currentRoomCode = roomCode; // Association done in server.ts

  const updatedRoom = RoomManager.addUserToRoom(roomCode, ws.id, username, ws);
  if (updatedRoom) {
    sendToClient(ws, 'join-success', {
      roomCode: updatedRoom.roomCode,
      question: updatedRoom.question,
      voteCounts: updatedRoom.voteCounts,
      remainingTime: updatedRoom.remainingTime,
      votingEnded: updatedRoom.votingEnded,
      users: Array.from(updatedRoom.users.values()).map(u => ({ id: u.id, name: u.name, hasVoted: u.hasVoted })),
    });

    broadcastToRoom(roomCode, 'user-joined', { userId: ws.id, username }, ws);

    // Start timer if needed
    if (!updatedRoom.timerStarted && updatedRoom.users.size > 0) {
      RoomManager.startRoomTimer(roomCode, onTimerTick, onTimerEnd);
    }
  } else {
    // Fallback join error
    sendToClient(ws, 'join-error', { message: 'Failed to join room.' });
  }
}

export function handleCastVote(ws: WebSocket & { id: string }, payload: { roomCode?: string; voteOption?: string }) {
  const { roomCode, voteOption } = payload;
  const userId = ws.id;

  if (!roomCode || !voteOption) {
    sendToClient(ws, 'vote-error', { message: 'Room code and vote option are required.' });
    return;
  }

  const room = RoomManager.getRoomByCode(roomCode);
  if (!room) {
    sendToClient(ws, 'vote-error', { message: 'Room not found.' });
    return;
  }
  if (room.votingEnded) {
    sendToClient(ws, 'vote-error', { message: 'Voting has ended.' });
    return;
  }
  const user = room.users.get(userId);
  if (!user) {
    sendToClient(ws, 'vote-error', { message: 'User not found in this room. Please rejoin.' });
    return;
  }
  if (user.hasVoted) {
    sendToClient(ws, 'vote-error', { message: 'You have already voted.' });
    return;
  }

  const success = RoomManager.castUserVote(roomCode, userId, voteOption);
  if (success) {
    sendToClient(ws, 'vote-success', { message: 'Vote recorded.' });
    broadcastToRoom(roomCode, 'vote-update', { voteCounts: room.voteCounts });
  } else {
    // Vote fail (invalid option/already voted)
    sendToClient(ws, 'vote-error', { message: 'Failed to cast vote. Invalid option or already voted.' });
  }
}

// Map ws.id -> roomCode for cleanup
const clientRooms = new Map<string, string>(); 

export function registerClientForRoom(clientId: string, roomCode: string) {
    clientRooms.set(clientId, roomCode);
}

export function unregisterClientFromRoom(clientId: string) {
    clientRooms.delete(clientId);
}


export function handleDisconnect(ws: WebSocket & { id: string }) {
  const userId = ws.id;
  // Find user's room via clientRooms map
  const roomCode = clientRooms.get(userId);

  if (roomCode) {
    const room = RoomManager.getRoomByCode(roomCode);
    if (room) {
        const user = room.users.get(userId);
        RoomManager.removeUserFromRoom(roomCode, userId, ws);
        unregisterClientFromRoom(userId); // Cleanup map
        if (user) {
            broadcastToRoom(roomCode, 'user-left', { userId, username: user.name });
        }
    }
  }
  console.log(`Client [${userId}] disconnected.`);
}
