#!/bin/bash
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Building Next.js app..."
next build
