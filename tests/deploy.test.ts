import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const script = fileURLToPath(
  new URL("../scripts/deploy-cpanel.sh", import.meta.url),
);
const config = {
  CPANEL_HOST: "cpanel.example.com",
  CPANEL_PORT: "22",
  CPANEL_USERNAME: "safari_test",
  CPANEL_DEPLOY_PATH: "/home/safari_test/app.teinum.no/squirrel",
  CPANEL_SSH_KEY: "test-only-placeholder",
  CPANEL_SSH_KNOWN_HOSTS: "test-only-placeholder",
  CPANEL_PASSWORD: "",
};
function run(extra: NodeJS.ProcessEnv, dist = "/nonexistent-squirrel-build") {
  return spawnSync("bash", [script, dist], {
    env: { ...process.env, ...config, ...extra },
    encoding: "utf8",
    timeout: 20000,
  });
}
test("deployment rejects missing credentials, panel port and unsafe destination paths", () => {
  for (const extra of [
    { CPANEL_HOST: "" },
    { CPANEL_SSH_KEY: "" },
    { CPANEL_USERNAME: "" },
    { CPANEL_PORT: "2083" },
    { CPANEL_PORT: "65536" },
    { CPANEL_HOST: "host;echo bad" },
    { CPANEL_DEPLOY_PATH: "/home/safari_test/public_html" },
    { CPANEL_DEPLOY_PATH: "/home/safari_test/../squirrel" },
    { CPANEL_DEPLOY_PATH: "/home/safari_test/squirrel;echo bad" },
  ]) {
    const result = run(extra);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Deployment error:/);
    assert.doesNotMatch(result.stdout + result.stderr, /test-only-placeholder/);
  }
});
test("deployment rejects builds with the wrong asset base", () => {
  const dir = mkdtempSync(join(tmpdir(), "safari-deploy-build-"));
  try {
    mkdirSync(join(dir, "assets"));
    mkdirSync(join(dir, "data"));
    writeFileSync(
      join(dir, "index.html"),
      '<script src="/assets/index.js"></script>',
    );
    writeFileSync(join(dir, "data/census.json"), "{}");
    writeFileSync(join(dir, "data/park.json"), "{}");
    const result = run({}, dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /BASE_PATH=\/squirrel\//);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("encrypted-key deployment uploads assets before publishing index and cleans credentials", () => {
  const dir = mkdtempSync(join(tmpdir(), "safari-deploy-transport-"));
  try {
    const key = join(dir, "test-key"),
      dist = join(dir, "dist"),
      bin = join(dir, "bin"),
      log = join(dir, "commands");
    mkdirSync(bin);
    mkdirSync(join(dist, "assets"), { recursive: true });
    mkdirSync(join(dist, "data"));
    writeFileSync(
      join(dist, "index.html"),
      '<script src="/squirrel/assets/index.js"></script>',
    );
    writeFileSync(join(dist, "data/census.json"), "{}");
    writeFileSync(join(dist, "data/park.json"), "{}");
    const generated = spawnSync(
      "ssh-keygen",
      ["-q", "-t", "ed25519", "-N", "safari-test-passphrase", "-f", key],
      { encoding: "utf8" },
    );
    assert.equal(generated.status, 0, generated.stderr);
    // Only remote transport is stubbed. Key loading and cleanup use real OpenSSH.
    for (const command of ["ssh", "rsync"]) {
      writeFileSync(
        join(bin, command),
        `#!/usr/bin/env bash\nprintf '%s\\n' '${command}' "$@" >> "$SAFARI_TEST_LOG"\nprintf 'config=%s\\n' "$SAFARI_SSH_CONFIG" >> "$SAFARI_TEST_LOG"\n`,
        { mode: 0o755 },
      );
    }
    const secret = readFileSync(key, "utf8");
    const result = run(
      {
        PATH: `${bin}:${process.env.PATH}`,
        SAFARI_TEST_LOG: log,
        CPANEL_SSH_KEY: secret,
        CPANEL_PASSWORD: "safari-test-passphrase",
        CPANEL_SSH_KNOWN_HOSTS: `cpanel.example.com ${readFileSync(`${key}.pub`, "utf8")}`,
      },
      dist,
    );
    assert.equal(result.status, 0, result.stderr);
    const commands = readFileSync(log, "utf8");
    assert.ok(
      commands.indexOf("--exclude=/index.html") <
        commands.indexOf(`${dist}/index.html`),
    );
    assert.ok(
      commands.indexOf(`${dist}/index.html`) < commands.indexOf("mv -f --"),
    );
    assert.doesNotMatch(commands, /--delete/);
    assert.doesNotMatch(
      result.stdout + result.stderr + commands,
      /PRIVATE KEY|safari-test-passphrase/,
    );
    const configPath = commands.match(/^config=(.+)$/m)?.[1];
    assert.ok(configPath);
    assert.equal(existsSync(configPath), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
