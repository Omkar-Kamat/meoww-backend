# 🐾 MEOWW Backend

The backend coordination engine for **Meoww** — a real-time, 1v1 random video chat application.

## 🚀 Teck Stack

- **Server**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.io
- **Auth**: JWT (Double Cookie Strategy) + bcryptjs
- **Services**: Resend (Email), Cloudinary (Images)
- **Security**: Helmet, Express Rate Limit

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Cloudinary Account
- Resend API Key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory (refer to `.env.example`).
4. Run the development server:
   ```bash
   npm run dev
   ```

## 📖 API Documentation

The API Documentation is powered by **Swagger**. 

Once the server is running, you can access the interactive documentation at:
🔗 `http://localhost:5000/api-docs`

## 🔌 Socket Events

The signaling server handles the following events:

- `search`: Join the matchmaking queue.
- `offer`: Relay WebRTC offer to peer.
- `answer`: Relay WebRTC answer to peer.
- `ice-candidate`: Relay ICE candidates.
- `skip`: Disconnect from current peer and find a new one.
- `send-message`: Exchange chat messages in-room.

## 📁 Project Structure

```text
meoww-backend/
├── src/
│   ├── config/        # Setup for DB, CORS, Cloudinary, Swagger
│   ├── modules/       # MVC Modules (Auth, User, OTP)
│   ├── sockets/       # Socket.io signaling & matchmaking
│   ├── services/      # External services (Email, TURN)
│   ├── middleware/    # Auth and Rate limiting
│   └── app.js         # Express app config
├── server.js          # Entry point
└── ...
```
