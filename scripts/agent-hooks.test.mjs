import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  envGuardReply,
  isEnvFile,
  isInPlaywrightFolder,
  playwrightFolderGuardReply,
  readOnlyGuardReply,
  readsOnly,
} from "./agent-hooks.mjs";

const HERE = import.meta.dirname;

function hook(script, input) {
  const run = spawnSync(process.execPath, [path.join(HERE, script)], {
    input: JSON.stringify(input),
    encoding: "utf8",
  });
  return { code: run.status, reply: run.stdout.trim() ? JSON.parse(run.stdout) : null };
}

const denied = (reply) => reply?.hookSpecificOutput.permissionDecision === "deny";

describe("isEnvFile", () => {
  it.each([".env", "frontend/.env", "/Users/someone/projects/accountable/.env", "C:\\work\\accountable\\.env", ".ENV"])(
    "knows %s is a .env file",
    (file) => expect(isEnvFile(file)).toBe(true),
  );

  it.each([".env.example", ".envrc", "frontend/src/env.ts", ".venv/bin/python", "my.env"])("knows %s isn't", (file) =>
    expect(isEnvFile(file)).toBe(false),
  );
});

describe("envGuardReply", () => {
  it.each(["Edit", "MultiEdit", "Write"])("stops %s from changing .env", (tool) => {
    expect(denied(envGuardReply({ tool_name: tool, tool_input: { file_path: "/repo/.env" } }))).toBe(true);
  });

  it("lets other files be edited", () => {
    expect(envGuardReply({ tool_name: "Write", tool_input: { file_path: "/repo/.env.example" } })).toBeNull();
    expect(envGuardReply({ tool_name: "Edit", tool_input: { file_path: "/repo/frontend/src/App.tsx" } })).toBeNull();
  });

  it.each([
    "echo KEY=1 >> .env",
    "cp .env.example .env",
    `sed -i '' 's/a/b/' "$CLAUDE_PROJECT_DIR/.env"`,
    "rm -f backend/../.ENV",
  ])("stops the command %s", (command) => {
    expect(denied(envGuardReply({ tool_name: "Bash", tool_input: { command } }))).toBe(true);
  });

  it("stops a PowerShell command too", () => {
    expect(
      denied(envGuardReply({ tool_name: "PowerShell", tool_input: { command: "Set-Content .env 'KEY=1'" } })),
    ).toBe(true);
  });

  it.each(["cat .env.example", "ls .venv/bin", "npm run check:quick", "git status"])(
    "lets the command %s run",
    (command) => expect(envGuardReply({ tool_name: "Bash", tool_input: { command } })).toBeNull(),
  );

  it("answers Claude Code through the hook script", () => {
    const blocked = hook("agent-guard-env.mjs", { tool_name: "Write", tool_input: { file_path: "/repo/.env" } });
    expect(blocked.code).toBe(0);
    expect(blocked.reply.hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" });

    expect(hook("agent-guard-env.mjs", { tool_name: "Write", tool_input: { file_path: "/repo/notes.txt" } })).toEqual({
      code: 0,
      reply: null,
    });
  });
});

describe("readsOnly", () => {
  it.each([
    "git diff --stat --merge-base main",
    "git log --oneline main..HEAD",
    "git show HEAD~1 -- frontend/src/App.tsx",
    'git log --format="%h %an %s" -5',
    "git --no-pager diff --stat",
    "git -C frontend status --short",
    "git branch --show-current",
    "git grep -n useToday -- frontend/src",
    "git ls-files --others --exclude-standard",
    'grep -rn "Won|Lost" docs | head -20',
    "grep -n 'a > b' scripts/checks.mjs",
    "cd /repo && git diff --stat 2>/dev/null | wc -l",
    "git diff main 2>&1 | tail -40",
    "rg -n TODO backend; ls -la docs",
    "git log --format=%an | sort | head",
    "cat docs/REVIEW.md",
  ])("lets %s run", (command) => expect(readsOnly(command)).toBe(true));

  it.each([
    "git checkout main",
    "git commit -m 'Review fixes'",
    "git stash",
    "git branch old-work",
    "git branch -D old-work",
    "git -c core.pager=less log",
    "git diff --output=changes.diff",
    'git diff "--output=changes.diff"',
    "git diff > changes.diff",
    "git log >> notes.txt",
    "cat docs/spec.md | tee copy.md",
    "rm -rf node_modules",
    "npm test",
    "sed -i '' 's/a/b/' docs/spec.md",
    "git diff $(git merge-base main HEAD)",
    'echo "$(rm notes.txt)"',
    "git log `whoami`",
    'grep "`rm notes.txt`" docs',
    "(cd docs && rm spec.md)",
    "git status && touch notes.txt",
    "rg --pre ./convert.sh pattern",
    "sort -o sorted.txt names.txt",
    "PAGER=less git log",
    'grep "unclosed',
  ])("stops %s", (command) => expect(readsOnly(command)).toBe(false));
});

describe("readOnlyGuardReply", () => {
  it("stops a command that writes, and says what the reviewer can run instead", () => {
    const reply = readOnlyGuardReply({ tool_name: "Bash", tool_input: { command: "git checkout main" } });

    expect(denied(reply)).toBe(true);
    expect(reply.hookSpecificOutput.permissionDecisionReason).toContain("only commands that read");
  });

  it("lets a command that reads go ahead", () => {
    expect(readOnlyGuardReply({ tool_name: "Bash", tool_input: { command: "git diff main" } })).toBeNull();
  });

  it("answers Claude Code through the hook script", () => {
    const blocked = hook("agent-guard-read-only.mjs", { tool_name: "Bash", tool_input: { command: "git stash" } });
    expect(blocked.code).toBe(0);
    expect(blocked.reply.hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" });

    expect(hook("agent-guard-read-only.mjs", { tool_name: "Bash", tool_input: { command: "git log -3" } })).toEqual({
      code: 0,
      reply: null,
    });
  });
});

describe("playwrightFolderGuardReply", () => {
  const screenshot = (filename) => ({
    tool_name: "mcp__playwright__browser_take_screenshot",
    tool_input: { filename, scale: "css" },
  });

  it.each([
    ".playwright-mcp/dashboard-light-1440.png",
    "./.playwright-mcp/pipeline-dark-1440.png",
    ".playwright-mcp\\deals.png",
  ])("lets a file be saved at %s", (filename) => {
    expect(isInPlaywrightFolder(filename)).toBe(true);
    expect(playwrightFolderGuardReply(screenshot(filename))).toBeNull();
  });

  it.each([
    "dashboard.png",
    "docs/dashboard.png",
    ".playwright-mcp/../dashboard.png",
    "/tmp/dashboard.png",
    ".playwright-mcp-old/dashboard.png",
  ])("stops a file being saved at %s", (filename) => {
    expect(denied(playwrightFolderGuardReply(screenshot(filename)))).toBe(true);
  });

  it("lets a tool that saves no file go ahead", () => {
    const navigate = { tool_name: "mcp__playwright__browser_navigate", tool_input: { url: "http://localhost:5173" } };
    expect(playwrightFolderGuardReply(navigate)).toBeNull();
    expect(playwrightFolderGuardReply({ tool_name: "mcp__playwright__browser_take_screenshot" })).toBeNull();
  });

  it("answers Claude Code through the hook script", () => {
    const blocked = hook("agent-guard-playwright-folder.mjs", screenshot("dashboard.png"));
    expect(blocked.code).toBe(0);
    expect(blocked.reply.hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" });

    expect(hook("agent-guard-playwright-folder.mjs", screenshot(".playwright-mcp/dashboard.png"))).toEqual({
      code: 0,
      reply: null,
    });
  });
});
