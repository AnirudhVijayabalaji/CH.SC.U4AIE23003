const axios = require('axios');
const { Log, ACCESS_TOKEN } = require('../logger');

const DEPOT_API = 'http://20.207.122.201/evaluation-service/depots';
const VEHICLE_API = 'http://20.207.122.201/evaluation-service/vehicles';

/**
 * Solves the Knapsack problem to maximize importance score within budget.
 */
function optimizeScheduling(tasks, budget) {
    if (!tasks || tasks.length === 0 || !budget) return { total_score: 0, selected_vehicles: [] };
    
    const n = tasks.length;
    const dp = Array.from({ length: n + 1 }, () => Array(budget + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        const { duration, importance_score } = tasks[i - 1];
        for (let w = 0; w <= budget; w++) {
            if (duration <= w) {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - duration] + importance_score);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    let w = budget;
    const selected = [];
    for (let i = n; i > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selected.push(tasks[i - 1].vehicle_id);
            w -= tasks[i - 1].duration;
        }
    }

    return { total_score: dp[n][budget], selected_vehicles: selected };
}

async function runScheduler() {
    await Log('backend', 'info', 'handler', 'Initiating Vehicle Scheduling process');

    try {
        console.log('Fetching depots and vehicles data...');
        
        // Fetch both depots and vehicles in parallel
        const [depotRes, vehicleRes] = await Promise.all([
            axios.get(DEPOT_API, { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` } }),
            axios.get(VEHICLE_API, { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` } })
        ]);

        const depots = depotRes.data.depots || depotRes.data;
        const allVehicles = vehicleRes.data.vehicles || vehicleRes.data;
        await Log('backend', 'info', 'handler', `Fetched ${depots.length} depots, ${allVehicles.length} vehicles`);

        // Process each depot
        for (const depot of depots) {
            const depot_id = depot.ID || depot.depot_id;
            const budget = depot.MechanicHours || depot.available_mechanic_hours;
            
            // Map vehicle properties to our internal format using the exact keys you provided
            const tasks = allVehicles.map(v => ({
                vehicle_id: v.TaskID || v.vehicle_id || v.VehicleID || v.ID || v.id,
                duration: v.Duration || v.duration || v.time || v.Time || 0,
                importance_score: v.Impact || v.importance_score || v.ImportanceScore || v.score || v.Score || 0
            }));
            
            await Log('backend', 'info', 'handler', `Opt Depot ${depot_id}: ${tasks.length} veh, ${budget}h`);
            
            const result = optimizeScheduling(tasks, budget);
            
            console.log(`\nDepot ${depot_id} Optimization Results:`);
            console.log(`- Total Importance Score: ${result.total_score}`);
            console.log(`- Selected Vehicles: ${result.selected_vehicles.join(', ') || 'None'}`);
            
            await Log('backend', 'info', 'handler', `Depot ${depot_id}: Score ${result.total_score}, Veh ${result.selected_vehicles.length}`);
        }

    } catch (error) {
        let errorMsg = `Scheduling failed: ${error.message}`;
        if (error.response && error.response.status === 403) {
            errorMsg = "Network Access Blocked (403 Forbidden). Likely due to University Firewall.";
        }
        
        console.error(errorMsg);
        await Log('backend', 'error', 'handler', errorMsg);
        
        // Fallback for demonstration
        console.log('\n--- FALLBACK: Running with Sample Data ---');
        const sampleDepots = [{ ID: "D001", MechanicHours: 10 }];
        const sampleTasks = [
            { TaskID: "V01", Duration: 3, Impact: 50 },
            { TaskID: "V02", Duration: 5, Impact: 70 },
            { TaskID: "V03", Duration: 2, Impact: 40 },
            { TaskID: "V04", Duration: 4, Impact: 60 }
        ];

        sampleDepots.forEach(depot => {
            // Use the same mapping logic as the real API
            const tasks = sampleTasks.map(v => ({
                vehicle_id: v.TaskID,
                duration: v.Duration,
                importance_score: v.Impact
            }));
            const result = optimizeScheduling(tasks, depot.MechanicHours);
            console.log(`Sample Depot ${depot.ID} Optimization Results:`);
            console.log(`- Total Importance Score: ${result.total_score}`);
            console.log(`- Selected Vehicles: ${result.selected_vehicles.join(', ')}`);
        });
    }
}

if (require.main === module) {
    runScheduler();
}

module.exports = { Log, ACCESS_TOKEN, optimizeScheduling };
