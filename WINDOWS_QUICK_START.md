# 🚀 JobPost - Windows Quick Start

## Easiest Way to Start (Recommended)

### Step 1: Install Dependencies
- **Double-click** `install.bat` in the project folder
- Wait for it to complete (this may take 2-5 minutes)

### Step 2: Start the Application  
- **Double-click** `start.bat` in the project folder
- Two terminal windows will automatically open
- Your browser will open to the application

### Step 3: You're Done!
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

---

## First-Time Setup Checklist

- [ ] WSL installed (Windows → Settings → Apps → Optional Features → Windows Subsystem for Linux)
- [ ] Node.js installed in WSL (`wsl npm --version`)
- [ ] MongoDB running or MongoDB Atlas account created
- [ ] Ran `install.bat`
- [ ] Ran `start.bat`

---

## MongoDB Setup

### Option A: Local MongoDB (Recommended for Development)
1. Install MongoDB Community Edition
2. Run `mongod` in a terminal before starting the app

### Option B: MongoDB Atlas (Cloud - No Local Installation)
1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free account and cluster
3. Get connection string
4. Edit `backend/.env` and update `MONGODB_URI`

---

## Troubleshooting

### Issue: "WSL command not found"
**Solution**: WSL is not installed. Go to Windows Settings → Apps → Optional Features and enable "Windows Subsystem for Linux"

### Issue: Port 3000 or 5000 already in use
**Solution**: 
```bash
# In WSL terminal, kill the process:
lsof -i :3000  # or :5000
kill -9 <PID>
```

### Issue: "MongoDB connection error"
**Solution**: 
- Make sure `mongod` is running in a terminal
- Or update `backend/.env` with MongoDB Atlas connection string

### Issue: Still seeing errors?
Try manual setup:
```bash
# Open WSL terminal (right-click in project folder → Open in Terminal → Switch to Ubuntu)
wsl
cd ~/w/jobpost
npm install --prefix backend
npm install --prefix frontend
cd backend && npm start
# In another terminal:
cd frontend && npm run dev
```

---

## Project Features

✅ **User Authentication** - Register as Worker or Employer
✅ **Job Posting** - Employers can post jobs
✅ **Job Search** - Workers can search and filter jobs
✅ **Job Applications** - Workers can apply for jobs
✅ **Application Management** - Employers can manage applications

---

## API Endpoints

```
Auth:
- POST   /api/auth/register        Register new user
- POST   /api/auth/login           Login user

Jobs:
- GET    /api/jobs                 Get all jobs
- POST   /api/jobs                 Post new job
- GET    /api/jobs/:id             Get job details
- PUT    /api/jobs/:id             Update job
- DELETE /api/jobs/:id             Delete job

Applications:
- POST   /api/applications         Apply for job
- GET    /api/applications         Get my applications

Users:
- GET    /api/users/:id            Get user profile
- PUT    /api/users/:id            Update profile
```

---

## Need More Help?

Read the full setup guide: See `SETUP.md` in the project folder

