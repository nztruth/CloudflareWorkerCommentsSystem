#!/bin/bash

# Force npm usage and install dependencies
echo "Using npm for package management..."
npm ci

# Build the frontend
echo "Building frontend..."
npm run build

echo "Build complete!"