import { describe, it, expect, afterEach } from "@jest/globals";
import { sshTunnelServiceInstance, TunnelInfo } from "../src/services/sshTunnelService";
import { Client as PgClient } from "pg";
import net from "net";

// Use a long timeout for integration tests
const TIMEOUT = 15000;

const TEST_PRIVATE_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACDH/I6vMOnNlZ4A6Y0J+HwO6L6vMOnNlZ4A6Y0J+HwO6AAAAJCeA+mNCfh8
Dui+rzDpzZWeAOmNCfh8DuiAAAAAtc3NoLWVkMjU1MTkAAAAgx/yOrzDpzZWeAOmNCfh8
Dui+rzDpzZWeAOmNCfh8DuiAAAAAQXytL4K2vOOnNlZ4A6Y0J+HwO6L6vMOnNlZ4A6Y0J
+HwO6AAAAB3Rlc3RAcmVsd2F2ZQECAwQFBg==
-----END OPENSSH PRIVATE KEY-----`;

describe("SSHTunnelService Integration Tests", () => {
  let tunnel: TunnelInfo | null = null;

  afterEach(async () => {
    if (tunnel) {
      tunnel.close();
      tunnel = null;
    }
  });

  it("should connect to postgres via SSH tunnel using password auth", async () => {
    // 1. Create SSH Tunnel
    tunnel = await sshTunnelServiceInstance.createSSHTunnel(
      {
        host: "localhost",
        port: 2222, // ssh-server exposed port
        username: "testsshuser",
        authMethod: "password",
        password: "testpassword",
      },
      "postgres-behind-ssh", // remote host inside docker network
      5432 // remote port
    );

    expect(tunnel.localPort).toBeGreaterThan(0);

    // 2. Connect to Postgres via the local tunnel port
    const pgClient = new PgClient({
      host: "127.0.0.1",
      port: tunnel.localPort,
      user: "testuser",
      password: "testpass",
      database: "testdb",
    });

    await pgClient.connect();
    const res = await pgClient.query("SELECT 1 + 1 AS result");
    expect(res.rows[0].result).toBe(2);
    await pgClient.end();
  }, TIMEOUT);

  it("should connect to postgres via SSH tunnel using private key auth", async () => {
    // 1. Create SSH Tunnel
    tunnel = await sshTunnelServiceInstance.createSSHTunnel(
      {
        host: "localhost",
        port: 2222,
        username: "testsshuser",
        authMethod: "privateKey",
        privateKey: TEST_PRIVATE_KEY,
      },
      "postgres-behind-ssh",
      5432
    );

    expect(tunnel.localPort).toBeGreaterThan(0);

    // 2. Connect to Postgres
    const pgClient = new PgClient({
      host: "127.0.0.1",
      port: tunnel.localPort,
      user: "testuser",
      password: "testpass",
      database: "testdb",
    });

    await pgClient.connect();
    const res = await pgClient.query("SELECT 1 + 1 AS result");
    expect(res.rows[0].result).toBe(2);
    await pgClient.end();
  }, TIMEOUT);

  it("tunnel.close() tears down cleanly and subsequent connections fail", async () => {
    // 1. Create SSH Tunnel
    tunnel = await sshTunnelServiceInstance.createSSHTunnel(
      {
        host: "localhost",
        port: 2222,
        username: "testsshuser",
        authMethod: "password",
        password: "testpassword",
      },
      "postgres-behind-ssh",
      5432
    );

    const localPort = tunnel.localPort;

    // 2. Close tunnel
    tunnel.close();
    tunnel = null;

    // 3. Verify connection fails
    const socket = new net.Socket();
    const connectionPromise = new Promise((resolve, reject) => {
      socket.setTimeout(1000);
      socket.connect(localPort, "127.0.0.1", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.on("timeout", () => resolve(false));
    });

    const isConnected = await connectionPromise;
    expect(isConnected).toBe(false);
  }, TIMEOUT);
});
