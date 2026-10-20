# Project I/O

Format 0.2 authors edit `mapbard.json` and `story.json`. `loadProject(root)`
requires a fresh CLI-owned `mapbard.lock.json`, rejects drift, then validates
semantic references and compiles through the existing engine. `refreshProjectLock`
profiles sources, normalizes line endings for JSON/GeoJSON/CSV hashes, hashes
binary media as bytes, and writes only the lock. `recordProjectCompilation`
records matching compiled inputs. `migrateProject(source, destination)` copies a
0.1 project to a new directory and writes a migration report. The source stays
untouched. JSON Schema export uses `zod-to-json-schema` 3.24.6 (MIT).

## Legacy 0.1 reader

`loadProject(root)` reads `mapbard.project.json`, its narrative and design files,
and all declared local resources. It checks real-path containment,
case-insensitive path collisions, declared SHA-256 values and strict schemas.
The loaded input snapshot contains authored-file digests and sorted resource
IDs; roots and paths stay process-local.

Call `validateProject(loaded.value)` after a successful load to check semantic
references, declarations, required extensions and snapshot membership. Use the
loader to establish byte identity. Compilation uses those public contracts.

The synthetic specimen in `fixtures/two-period/` and the Potomac project in
`examples/projects/first-slice/` still exercise this boundary. M1-F replaces the
checked-in example with format 0.2 after the M1-C CLI is available.
