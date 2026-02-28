# QuickChat

QuickChat is a real-time messaging application featuring both a web frontend and a robust backend server.

## Overview

This repository contains the full source code for the QuickChat project, organized into two main directories:
- **`frontend/`**: A React-based Single Page Application (SPA) offering a responsive, modern user interface for real-time chat.
- **`backend/`**: A Python FastAPI server providing REST endpoints, secure authentication, and WebSocket-based bidirectional communication.

## Features

- **Real-Time Communication**: Instant messaging powered by WebSockets (Socket.IO).
- **Secure Authentication**: JWT-based user login and registration.
- **Modern UI**: Designed with React, Radix UI Primitives, and Tailwind CSS for a seamless user experience.
- **Database Integration**: Async data management utilizing MongoDB (Motor).

## Prerequisites

To run QuickChat locally, ensure you have the following installed:
- **Node.js** and **Yarn** (for the frontend application)
- **Python 3.10+** (for the backend application)
- **MongoDB** instance (running locally or a cloud URI like MongoDB Atlas)

## Getting Started

### 1. Setting Up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your environment variables in `backend/.env` (e.g., MongoDB URI, JWT Secret).
5. Start the backend server:
   ```bash
   # Windows users can use the provided batch script:
   start-backend.bat
   ```

### 2. Setting Up the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies using Yarn:
   ```bash
   yarn install
   ```
3. Start the React development server:
   ```bash
   yarn start
   # Windows users can also use the startup script in the root directory:
   # start-frontend.bat
   ```
4. Access the application in your browser at `http://localhost:3000`.

## Tech Stack Overview

- **Frontend**: React.js, Tailwind CSS, Radix UI, Socket.IO Client, Axios, React Hook Form, Zod.
- **Backend**: Python, FastAPI, Motor (PyMongo), Uvicorn, Python-SocketIO, JWT, Bcrypt.

## Scripts & Tools

- `start-frontend.bat`: Convenience script to launch the frontend on Windows.
- `diagnose-mobile.bat`: Script to troubleshoot mobile (Flutter/Android) connectivity and network paths on Windows.
