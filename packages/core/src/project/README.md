# Project I/O (format 0.1)

`loadProject(root)` reads `mapbard.project.json`, its narrative and design files,
and all declared local resources. It checks real-path containment,
case-insensitive path collisions, declared SHA-256 values and strict schemas.
The loaded input snapshot contains authored-file digests and sorted resource
IDs; roots and paths stay process-local.

Call `validateProject(loaded.value)` after a successful load to check semantic
references, declarations, required extensions and snapshot membership. Use the
loader to establish byte identity. Compilation uses those public contracts.

The synthetic specimen in `fixtures/two-period/` and the Potomac project in
`examples/projects/first-slice/` exercise this boundary. Format 0.2 and
`mapbard migrate` are planned in M1-B and M1-C.
