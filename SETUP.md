# JobPost - Quick Start Guide

## ⚠️ IMPORTANT: Run from WSL Terminal, Not PowerShell

The project requires running from a proper WSL (Linux) terminal, not PowerShell.

### Step 1: Open WSL Terminal
```bash
# In PowerShell, type:
wsl

# Or open Ubuntu from Windows Start menu
```

You should see a prompt like: `ssybk@Sisobk:~$`

### Step 2: Navigate to Project
```bash
cd ~/w/jobpost
```

### Step 3: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 4: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 5: Start Backend Server (Terminal 1)
```bash
cd ~/w/jobpost/backend
npm run dev
```

The backend will start on `http://localhost:5000`

### Step 6: Start Frontend Server (Terminal 2)
```bash
cd ~/w/jobpost/frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### Step 7: Access the Application
Open your browser and go to: `http://localhost:3000`

## Database Setup

### Option 1: MongoDB Local
Make sure MongoDB is installed and running:
```bash
# Start MongoDB service
mongod
```

### Option 2: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string
4. Update `backend/.env` with your connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jobpost
   ```

## Features
- 👥 User Registration & Login (Worker/Employer)
- 📋 Post Jobs (Employers)
- 🔍 Search & Filter Jobs (Workers)
- 📝 Apply for Jobs (Workers)
- 💼 Manage Applications (Employers)

## Troubleshooting

### "npm: command not found"
- Make sure you're in WSL terminal, not PowerShell
- Run: `which npm` - should show `/usr/bin/npm` or similar

### Port 3000 or 5000 already in use
- Kill the process: `lsof -i :3000` then `kill -9 <PID>`
- Or change port in `.env` files

### MongoDB connection error
- Make sure MongoDB is running
- Check connection string in `backend/.env`
- Try MongoDB Atlas instead of local

## Project Structure
```
jobpost/
├── backend/           # Express.js API server
│   ├── models/        # Database schemas
│   ├── routes/        # API endpoints
│   ├── middleware/    # Authentication
│   └── server.js
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/  # API client
│   └── package.json
└── README.md
```
