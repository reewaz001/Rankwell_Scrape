module.exports = {
  apps: [
    {
      name: 'rankwell-scraper',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env_production: {
        NODE_ENV: 'production',
        ENABLE_CRON: 'true',
        CRON_TIMEZONE: 'Europe/Paris'
      },
      env: {
        NODE_ENV: 'development',
        ENABLE_CRON: 'false',
        CRON_TIMEZONE: 'Europe/Paris'
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    }
  ]
};
