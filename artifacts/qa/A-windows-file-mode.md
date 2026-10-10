# A: Windows local-server permission assertion diagnosis

Scope: diagnostic only. Neither local/server nor tests/local-server.test.js was changed.

Observed on Windows 10.0.26200 / Node 24.19.0: tests/local-server.test.js:47 expects `(statSync(database).mode & 0o777) === 0o600`; actual value is decimal 438 (octal 0666), expected decimal 384 (octal 0600). The test ran real fictional local-server operations and failed at this assertion before its remaining restart checks.

Node's Windows mode/chmod abstraction does not implement POSIX owner/group/other permission separation. On Windows only the writable/read-only aspect is supported through this interface; the returned 0666 must not be interpreted as proof that every Windows account can read or write the database. Conversely, a desired mode argument of 0600 is not proof of a restrictive Windows DACL.

Actual Windows access depends on the file and directory security descriptors: inherited and explicit DACL entries, enabled user/group SIDs, deny/allow ordering and the requesting token. A mode-only assertion cannot establish effective ACL access. No real user database or ACL was inspected in this task; the observed failure alone does not establish an exposure or certify protection.

Suggested test boundary for parent review:

- Keep exact 0600 assertions for platforms with POSIX mode semantics.
- Add a separate Windows security test using a disposable fictional-data directory and Windows ACL-aware inspection or effective access tests. State the intended account policy explicitly (e.g. owner, SYSTEM and administrators) and account for inheritance.
- Keep platform-independent password/authentication, origin restrictions, durable save, backup and restart assertions in their own tests so a platform-specific permission failure cannot prevent those checks from running.
- If restrictive Windows ACLs are a product requirement, implement and verify that separately; do not treat removing this assertion as a security fix.

References for parent verification: Node fs.chmod documentation (https://nodejs.org/api/fs.html#fschmodpath-mode-callback), Microsoft access-control model (https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-model). These links identify documentation; no claim is made that an ACL audit was performed.
