/**
 * dsh-git-sync host config. The `config:` block of the plugin's loader row is
 * validated against this schemastery schema before `apply` runs; every
 * deployment-varying value is a field here (no hardcoded tunables).
 * @module @deepseek-ai/dsh-git-sync/config
 */
import z from '@deepseek-ai/schemastery';
import { dshHomePath } from '@deepseek-ai/dsh-home-paths';
export const Config = z.object({
    enabled: z.boolean().default(false),
    remoteUrl: z.string().default(''),
    branch: z.string().default('main'),
    intervalMinutes: z.number().step(1).min(0).default(10),
    syncDir: z.string().default(dshHomePath('git-sync')),
    authorName: z.string().default('dsh-git-sync'),
    authorEmail: z.string().default('dsh-git-sync@localhost'),
    autoCreateRepo: z.boolean().default(false),
    repoPrivate: z.boolean().default(true),
    apiTokenEnv: z.string().default('GITHUB_TOKEN'),
});
/** Whether periodic sync is armed with the resolved interval. */
export function periodicMs(config) {
    return config.intervalMinutes > 0 ? config.intervalMinutes * 60_000 : 0;
}
/**
 * Resolve a loader-provided config (possibly partial — a patch row restates
 * only the keys it owns) into a fully-defaulted {@link Config}. Schemastery
 * validates and documents the defaults; this applies them at runtime, matching
 * the `??` pattern the goal service uses for its own config.
 */
export function resolveConfig(config) {
    return {
        enabled: config?.enabled ?? false,
        remoteUrl: config?.remoteUrl ?? '',
        branch: config?.branch ?? 'main',
        intervalMinutes: config?.intervalMinutes ?? 10,
        syncDir: config?.syncDir ?? dshHomePath('git-sync'),
        authorName: config?.authorName ?? 'dsh-git-sync',
        authorEmail: config?.authorEmail ?? 'dsh-git-sync@localhost',
        autoCreateRepo: config?.autoCreateRepo ?? false,
        repoPrivate: config?.repoPrivate ?? true,
        apiTokenEnv: config?.apiTokenEnv ?? 'GITHUB_TOKEN',
    };
}
export default Config;
//# sourceMappingURL=config.js.map