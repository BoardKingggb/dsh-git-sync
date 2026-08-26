/**
 * dsh-git-sync user settings: a registered settings namespace that surfaces the
 * editable configuration card in Settings → Plugins → Plugin configuration.
 * When the settings service is present (desktop / web), its resolved values are
 * authoritative over the cordis `config:` block for the editable fields, so the
 * user never needs to hand-edit a yaml for day-to-day configuration.
 * @module @deepseek-ai/dsh-git-sync/settings
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Config } from './config.ts';
/** The settings namespace id (lowercase kebab-case per the namespace brand). */
export declare const GIT_SYNC_SETTINGS_NAMESPACE = "git-sync";
/** The editable slice of the config surfaced in the settings card. */
export interface SettingsValue {
    enabled: boolean;
    remoteUrl: string;
    branch: string;
    intervalMinutes: number;
    autoCreateRepo: boolean;
    repoPrivate: boolean;
    apiTokenEnv: string;
    /** Host-owned control: bumping this triggers a GitHub browser login. */
    loginRequest?: number;
    /** Host-owned control: bumping this re-checks the GitHub auth status. */
    statusRequest?: number;
    /** Host-owned status: 'unknown' | 'logged-in' | 'not-logged-in'. */
    authStatus?: string;
}
/** Schemastery schema: schema defaults feed the card's initial values. */
export declare const SettingsSchema: z<Schemastery.ObjectS<{
    enabled: z<boolean, boolean>;
    remoteUrl: z<string, string>;
    branch: z<string, string>;
    intervalMinutes: z<number, number>;
    autoCreateRepo: z<boolean, boolean>;
    repoPrivate: z<boolean, boolean>;
    apiTokenEnv: z<string, string>;
    loginRequest: z<number, number>;
    statusRequest: z<number, number>;
    authStatus: z<string, string>;
}>, Schemastery.ObjectT<{
    enabled: z<boolean, boolean>;
    remoteUrl: z<string, string>;
    branch: z<string, string>;
    intervalMinutes: z<number, number>;
    autoCreateRepo: z<boolean, boolean>;
    repoPrivate: z<boolean, boolean>;
    apiTokenEnv: z<string, string>;
    loginRequest: z<number, number>;
    statusRequest: z<number, number>;
    authStatus: z<string, string>;
}>>;
/** Read/write handle the service uses to merge and persist the user layer. */
export interface SettingsAccess {
    /** The resolved namespace value (schema defaults included). */
    read: () => Partial<Config>;
    /** Merge a patch (config field or host-owned control/status) into the user layer. */
    update: (patch: Partial<Config> & Partial<SettingsValue>) => Promise<void>;
    /** Observe committed changes to the namespace's resolved value. */
    watch: (callback: (next: SettingsValue, prev: SettingsValue) => void | Promise<void>) => () => void;
}
/**
 * Register the namespace and hand its scope to the caller. The card appears in
 * the settings UI automatically once a settings provider is composed; without
 * one the plugin stays config-file-driven.
 * @param ctx - host context.
 * @param onAccess - receives the scope-based read/write handle after registration.
 */
export declare function installGitSyncSettings(ctx: Context, onAccess: (access: SettingsAccess) => void): void;
//# sourceMappingURL=settings.d.ts.map