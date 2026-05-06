const { Log } = require('./logger');

async function runTests() {
    console.log('--- Starting Logger Tests ---');

    // Test Case 1: Standard error log
    await Log('backend', 'error', 'handler', 'received string, expected bool');

    // Test Case 2: Fatal log for DB
    await Log('backend', 'fatal', 'db', 'Critical database connection failure.');

    // Test Case 3: Info log
    await Log('backend', 'info', 'auth', 'User authenticated successfully');

    console.log('--- Logger Tests Completed ---');
}

runTests();
