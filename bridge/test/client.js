// bridge/test/client.js
const { spawn } = require("child_process");
const path = require("path");

const bridgePath = path.resolve(__dirname, "..", "dist", "index.js"); // run after build
const child = spawn("node", [bridgePath], { stdio: ["pipe", "pipe", "pipe"] });

child.on("error", (err) => {
  console.error("Failed to spawn bridge:", err);
  process.exit(1);
});

child.stderr.on("data", (d) => {
  process.stderr.write(d.toString());
});

let buffer = "";
child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      console.log("<< bridge ->", JSON.stringify(obj, null, 2));
    } catch (e) {
      console.log("<< bridge raw ->", line);
    }
  }
});

// helper to send request (id, method, params)
let id = 1;
function sendRequest(method, params) {
  const req = { id: id++, method, params };
  const line = JSON.stringify(req) + "\n";
  child.stdin.write(line);
  return req.id;
}

// wait for ready notification, then send requests
let ready = false;
const readyTimeout = setTimeout(() => {
  if (!ready) {
    console.warn(
      "No ready notification — still sending tests (bridge may be slow to start)."
    );
    runTests();
  }
}, 2000);

function runTests() {
  sendRequest("ping", { hello: "world" });
  sendRequest("health.ping", {});
  // also test connection.test with missing config (should return error from pg)
  sendRequest("connection.test", {
    config: {
      host: "127.0.0.1",
      port: 5432,
      user: "invalid",
      password: "x",
      database: "postgres",
    },
  });
}

// listen for ready notification
child.stdout.on("data", (chunk) => {
  // certain ready notification appears as method bridge.ready
  // but we already parse above and log; detect it by content in buffer maybe
  // Use simple approach: when we see any line with "bridge.ready" trigger tests once
  // This is handled by the general parser; to be safe run tests after a short timeout if not already run.
  if (!ready) {
    ready = true;
    clearTimeout(readyTimeout);
    setTimeout(() => runTests(), 100);
  }
});
// cleanup when child exits
child.on("exit", (code, signal) => {
  console.log("bridge exited", { code, signal });
  process.exit(0);
});
