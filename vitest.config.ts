import { configDefaults, defineConfig } from "vitest/config";

// Other sessions keep git worktrees under .claude/; their copies of the tests are not ours to run.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, ".claude/**"] },
});
