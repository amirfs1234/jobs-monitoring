# Job Monitoring System

This is a simple job monitoring system that simulates running C++ jobs (using PowerShell scripts for demonstration). It tracks job success rates, retries, and provides statistics about job patterns.

## Prerequisites

- Node.js installed (version 14 or higher)
- Windows OS (since it uses PowerShell)
- npm or yarn package manager

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Running the Project

1. Start the server:
```bash
node server.js
```
The server will start on port 3000 (or the port specified in your .env file)

2. In a separate terminal, run the test script to simulate some jobs:
```bash
node test-jobs.js
```

## What This Does

This system:
- Simulates running jobs (like C++ programs) with random success/failure rates
- Automatically retries failed jobs once
- Tracks job statistics and patterns
- Provides an API to monitor job status and get statistics

You can:
- Submit new jobs via POST /jobs
- Check job status via GET /jobs
- View statistics via GET /stats

The code is structured to be easily extended for real C++ jobs or other types of programs.

## API Endpoints

- POST /jobs - Submit a new job
- GET /jobs - List all jobs
- GET /stats - Get job statistics and patterns

## Note

This is a demonstration project. In a production environment, you'd want to:
- Use a proper database instead of in-memory storage
- Add authentication and rate limiting
- Implement proper error handling
- Add logging and monitoring
- Use a process manager like PM2