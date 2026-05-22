#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────
# Default suffix appended to every tag. Empty = stable channel.
# Switch to e.g. "-alpha" / "-beta" / "-rc.1" to cut a pre-release.
SUFFIX="${RELEASE_SUFFIX-}"

# Number of recent tags to keep on origin after a successful release.
# Older tags (and their associated GitHub Releases, when `gh` is on
# PATH) are pruned. Mutable channel tags like `nightly` are never
# touched.
KEEP_COUNT="${RELEASE_KEEP_COUNT:-4}"

# ─── Helpers ──────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $0 [patch|minor|major]

Bump types:
  patch  (default)  Correções e ajustes pequenos
                    0.1.0 → 0.1.1 → 0.1.2 → 0.1.3 ...

  minor             Features novas (reseta patch pra 0)
                    0.1.2 → 0.2.0 → 0.3.0 → 0.4.0 ...

  major             Breaking changes (reseta minor e patch pra 0)
                    0.4.0 → 1.0.0 → 2.0.0 → 3.0.0 ...

Env vars:
  RELEASE_SUFFIX     Appended to every tag (default empty → stable).
                     Example: RELEASE_SUFFIX=-alpha $0 patch
  RELEASE_KEEP_COUNT Number of tags to keep after pruning (default 4).

Todas as tags são annotated com changelog dos commits desde a última tag.

Exemplos:
  $0              # 0.1.0 → 0.1.1
  $0 minor        # 0.1.1 → 0.2.0
  $0 major        # 0.2.0 → 1.0.0
  RELEASE_SUFFIX=-alpha $0 patch  # 0.1.0 → 0.1.1-alpha
EOF
  exit 1
}

# ─── Parse bump type ─────────────────────────────────────────────────
BUMP="${1:-patch}"
case "$BUMP" in
  patch|minor|major) ;;
  -h|--help) usage ;;
  *) echo "Error: unknown bump type '$BUMP'"; usage ;;
esac

# ─── Sanity: clean working tree on main ──────────────────────────────
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: must be on main (currently on '$CURRENT_BRANCH')."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree has uncommitted changes. Commit or stash first."
  git status --short
  exit 1
fi

# ─── Get latest tag (or seed from package.json on first release) ─────
LATEST_TAG=$(git tag --sort=-v:refname | grep -v '^nightly$' | head -1)
BOOTSTRAP=0

if [ -z "$LATEST_TAG" ]; then
  # Bootstrap: no tags yet, so derive the baseline from package.json.
  # This avoids the "regress to 0.0.1" pitfall when the project has been
  # carrying an in-repo version (e.g. 0.1.0) before the first git tag.
  # The chosen patch/minor/major bump is applied on top of this base.
  PKG_VERSION=$(node -p "require('./package.json').version")
  if ! [[ "$PKG_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
    echo "Error: package.json version '$PKG_VERSION' is not a valid semver baseline."
    exit 1
  fi
  echo "No tags found. Seeding baseline from package.json: ${PKG_VERSION}"
  # Strip any pre-existing suffix so the bump math below operates on the
  # bare X.Y.Z and re-applies $SUFFIX consistently.
  BASE_VERSION=$(echo "$PKG_VERSION" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')
  LATEST_TAG="${BASE_VERSION}${SUFFIX}"
  BOOTSTRAP=1
fi

echo "Latest tag: $LATEST_TAG"

# ─── Strip suffix and split version ──────────────────────────────────
VERSION=$(echo "$LATEST_TAG" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# ─── Bump version ────────────────────────────────────────────────────
case "$BUMP" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}${SUFFIX}"

# ─── Build changelog from commits since last tag ─────────────────────
echo ""
echo "──────────────────────────────────────"
echo "  $LATEST_TAG → $NEW_VERSION ($BUMP)"
echo "──────────────────────────────────────"
echo ""

if [ "$BOOTSTRAP" = "1" ]; then
  # First release: no prior tag to anchor the range, so include the
  # full history.
  COMMITS=$(git log --oneline --no-decorate)
else
  COMMITS=$(git log "${LATEST_TAG}..HEAD" --oneline --no-decorate)
fi

if [ -z "$COMMITS" ]; then
  echo "No new commits since $LATEST_TAG. Aborting."
  exit 1
fi

# ─── Format changelog ────────────────────────────────────────────────
CHANGELOG=$(echo "$COMMITS" | while IFS= read -r line; do
  # Strip the short hash, keep only the message
  MSG="${line#* }"
  echo "- $MSG"
done)

TAG_BODY="Release ${NEW_VERSION}

Changes since ${LATEST_TAG}:

${CHANGELOG}
"

echo "$TAG_BODY"
echo "──────────────────────────────────────"
echo ""

# ─── Confirm ─────────────────────────────────────────────────────────
read -rp "Create tag $NEW_VERSION? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# ─── Bump version in project files ───────────────────────────────────
echo "Updating version in package.json..."

# Portable sed across macOS (BSD) and Linux (GNU): write to a temp file
# then move it back. `sed -i ''` is macOS-only and `sed -i` (no arg) is
# GNU-only — neither works on both.
TMP=$(mktemp)
sed "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" package.json > "$TMP"
mv "$TMP" package.json

git add package.json
git commit -m "chore: bump version to ${NEW_VERSION}"

echo "Version bumped and committed."
echo ""

# ─── Create annotated tag ────────────────────────────────────────────
git tag -a "$NEW_VERSION" -m "$TAG_BODY"

echo ""
echo "Tag $NEW_VERSION created. Pushing to origin..."
echo ""

git push origin main
git push origin "$NEW_VERSION"

echo ""
echo "Tag $NEW_VERSION pushed to GitHub. release.yml will take it from here."

# ─── Prune old tags (keep last KEEP_COUNT, never touch 'nightly') ────
echo ""
echo "Pruning old tags (keeping last ${KEEP_COUNT})..."

git fetch --tags --prune --prune-tags origin >/dev/null 2>&1 || true

ALL_TAGS=$(git tag -l --sort=-v:refname | grep -v '^nightly$' || true)
OLD_TAGS=$(echo "$ALL_TAGS" | tail -n +$((KEEP_COUNT + 1)))

if [ -z "$OLD_TAGS" ]; then
  echo "Nothing to prune."
else
  HAVE_GH=0
  command -v gh >/dev/null 2>&1 && HAVE_GH=1
  echo "$OLD_TAGS" | while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    echo "  deleting $tag"
    if [ "$HAVE_GH" = "1" ]; then
      gh release delete "$tag" --cleanup-tag -y >/dev/null 2>&1 || true
    fi
    git push origin --delete "$tag" >/dev/null 2>&1 || true
    git tag -d "$tag" >/dev/null 2>&1 || true
  done
  echo "Pruned."
fi
