# Greekquent vault updates

Weekly updates for the Greekquent Obsidian vault. Students don't need to visit this page: the **Update vault** button in the vault downloads changes from here.

- `manifest.json` lists every file in the current release with its SHA-256 hash.
- `vault/` holds the files. The student's `My Work/` folder and window layout are never included, so updates can't overwrite them.
- `publish.py <vault folder> <this repo> <release date>` rebuilds `manifest.json` and `vault/` from a vault folder.

## Editions (since 2026-11-17i)

- `master/` is the one copy to edit. It still holds the kid lessons, which only the kids vault uses.
- `python3 tools/build_editions.py master /tmp/gqsrc /tmp/gqbsrc`, then `python3 publish.py /tmp/gqsrc . R` (Intermediate, repo root) and `python3 publish.py /tmp/gqbsrc beginner R` (Beginner).
- Intermediate: Beginner and Intermediate scripts with a switch. Beginner: Beginner scripts only; its `.obsidian/greekquent-edition.json` points updates at `beginner/`.
