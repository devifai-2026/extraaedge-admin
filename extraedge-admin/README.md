# Build shim — not application code

The app itself lives at the REPO ROOT (it was flattened out of this directory
in "Flatten repo: move app files from extraedge-admin/ to repo root").

This directory exists only because Hostinger's deploy panel has a "Root
directory" setting that cannot be set to the repository root — its picker
only lists subdirectories, and the site was originally connected with this
path saved. Pointing it anywhere real (`src/`, `public/`) fails the same way,
because neither holds a package.json.

So this shim gives that setting a valid target. Its `build` script steps up to
the real project, installs and builds it, then copies the resulting `dist/`
back down here where Hostinger's configured output directory expects it.

If the Hostinger site is ever reconnected with an empty root directory, delete
this whole directory — nothing else references it.
