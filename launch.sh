#!/bin/bash

# OrderFlow Architect - Production Launcher
# ========================================
# 
# This shell script handles the complete production launch process
# for the OrderFlow Architect trading platform.
#
# Usage: ./launch.sh [dev|prod|clean|health]
#   dev   - Launch in development mode
#   prod  - Launch in production mode
#   clean - Clean and reset the environment
#   health - Run health check
#

set -e

# Set colors for output
GREEN='\033[92m'
YELLOW='\033[93m'
RED='\033[91m'
BLUE='\033[94m'
RESET='\033[0m'

# Default mode
MODE="dev"

# Parse command line arguments
if [ $# -eq 0 ]; then
    MODE="dev"
else
    MODE="$1"
fi

# Display header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║${RESET} ${GREEN}OrderFlow Architect - Production Launcher${RESET}                      ${BLUE}║${RESET}"
echo -e "${BLUE}║${RESET} ${YELLOW}Advanced Trading Platform Deployment System${RESET}                    ${BLUE}║${RESET}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed! Please install Node.js first.${RESET}"
    exit 1
fi

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed! Please install npm first.${RESET}"
    exit 1
fi

echo -e "${GREEN}✅ Environment check passed${RESET}"
echo -e "${GREEN}✅ Node.js:${RESET} ${YELLOW}$(node --version)${RESET}"
echo -e "${GREEN}✅ npm:${RESET} ${YELLOW}$(npm --version)${RESET}"
echo

# Handle different modes
case "$MODE" in
    "clean")
        clean_environment
        ;;
    "health")
        health_check
        ;;
    "dev")
        development_mode
        ;;
    "prod")
        production_mode
        ;;
    *)
        echo -e "${RED}❌ Unknown mode: $MODE${RESET}"
        echo -e "${YELLOW}Usage: $0 [dev|prod|clean|health]${RESET}"
        exit 1
        ;;
esac

clean_environment() {
    echo -e "${YELLOW}🧹 Starting environment cleanup...${RESET}"
    echo

    # Kill existing processes
    echo -e "${BLUE}Stopping existing processes...${RESET}"
    pkill -f "node|tsx|nodemon" || true

    # Clean up ports
    echo -e "${BLUE}Cleaning up ports...${RESET}"
    lsof -ti:3000 | xargs kill -9 || true

    # Remove build artifacts
    echo -e "${BLUE}Removing build artifacts...${RESET}"
    rm -rf .next node_modules/.cache *.log

    # Clean npm cache
    echo -e "${BLUE}Cleaning npm cache...${RESET}"
    npm cache clean --force

    echo -e "${GREEN}✅ Environment cleanup completed${RESET}"
    echo
}

health_check() {
    echo -e "${YELLOW}🔍 Running system health check...${RESET}"
    echo

    # Check if server is running
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✅ Server is running and responding${RESET}"
        
        # Get detailed health status
        echo -e "${BLUE}Detailed health status:${RESET}"
        curl -s http://localhost:3000/api/health
        echo
    else
        echo -e "${RED}❌ Server is not running or not responding${RESET}"
        echo -e "${YELLOW}Try launching the server first with: $0 dev${RESET}"
    fi

    # Check database
    echo -e "${BLUE}Checking database...${RESET}"
    if [ -f "db/custom.db" ]; then
        echo -e "${GREEN}✅ Database file exists${RESET}"
    else
        echo -e "${YELLOW}⚠️ Database file not found, will be created on first run${RESET}"
    fi

    # Check dependencies
    echo -e "${BLUE}Checking dependencies...${RESET}"
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ Dependencies installed${RESET}"
    else
        echo -e "${YELLOW}⚠️ Dependencies not installed, run npm install first${RESET}"
    fi

    echo
}

development_mode() {
    echo -e "${YELLOW}🚀 Launching in DEVELOPMENT mode...${RESET}"
    echo

    # Check dependencies
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}Installing dependencies...${RESET}"
        npm install
    fi

    # Check database setup
    echo -e "${BLUE}Setting up database...${RESET}"
    npm run db:push

    # Kill existing processes on port 3000
    echo -e "${BLUE}Cleaning up port 3000...${RESET}"
    lsof -ti:3000 | xargs kill -9 || true

    # Launch development server
    echo -e "${GREEN}🚀 Starting development server...${RESET}"
    echo -e "${BLUE}Server will be available at: http://localhost:3000${RESET}"
    echo -e "${BLUE}WebSocket server: ws://localhost:3000/api/socketio${RESET}"
    echo -e "${YELLOW}Press Ctrl+C to stop the server${RESET}"
    echo

    # Start the development server with logging
    npm run dev

    echo
    echo -e "${GREEN}✅ Development server stopped${RESET}"
}

production_mode() {
    echo -e "${YELLOW}🚀 Launching in PRODUCTION mode...${RESET}"
    echo

    # Check if this is a production build
    if [ ! -d ".next" ]; then
        echo -e "${BLUE}Building for production...${RESET}"
        npm run build
    fi

    # Check database setup
    echo -e "${BLUE}Setting up database...${RESET}"
    npm run db:push

    # Kill existing processes on port 3000
    echo -e "${BLUE}Cleaning up port 3000...${RESET}"
    lsof -ti:3000 | xargs kill -9 || true

    # Set production environment
    export NODE_ENV=production

    # Launch production server
    echo -e "${GREEN}🚀 Starting production server...${RESET}"
    echo -e "${BLUE}Server will be available at: http://localhost:3000${RESET}"
    echo -e "${BLUE}WebSocket server: ws://localhost:3000/api/socketio${RESET}"
    echo -e "${YELLOW}Press Ctrl+C to stop the server${RESET}"
    echo

    # Start the production server with logging
    npm run start

    echo
    echo -e "${GREEN}✅ Production server stopped${RESET}"
}

# Make the script executable
chmod +x "$0"

echo -e "${BLUE}Thank you for using OrderFlow Architect!${RESET}"
echo -e "${GREEN}Happy Trading! 🚀${RESET}"
echo