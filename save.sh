#!/bin/bash

# Stage semua perubahan dulu
git add .

# Ambil perubahan yang sudah di-stage
CHANGED=$(git diff --cached --name-only)

if [[ -z "$CHANGED" ]]; then
  echo "Ga ada perubahan 😴"
  exit 0
fi

TYPE=$1
shift
MSG="$*"

# Auto detect type
if [[ -z "$TYPE" ]]; then
  if echo "$CHANGED" | grep -E "\.md$" >/dev/null; then
    TYPE="docs"
  elif echo "$CHANGED" | grep -E "\.json$|\.config|\.env" >/dev/null; then
    TYPE="chore"
  elif echo "$CHANGED" | grep -E "\.test\.|spec\." >/dev/null; then
    TYPE="test"
  else
    TYPE="feat"
  fi
fi

# Emoji
case "$TYPE" in
  feat) EMOJI="✨" ;;
  fix) EMOJI="🐛" ;;
  chore) EMOJI="🔧" ;;
  docs) EMOJI="📝" ;;
  test) EMOJI="🧪" ;;
  refactor) EMOJI="♻️" ;;
  perf) EMOJI="⚡" ;;
  style) EMOJI="🎨" ;;
  *) EMOJI="🔹" ;;
esac

# Auto message
if [[ -z "$MSG" ]]; then
  FILE_COUNT=$(echo "$CHANGED" | wc -l)
  MSG="update $FILE_COUNT file(s)"
fi

STATS=$(git diff --cached --shortstat)

git commit -m "$EMOJI $TYPE: $MSG

Changes:
$STATS

Files:
$CHANGED"

if [[ $? -eq 0 ]]; then
  git push
else
  echo "Commit gagal ❌"
fi