---
description: Push changes to GitHub repository (wx2xhs)
---

# Git Push Workflow

This workflow pushes local changes to the GitHub repository at https://github.com/Vieeeeeee/wx2xhs.git

## Steps

// turbo-all

1. Check git status to see what files have changed:
```bash
git status
```

2. Stage all changes:
```bash
git add .
```

3. Show staged changes for review:
```bash
git diff --cached --stat
```

4. Commit with a descriptive message (replace `<message>` with actual commit message):
```bash
git commit -m "<message>"
```

5. Push to remote:
```bash
git push origin main
```

## First-time Setup (if needed)

If the remote isn't configured yet:
```bash
git remote add origin https://github.com/Vieeeeeee/wx2xhs.git
```

If pushing for the first time:
```bash
git push -u origin main
```
