module.exports = {
  apps: [
    {
      name: 'compass-web',
      script: 'npm',
      args: 'run start:server',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
