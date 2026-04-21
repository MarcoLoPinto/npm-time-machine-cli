#!/usr/bin/env bash

set -e

echo "🚀 Starting release..."

# Check clean working directory
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Working directory not clean. Commit or stash changes first."
  exit 1
fi

# Version type (default: patch)
VERSION_TYPE=${1:-patch}

if [[ "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
  echo "❌ Invalid version type. Use: patch | minor | major"
  exit 1
fi

# Ensure you're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "❌ You are on branch '$CURRENT_BRANCH'. Switch to main."
  exit 1
fi

# Show current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Run tests
echo "🧪 Running tests..."
npm test
echo "✅ Tests passed"

# Interactive confirmation
read -p "⚠️ Proceed with $VERSION_TYPE release? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "❌ Release aborted"
  exit 1
fi

# Bump version + create tag
echo "📦 Bumping version..."
npm version "$VERSION_TYPE"

NEW_VERSION=$(node -p "require('./package.json').version")
echo "📦 New version: $NEW_VERSION"

# Push code + tags
echo "📡 Pushing to GitHub..."
git push origin main --follow-tags

echo "🎉 Release v$NEW_VERSION triggered!"
echo "👉 Check GitHub Actions for publish status"