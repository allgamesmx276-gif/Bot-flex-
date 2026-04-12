function ok(message) {
    return `✅ ${message}`;
}

function error(message) {
    return `❌ ${message}`;
}

function warn(message) {
    return `⚠️ ${message}`;
}

function info(message) {
    return `ℹ️ ${message}`;
}

function action(message) {
    return `✨ ${message}`;
}

module.exports = {
    ok,
    error,
    warn,
    info,
    action
};
