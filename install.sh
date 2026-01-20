#!/bin/bash

echo "Installing JobPost Backend & Frontend..."

cd /home/ssybk/w/jobpost/backend
echo "Installing backend dependencies..."
npm install

cd /home/ssybk/w/jobpost/frontend
echo "Installing frontend dependencies..."
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start the application:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
