<!-- BEGIN:stephane-codex-rules -->
# Codex working rules

## User experience

The user may describe work in ordinary language. Infer the appropriate engineering workflow without requiring a formal prompt. Ask a question only when a missing choice materially changes the result or when authorization is required.

Keep status updates and final reports concise. Do not reproduce unchanged files or explain trivial code.

## Default workflow

1. Read the nearest relevant instructions and inspect only the files needed for the task.
2. Search for existing implementations, utilities, types, and tests before creating anything.
3. Choose the smallest safe change that fully solves the request.
4. Preserve public APIs and existing behavior unless the user explicitly requests a breaking change.
5. Validate at the narrowest useful level first, then expand validation when risk warrants it.
6. Report the outcome, validation performed, modified files, and any real remaining risk.

Stop exploring once the responsible implementation and directly affected callers are understood. Do not audit unrelated areas or perform unrelated refactors.

## Scope and efficiency

- Prefer editing existing code over adding parallel implementations.
- Do not add a dependency when existing code or platform APIs reasonably suffice.
- Do not create speculative abstractions, documentation, tests, or files unrelated to the requested outcome.
- Never discard, overwrite, or revert user changes outside the task.
- Keep diffs small, coherent, and easy to review or roll back.
- Treat tests as executable product requirements; update or add them when behavior changes.
- Use repository-native commands and conventions. Do not invent commands that are not configured.

## Risk-based validation

Apply effort according to risk:

- Routine UI or local change: targeted checks plus lint/typecheck when available.
- Business logic or shared behavior: relevant tests, lint/typecheck, and build when appropriate.
- Authentication, authorization, payments, finance, tax, security, migrations, production data, or deployment: inspect callers and data flow, validate inputs and permissions, run relevant tests and build, and explicitly assess regression and rollback risk.

Compilation alone is not proof that a feature works. When practical, verify the actual affected flow.

## Data and production safety

Without explicit user authorization, never:

- delete, truncate, or irreversibly rewrite production data;
- run destructive migrations or rewrite migration history;
- expose secrets or move server-only values to client code;
- deploy to production, merge, force-push, or perform other irreversible external actions.

Database changes must preserve existing data, use a migration, and be reversible where practical. Prefer development or preview validation before production.

## Completion standard

A change is complete when the requested behavior is implemented, relevant validation passes, no unrelated scope was introduced, and remaining limitations are stated honestly. If a check cannot run, report why instead of claiming success.
<!-- END:stephane-codex-rules -->
