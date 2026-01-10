module.exports = {
  apps: [
    {
      name: 'gameplay-service',
      node_args: '--max-old-space-size=5140',
      script: './dist/app.js',
      watch: false,
      autorestart: true,
      kill_timeout: 20000,
      stop_exit_codes: [0],
      output: '/dev/null',
      error: '/dev/null',
      env: {
        PORT: 5000
      },
      instances: -1,
      exec_mode: 'cluster',
    },
  ],
};

