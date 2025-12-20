"use strict";

const { randomInt } = require("node:crypto");
const net = require("node:net");

/**
 * 检测指定端口是否可用（可被当前进程绑定）。
 *
 * 实现方式：尝试创建一个临时 TCP Server 并监听该端口：
 * - 监听成功：说明端口可用，随后立即关闭 Server。
 * - 监听失败且错误为 EADDRINUSE/EACCES：说明端口不可用。
 *
 * @param {number} port 端口号（0~65535）
 * @returns {Promise<boolean>} 端口可用返回 true，否则返回 false
 */
function isPortAvailable(port) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    return Promise.reject(new TypeError(`Invalid port: ${port}`));
  }

  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.once("error", (err) => {
      // 端口被占用 / 无权限绑定（通常是 <1024）视为不可用
      if (err && (err.code === "EADDRINUSE" || err.code === "EACCES")) {
        resolve(false);
        return;
      }
      reject(err);
    });

    server.once("listening", () => {
      server.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
          return;
        }
        resolve(true);
      });
    });

    server.listen({ port, host: "127.0.0.1" });
  });
}

/**
 * 在指定范围内查找第一个可用端口（默认用于 8000-9000）。
 *
 * @param {number} start 起始端口（包含）
 * @param {number} end 结束端口（包含）
 * @returns {Promise<number>} 返回找到的可用端口号
 */
async function findAvailablePort(start = 8000, end = 9000) {
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new TypeError("start/end must be integers");
  }
  if (start < 0 || end > 65535 || start > end) {
    throw new RangeError(`Invalid port range: ${start}-${end}`);
  }

  for (let port = start; port <= end; port += 1) {
    const ok = await isPortAvailable(port);
    if (ok) return port;
  }

  throw new Error(`No available port found in range ${start}-${end}`);
}

/**
 * 在指定范围内随机分配一个可用端口（默认用于 8000-9000）。
 *
 * 说明：为保证“随机性 + 终止性”，实现采用“生成端口列表并洗牌”，
 * 然后依次检测直到找到可用端口或遍历完所有端口。
 *
 * @param {number} minPort 最小端口（包含）
 * @param {number} maxPort 最大端口（包含）
 * @returns {Promise<number>} 返回随机挑选到的可用端口号
 */
async function getRandomAvailablePort(minPort = 8000, maxPort = 9000) {
  if (!Number.isInteger(minPort) || !Number.isInteger(maxPort)) {
    throw new TypeError("minPort/maxPort must be integers");
  }
  if (minPort < 0 || maxPort > 65535 || minPort > maxPort) {
    throw new RangeError(`Invalid port range: ${minPort}-${maxPort}`);
  }

  const count = maxPort - minPort + 1;
  const ports = new Array(count);
  for (let i = 0; i < count; i += 1) {
    ports[i] = minPort + i;
  }

  // Fisher–Yates shuffle（使用 crypto.randomInt 避免 Math.random 的安全/质量问题）
  for (let i = ports.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    const tmp = ports[i];
    ports[i] = ports[j];
    ports[j] = tmp;
  }

  for (const port of ports) {
    const ok = await isPortAvailable(port);
    if (ok) return port;
  }

  throw new Error(`No available port found in range ${minPort}-${maxPort}`);
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  getRandomAvailablePort,
};
