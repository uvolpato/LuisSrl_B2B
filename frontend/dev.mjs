import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextDev = spawn("npx", ["next", "dev", "-H", "0.0.0.0"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
});

const httpsProxy = spawn("node", ["https-proxy.mjs"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, HTTPS_PROXY_PORT: "3443" },
});

process.on("SIGINT", () => {
  nextDev.kill();
  httpsProxy.kill();
  process.exit(0);
});

nextDev.on("exit", (code) => {
  httpsProxy.kill();
  process.exit(code);
});
