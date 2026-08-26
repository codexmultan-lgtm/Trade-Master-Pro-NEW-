---
name: Imported artifact previews
description: Preview and workflow behavior for imported artifact workspaces
---

Imported projects can contain a valid `.replit-artifact/artifact.toml` while the artifact is absent from the workspace registry and has no managed workflow. In that state, artifact presentation, managed workflow restart, and proxied screenshot verification are unavailable until the artifact is registered by the platform.

**Why:** An imported CryptoTrade workspace had service metadata but `listArtifacts()` and `listWorkflows()` were empty, so the documented managed workflow name could not be restarted and the preview could not be resolved.

**How to apply:** Check the artifact/workflow registry before relying on managed preview tools. If it is empty, use package builds and direct process checks for what can be verified, and report the preview limitation rather than creating a duplicate workflow or editing artifact metadata.