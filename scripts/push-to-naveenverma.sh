#!/usr/bin/env bash
set -euo pipefail

# Push current branch to naveenverma/otc using a PAT from env.
# Usage:
#   export GITHUB_TOKEN_NAVEEN="<github_pat_with_repo_scope>"
#   ./scripts/push-to-naveenverma.sh
#
# Optional:
#   export GITHUB_USER_NAVEEN="naveenverma"   # default
#   export GITHUB_REPO_NAVEEN="otc"           # default
#   export GIT_BRANCH="main"                  # default auto-detect

GITHUB_USER_NAVEEN="${GITHUB_USER_NAVEEN:-naveenverma}"
GITHUB_REPO_NAVEEN="${GITHUB_REPO_NAVEEN:-otc}"
GIT_BRANCH="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

if [[ -z "${GITHUB_TOKEN_NAVEEN:-}" ]]; then
  echo "Error: GITHUB_TOKEN_NAVEEN is not set."
  echo "Set it first:"
  echo "  export GITHUB_TOKEN_NAVEEN='<github_pat_with_repo_scope>'"
  exit 1
fi

if [[ ! -d .git ]]; then
  echo "Error: current directory is not a git repository."
  exit 1
fi

REMOTE_URL="https://${GITHUB_USER_NAVEEN}:${GITHUB_TOKEN_NAVEEN}@github.com/${GITHUB_USER_NAVEEN}/${GITHUB_REPO_NAVEEN}.git"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "${REMOTE_URL}"
else
  git remote add origin "${REMOTE_URL}"
fi

echo "Pushing branch '${GIT_BRANCH}' to ${GITHUB_USER_NAVEEN}/${GITHUB_REPO_NAVEEN}..."
git push -u origin "${GIT_BRANCH}"
echo "Done."

