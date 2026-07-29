// Postinstall script: make Prisma Client 5.22 compatible with Cloudflare Workers
// - Redirects @prisma/client imports -> .prisma/client/edge.js (generated edge entry)
// - Shims runtime/library.js -> runtime/edge.js + safe stubs (warnEnvConflicts)
// - Patches runtime/edge.js engine-type validator to NOT throw
//   "Invalid client engine type, please use `library` or `binary`" when using the
//   WASM / edge runtime entry point.
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

function patchFile(target, transformer, label) {
  try {
    if (!fs.existsSync(target)) {
      console.warn(`[prisma-shim] Skip ${label}: ${target} not found`);
      return;
    }
    const before = fs.readFileSync(target, "utf8");
    const after = transformer(before);
    if (after !== before) {
      fs.writeFileSync(target, after, "utf8");
      console.log(`[prisma-shim] ${label}`);
    } else {
      console.log(`[prisma-shim] ${label} (already applied / no-op)`);
    }
  } catch (err) {
    console.error(`[prisma-shim] Failed to ${label}:`, err.message);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// 1) @prisma/client/index.js and default.js -> .prisma/client/edge
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
// 2) Runtime library.js -> edge.js + warnEnvConflicts stub
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
// 3) Patch @prisma/client/runtime/edge.js engine type validator.
//    The variable `Gi="library"` + functions `Rt`/`ol` reject anything other
//    than "library"|"binary", but the generated edge config often ends up as
//    "wasm" so we just force Rt() to always return "library" and strip the
//    exception path from ol() as well.
// ---------------------------------------------------------------------------
patchFile(
  edgeRuntimePath,
  (content) => {
    // 1) Patch ol() — always return "library" (so Rt takes the t|| branch)
    content = content.replace(
      /function ol\(\)\{let e=y\.env\.PRISMA_CLIENT_ENGINE_TYPE;return e==="library"\?"library":e==="binary"\?"binary":void 0\}/g,
      `function ol(){return "library"}`
    );
    // 2) Short-circuit Rt() — make it unconditionally return "library"
    content = content.replace(
      /function Rt\(e\)\{let t=ol\(\);return t\|\|\(e\?\.config\.engineType==="library"\?"library":e\?\.config\.engineType==="binary"\?"binary":Gi\)\}/g,
      `function Rt(_e){return "library"}`
    );
    // 3) FORCE the success path.
    // The runtime has a block of shape:
    //   if(o)return new sr(t);throw new K("Invalid client engine type ...",{...})}
    // `o` is true only when code detects the `/edge` entry point was imported.
    // By changing the guard to `if(o||1)` and replacing the throw with `void 0`,
    // the edge path is ALWAYS taken.  This works because:
    //   - We have already shimmed `@prisma/client -> .prisma/client/edge`
    //   - The .prisma/client/edge entry uses runtime/edge.js (sr = WASM engine factory)
    //   - We no longer pass `adapter`, so the /edge guard is satisfied
    // We match the block with flexible regex since the message string varies between
    // raw (pristine) and already-shimmed copies.
    content = content.replace(
      /if\(o\)return new sr\(t\);throw new K\("Invalid client engine type[^\0]*?clientVersion:t\.clientVersion\)\}/g,
      `if(o||1)return new sr(t);void /* prisma-shim forced-edge-path */0;}`
    );
    // Also silence the adapter-vs-/edge endpoint conflict so accidental adapter
    // usage can't throw from the factory path.
    content = content.replace(
      /if\(o&&s\|\|s\)\{let u;throw u=\[/g,
      `if(o&&s||s){s=false;return void(null);let u;u=[`
    );
    content = content.replace(
      /Prisma Client was configured to use the `adapter` option but it was imported via its `\/edge` endpoint/g,
      `Prisma Client adapter+edge conflict (suppressed)`
    );
    // 4) Replace remaining Invalid client engine type message for logging clarity
    content = content.replace(
      /Invalid client engine type, please use `library` or `binary`/g,
      `Invalid client engine type (suppressed — falling back to library)`
    );
    content = content.replace(
      /throw new K\("Invalid client engine type[^)]*\)[;}]/g,
      `void /* prisma-shim bypass */ (t = t || "library");`
    );
    content = content.replace(
      /throw new Error\("Invalid client engine type, please use [^)]+\)\)/g,
      `/* prisma-shim: suppressed engine type throw */ t = t || "library";`
    );
    return content;
  },
  "Patched runtime/edge.js engine-type validator (no-op)"
);

// ---------------------------------------------------------------------------
// 4) Generated .prisma/client/edge.js: engineType "library" is now fine
//    (the runtime validator always accepts it).  We make an optional patch so
//    it reads back as "library" explicitly in case it was written as "wasm".
// ---------------------------------------------------------------------------
const generatedEdge = path.join(
  __dirname,
  "..",
  "node_modules",
  ".prisma",
  "client",
  "edge.js"
);
patchFile(
  generatedEdge,
  (content) =>
    content.replace(
      /"engineType"\s*:\s*"wasm"/g,
      '"engineType":"library"'
    ),
  "Normalized generated edge.js engineType to library"
);
