const axios = require('axios');
const { Log, ACCESS_TOKEN } = require('./logger');

const NOTIFICATION_API = 'http://20.207.122.201/evaluation-service/notifications';

const TYPE_WEIGHTS = {
    'Placement': 3,
    'Result': 2,
    'Event': 1
};

async function getPriorityNotifications(limit = 10) {
    try {
        console.log(`Fetching notifications from API...`);
        const response = await axios.get(NOTIFICATION_API, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });

        const data = response.data.notifications || response.data;
        processNotifications(data, limit);

    } catch (error) {
        console.error(`\n[Error]: ${error.message}`);
        if (error.response && error.response.status === 403) {
            console.error("Network Access Blocked (403 Forbidden). Likely due to University Firewall.");
        }
        await Log('backend', 'error', 'handler', `Priority Inbox API Error: ${error.message}`);
    }
}

function processNotifications(data, limit) {
    const notifications = data.map(n => ({
        id: n.ID,
        type: n.Type,
        message: n.Message,
        timestamp: n.Timestamp
    }));

    notifications.sort((a, b) => {
        const weightA = TYPE_WEIGHTS[a.type] || 0;
        const weightB = TYPE_WEIGHTS[b.type] || 0;

        if (weightB !== weightA) return weightB - weightA;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const topN = notifications.slice(0, limit);

    console.log(`\n--- Top ${limit} Priority Notifications ---`);
    topN.forEach((n, i) => {
        console.log(`${i + 1}. [${n.type}] ${n.message}`);
        console.log(`   Recieved: ${n.timestamp}`);
        console.log('-------------------------------------------');
    });
}

if (require.main === module) {
    getPriorityNotifications(10);
}

module.exports = { getPriorityNotifications };
