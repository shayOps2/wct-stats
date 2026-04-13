---
name: spec-and-docs-first
description: "Use when planning, implementing, testing, reviewing, or operating on this repository. Before changing code, tests, deployment, or infrastructure, inspect the relevant files in spec/ and docs/ to ground the task in the documented architecture, API contracts, data models, workflows, and known limitations."
---
# Spec And Docs First

- Before starting substantive work, read the relevant files in `spec/` and `docs/` for the area you are touching.
- Treat `spec/` as the strict reference for architecture, API contracts, data models, coding rules, and workflows.
- Treat `docs/` as the explanatory reference for setup, business logic, decisions, and troubleshooting.
- Choose the narrowest relevant documentation set instead of reading everything every time.

## Documentation Selection Rules

- For backend API changes, inspect `spec/api-contracts.md`, `spec/data-models.md`, `spec/workflows.md`, and `docs/business-logic.md`.
- For frontend behavior changes, inspect `docs/overview.md`, `docs/business-logic.md`, and any relevant API or workflow spec files.
- For infrastructure or deployment changes, inspect `spec/architecture.md`, `spec/workflows.md`, `spec/coding-rules.md`, `docs/setup.md`, `docs/decisions.md`, and `docs/troubleshooting.md`.
- For reviews or debugging, inspect the relevant troubleshooting, workflow, and business-logic documents before concluding that code behavior is incorrect.

## Operational Rules

- Do not assume undocumented behavior when a relevant spec or doc file exists.
- If documentation and code disagree, verify the implementation in code before acting.
- When you confirm the documentation is stale, update the affected `spec/` or `docs/` files as part of the change when appropriate.
- When making a plan or summary, cite the documentation you used and note any gaps or assumptions.

## Priority Order

1. Relevant code and tests remain the final source of truth for exact behavior.
2. `spec/` files are the next reference for precise repository contracts and structure.
3. `docs/` files provide rationale, setup context, and troubleshooting guidance.

## Scope

- This instruction applies to all agents working in this workspace, including product planning, development, QA, review, and DevOps tasks.