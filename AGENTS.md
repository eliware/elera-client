# Agent guidance

Use Node.js 26 native ESM, keep the public entrypoint limited to the managed
application client, and keep implementation in focused modules. Applications
configure only ELERA_API_URL and ELERA_API_TOKEN. Do not add supervisor,
CLI, backup, GitOps, or cluster-administration policy here.
