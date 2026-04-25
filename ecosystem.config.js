module.exports = {
    apps: [
        {
            name: 'flexbot',
            script: 'index.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            autorestart: true,
            max_memory_restart: '800M',
            node_args: '--max-old-space-size=1024',
            env: {
                NODE_ENV: 'production',
                LOG_LEVEL: 'warn'
            }
        }
    ]
};
