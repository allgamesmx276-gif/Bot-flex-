module.exports = {
    apps: [
        {
            name: 'flexbot',
            script: 'index.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            autorestart: true,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                LOG_LEVEL: 'warn'
            }
        }
    ]
};
