# Khuzdar POS

A modern Point of Sale (POS) application built with React (Vite) and Express (Node.js/PostgreSQL).

## Project Structure

- `client/`: React frontend application built using Vite.
- `server/`: Express API backend application with PostgreSQL database layer.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL database

### 1. Database Setup
Make sure you have PostgreSQL running. Create a `.env` file in the `server` directory based on `server/.env.example`.
Then run the setup script to initialize the tables and seed data:
```bash
cd server
npm install
npm run setup
```

### 2. Run the API Server
Start the Express server in development mode:
```bash
npm run dev
```

### 3. Run the Frontend Client
Open another terminal, install the dependencies, and start the Vite dev server:
```bash
cd client
npm install
npm run dev
```

## Production Build

To build the client SPA for production:
```bash
cd client
npm run build
```
This will compile the frontend assets into `client/dist/` which can be served by the web server.
