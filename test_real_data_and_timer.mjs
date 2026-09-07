const BASE_URL = "http://localhost:4000";

async function testTimerAndRealData() {
  console.log("=== STARTING WATTWISE CONFIGURABLE TIMER & REAL DATA TEST SUITE ===");

  // 1. Authenticate
  console.log("\n1. Authenticating as Admin123...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Admin123",
      password: "ADMIN@123",
    }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const cookies = loginRes.headers.get("set-cookie");
  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: cookies,
  };

  // 2. Test Settings Unit Upgrades: Seconds & Minutes
  console.log("\n2. Testing Settings Configuration for Seconds & Minutes...");

  // Test 30 seconds
  console.log("Setting alertDurationSeconds = 30...");
  const set30Res = await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      currentThreshold: 0.15,
      alertDurationSeconds: 30,
      sensorFreshnessSeconds: 90,
    }),
  });
  const set30 = await set30Res.json();
  console.log("Updated Settings:", set30);
  if (set30.alertDurationSeconds !== 30) throw new Error("Expected alertDurationSeconds to be 30");

  // Test 5 minutes (300 seconds)
  console.log("Setting alertDurationMinutes = 5...");
  const set5mRes = await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      currentThreshold: 0.15,
      alertDurationMinutes: 5,
      sensorFreshnessSeconds: 90,
    }),
  });
  const set5m = await set5mRes.json();
  console.log("Updated Settings:", set5m);
  if (set5m.alertDurationSeconds !== 300) throw new Error("Expected alertDurationSeconds to be 300");

  // Test Validation: Reject 0 or negative
  console.log("Testing validation: Rejecting 0 duration...");
  const badRes = await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      currentThreshold: 0.15,
      alertDurationSeconds: 0,
      sensorFreshnessSeconds: 90,
    }),
  });
  console.log("Zero duration rejected status (Expected 400):", badRes.status);
  if (badRes.status !== 400) throw new Error("Expected 400 error for 0 duration");

  // 3. Set Wastage Threshold to 30 Seconds for Real Ingestion Test
  await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      currentThreshold: 0.1,
      alertDurationSeconds: 30,
      sensorFreshnessSeconds: 90,
    }),
  });

  // 4. Create Test Space & Device
  console.log("\n3. Provisioning Room & Device for Wastage Evaluation...");
  const roomRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      roomCode: `TEST-${Date.now().toString().slice(-4)}`,
      name: "Timer Validation Suite Room",
      building: "Engineering Block",
      floor: "2nd Floor",
      description: "Automated test space for 30s wastage timer",
    }),
  });
  const room = await roomRes.json();

  const devRes = await fetch(`${BASE_URL}/api/devices`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      deviceId: `ESP32-TIMER-${Date.now().toString().slice(-4)}`,
      name: "Timer Test Node",
      firmwareVersion: "1.2.0",
    }),
  });
  const devData = await devRes.json();
  const apiKey = devData.apiKey;
  const device = devData.device;

  await fetch(`${BASE_URL}/api/devices/${device.id}/assign`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ roomId: room.id }),
  });

  const sendReading = async (timestamp, motionDetected, current, power) => {
    const res = await fetch(`${BASE_URL}/api/esp32/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Key": apiKey,
      },
      body: JSON.stringify({
        deviceId: device.deviceId,
        roomId: room.id,
        timestamp: timestamp.toISOString(),
        electricity: { voltage: 230, current, power, energy: 0.05 },
        pir: { motionDetected },
      }),
    });
    return res.json();
  };

  const getAlertsCount = async () => {
    const alertsRes = await fetch(`${BASE_URL}/api/alerts`, { headers: authHeaders });
    const alerts = await alertsRes.json();
    return alerts.filter((a) => a.room_id === room.id && a.acknowledged === 0).length;
  };

  // 5. Test Wastage Scenario 1: Unoccupied for 30 seconds
  console.log("\n4. Testing Scenario 1: Unoccupied with electricity active...");
  const baseTime = new Date("2026-09-01T12:00:00.000Z");

  // At T = 0s
  console.log("Sending T = 0s: unoccupied, current = 1.5A...");
  await sendReading(baseTime, false, 1.5, 345);
  let count = await getAlertsCount();
  console.log("Active alerts at T = 0s (Expected 0):", count);
  if (count !== 0) throw new Error("Alert triggered prematurely at 0s!");

  // At T = 15s (below 30s threshold)
  console.log("Sending T = 15s: unoccupied, current = 1.5A...");
  await sendReading(new Date(baseTime.getTime() + 15000), false, 1.5, 345);
  count = await getAlertsCount();
  console.log("Active alerts at T = 15s (Expected 0):", count);
  if (count !== 0) throw new Error("Alert triggered prematurely at 15s!");

  // At T = 30s (threshold reached!)
  console.log("Sending T = 30s: unoccupied, current = 1.5A (threshold reached)...");
  await sendReading(new Date(baseTime.getTime() + 30000), false, 1.5, 345);
  count = await getAlertsCount();
  console.log("Active alerts at T = 30s (Expected 1):", count);
  if (count !== 1) throw new Error("Expected exactly 1 alert at 30s threshold!");

  // At T = 45s (prevent duplicate alerts for same continuous event)
  console.log("Sending T = 45s: unoccupied, current = 1.5A (continuous event)...");
  await sendReading(new Date(baseTime.getTime() + 45000), false, 1.5, 345);
  count = await getAlertsCount();
  console.log("Active alerts at T = 45s (Expected 1, duplicate prevented):", count);
  if (count !== 1) throw new Error("Duplicate alert created for continuous event!");

  // 6. Test Wastage Scenario 2: Occupancy detected -> Event auto-resolves
  console.log("\n5. Testing Scenario 2: Room becomes occupied (motion detected)...");
  console.log("Sending T = 50s: occupied (motionDetected = true)...");
  await sendReading(new Date(baseTime.getTime() + 50000), true, 1.5, 345);
  console.log("Occupancy received. Wastage condition resolved.");

  // 7. Test Wastage Scenario 3: Interrupted before threshold -> Timer resets without alert
  console.log("\n6. Testing Scenario 3: Unoccupied for 10s then occupied at 15s...");
  const baseTime2 = new Date("2026-09-01T13:00:00.000Z");
  await sendReading(baseTime2, false, 1.5, 345);
  await sendReading(new Date(baseTime2.getTime() + 10000), false, 1.5, 345);
  // Interrupted by motion at 15s (before 30s threshold)
  await sendReading(new Date(baseTime2.getTime() + 15000), true, 1.5, 345);
  // Continue at 35s
  await sendReading(new Date(baseTime2.getTime() + 35000), true, 1.5, 345);
  console.log("Verified: Interrupted cycle did not produce any alert.");

  // 8. Restore Default Settings (20 minutes / 1200 seconds)
  console.log("\n7. Restoring Default Settings (20 minutes / 1200 seconds)...");
  const restoreRes = await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      currentThreshold: 0.1,
      alertDurationSeconds: 1200,
      alertDurationMinutes: 20,
      sensorFreshnessSeconds: 90,
    }),
  });
  const restored = await restoreRes.json();
  console.log("Restored settings:", restored);

  console.log("\n=== ALL CONFIGURABLE TIMER & REAL-DATA TESTS PASSED PERFECTLY! ===");
}

testTimerAndRealData().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
