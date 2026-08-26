/**
 * dsh-git-sync client half, browser half: one settings card in
 * Settings → Plugins → Plugin configuration that edits the `git-sync`
 * namespace the host plugin registered.
 * @module @deepseek-ai/dsh-client-ui-git-sync
 */
import { GitSyncCard } from "./GitSyncCard.js";
import { GIT_SYNC_NS, GitSyncCardController } from "./git-sync-card.js";
import { en, NS, zh } from "./locales.js";
export { GitSyncCard } from "./GitSyncCard.js";
export { GIT_SYNC_NS, GitSyncCardController } from "./git-sync-card.js";
/** Required services for locale registration, the settings scope, and the card slot. */
export const inject = ['slots', 'locale', 'settingsScope'];
/**
 * Client plugin body: register the dictionary and the settings card.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-git-sync: card dictionaries');
    const card = new GitSyncCardController(ctx.settingsScope.bind({ namespace: GIT_SYNC_NS }));
    ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        key: GIT_SYNC_NS,
        locale: NS,
        inject: () => card.inject(),
    }, GitSyncCard));
}
//# sourceMappingURL=index.js.map