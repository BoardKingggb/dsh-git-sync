# dsh-git-sync

English | [中文](README.zh.md)

Per-session **opt-in** multi-device sync of DeepSeek Harness session and memory
data over git. The plugin drives a git mirror of the sessions you explicitly
enable and shares it with a remote (e.g. a private GitHub repository) across
devices. Nothing syncs until a session is opted in **and** the master switch is
on.

This is a **private experimental** package: it retains the repository's usual
engineering and security requirements but carries no release or stability
promise.

## Why opt-in

Conflict resolution is deliberately simple: the mirror is switched per session,
and a rebase conflict keeps the **local** copy (last-write-wins). By requiring a
per-session opt-in, only conversations the user accepts to have overwritten are
ever shared, so no complex merge machinery is needed for v1.

## Install / enable

Add the plugin to a profile and the web bundle (see
[bundle wiring](../../bundle/web-app/README.md)), then configure it:

```yaml
# cordis.patch.yml (or a profile overlay)
- id: git-sync
  name: @deepseek-ai/dsh-git-sync
  config:
    enabled: false          # master switch, default off
    remoteUrl: git@github.com:you/dsh-sync-store.git
    branch: main
    intervalMinutes: 10     # 0 disables periodic sync
    autoCreateRepo: false
```

## Usage

- `/sync` — run a sync cycle (push enabled sessions, then pull).
- `/sync on` / `/sync off` — flip the master switch (persisted in the mirror).
- `/sync enable <session-id>` / `/sync disable <session-id>` — opt a session in
  or out (the session header button calls the same service).
- The per-session header toggle (client plugin) calls `ctx.gitSync.setSessionSync`
  to opt a session in/out without typing a command.

## Data

The mirror lives at `<dsh home>/git-sync` by default and contains:
`<session-id>/<artifact>` under `sessions/`, plus a `manifest.json` recording the
master switch and each opted-in session's header. Only opted-in sessions are
copied; `.dsh` credentials, caches, and logs are never touched.

## Model Experience

The plugin is model-agnostic: it adds no context to requests and no system
prompt or tool schemas. It only runs background git work and a slash command.

#### Token effect

Zero direct token effect.

#### KV Cache effect

Independent model request; nothing the plugin does invalidates request reuse.

## Known Limitations and Deferred Work

- **Whole-file, not content, merge.** Two devices editing the *same* session in
  the same interval conflict at the file level and keep the local copy; a
  message written on the remote side of that window is dropped.
- **Cross-device `cwd` mapping.** Session mirror files are keyed by session id,
  not by the workspace `cwd` slug, so a session authored on one device is placed
  back under the local device's own `cwd` grouping on pull.
- **No live conflict notification UI in v1.** Conflicts are reported in the
  `/sync` status line and the sync log, not in a dedicated panel.
- **Client header toggle is a follow-up.** v1 surfaces session opt-in via the
  `/sync enable|disable` command.
