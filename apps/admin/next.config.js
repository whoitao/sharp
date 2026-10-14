/** @type {import('next').NextConfig} */
const path = require("path");
const fs = require("fs");

const adminDir = __dirname;

// antd 生态是 ESM 且依赖大量 rc-* 子包，需交给 transpilePackages 统一转译。
// 这里自动收集 antd / @ant-design/icons / @ant-design/nextjs-registry 的生产依赖闭包，
// 避免手工维护白名单时漏掉 rc-* 包。react / react-dom 由 Next 统一处理，不参与转译。
function collectTranspilePackages() {
  const roots = ["antd", "@ant-design/icons", "@ant-design/nextjs-registry"];
  const skip = new Set(["react", "react-dom"]);
  const visited = new Set();
  const queue = roots.map((name) => ({ name, from: adminDir }));

  while (queue.length) {
    const { name, from } = queue.shift();
    if (visited.has(name) || skip.has(name)) continue;

    let pkgPath;
    try {
      pkgPath = require.resolve(`${name}/package.json`, { paths: [from] });
    } catch {
      continue;
    }
    visited.add(name);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const parentDir = path.dirname(pkgPath);
    for (const dep of Object.keys(pkg.dependencies || {})) {
      if (!visited.has(dep) && !skip.has(dep)) {
        queue.push({ name: dep, from: parentDir });
      }
    }
  }

  return ["@sharp/shared", ...[...visited].sort()];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: collectTranspilePackages(),
};

module.exports = nextConfig;
