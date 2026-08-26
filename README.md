# dsh-git-sync

> Per-session **opt-in** multi-device sync of DeepSeek Harness sessions & memory over git (GitHub).
> 按会话手动开启的多设备共享：把你想共享的会话同步到同一个 GitHub 仓库，多台设备自动双向同步。

English | [中文](README.zh.md)

![dsh](https://img.shields.io/badge/DeepSeek%20Harness-plugin-blue) ![npm](https://img.shields.io/npm/v/@sanzhihema/dsh-git-sync) ![license](https://img.shields.io/npm/l/@sanzhihema/dsh-git-sync)

## What it does

- **Per-session opt-in**: nothing syncs until you enable the master switch **and** turn on a specific session. Only sessions you opt in are ever shared.
- **Git-based transport**: enabled sessions are mirrored to `~/.dsh/git-sync` and pushed/pulled to your GitHub repository on a timer or on demand.
- **Settings card**: a card in **Settings → Plugins → Plugin configuration** with the master switch, GitHub remote, branch, interval, auto-create, and a **Sign in with GitHub** button + auth status.
- **Slash commands**: `/sync`, `/sync enable|disable`, `/sync list`, `/sync on|off`.

## Install

On any DeepSeek Harness machine (the card is installed automatically as a dependency):

```sh
dsh plugin --profile desktop add @sanzhihema/dsh-git-sync
```

Then **restart DSH**.

## Quick start (first time, step by step)

1. **Restart DSH** so the plugin and its settings card load.
2. Open **Settings → Plugins → Plugin configuration** and expand the **Git Sync (dsh-git-sync)** card.
3. Click **Sign in with GitHub** — a browser opens the GitHub login page. Authorize and come back; the status turns **Signed in** (green). *(Uses Git Credential Manager; the credential is stored in the OS credential store.)*
4. Fill in the **GitHub remote** (e.g. `https://github.com/<owner>/<repo>.git` or `git@github.com:<owner>/<repo>.git`) and toggle **Enabled** on. Save.
   - Want the repo created automatically? Toggle **Auto-create repo** on (it uses the stored GitHub login token — no separate PAT needed).
   - Keep the repo **private** — it will contain session data.
5. In the session you want to share, type **`/sync enable`** (no id needed — it enables the *current* session).
6. Type **`/sync`** to push immediately. The GitHub repo now contains `sessions/<session-id>/session.jsonl.zstd` and `manifest.json`.

## Commands

| Command | What it does |
|---|---|
| `/sync` | Push enabled sessions, then pull remote changes |
| `/sync on` / `/sync off` | Master switch |
| `/sync enable [session-id]` | Opt the current session in (no id = current session) |
| `/sync disable [session-id]` | Opt a session out |
| `/sync list` | List sessions with their id and sync status |
| `/sync now` | Same as `/sync` |

## Multi-device

On each machine:

1. `dsh plugin --profile desktop add @sanzhihema/dsh-git-sync`
2. Restart, open the card, click **Sign in with GitHub** (once per machine).
3. Set the **same remote** (`remoteUrl`) and enable.
4. In the sessions you want, `/sync enable`, then `/sync`.

The same GitHub repository is the shared store; sessions appear on every device that pulls it.

## Auto-create the repository

If the remote does not exist yet, toggle **Auto-create repo** on the card. The plugin creates a **private** repo on first `/sync` using:
- the `GITHUB_TOKEN` environment variable if set, otherwise
- the token Git Credential Manager already stored from the **Sign in with GitHub** button.

## How it works

```
DSH sessions (~/.dsh/sessions/<session-id>/session.jsonl.zstd)
        │  /sync enable  (per-session opt-in, recorded in manifest.json)
        ▼
mirror  ~/.dsh/git-sync/sessions/<session-id>/…   (a git repo)
        │  /sync or timer: git add + commit + push
        ▼
GitHub  <your remote>/sessions/<session-id>/session.jsonl.zstd  + manifest.json
        ▲  other devices: git pull --rebase, files land back in ~/.dsh/sessions
```

- Only opted-in sessions are mirrored; credentials, caches and logs never enter the repo.
- Conflicts (two devices editing the same session at once) keep the **local** copy (last-write-wins) — opt in only sessions you accept may be overwritten.

## Settings card fields

| Field | Meaning |
|---|---|
| Enabled | Master switch (off by default) |
| GitHub remote | The shared repository URL (SSH or HTTPS) |
| Branch | Tracked branch (default `main`) |
| Sync interval (minutes) | Periodic sync; `0` = manual only |
| Auto-create repo | Create the private repo on first sync if missing |

## Troubleshooting

- **`/sync` says `no remote configured`** — set `remoteUrl` on the settings card and save.
- **`/sync` says `sync is disabled`** — enable the master switch on the card (or `/sync on`).
- **GitHub repo is empty after `/sync enable`** — `/sync enable` only marks the session; run `/sync` (or wait for the interval) to push.
- **Push fails with authentication errors** — click **Sign in with GitHub** on the card, or check `git ls-remote <remote> HEAD` works in a terminal.
- **`couldn't find remote ref main`** — the remote is empty; the first `/sync` push creates the branch.
- **In China and GitHub is unreachable** — the plugin uses the machine's git; configure a proxy for github.com (`git config --global http.https://github.com.proxy http://127.0.0.1:<port>`).

## Model Experience

The plugin is model-agnostic: it adds no context to requests and no tool schemas; it only runs background git work, a slash command, and a settings card.

#### Token effect

Zero direct token effect.

#### KV Cache effect

Independent model request; nothing the plugin does invalidates request reuse.

## Known Limitations and Deferred Work

- **Whole-file, not content, merge.** Two devices editing the *same* session in the same interval conflict at the file level and keep the local copy; a message written on the remote side of that window is dropped.
- **Cross-device `cwd` mapping.** Mirror files are keyed by session id, not workspace `cwd`, so a pulled session is placed back under the local device's own `cwd` grouping.
- **Settings-card controls are simple.** Booleans are checkboxes and other fields are plain text inputs; the card does not yet support per-field reset to defaults.

## License

MIT
