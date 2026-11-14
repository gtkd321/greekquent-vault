# Build a GitHub-ready update tree: manifest.json + vault/<files>
import hashlib, json, os, shutil, sys
src, out, release = sys.argv[1], sys.argv[2], sys.argv[3]
SKIP = lambda p: p.startswith('My Work/') or p in ('.obsidian/workspace.json', '.obsidian/workspace-mobile.json', '.obsidian/greekquent-release.json') or p.startswith('.trash/') or p == '.obsidian/plugins/greekquent-student-layout/data.json'
if os.path.exists(os.path.join(out, 'vault')): shutil.rmtree(os.path.join(out, 'vault'))
files = {}
for root, _, fs in os.walk(src):
    for f in fs:
        full = os.path.join(root, f); p = os.path.relpath(full, src).replace(os.sep, '/')
        if SKIP(p): continue
        b = open(full, 'rb').read(); files[p] = {'sha256': hashlib.sha256(b).hexdigest(), 'size': len(b)}
        dst = os.path.join(out, 'vault', p); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(full, dst)
json.dump({'release': release, 'files': dict(sorted(files.items()))}, open(os.path.join(out, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
print(len(files), 'files, release', release)
