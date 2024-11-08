# Ludo Game App

A scalable, multiplayer Ludo game app built with Node.js, MongoDB, Redis, and Socket.io. This application supports real-time gameplay, user authentication, friend invitations, leaderboards, and in-app notifications.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Real-Time Gameplay**: Enjoy live, multiplayer gameplay with instant feedback and updates.
- **User Authentication**: Sign up, log in, and manage user sessions.
- **Friend System**: Send friend requests and play with friends.
- **Leaderboard**: Compete with others to reach the top of the leaderboard based on coins and wins.
- **Coin Wallet**: Earn, spend, and manage coins.
- **In-App Notifications**: Receive notifications for friend requests, game invites, and more.
- **Game History**: View previous games and moves.
  
## Architecture

The app uses a microservice-like approach to handle different aspects of the game efficiently. Here's a high-level overview:

1. **Backend Server (Node.js & Express)**: Manages API requests, authentication, game logic, and communication.
2. **Redis**: Stores active game states temporarily for real-time performance and quick access.
3. **MongoDB**: Persistent storage for user profiles, game history, leaderboard data, and coin transactions.
4. **Socket.io**: Real-time, bidirectional communication between the server and clients for live gameplay.
5. **Load Balancing**: Ensures scalability and fault tolerance by distributing traffic.

## Technologies Used

- **Node.js & Express**: Backend and RESTful API server
- **MongoDB**: NoSQL database for data persistence
- **Redis**: In-memory storage for real-time data and Pub/Sub
- **Socket.io**: Real-time WebSocket communication
- **Mongoose**: MongoDB ORM for data modeling
- **JWT**: User authentication
- **AWS (optional)**: Deployment on AWS with EC2, S3, and ELB

## Project Structure

```bash
.
├── models               # Mongoose models for MongoDB collections
├── controllers          # Controllers for handling API logic
├── services             # Services for managing business logic
├── config               # Configuration files (DB, Redis, JWT)
├── sockets              # Socket.io setup and event handling
├── middlewares          # Custom middleware for authentication and error handling
├── helper               # helper functions
├── README.md            # Project README
├── .env                 # Environment variables
└── server.js            # Entry point for the server
