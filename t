[33mcommit 861895b8a9b6ac5c91994cdd880cbf9a018bf472[m[33m ([m[1;34mgrafted[m[33m, [m[1;36mHEAD[m[33m -> [m[1;32mchore/run-9-5[m[33m, [m[1;31morigin/run-phase-8-3-insurance-quote-proposal[m[33m, [m[1;31morigin/main[m[33m, [m[1;31morigin/HEAD[m[33m, [m[1;32mmain[m[33m)[m
Author: Richard <richard@ingrid-app.com>
Date:   Fri Dec 26 13:21:33 2025 -0500

    Merge remote-tracking branch 'origin/run-6-3'
    
    # Conflicts:
    #       README.md
    #       apps/data-service/package.json
    #       apps/orchestrator/package.json
    #       docs/PHASES.md

[33mcommit 7c556eb029c641062fea1f6a1c2f630d4253fafe[m
Author: cto-new[bot] <140088366+cto-new[bot]@users.noreply.github.com>
Date:   Fri Dec 26 00:59:55 2025 +0000

    feat(orchestrator): add multi-criteria lead ranking engine and tests

[33mcommit 9d64e0084a408ded56baae71c17087c13eff7666[m
Author: cto-new[bot] <140088366+cto-new[bot]@users.noreply.github.com>
Date:   Wed Dec 24 18:58:21 2025 +0000

    feat(data-service): implement Prisma schema and repositories

[33mcommit f94ec6573ddd84af0f8ac842d9049bb3a9394574[m
Author: cto-new[bot] <140088366+cto-new[bot]@users.noreply.github.com>
Date:   Wed Dec 24 17:46:12 2025 +0000

    feat(phase2): scaffold data pipeline and real-time lead processing

[33mcommit 84580b3f00a93d9cd9fdf63423a404bb96504ac9[m
Author: cto-new[bot] <140088366+cto-new[bot]@users.noreply.github.com>
Date:   Wed Dec 24 17:12:18 2025 +0000

    test(monorepo): establish Jest-based test infra across all packages
    
    Set up a comprehensive Jest configuration across API, Data Service, Orchestrator, Core, Types, and Config. Added initial smoke tests, per-package tsconfig, and sample tests to validate setup. Introduced pnpm-workspace.yaml for workspace management. Implemented config/env loader with tests and bumped API dependency to a compatible version. This enables CI testing and Phase 1 validation.

[33mcommit 0c87014eae2af7ca04bc5da8ce2c1b32c96a48b5[m
Author: cto-new[bot] <140088366+cto-new[bot]@users.noreply.github.com>
Date:   Wed Dec 24 03:36:19 2025 +0000

    feat(monorepo): initialize greenfield monorepo with Turborepo, pnpm workspaces, and base infra
