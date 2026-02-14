#!/bin/bash

TYPE=$1
MSG=$2

if [[ -z "$TYPE" ]]; then
  TYPE="chore"
fi

if [[ -z "$MSG" ]]; then
  MSG="update bot"
fi

if [[ -n $(git status --porcelain) ]]; then
  git add .
  git commit -m "$TYPE: $MSG"
  git push
else
  echo "Ga ada perubahan 😴"
fi