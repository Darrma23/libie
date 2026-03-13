#!/bin/bash

CHANGED=$(git diff --name-only)

if [[ -z "$CHANGED" ]]; then
  echo "Ga ada perubahan 😴"
  exit 0
fi

TYPE=$1
MSG=$2

# Auto detect type kalau kosong
if [[ -z "$TYPE" ]]; then
  if echo "$CHANGED" | grep -E "\.md$" > /dev/null; then
    TYPE="docs"
  elif echo "$CHANGED" | grep -E "\.json$|\.config|\.env" > /dev/null; then
    TYPE="chore"
  elif echo "$CHANGED" | grep -E "\.test\.|spec\." > /dev/null; then
    TYPE="test"
  else
    TYPE="feat"
  fi
fi

# Mapping emoji
case $TYPE in
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

# Auto message kalau kosong
if [[ -z "$MSG" ]]; then
  FILE_COUNT=$(echo "$CHANGED" | wc -l)
  MSG="update $FILE_COUNT file(s)"
fi

STATS=$(git diff --shortstat)

git add .
git commit -m "$EMOJI $TYPE: $MSG

Changes:
$STATS

Files:
$CHANGED"

git push