import { WebSocketServer, WebSocket } from 'ws';
import * as EventHandlers from './eventHandlers';

const PORT = process.env.PORT || 3001;

// Extended WebSocket with id
interface ExtendedWebSocket extends WebSocket {
  id: string;
}

const wss = new WebSocketServer({ port: Number(PORT) });

let nextClientId = 1; // Unique client ID counter

console.log(`WebSocket server started on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  const extendedWs = ws as ExtendedWebSocket;
  extendedWs.id = `user-${nextClientId++}`;

  console.log(`Client connected: ${extendedWs.id}`);

  ws.on('message', (messageBuffer) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(messageBuffer.toString());
    } catch (error) {
      console.error(`Failed to parse message from ${extendedWs.id}:`, messageBuffer.toString());
      ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid JSON message format.' } }));
      return;
    }

    const { type, payload } = parsedMessage;
    console.log(`Received message from ${extendedWs.id}: type=${type}, payload=`, payload);

    switch (type) {
      case 'create-room':
        EventHandlers.handleCreateRoom(extendedWs, payload);
        break;
      case 'join-room':
        // Register client before join
        if (payload && payload.roomCode) {
            EventHandlers.registerClientForRoom(extendedWs.id, payload.roomCode);
        }
        EventHandlers.handleJoinRoom(extendedWs, payload);
        break;
      case 'cast-vote':
        EventHandlers.handleCastVote(extendedWs, payload);
        break;
      default:
        console.log(`Unknown message type from ${extendedWs.id}: ${type}`);
        ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown message type: ${type}` } }));
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${extendedWs.id}`);
    EventHandlers.handleDisconnect(extendedWs);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${extendedWs.id}:`, error);
    // Consider cleanup on error
  });

});

wss.on('error', (error) => {
  console.error('WebSocketServer error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  wss.clients.forEach(client => client.close());
  wss.close(() => {
    console.log('WebSocket server closed.');
    process.exit(0);
  });
});
