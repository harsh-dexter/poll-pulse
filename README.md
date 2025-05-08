# Poll Pulse - Real-time Voting Application

This project is a simple real-time polling application built for an assignment. Users can create or join shared poll rooms, vote on a predefined question (e.g., "Cats vs Dogs?"), and see results update live via WebSockets.

## Project Structure

The project is organized into two main directories:

-   `client/`: Contains the React frontend application (built with Vite and TypeScript).
-   `server/`: Contains the Node.js WebSocket backend server (built with TypeScript).

## Features Implemented

**Frontend (React - client/)**

*   **User Identification:** Enter a username to identify yourself in poll rooms.
*   **Room Creation:** Create a new poll room; receives a unique 6-character room code from the backend.
*   **Room Joining:** Join an existing poll room using its room code.
*   **Poll Display:** Shows the poll question (default: "Cats vs Dogs?") and voting options.
*   **Voting:** Allows users to cast one vote per poll room.
*   **Real-time Updates:** Vote counts update live as users vote, powered by WebSocket messages.
*   **Voted Status:** UI indicates if the current user has already voted in the room, preventing re-voting.
*   **Countdown Timer:** A 60-second timer starts when the first user joins. Voting is disabled when the timer ends.
*   **Vote Persistence:** Uses `localStorage` to remember if a user has voted in a specific room, even after refreshing the page.

**Backend (Node.js + WebSocket - server/)**

*   **WebSocket Server:** Uses the `ws` library to handle real-time communication.
*   **Room Management:** Creates unique room codes and manages multiple concurrent poll rooms.
*   **In-Memory State:** Stores all room data (users, votes, timer status) in memory; no database required.
*   **User Handling:** Tracks users connected to each room via their WebSocket connection.
*   **Vote Broadcasting:** Receives votes and broadcasts updated vote counts to all clients in the relevant room.
*   **Timer Logic:** Manages a 60-second countdown per room, triggered by the first user joining. Broadcasts timer end events.

## Technologies Used

*   **Frontend:** React, Vite, TypeScript, Shadcn UI, Tailwind CSS
*   **Backend:** Node.js, TypeScript, ws (WebSocket library)
*   **State Management:** React Hooks (useState, useEffect), In-memory Map (backend)
*   **Communication:** WebSockets

## Setup and Running the Application

**Prerequisites:**

*   Node.js (v18 or later recommended)
*   npm (usually comes with Node.js)

**Instructions:**

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/harsh-dexter/poll-pulse
    cd poll-pulse-ui 
    ```

2.  **Install Server Dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Install Client Dependencies:**
    ```bash
    cd ../client 
    npm install
    ```

4.  **Run the Backend Server:**
    *   Open a terminal window.
    *   Navigate to the `server` directory: `cd server`
    *   Start the server in development mode (with auto-restart):
        ```bash
        npm run dev
        ```
    *   The server will start on `ws://localhost:3001` by default.

5.  **Run the Frontend Client:**
    *   Open a *second* terminal window.
    *   Navigate to the `client` directory: `cd client`
    *   Start the client development server:
        ```bash
        npm run dev
        ```
    *   The client will likely open automatically in your browser at `http://localhost:8080` (or another port specified by Vite).

6.  **Use the Application:** Open the client URL in your browser. You can open multiple browser tabs/windows to simulate multiple users joining the same room.

## Environment Variables (Frontend)

The frontend uses a `.env` file to configure the WebSocket URL for connecting to the backend.

*   Create a file named `.env` in the `client/` directory.
*   Add the following line, replacing the URL with your backend's address:
    ```
    VITE_WEBSOCKET_URL=wss://your-backend-websocket-url.com
    ```
*   For local development, if the server is running on `ws://localhost:3001`, you can use:
    ```
    VITE_WEBSOCKET_URL=ws://localhost:3001
    ```
*   This `.env` file is ignored by Git (via `.gitignore`). For deployed environments, configure `VITE_WEBSOCKET_URL` as an environment variable in your hosting provider's settings.

## Backend Architecture: Vote State Sharing & Room Management

The backend uses an in-memory architecture to manage poll rooms and synchronize vote states in real time. This design keeps the system lightweight and responsive, ideal for the assignment’s scope. The logic is centered around three key files:

- `roomManager.ts`: Manages all room data and state.
- `server.ts`: Handles WebSocket connections and routing.
- `eventHandlers.ts`: Processes client events and triggers state updates.

### Room Management

Poll rooms are stored in a global `Map`, where each key is a unique `roomCode` and the value is a `Room` object. Each room independently tracks:

- The poll question  
- Vote counts (e.g., `{ cats: 2, dogs: 3 }`)  
- Connected users (with unique `userIds`)  
- Active WebSocket clients  
- Voting status and timer  

A second map (`clientRooms`) maps each WebSocket client to their current room for easy cleanup on disconnect.

### Vote State Sharing

When a user connects, the server assigns a unique ID and listens for WebSocket messages. Messages follow a `{ type, payload }` structure and are routed via event handlers.

Based on the message type (e.g., `join-room`, `cast-vote`), the server updates the relevant room’s state using helper functions in `roomManager.ts`.

Whenever the state changes — like a vote is cast or a user joins — the server broadcasts an update (`vote-update`, `user-joined`, etc.) to all clients in that specific room using the room’s `clients` set. This ensures real-time, scoped updates without affecting other rooms.

### Timer Handling

Each room starts its timer (`setInterval`) when the first user joins. The remaining time is broadcasted every second. Once the timer reaches zero, the room's `votingEnded` flag is set to `true`, and a `voting-ended` event is sent to all connected clients.

Timers and vote updates are fully decoupled from the client — ensuring consistent state even if users refresh or disconnect temporarily.

---

### Summary

This architecture avoids external databases or persistent storage, focusing purely on fast, event-driven WebSocket communication. It supports multiple simultaneous rooms, isolates state cleanly per room, and handles disconnections gracefully — all while remaining simple and easy to scale if needed.
