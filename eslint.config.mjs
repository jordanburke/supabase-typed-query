import baseConfig from "ts-builds/eslint-functype"

export default [
  ...baseConfig,
  // ── functype prefer-* exclusions for the SQL/IO boundary ────────────────────
  // This package maps a functype-style public API (Task/Option/List) onto
  // Supabase's imperative, nullable, throwing PostgREST client. A few prefer-*
  // rules are genuine false positives at that boundary. Each is scoped to only the
  // files where it doesn't apply, with the reason below. Everything else stays
  // enforced — no-let, prefer-try, no-imperative-loops, prefer-do-notation, etc.
  // (no-imperative-loops is satisfied in code, not disabled.)

  // prefer-option — these files model SQL three-valued logic: a column value of
  // null is real data (IS NULL / IS TRUE / IS FALSE) and is part of the public API
  // consumers write (e.g. `{ field: null }`), not Option-style absence. They also
  // carry optional query params (`x | undefined`) at the same boundary.
  {
    files: [
      "src/types.ts",
      "src/query/Query.ts",
      "src/query/QueryBuilder.ts",
      "src/query/index.ts",
      "src/entity/types.ts",
      "src/entity/core.ts",
    ],
    rules: { "functype/prefer-option": "off" },
  },

  // prefer-either — every throw in these files either populates the
  // IO.tryAsync/Task error channel (throwing IS the error mechanism for IOTask) or
  // is the intentional poison-pill `.then()` that must throw synchronously when a
  // builder is awaited without a terminal method. Either.left does not apply.
  {
    files: ["src/query/index.ts", "src/query/rpc.ts", "src/query/QueryBuilder.ts", "src/entity/types.ts"],
    rules: { "functype/prefer-either": "off" },
  },

  // The query engine serializes conditions into PostgREST filter strings. It
  // branches on raw null values (not Option), accumulates string parts, and uses
  // native Set/Map for hot-path lookup — so prefer-fold/-map/-functype-set/-map are
  // false positives. prefer-flatmap flags `Task.map(list => list.map(fn))`, which
  // is correct functor composition (Task then List), not a flatMap.
  {
    files: ["src/query/QueryBuilder.ts"],
    rules: {
      "functype/prefer-fold": "off",
      "functype/prefer-map": "off",
      "functype/prefer-flatmap": "off",
      "functype/prefer-functype-set": "off",
      "functype/prefer-functype-map": "off",
    },
  },

  // prefer-fold — the pagination helper branches on `number | undefined`, not Option.
  {
    files: ["src/entity/core.ts"],
    rules: { "functype/prefer-fold": "off" },
  },
]
