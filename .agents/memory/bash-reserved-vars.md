---
name: Bash reserved variable names in test scripts
description: Using UID (or other bash builtins) as a shell variable name silently substitutes the wrong value instead of erroring
---

`UID` is a readonly, bash-builtin variable holding the real OS user id (e.g. `1000`). Assigning to it in a script is silently ignored, and later expansions of `$UID` yield the OS uid, not the value you tried to set.

**Why:** Spent significant time debugging Mongoose `CastError: Cast to ObjectId failed for value "1000"` when testing admin ban/freeze endpoints via curl — the script used `UID=<mongo object id>` and later `$UID` resolved to `1000` instead.

**How to apply:** When writing ad-hoc bash test scripts (curl loops, etc.), avoid reserved/builtin variable names like `UID`, `EUID`, `PATH`, `HOME`, `IFS`, `PS1`. Use clearly custom names like `USER_ID`, `TARGET_UID`, `TUID`.
