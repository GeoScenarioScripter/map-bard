# Diagnostics

`mapbard --json check` returns `{ok, command, cliVersion, diagnostics, result, truncated}`. `truncated` is true when `--limit` cut the diagnostics or a result list; raise the limit to see the rest. Each diagnostic includes a code, artifact, path, IDs when relevant, message, severity, and remedy. Errors give exit code 1; invalid CLI usage gives 2; internal failures give 3. Read the specific remedy before changing authored content.

| Code                                               | What to inspect                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `INPUT_STALE`                                      | Which authored file or resource changed; then run `mapbard lock` and retry `check`                      |
| `REFERENCE_MISSING`                                | Resource, attribute, scene, layer, or feature ID spelling and registration                              |
| `MEASUREMENT_REQUIRED`, `MEASUREMENT_INCOMPATIBLE` | Source documentation for role, unit, level, and denominator; never guess these to satisfy the compiler  |
| `CAPABILITY_UNSUPPORTED`                           | `mapbard capabilities` and the requested technique, classification, encoding, filter, or control        |
| `RESOURCE_MISSING`, `ASSET_PATH_INVALID`           | Whether the referenced local file exists inside the project at its declared path                        |
| `VALUE_INVALID`                                    | The reported field and its schema or source values; a missing attribution placeholder also blocks build |

After fixing an authored file, refresh the lock and check again. A successful `check` validates the project and compiler inputs; inspect a preview to confirm the page actually communicates the intended claim.
