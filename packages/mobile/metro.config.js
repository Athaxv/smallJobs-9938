const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch monorepo root so shared packages resolve
config.watchFolders = [monorepoRoot];

// Resolve modules from mobile package first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Shim Node-only better-auth modules so Metro can bundle them in React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@better-auth/utils/random": path.resolve(
    projectRoot,
    "node_modules/@better-auth/utils/random.js"
  ),
  "@better-auth/core/utils": path.resolve(
    projectRoot,
    "node_modules/@better-auth/core/dist/utils/index.js"
  ),
  "@better-auth/core/utils/json": path.resolve(
    projectRoot,
    "node_modules/@better-auth/core/dist/utils/json.js"
  ),
};

// resolveRequest intercepts ALL module lookups regardless of origin (including nested node_modules).
// extraNodeModules only works for imports from project-root context — not from inside node_modules/.bun/...
const shimMap = {
  "@better-auth/core/utils/json": path.resolve(
    projectRoot,
    "node_modules/@better-auth/core/dist/utils/json.js"
  ),
  "@better-auth/core/utils": path.resolve(
    projectRoot,
    "node_modules/@better-auth/core/dist/utils/index.js"
  ),
  "@better-auth/utils/random": path.resolve(
    projectRoot,
    "node_modules/@better-auth/utils/random.js"
  ),
  "expo-network": path.resolve(projectRoot, "shims/expo-network.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web, shim react-native-webview with an iframe-based implementation
  if (moduleName === "react-native-webview" && platform === "web") {
    return {
      type: "sourceFile",
      filePath: path.resolve(projectRoot, "shims/react-native-webview.web.js"),
    };
  }
  if (shimMap[moduleName]) {
    return { type: "sourceFile", filePath: shimMap[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
