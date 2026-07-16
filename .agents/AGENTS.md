# OHRM Repo Synchronization Rule
Whenever making code changes to this monorepo (`c:\WFH Tracking\wfh-tracking-system`), you MUST ALWAYS synchronize the changes to the three separate OHRM repositories as well. 

The three repos are located at:
1. Backend: `c:\WFH Tracking\OHRM_WFH_Backend`
2. Desktop Agent: `c:\WFH Tracking\OHRM_WFH_Desktop.agent`
3. Frontend: `c:\WFH Tracking\OHRM_WFH_Frontend`

**Workflow for syncing:**
1. After committing changes in the monorepo, copy the updated folders (`backend`, `desktop-agent`, `frontend`) to the respective OHRM repositories, overwriting existing files (but being careful not to delete `.git` folders in the target).
2. For each OHRM repository, add changes, commit them to the current branch, and `git push`.
3. IMPORTANT: You cannot create PRs or add reviewers automatically because the GitHub CLI is not installed. Therefore, you MUST remind the user to go to GitHub, create the Pull Requests, and assign the appropriate reviewers themselves.
