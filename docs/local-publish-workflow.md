# Local publish workflow

This repository uses two working branches:

- `db`: local work and test branch. All requested changes start here.
- `main`: stable GitHub publish branch. Only merge after local checks pass.

Vercel automatic Git deployments are disabled in `vercel.json` with `git.deploymentEnabled: false`.
Pushing to GitHub will not automatically publish to Vercel.

Before publishing to `main`, run:

```powershell
npm run build
```

Recommended flow:

```powershell
git switch db
# make changes
npm run build
git add .
git commit -m "Describe the verified change"
git switch main
git merge --ff-only db
git push origin main
git switch db
```

Production Vercel deployment should be run manually only after `main` is verified.
