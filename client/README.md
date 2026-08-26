# dsh-client-ui-git-sync

Settings card for the `dsh-git-sync` plugin. Adds one card to
**Settings → Plugins → Plugin configuration** that edits the `git-sync` settings
namespace (master switch, GitHub remote, branch, sync interval, auto-create).

## Behaviour

- Renders a card in the `settings.plugin.item` slot keyed by the `git-sync`
  namespace, shown only while the host `@deepseek-ai/dsh-git-sync` plugin serves
  that namespace.
- Staged edits are written to the settings document on save; the host plugin
  reads them live, so a saved remote/enable change applies on the next `/sync`.

## Model Experience

The plugin is model-agnostic: it adds no context to requests and no tool
schemas, only a settings card and the namespace writes behind it.

#### Token effect

Zero direct token effect.

#### KV Cache effect

Independent model request; nothing the plugin does invalidates request reuse.

## Known Limitations and Deferred Work

- **Staged per-save, no per-field reset.** The card writes every edited field
  on save; resetting one field to its default is not yet a separate gesture.
- **Booleans render as checkboxes, other fields as text** (no fancy widgets).
