# Decisions

## D1 — Branch protection without required approvals (2026-11-12)

- **Context:** all agents push as one GitHub account; GitHub does not let an account approve its own PR.
- **Options:** require 1 approval (blocks every merge) / require 0 approvals and review in PR comments.
- **Choice:** 0 required approvals; PR, linear history, conversation resolution, no force-push, no deletion, admins included.
- **Why:** the peer review happens as a debate of facts in the PR; a required approval would only deadlock.
- **Follow-up:** add the CI `ci-ok` job as a required check once it has run once.

## D2 — Tool system from research instead of preinstalled skills (2026-11-12)

- **Context:** Om asked for the tool system to come from at least 100 researched sources across three agents.
- **Options:** rely on preinstalled agent skills / research and agree a shelf.
- **Choice:** the shelf in [tool-system.md](tool-system.md), agreed by Antigravity and OpenCode with zero open disagreements;
  Claude's CI/security/deploy slice added.
- **Why:** 201 sources total, every pick with licence and maintenance evidence; 11 factual corrections made during cross-review.

## D3 — Fonts and palette are candidates, not decisions (2026-11-12)

- **Context:** research proposed Fraunces + Plus Jakarta Sans on a cream / pine / terracotta palette.
- **Choice:** keep as one Phase 3 candidate; Phase 3 must also show a direction without it.
- **Why:** that combination is itself a frequent look of AI-generated sites, which this redesign exists to avoid.
