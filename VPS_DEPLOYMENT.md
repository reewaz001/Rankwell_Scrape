  VPS Deployment Commands:

  # 1. Install PM2 globally (if not installed)
  npm install -g pm2

  # 2. Clone/pull your code and install dependencies
  git pull
  npm install

  # 3. Build the project
  npm run build

  # 4. Create logs directory
  mkdir -p logs

  # 5. Start with PM2
  npm run pm2:start

  # 6. Save PM2 process list (auto-restart on reboot)
  pm2 save
  pm2 startup

  Useful PM2 commands:

  | Command             | Description          |
  |---------------------|----------------------|
  | npm run pm2:start   | Start the app        |
  | npm run pm2:stop    | Stop the app         |
  | npm run pm2:restart | Restart the app      |
  | npm run pm2:logs    | View logs            |
  | npm run pm2:status  | Check status         |
  | pm2 monit           | Real-time monitoring |
