// Postinstall script: make Prisma use the edge runtime everywhere
// by shimming @prisma/client and its runtime entry so all imports resolve to
// the .prisma/client/edge.js generated entry.  The edge runtime avoids
// the filesystem lookups (fs.readdir) that fail on Cloudflare Workers.
const fs = require("fs");
const path = require("path");

function shimFile(target, content, label) {
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) return;
    fs.writeFileSync(target, content, "utf8");
    console.log(`[prisma-shim] ${label}`);
  } catch (err) {
    console.error(`[prisma-shim] Failed to ${label}:`, err.message);
    process.exitCode = 1;
  }
}

// 1) @prisma/client re-exports: redirect default/index -> edge
shimFile(
  path.join(__dirname, "..", "node_modules", "@prisma", "client", "index.js"),
  `// prisma-shim: redirect -> .prisma/client/edge
module.exports = {
  ...require('.prisma/client/edge'),
};
`,
  "Redirected @prisma/client/index.js -> edge"
);

shimFile(
  path.join(__dirname, "..", "node_modules", "@prisma", "client", "default.js"),
  `// prisma-shim: redirect -> .prisma/client/edge
module.exports = {
  ...require('.prisma/client/edge'),
};
`,
  "Redirected @prisma/client/default.js -> edge"
);

// 2) Runtime library.js -> edge.js shim with warnEnvConflicts stub
//    Some generated code (older @prisma versions) still does
//    require('@prisma/client/runtime/library.js') for warnEnvConflicts etc.
const runtimeDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@prisma",
  "client",
  "runtime"
);
const libraryPath = path.join(runtimeDir, "library.js");
const edgePath = path.join(runtimeDir, "edge.js");

if (fs.existsSync(runtimeDir) && fs.existsSync(edgePath)) {
  const libShim = `"use strict";
// prisma-shim: runtime/library.js -> runtime/edge.js + stubs

var _edge = require("./edge.js");
for (var _k in _edge) {
  if (Object.prototype.hasOwnProperty.call(_edge, _k)) exports[_k] = _edge[_k];
}
if (_edge && _edge.__esModule) Object.defineProperty(exports, "__esModule", { value: true });
if (_edge && "default" in _edge) exports.default = _edge.default;

// Library-only utilities (safe no-op stubs — Workers don't load .env from fs)
function warnEnvConflicts(_envPaths) { return; }
exports.warnEnvConflicts = warnEnvConflicts;
`;

  shimFile(libraryPath, libShim, "Replaced runtime/library.js with edge+stubs");
} else {
  console.warn(
    "[prisma-shim] Skipping runtime/library.js shim (edge runtime not found"
  );
}
