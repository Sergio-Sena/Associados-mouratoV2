module.exports = {
  apps: [
    {
      name: 'mica-247',
      script: 'scripts/mica_whatsapp_server.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 3000,
      restart_delay: 3000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        MICA_PORT: '3050'
      }
    }
  ]
};
