/**
 * The git-sync settings card controller: stages edits over the `git-sync`
 * namespace scope and writes them on save. Self-contained (no dependency on the
 * ui-settings-plugins card internals): booleans render as checkboxes, text and
 * numbers as inputs.
 * @module @deepseek-ai/dsh-client-ui-git-sync/git-sync-card
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** The settings namespace the host dsh-git-sync plugin registered. */
export const GIT_SYNC_NS = 'git-sync';
/** Bridges the `git-sync` scope onto the card's staged form. */
export class GitSyncCardController {
    scope;
    store;
    drafts = new Map();
    saving = false;
    failed = false;
    /** @param scope - the bound settings scope for the `git-sync` namespace. */
    constructor(scope) {
        this.scope = scope;
        this.store = createSnapshotStore(this.projection());
        this.scope.subscribe(() => { this.publish(); });
    }
    /** Build the face the card's slot registration injects. */
    inject() {
        return {
            hooks: { gitSyncCard: this.store },
            edit: (field, value) => {
                this.drafts.set(field, value);
                this.failed = false;
                this.publish();
            },
            save: () => { void this.save(); },
            discard: () => {
                this.drafts.clear();
                this.failed = false;
                this.publish();
            },
            login: () => { void this.scope.set('loginRequest', Date.now()); },
            refreshStatus: () => { void this.scope.set('statusRequest', Date.now()); },
        };
    }
    sectionValue(field) {
        const value = this.scope.getSnapshot().value;
        return value?.[field];
    }
    userHas(field) {
        const user = this.scope.getSnapshot().user;
        return user !== undefined && Object.hasOwn(user, field);
    }
    fieldState(field) {
        const draft = this.drafts.get(field);
        if (draft !== undefined)
            return { value: draft, overridden: true };
        const stored = this.sectionValue(field);
        const value = typeof stored === 'boolean' || typeof stored === 'number'
            ? stored
            : (typeof stored === 'string' ? stored : '');
        return { value, overridden: this.userHas(field) };
    }
    projection() {
        const snap = this.scope.getSnapshot();
        const storedStatus = this.sectionValue('authStatus');
        return {
            available: snap.status === 'ready',
            writable: snap.writable,
            dirty: this.drafts.size > 0,
            saving: this.saving,
            failed: this.failed,
            authStatus: typeof storedStatus === 'string' ? storedStatus : 'unknown',
            enabled: this.fieldState('enabled'),
            remoteUrl: this.fieldState('remoteUrl'),
            branch: this.fieldState('branch'),
            intervalMinutes: this.fieldState('intervalMinutes'),
            autoCreateRepo: this.fieldState('autoCreateRepo'),
        };
    }
    publish() {
        this.store.set(this.projection());
    }
    async save() {
        if (this.drafts.size === 0 || this.saving)
            return;
        this.saving = true;
        this.failed = false;
        this.publish();
        try {
            for (const [field, value] of this.drafts) {
                await this.scope.set(field, value);
            }
            this.drafts.clear();
        }
        catch {
            this.failed = true;
        }
        finally {
            this.saving = false;
            this.publish();
        }
    }
}
//# sourceMappingURL=git-sync-card.js.map