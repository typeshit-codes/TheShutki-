const { spawnSync } = require("child_process");
const path = require("path");

const frontend = path.join(__dirname, "..", "frontend");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(args) {
  const result = spawnSync(npm, args, {
    cwd: frontend,
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "false",
      DISABLE_ESLINT_PLUGIN: "true",
      GENERATE_SOURCEMAP: "false",
    },
  });
  if (result.status !== 0) process.exit(result.status == null ? 1 : result.status);
}

run(["install", "--include=dev", "--legacy-peer-deps"]);
run(["run", "build"]);
