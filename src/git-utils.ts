/**
 * Git utility functions for detecting repository context
 */

import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "./logger.js";

const execAsync = promisify(exec);

export interface GitContext {
  is_git_repo: boolean;
  repository?: string;
  branch?: string;
  has_uncommitted_changes?: boolean;
}

/**
 * Detect git repository context from a working directory
 */
export async function detectGitContext(cwd: string): Promise<GitContext> {
  try {
    await execAsync("git rev-parse --is-inside-work-tree", { cwd });
  } catch {
    return { is_git_repo: false };
  }

  let repository: string | undefined;
  try {
    const { stdout: remoteUrl } = await execAsync("git remote get-url origin", {
      cwd,
    });
    repository = remoteUrl.trim();
    // Convert SSH to HTTPS
    if (repository.startsWith("git@github.com:")) {
      repository = repository
        .replace("git@github.com:", "https://github.com/")
        .replace(/\.git$/, "");
    } else if (repository.endsWith(".git")) {
      repository = repository.replace(/\.git$/, "");
    }
  } catch {
    // Try any remote
    try {
      const { stdout: remotes } = await execAsync("git remote", { cwd });
      const firstRemote = remotes.trim().split("\n")[0];
      if (firstRemote) {
        const { stdout: remoteUrl } = await execAsync(
          `git remote get-url ${firstRemote}`,
          { cwd }
        );
        repository = remoteUrl.trim();
      }
    } catch {
      // No remotes
      logger.debug("No git remotes found", { cwd });
    }
  }

  let branch: string | undefined;
  try {
    const { stdout } = await execAsync("git branch --show-current", { cwd });
    branch = stdout.trim() || undefined;
    if (!branch) {
      const { stdout: commit } = await execAsync("git rev-parse --short HEAD", {
        cwd,
      });
      branch = `detached@${commit.trim()}`;
    }
  } catch {
    logger.debug("Could not determine git branch", { cwd });
  }

  let has_uncommitted_changes = false;
  try {
    const { stdout } = await execAsync("git status --porcelain", { cwd });
    has_uncommitted_changes = stdout.trim().length > 0;
  } catch {
    // Ignore
  }

  return { is_git_repo: true, repository, branch, has_uncommitted_changes };
}
