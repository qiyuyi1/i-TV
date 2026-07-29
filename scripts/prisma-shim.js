// Postinstall script: shim @prisma/client/runtime/library.js to edge.js
// with additional exports expected by generated .prisma/client/index.js
const fs = require("fs");
const path = require("path");

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

if (!fs.existsSync(runtimeDir)) {
  console.warn("[prisma-shim] Runtime dir not found, skipping:", runtimeDir);
  process.exit(0);
}

if (!fs.existsSync(edgePath)) {
  console.warn("[prisma-shim] edge.js not found, skipping:", edgePath);
  process.exit(0);
}

// Extra exports only present in library.js runtime.
// We provide safe stubs that avoid fs.readdir / file-system lookups.
const extraExports = `
// ---- Extra exports expected by .prisma/client/index.js but missing from edge.js ----

// warnEnvConflicts: normally checks for conflicting .env files.
// Stub: no-op on Workers since env is provided by runtime variables.
function warnEnvConflicts(_envPaths) {
  return;
}

exports.warnEnvConflicts = warnEnvConflicts;
exports.warnEnvConflicts = warnEnvConflicts;
`;

const shimCode = `// Auto-generated shim by scripts/prisma-shim.js
// Re-exports from edge runtime (avoids fs.readdir that fails on Workers)
// plus stubs for library-only utilities that .prisma/client/index.js expects.

"use strict";

// 1) Re-export everything that edge runtime provides.
var _edge = require("./edge.js");
for (var _k in _edge) {
  if (Object.prototype.hasOwnProperty.call(_edge, _k)) {
    exports[_k] = _edge[_k];
  }
}
if (_edge && _edge.__esModule) {
  Object.defineProperty(exports, "__esModule", { value: true });
}
if (_edge && typeof _edge === "object" && "default" in _edge) {
  exports.default = _edge.default;
}

// 2) Library-only utilities (safe stubs, no fs usage)

function warnEnvConflicts(_envPaths) {
  // Workers environment does not use filesystem-based .env loading.
  // This function only prints warnings; it is safe to no-op.
  return;
}

exports.warnEnvConflicts = warnEnvConflicts;
`;

try {
  fs.writeFileSync(libraryPath, shimCode, "utf8");
  console.log(
    "[prisma-shim] Replaced @prisma/client/runtime/library.js with edge+extra shim"
  );
} catch (err) {
  console.error("[prisma-shim] Failed to shim library.js:", err.message);
  process.exit(1);
}
