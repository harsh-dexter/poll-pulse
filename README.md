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

## Deployment

*   **Backend:** The server in the `server/` directory can be deployed to any Node.js hosting environment (e.g., Render, Heroku, AWS). Ensure the `PORT` environment variable is correctly set by the hosting provider if it's not 3001.
*   **Frontend:** The client in the `client/` directory is a static Vite application.
    *   Build the application:
        ```bash
        cd client
        npm run build
        ```
    *   Deploy the contents of the `client/dist/` folder to any static site hosting service (e.g., Render, Vercel, Netlify, GitHub Pages).
    *   **Crucially**, ensure the `VITE_WEBSOCKET_URL` environment variable is set in your frontend hosting provider's settings to point to your deployed backend WebSocket URL (e.g., `wss://poll-pulse.onrender.com`).

## Backend Architecture: State Sharing & Room Management

The backend's vote state sharing and room management are structured around an in-memory model, primarily orchestrated by `server/src/roomManager.ts`. Each poll room is an independent entity holding its own vote counts, user list, and timer status. Real-time updates and state synchronization with clients are achieved through WebSocket messages, ensuring all participants in a room see live changes.

The backend manages the application state entirely in memory, suitable for the assignment's scope. Here's how it works in more detail:

1.  **Room Storage (`server/src/roomManager.ts`):**
    *   A global `Map` object (`rooms`) stores all active poll rooms. The key is the unique `roomCode` (string), and the value is a `Room` object containing all information about that specific poll.
    *   The `Room` object holds the `question`, current `voteCounts` (e.g., `{ cats: 0, dogs: 0 }`), `remainingTime`, `votingEnded` status, a `Map` of connected `users` (keyed by a unique user ID assigned on connection), and a `Set` of active `WebSocket` client connections (`clients`) currently in that room.

2.  **Connection Handling (`server/src/server.ts`):**
    *   When a client connects via WebSocket, the server assigns it a unique ID (e.g., `user-1`).
    *   The server listens for JSON messages from the client. Each message has a `type` (e.g., `join-room`, `cast-vote`) and a `payload`.

3.  **Event Processing (`server/src/eventHandlers.ts`):**
    *   Based on the message `type`, the corresponding handler function is called.
    *   These handlers interact with the `roomManager` functions (e.g., `addUserToRoom`, `castUserVote`) to update the state stored in the `rooms` Map.
    *   A separate `Map` (`clientRooms`) tracks which room each connected client (`ws.id`) is currently in, facilitating cleanup on disconnect.

4.  **State Sharing (Broadcasting):**
    *   When a relevant state change occurs (e.g., a vote is cast, a user joins/leaves, the timer ends), the backend broadcasts update messages to clients.
    *   Broadcasting is targeted to specific rooms using the `clients` Set stored within each `Room` object in the `roomManager`. Helper functions (`sendToClient`, `broadcastToRoom`) ensure messages are sent only to the relevant connected clients in a room. For example, a `vote-update` message containing the new `voteCounts` is sent to everyone in the room where the vote occurred.

5.  **Timer Management:**
    *   The timer (`setInterval`) is managed within the `roomManager`. It's started when the first user joins a room and hasn't already started.
    *   On each tick, a callback provided by `eventHandlers` broadcasts the remaining time. When the timer finishes, another callback broadcasts the `voting-ended` event and updates the room state.

This in-memory approach keeps the backend simple and focused on real-time updates via WebSockets without needing external databases or complex state synchronization mechanisms.
