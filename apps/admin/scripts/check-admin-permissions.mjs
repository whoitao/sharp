#!/usr/bin/env node
// 扫描所有 admin API 路由，确保每个业务路由都做了权限校验。
// 用法：node scripts/check-admin-permissions.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../app/api/admin", import.meta.url).pathname;
// 允许不做权限校验的路由：登录 / 当前用户信息
const WHITELIST = ["auth/login/route.ts", "auth/me/route.ts"];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

const routes = walk(ROOT);
const missing = [];
for (const file of routes) {
  const rel = relative(ROOT, file);
  if (WHITELIST.includes(rel)) continue;
  const src = readFileSync(file, "utf8");
  if (!src.includes("requirePermission(")) missing.push(rel);
}

console.log(`共扫描 ${routes.length} 个路由文件`);
if (missing.length === 0) {
  console.log("✅ 所有业务路由都已使用 requirePermission");
} else {
  console.error(`❌ 以下路由缺少 requirePermission（${missing.length} 个）：`);
  for (const m of missing) console.error("  - " + m);
  process.exit(1);
}
