// Postinstall script: make Prisma use the edge runtime everywhere
// 1) Redirects @prisma/client -> .prisma/client/edge
// 2) Shims @prisma/client/runtime/library.js -> edge.js + safe stubs
// 3) Patches .prisma/client/edge.js config to force engineType=wasm
//    (the generated config incorrectly has engineType=library)
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

// ---------------------------------------------------------------------------
// 1) @prisma/client -> .prisma/client/edge (default, index)
// ---------------------------------------------------------------------------
const prismaClientDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@prisma",
  "client"
);
shimFile(
  path.join(prismaClientDir, "index.js"),
  `// prisma-shim: redirect -> .prisma/client/edge
module.exports = { ...require('.prisma/client/edge') };
`,
  "Redirected @prisma/client/index.js -> edge"
);
shimFile(
  path.join(prismaClientDir, "default.js"),
  `// prisma-shim: redirect -> .prisma/client/edge
module.exports = { ...require('.prisma/client/edge') };
`,
  "Redirected @prisma/client/default.js -> edge"
);

// ---------------------------------------------------------------------------
// 2) @prisma/client/runtime/library.js -> edge.js + warnEnvConflicts stub
// ---------------------------------------------------------------------------
const runtimeDir = path.join(prismaClientDir, "runtime");
const libraryPath = path.join(runtimeDir, "library.js");
const edgeRuntimePath = path.join(runtimeDir, "edge.js");
if (fs.existsSync(runtimeDir) && fs.existsSync(edgeRuntimePath)) {
  shimFile(
    libraryPath,
    `"use strict";
// prisma-shim: runtime/library.js -> edge runtime + stubs
var _edge = require("./edge.js");
for (var _k in _edge)
  if (Object.prototype.hasOwnProperty.call(_edge, _k)) exports[_k] = _edge[_k];
if (_edge && _edge.__esModule) Object.defineProperty(exports, "__esModule", { value: true });
if (_edge && "default" in _edge) exports.default = _edge.default;

function warnEnvConflicts(_envPaths) { return; }
exports.warnEnvConflicts = warnEnvConflicts;
`,
    "Replaced runtime/library.js with edge+stubs"
  );
}

// ---------------------------------------------------------------------------
// 3) Patch .prisma/client/edge.js config: engineType "library" -> "wasm"
//    Prisma edge runtime rejects engineType=library with
//    "Invalid client engine type, please use `library` or `binary`"
//    Edge runtime actually wants engineType wasm (or uses internal default)
// ---------------------------------------------------------------------------
const generatedEdge = path.join(
  __dirname,
  "..",
  "node_modules",
  ".prisma",
  "client",
  "edge.js"
);
if (fs.existsSync(generatedEdge)) {
  let content = fs.readFileSync(generatedEdge, "utf8");
  const matches = content.match(/"engineType"\s*:\s*"library"/g) || [];
  if (matches.length) {
    content = content.replace(/"engineType"\s*:\s*"library"/g, '"engineType":"wasm"');
    try {
      fs.writeFileSync(generatedEdge, content, "utf8");
      console.log(
        `[prisma-shim] Patched .prisma/client/edge.js: replaced ${matches.length} engineType=library -> wasm`
      );
    } catch (err) {
      console.error("[prisma-shim] Failed to patch generated edge.js:", err.message);
      process.exitCode = 1;
    }
  } else {
    console.log(
      "[prisma-shim] No engineType=library found in .prisma/client/edge.js (skipping)"
    );
  }
} else {
  console.warn(
    "[prisma-shim] .prisma/client/edge.js not found; skipping engineType patch"
  );
}
