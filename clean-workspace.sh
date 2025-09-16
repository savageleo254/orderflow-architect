#!/bin/bash

# Clean workspace script for archiving
echo "Cleaning workspace for archiving..."

# Remove node_modules (will be restored with npm install)
echo "Removing node_modules..."
rm -rf node_modules

# Remove any remaining log files
echo "Removing log files..."
find . -name "*.log" -type f -delete

# Remove database files (will be regenerated)
echo "Removing database files..."
rm -rf db/*.db

# Remove build artifacts
echo "Removing build artifacts..."
rm -rf .next
rm -rf dist
rm -rf build

# Remove cache directories
echo "Removing cache directories..."
rm -rf .cache
rm -rf .npm
rm -rf .yarn

# Remove IDE files
echo "Removing IDE files..."
rm -rf .vscode
rm -rf .idea
rm -rf *.swp
rm -rf *.swo

# Remove OS files
echo "Removing OS files..."
find . -name ".DS_Store" -type f -delete
find . -name "Thumbs.db" -type f -delete

echo "Workspace cleaned successfully!"
echo "Total size: $(du -sh . | cut -f1)"
echo ""
echo "To restore the workspace:"
echo "1. Run 'npm install' to restore node_modules"
echo "2. Run 'npm run db:push' to recreate the database"