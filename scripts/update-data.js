#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MPP_URL = 'https://mpp.football/leagues/mpp_challenge_UC8MVG4F';
const WORLDCUP_URL = 'https://raw.githubusercontent.com/mjwebmaster/world-cup-2026-schedule-data/main/world-cup-2026-schedule.json';
const GH_PAGES_BRANCH = 'gh-pages';

function run(command, cwd = ROOT) {
  return execSync(command, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
}

function runInherit(command, cwd = ROOT) {
  execSync(command, { cwd, stdio: 'inherit' });
}

function branchExists(name) {
  try {
    run(`git rev-parse --verify ${name}`);
    return true;
  } catch {
    return false;
  }
}

function remoteBranchExists(name) {
  try {
    const result = run(`git ls-remote --heads origin ${name}`);
    return Boolean(result);
  } catch {
    return false;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'mpp-football-gh-pages-updater/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function copyStaticSite(targetDir) {
  const indexSource = path.join(ROOT, 'index.html');
  const indexTarget = path.join(targetDir, 'index.html');
  fs.copyFileSync(indexSource, indexTarget);
}

function ensureGitIdentity(worktree) {
  const email = process.env.GIT_AUTHOR_EMAIL || 'github-actions[bot]@users.noreply.github.com';
  const name = process.env.GIT_AUTHOR_NAME || 'github-actions[bot]';
  runInherit(`git config user.email "${email}"`, worktree);
  runInherit(`git config user.name "${name}"`, worktree);
}

function pushChanges(worktree) {
  const dryRun = process.env.DRY_RUN === '1';
  if (dryRun) {
    console.log('DRY_RUN=1 set, skipping push.');
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required for pushing gh-pages updates.');
  }

  const originUrl = run('git config --get remote.origin.url', worktree);
  if (originUrl.startsWith('https://github.com/')) {
    const authed = originUrl.replace('https://', `https://x-access-token:${token}@`);
    runInherit(`git push "${authed}" ${GH_PAGES_BRANCH}:${GH_PAGES_BRANCH}`, worktree);
    return;
  }

  runInherit(`git push origin ${GH_PAGES_BRANCH}:${GH_PAGES_BRANCH}`, worktree);
}

async function main() {
  process.chdir(ROOT);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mpp-gh-pages-'));

  let worktreeReady = false;

  try {
    const remoteExists = remoteBranchExists(GH_PAGES_BRANCH);

    if (branchExists(GH_PAGES_BRANCH)) {
      runInherit(`git worktree add "${temp}" ${GH_PAGES_BRANCH}`);
      worktreeReady = true;
    } else if (remoteExists) {
      runInherit(`git fetch origin ${GH_PAGES_BRANCH}:${GH_PAGES_BRANCH}`);
      runInherit(`git worktree add "${temp}" ${GH_PAGES_BRANCH}`);
      worktreeReady = true;
    } else {
      runInherit(`git worktree add --detach "${temp}" HEAD`);
      runInherit(`git checkout --orphan ${GH_PAGES_BRANCH}`, temp);
      runInherit('git rm -rf . >/dev/null 2>&1 || true', temp);
      worktreeReady = true;
    }

    const [leagueHtml, worldCupText] = await Promise.all([
      fetchText(MPP_URL),
      fetchText(WORLDCUP_URL)
    ]);

    let worldCupData;
    try {
      worldCupData = JSON.parse(worldCupText);
    } catch (error) {
      throw new Error(`World Cup JSON is invalid: ${error.message}`);
    }

    copyStaticSite(temp);
    writeFile(path.join(temp, 'data', 'mpp_league.html'), leagueHtml);
    writeFile(
      path.join(temp, 'data', 'worldcup.json'),
      `${JSON.stringify({
        source: WORLDCUP_URL,
        fetchedAt: new Date().toISOString(),
        data: worldCupData
      }, null, 2)}\n`
    );

    runInherit('git add index.html data/mpp_league.html data/worldcup.json', temp);

    const changed = run('git status --porcelain', temp);
    if (!changed) {
      console.log('No changes detected on gh-pages.');
      return;
    }

    ensureGitIdentity(temp);
    runInherit('git commit -m "chore: update gh-pages data"', temp);
    pushChanges(temp);
    console.log('gh-pages updated.');
  } finally {
    if (worktreeReady) {
      try {
        runInherit(`git worktree remove --force "${temp}"`);
      } catch (error) {
        console.warn(`Could not remove worktree ${temp}:`, error.message);
      }
    }
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
