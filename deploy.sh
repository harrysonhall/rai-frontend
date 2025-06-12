#!/bin/bash

APP_NAME="rai-frontend"
BRANCH="main"
# GITHUB_TOKEN should be set as environment variable
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable is not set"
  exit 1
fi

REMOTE_URL="https://${GITHUB_TOKEN}@github.com/harrysonhall/rai-frontend.git"

echo "[deploy] Remote: $REMOTE_URL"

ssh ec2-server "
  cd /home/ec2-user

  if [ ! -d \"$APP_NAME\" ]; then
    echo \"[deploy] Cloning $APP_NAME from $REMOTE_URL\"
    git clone -b $BRANCH $REMOTE_URL $APP_NAME
    cd $APP_NAME
    npm install
    npm run build
  else
    echo \"[deploy] Pulling $APP_NAME from $REMOTE_URL\"
    cd $APP_NAME
    git remote set-url origin $REMOTE_URL
    git pull origin $BRANCH
    npm install
    npm run build
  fi

  # 🔥 Full stop, clean restart
  pm2 delete \"$APP_NAME\" >/dev/null 2>&1 || true
  pm2 flush
  pm2 start npm --name \"$APP_NAME\" -- run start
  pm2 save
"