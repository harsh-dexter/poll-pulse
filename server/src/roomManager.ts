import type { WebSocket } from 'ws';
import { generateRoomCode } from './utils';

const DEFAULT_POLL_QUESTION = "Cats vs Dogs?";
const DEFAULT_VOTE_OPTIONS = ["cats", "dogs"]; // For voteCounts init
const TIMER_DURATION_SECONDS = 60;

export interface User {
  id: string; // Unique user ID (e.g., WebSocket ID)
  name: string;
  hasVoted: boolean;
}

export interface Room {
  roomCode: string;
  question: string;
  users: Map<string, User>; // Map userId to User
  voteCounts: { [option: string]: number };
  timerId: NodeJS.Timeout | null;
  remainingTime: number; // Time in seconds
  votingEnded: boolean;
  clients: Set<WebSocket>; // Active WebSocket connections
  timerStarted: boolean;
  cleanupTimeoutId: NodeJS.Timeout | null; // Empty room cleanup timer
}

// Active rooms store
const rooms = new Map<string, Room>();

/**
 * Creates a new poll room.
 * @param customQuestion Optional custom question for the poll.
 * @returns The newly created Room object.
 */
export function createNewRoom(customQuestion?: string): Room {
  const roomCode = generateRoomCode();
  const question = customQuestion || DEFAULT_POLL_QUESTION;
  const initialVoteCounts: { [option: string]: number } = {};
  DEFAULT_VOTE_OPTIONS.forEach(option => initialVoteCounts[option] = 0);

  const newRoom: Room = {
    roomCode,
    question,
    users: new Map<string, User>(),
    voteCounts: initialVoteCounts,
    timerId: null,
    remainingTime: TIMER_DURATION_SECONDS,
    votingEnded: false,
    clients: new Set<WebSocket>(),
    timerStarted: false,
    cleanupTimeoutId: null, // Init cleanup timer
  };
  rooms.set(roomCode, newRoom);
  console.log(`Room [${roomCode}] created with question: "${question}"`);
  return newRoom;
}

/**
 * Retrieves a room by its code.
 * @param roomCode The code of the room to retrieve.
 * @returns The Room object or undefined if not found.
 */
export function getRoomByCode(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

/**
 * Adds a user to a specified room.
 * @param roomCode The code of the room to join.
 * @param userId The unique ID of the user.
 * @param userName The name of the user.
 * @param client The WebSocket connection of the user.
 * @returns The updated Room object or null if the room doesn't exist.
 */
export function addUserToRoom(roomCode: string, userId: string, userName: string, client: WebSocket): Room | null {
  const room = getRoomByCode(roomCode);
  if (!room) {
    return null;
  }

  // Cancel cleanup on join
  if (room.cleanupTimeoutId) {
    clearTimeout(room.cleanupTimeoutId);
    room.cleanupTimeoutId = null;
    console.log(`Room [${roomCode}] cleanup cancelled due to user joining.`);
  }

  if (room.users.has(userId)) {
    // User rejoining, update client
    room.clients.add(client); 
    console.log(`User [${userName} (${userId})] re-joined room [${roomCode}].`);
    return room;
  }

  const user: User = { id: userId, name: userName, hasVoted: false };
  room.users.set(userId, user);
  room.clients.add(client);
  console.log(`User [${userName} (${userId})] joined room [${roomCode}]. Total users: ${room.users.size}`);
  return room;
}

/**
 * Removes a user from a room, typically on disconnect.
 * @param roomCode The code of the room.
 * @param userId The ID of the user to remove.
 * @param client The WebSocket client to remove from the room's client set.
 */
export function removeUserFromRoom(roomCode: string, userId: string, client: WebSocket): void {
  const room = getRoomByCode(roomCode);
  if (room) {
    room.users.delete(userId);
    room.clients.delete(client);
    console.log(`User [${userId}] removed from room [${roomCode}]. Remaining users: ${room.users.size}`);
    
    // Schedule cleanup if empty
    if (room.users.size === 0 && !room.cleanupTimeoutId) {
      console.log(`Room [${roomCode}] is empty. Scheduling cleanup in 1 minute.`);
      room.cleanupTimeoutId = setTimeout(() => {
        // Re-check before deleting
        const currentRoom = rooms.get(roomCode);
        if (currentRoom && currentRoom.users.size === 0) {
          // Clear poll timer
          if (currentRoom.timerId) {
            clearTimeout(currentRoom.timerId);
            currentRoom.timerId = null; 
          }
          rooms.delete(roomCode);
          console.log(`Room [${roomCode}] destroyed after grace period.`);
        } else if (currentRoom) {
          // User rejoined, cancel cleanup
           currentRoom.cleanupTimeoutId = null; 
           console.log(`Room [${roomCode}] cleanup aborted, users present.`);
        } else {
           // Log edge case: room gone
           console.log(`Room [${roomCode}] cleanup check: Room no longer exists.`);
        }
      }, 60000); 
    }
  }
}

/**
 * Records a vote for a user in a room.
 * @param roomCode The room code.
 * @param userId The ID of the user voting.
 * @param voteOption The option the user voted for.
 * @returns True if the vote was successfully recorded, false otherwise (e.g., already voted, voting ended).
 */
export function castUserVote(roomCode: string, userId: string, voteOption: string): boolean {
  const room = getRoomByCode(roomCode);
  if (!room || room.votingEnded) {
    return false;
  }
  const user = room.users.get(userId);
  if (!user || user.hasVoted) {
    return false;
  }

  if (room.voteCounts[voteOption] !== undefined) {
    room.voteCounts[voteOption]++;
    user.hasVoted = true;
    console.log(`Vote cast by user [${userId}] for [${voteOption}] in room [${roomCode}]. New counts:`, room.voteCounts);
    return true;
  }
  return false; 
}

/**
 * Starts the countdown timer for a room.
 * @param roomCode The room code.
 * @param onTick Callback function executed on each timer tick.
 * @param onEnd Callback function executed when the timer ends.
 */
export function startRoomTimer(
  roomCode: string,
  onTick: (roomCode: string, remainingTime: number) => void,
  onEnd: (roomCode: string) => void
): void {
  const room = getRoomByCode(roomCode);
  if (!room || room.timerId || room.timerStarted) { 
    return;
  }

  room.timerStarted = true;
  console.log(`Timer started for room [${roomCode}] for ${room.remainingTime} seconds.`);

  room.timerId = setInterval(() => {
    room.remainingTime--;
    onTick(roomCode, room.remainingTime);

    if (room.remainingTime <= 0) {
      if (room.timerId) clearInterval(room.timerId);
      room.timerId = null;
      room.votingEnded = true;
      onEnd(roomCode);
      console.log(`Voting ended for room [${roomCode}].`);
    }
  }, 1000);
}

/**
 * Retrieves all clients for a given room.
 * @param roomCode The room code.
 * @returns A Set of WebSocket clients or undefined if room not found.
 */
export function getRoomClients(roomCode: string): Set<WebSocket> | undefined {
    const room = getRoomByCode(roomCode);
    return room?.clients;
}
