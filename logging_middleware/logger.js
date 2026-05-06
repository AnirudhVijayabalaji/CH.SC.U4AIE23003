const axios = require('axios');

// Replace this with your actual access token from afford medical value.txt
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhbml2aWpheWxha3NAZ21haWwuY29tIiwiZXhwIjoxNzc4MDYzMjM0LCJpYXQiOjE3NzgwNjIzMzQsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiI0Nzg5MDc5Zi03NzRiLTQ2ZDQtOTVkMi1hNDIwYzZlNzY5ZTUiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJhbmlydWRodmlqYXlhYmFsYWppIiwic3ViIjoiNzQ5YjU1MDEtNzRiZi00ZDcwLTg2OGEtZjc0ZDMyY2Y2YWVlIn0sImVtYWlsIjoiYW5pdmlqYXlsYWtzQGdtYWlsLmNvbSIsIm5hbWUiOiJhbmlydWRodmlqYXlhYmFsYWppIiwicm9sbE5vIjoiY2guc2MudTRhaWUyMzAwMyIsImFjY2Vzc0NvZGUiOiJQVEJNbVEiLCJjbGllbnRJRCI6Ijc0OWI1NTAxLTc0YmYtNGQ3MC04NjhhLWY3NGQzMmNmNmFlZSIsImNsaWVudFNlY3JldCI6IlNwWHR6Q2tVdXBndkpLUEMifQ.DKSFsR0ZSzkdleKU7bnunpGHurqUAAro9gvzBcshCvw';
const LOG_ENDPOINT = 'http://20.207.122.201/evaluation-service/logs';

/**
 * Reusable Log function that sends data to the Test Server.
 * @param {string} stack - The stack name (e.g., 'backend', 'frontend')
 * @param {string} level - The log level (e.g., 'info', 'error', 'fatal')
 * @param {string} pkg - The package or component name (e.g., 'handler', 'db')
 * @param {string} message - The descriptive log message
 */
async function Log(stack, level, pkg, message) {
    const payload = {
        stack: stack,
        level: level,
        package: pkg,
        message: message
    };

    try {
        const response = await axios.post(LOG_ENDPOINT, payload, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`POST ${LOG_ENDPOINT}`);
        console.log(`Response (Status Code: ${response.status})`);
        console.log(JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error(`POST ${LOG_ENDPOINT}`);
        console.error(`[Log Failed]: ${message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`Error: ${error.message}`);
        }
        // In a real application, you might want to fallback to local console logging
    }
}

module.exports = { Log, ACCESS_TOKEN };
