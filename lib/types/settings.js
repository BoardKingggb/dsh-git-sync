/**
 * dsh-git-sync user settings: a registered settings namespace that surfaces the
 * editable configuration card in Settings → Plugins → Plugin configuration.
 * When the settings service is present (desktop / web), its resolved values are
 * authoritative over the cordis `config:` block for the editable fields, so the
 * user never needs to hand-edit a yaml for day-to-day configuration.
 * @module @deepseek-ai/dsh-git-sync/settings
 */
import z from '@deepseek-ai/schemastery';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
/** The settings namespace id (lowercase kebab-case per the namespace brand). */
export const GIT_SYNC_SETTINGS_NAMESPACE = 'git-sync';
/** Schemastery schema: schema defaults feed the card's initial values. */
export const SettingsSchema = z.object({
    enabled: z.boolean().default(false),
    remoteUrl: z.string().default(''),
    branch: z.string().default('main'),
    intervalMinutes: z.number().step(1).min(0).default(10),
    autoCreateRepo: z.boolean().default(false),
    repoPrivate: z.boolean().default(true),
    apiTokenEnv: z.string().default('GITHUB_TOKEN'),
    loginRequest: z.number(),
    statusRequest: z.number(),
    authStatus: z.string(),
});
/**
 * Register the namespace and hand its scope to the caller. The card appears in
 * the settings UI automatically once a settings provider is composed; without
 * one the plugin stays config-file-driven.
 * @param ctx - host context.
 * @param onAccess - receives the scope-based read/write handle after registration.
 */
export function installGitSyncSettings(ctx, onAccess) {
    ctx.inject(['settings'], (sctx) => {
        const scope = sctx.settings.register(settingsNamespace(GIT_SYNC_SETTINGS_NAMESPACE), SettingsSchema);
        onAccess({
            read: () => scope.get(),
            update: async (patch) => { await scope.update(patch); },
            watch: callback => scope.watch(callback),
        });
    });
}
//# sourceMappingURL=settings.js.map