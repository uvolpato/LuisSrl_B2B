import https from "https";
import http from "http";
import fs from "fs";
import net from "net";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_PORT = 3000;
const TARGET_HOST = "localhost";
const PROXY_PORT = parseInt(process.env.HTTPS_PROXY_PORT || "3443", 10);

const options = {
  key: fs.readFileSync(join(__dirname, "luis-dev-key.pem")),
  cert: fs.readFileSync(join(__dirname, "luis-dev-cert.pem")),
};

const server = https.createServer(options, (req, res) => {
  const proxyReq = http.request(
    {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", () => {
    res.writeHead(502);
    res.end("HTTPS proxy: upstream unavailable");
  });
  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const proxy = net.connect(TARGET_PORT, TARGET_HOST, () => {
    proxy.write(
      `${req.method} ${req.url} HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}\r\n` +
        `${Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n")}\r\n\r\n`
    );
    if (head.length) proxy.write(head);
    proxy.pipe(socket);
    socket.pipe(proxy);
  });
  proxy.on("error", () => socket.destroy());
  socket.on("error", () => proxy.destroy());
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`[https-proxy] HTTPS :${PROXY_PORT} → http://${TARGET_HOST}:${TARGET_PORT}`);
});
