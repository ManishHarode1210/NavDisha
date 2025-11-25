# NavDisha
Real-world Project


push pull commands:
1. Inspect local state and remotes:

cd "c:\Users\manis\Desktop\Coding\Projects\NavDisha"
git status
git remote -v
git branch --show-current

2. Fetch remote changes
 git fetch origin

3. Rebase your local branch onto the remote branch (recommended to keep history clean)
  git rebase origin/main

4. If you get merge conflicts during rebase:
Open conflicted files in the editor, fix the conflicts.
Then mark resolved and continue:

  git add .
  git rebase --continue

5. If you want to abort the rebase and return to the original state:
  git rebase --abort

6. After a successful rebase push your changes
  git push origin main
# if first push of this branch use:
# git push -u origin main

7. If you intentionally want your local to overwrite the remote (danger: will lose remote commits), force-push:


 git push --force origin main

8.  If you prefer merging instead of rebasing, run::
   git pull origin main --no-rebase
# resolve conflicts, then
git add .
git commit
git push origin main


Third time i commited using these commands because the privious time the code is 
duplicated in the file it self.
that's why i re commmited it today.
"Commands :- "
 cd <folder>
 git init
 git add .
 git  status
 git remote -v
 git remote add origin <the repo ink for push thhe code>
 git commit -m "commite count - NavDisha"
 git push origin main