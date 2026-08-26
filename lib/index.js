import { execFile, spawn } from "node:child_process";
import { Service } from "@deepseek-ai/cordis";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import z from "@deepseek-ai/schemastery";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region lib/types/engine.js
/**
* Dependency-light git sync engine for dsh-git-sync.
*
* The engine only knows how to keep a mirror directory under a git remote: it
* initializes a repo, copies enabled session artifacts in, commits, pushes, and
* pulls (rebasing). It has zero DSH dependencies so it can be unit-tested in
* isolation and reused by a standalone runner as well as the Cordis host.
*
* Conflict policy (v1): on a rebase conflict the engine keeps the LOCAL state
* of a file and reports the conflict; the caller decides what to surface.
* @module @deepseek-ai/dsh-git-sync/engine
*/
const execFileAsync = promisify(execFile);
const DEFAULT_BRANCH = "main";
const DEFAULT_AUTHOR_NAME = "dsh-git-sync";
const DEFAULT_AUTHOR_EMAIL = "dsh-git-sync@localhost";
const MIRROR_SUBDIR = "sessions";
const MANIFEST_FILE = "manifest.json";
const README_FILE = "README.md";
const GITIGNORE_FILE = ".gitignore";
const GITATTRIBUTES_FILE = ".gitattributes";
/**
* A small, dependency-free git wrapper over a mirror directory.
*
* Mirror layout:
* ```
* <syncDir>/
*   .git/
*   sessions/<id>/<basename of the source artifact>
*   manifest.json
*   README.md
* ```
* Sessions are keyed by id (never by cwd), so a session authored on one device
* maps to the same mirror path on every device even when their cwd slugs differ.
*/
var GitSyncEngine = class {
	syncDir;
	/** The git remote URL. Mutable: `ensureRepo()` re-pins the remote every call, so a settings change takes effect on the next sync. */
	remoteUrl;
	/** The branch to track. Mutable for the same reason as {@link remoteUrl}. */
	branch;
	authorName;
	authorEmail;
	constructor(options) {
		this.syncDir = resolve(options.syncDir);
		this.remoteUrl = options.remoteUrl;
		this.branch = options.branch ?? DEFAULT_BRANCH;
		this.authorName = options.authorName ?? DEFAULT_AUTHOR_NAME;
		this.authorEmail = options.authorEmail ?? DEFAULT_AUTHOR_EMAIL;
	}
	/** Ensure the mirror is a git repo with a remote and a tracked baseline. */
	async ensureRepo() {
		let initialized = false;
		try {
			await this.git(["rev-parse", "--is-inside-work-tree"]);
		} catch {
			await mkdir(this.syncDir, { recursive: true });
			await this.git([
				"init",
				"-b",
				this.branch
			]);
			await this.git([
				"config",
				"user.name",
				this.authorName
			]);
			await this.git([
				"config",
				"user.email",
				this.authorEmail
			]);
			await this.git([
				"config",
				"core.autocrlf",
				"false"
			]);
			await this.installScaffold();
			await this.commitAll(`chore: initialize dsh-git-sync mirror`);
			initialized = true;
		}
		try {
			await this.git([
				"remote",
				"get-url",
				"origin"
			]);
			await this.git([
				"remote",
				"set-url",
				"origin",
				this.remoteUrl
			]);
		} catch {
			await this.git([
				"remote",
				"add",
				"origin",
				this.remoteUrl
			]);
		}
		if (!initialized) await this.git([
			"branch",
			"--set-upstream-to",
			`origin/${this.branch}`,
			this.branch
		]).catch(() => {});
		await this.writeManifestBaseline();
	}
	/** Copy the given session artifacts into the mirror and (if dirty) commit + push. */
	async pushSessions(snapshots) {
		await this.ensureRepo();
		for (const snapshot of snapshots) {
			const target = this.mirrorPath(snapshot.id, snapshot.contentPath);
			await mkdir(dirname(target), { recursive: true });
			await copyFile(snapshot.contentPath, target);
		}
		await this.pruneMissingMirrors(snapshots);
		if (!await this.hasChanges()) return {
			committed: false,
			commitHash: void 0,
			pushed: false,
			message: "no changes"
		};
		const commitHash = await this.commitAll(this.commitMessage(snapshots.length));
		await this.push();
		return {
			committed: true,
			commitHash,
			pushed: true,
			message: "pushed"
		};
	}
	/** Pull the remote, rebasing local commits; on conflict keep local files. */
	async pull() {
		await this.ensureRepo();
		const before = await this.head();
		try {
			await this.git([
				"pull",
				"--rebase",
				"origin",
				this.branch
			], { timeoutMs: 12e4 });
		} catch (error) {
			await this.git(["rebase", "--abort"]).catch(() => {});
			const message = error instanceof Error ? error.message : String(error);
			if (/couldn't find remote ref|no such remote ref|not a valid ref|failed to find/i.test(message)) return {
				updated: [],
				conflict: void 0,
				message: "nothing to pull (remote has no branch yet)"
			};
			return {
				updated: [],
				conflict: { sessionIds: await this.changedSessionIds(before, await this.head()) },
				message: `conflict: kept local state (${message})`
			};
		}
		const after = await this.head();
		const updated = await this.changedSessionIds(before, after);
		return {
			updated,
			conflict: void 0,
			message: `pulled (${updated.length} session(s) updated)`
		};
	}
	/** Commit the manifest file alone, so opt-in changes survive any re-init. */
	async commitManifest() {
		if (!await this.hasChanges()) return;
		await this.git([
			"add",
			"--",
			MANIFEST_FILE
		]);
		if (!await this.hasChanges()) return;
		await this.git([
			"commit",
			"-m",
			`sync: update manifest @ ${(/* @__PURE__ */ new Date()).toISOString()}`
		]);
	}
	/** Read the session id → header map maintained in the mirror. */
	async readManifest() {
		try {
			const text = await readFile(join(this.syncDir, MANIFEST_FILE), "utf8");
			return JSON.parse(text);
		} catch {
			return {};
		}
	}
	async writeManifest(manifest) {
		await mkdir(this.syncDir, { recursive: true });
		await writeFile(join(this.syncDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
	}
	/** The absolute mirror path for a session artifact, preserving the artifact name. */
	mirrorPath(id, contentPath) {
		return join(this.syncDir, MIRROR_SUBDIR, id, basename(contentPath));
	}
	async installScaffold() {
		await mkdir(join(this.syncDir, MIRROR_SUBDIR), { recursive: true });
		await writeFile(join(this.syncDir, GITIGNORE_FILE), GITIGNORE_CONTENT, "utf8");
		await writeFile(join(this.syncDir, GITATTRIBUTES_FILE), GITATTRIBUTES_CONTENT, "utf8");
		await writeFile(join(this.syncDir, README_FILE), README_CONTENT, "utf8");
		if (await this.fileExists(join(this.syncDir, MANIFEST_FILE))) return;
		await writeFile(join(this.syncDir, MANIFEST_FILE), `${JSON.stringify({
			version: 1,
			note: "Managed by dsh-git-sync. Do not hand-edit while a device is running.",
			sessions: {}
		}, null, 2)}\n`, "utf8");
	}
	async writeManifestBaseline() {
		if (await this.fileExists(join(this.syncDir, MANIFEST_FILE))) return;
		await this.installScaffold();
	}
	/** Remove mirror entries whose id is no longer in the enabled set. */
	async pruneMissingMirrors(snapshots) {
		const ids = new Set(snapshots.map((snapshot) => snapshot.id));
		const root = join(this.syncDir, MIRROR_SUBDIR);
		const entries = await readdirSafe(root);
		for (const entry of entries) if (!ids.has(entry)) await rm(join(root, entry), {
			recursive: true,
			force: true
		});
	}
	async commitAll(message) {
		await this.git(["add", "-A"]);
		await this.git([
			"commit",
			"-m",
			message
		]);
		return await this.head();
	}
	async push() {
		await this.git([
			"push",
			"origin",
			this.branch
		], { timeoutMs: 12e4 });
	}
	async hasChanges() {
		const { stdout } = await this.git(["status", "--porcelain"]);
		return stdout.trim().length > 0;
	}
	async head() {
		try {
			const { stdout } = await this.git(["rev-parse", "HEAD"]);
			return stdout.trim();
		} catch {
			return "";
		}
	}
	async changedSessionIds(from, to) {
		if (from === "" || to === "" || from === to) return [];
		const { stdout } = await this.git([
			"diff",
			"--name-only",
			"--diff-filter=ACMR",
			from,
			to,
			"--",
			MIRROR_SUBDIR
		]);
		const ids = [];
		const seen = /* @__PURE__ */ new Set();
		for (const line of stdout.split("\n")) {
			const id = line.trim().match(new RegExp(`^${MIRROR_SUBDIR}/([^/]+)/`))?.[1];
			if (id !== void 0 && !seen.has(id)) {
				seen.add(id);
				ids.push(id);
			}
		}
		return ids;
	}
	commitMessage(count) {
		const stamp = (/* @__PURE__ */ new Date()).toISOString();
		return `sync(${this.branch}): mirror ${count} enabled session(s) @ ${stamp}`;
	}
	async fileExists(path) {
		try {
			await readFile(path);
			return true;
		} catch {
			return false;
		}
	}
	async git(args, options = {}) {
		try {
			const { stdout, stderr } = await execFileAsync("git", [
				"-C",
				this.syncDir,
				...args
			], {
				timeout: options.timeoutMs ?? 6e4,
				maxBuffer: 16 * 1024 * 1024
			});
			return {
				stdout,
				stderr
			};
		} catch (error) {
			const e = error;
			const detail = e.stderr ?? e.stdout ?? "";
			throw new Error(`git ${args[0] ?? ""} failed in ${this.syncDir}: ${detail.trim() || e.message}`);
		}
	}
};
async function readdirSafe(path) {
	try {
		const { readdir } = await import("node:fs/promises");
		return await readdir(path);
	} catch {
		return [];
	}
}
const GITIGNORE_CONTENT = [
	"# dsh-git-sync mirror: only session artifacts belong here.",
	".DS_Store",
	"*.tmp",
	""
].join("\n");
const GITATTRIBUTES_CONTENT = [
	"# Keep session artifacts byte-exact: never normalize line endings.",
	"* -text",
	""
].join("\n");
const README_CONTENT = [
	"# dsh-git-sync mirror",
	"",
	"Managed by the dsh-git-sync plugin. Every enabled session is mirrored here",
	"as `sessions/<session-id>/<artifact>` and shared across devices through git.",
	"",
	"Do not hand-edit while a device is running.",
	""
].join("\n");
//#endregion
//#region lib/types/github.js
/**
* GitHub remote creation for dsh-git-sync auto-create.
*
* Kept dependency-free so the reachability/creation logic is testable in
* isolation: `parseGitHubRepo` derives `owner`/`name` from the common SSH and
* HTTPS spellings, and `ensureRepoExists` checks then creates the repo through
* the GitHub REST API using the configured token.
* @module @deepseek-ai/dsh-git-sync/github
*/
const API_ROOT = "https://api.github.com";
/** Derive `{ owner, name }` from a GitHub SSH/HTTPS remote URL. */
function parseGitHubRepo(remoteUrl) {
	const match = remoteUrl.trim().match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
	if (match === null) return void 0;
	const owner = match[1];
	const name = match[2];
	if (owner === void 0 || name === void 0 || owner === "" || name === "") return void 0;
	return {
		owner,
		name
	};
}
function headers(token) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "dsh-git-sync",
		"Content-Type": "application/json"
	};
}
/** Whether the GitHub repo exists under the authenticated token. */
async function repoExists(token, owner, name) {
	const res = await fetch(`${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, { headers: headers(token) });
	if (res.status === 200) return true;
	if (res.status === 404) return false;
	throw new Error(`GitHub repo check failed (${res.status}): ${await res.text()}`);
}
/** Create a private (or public) GitHub repo under the authenticated account. */
async function createGitHubRepo(token, name, repoPrivate) {
	const res = await fetch(`${API_ROOT}/user/repos`, {
		method: "POST",
		headers: headers(token),
		body: JSON.stringify({
			name,
			private: repoPrivate
		})
	});
	if (res.status !== 201) throw new Error(`GitHub repo create failed (${res.status}): ${await res.text()}`);
}
/**
* Read the token named by `config.apiTokenEnv` from the environment, falling
* back to the token Git Credential Manager already stored for github.com (the
* "Sign in with GitHub" card action) — so auto-create works with just the
* browser login, no separate PAT required.
*/
async function tokenFor(config, env = process.env) {
	const fromEnv = env[config.apiTokenEnv]?.trim();
	if (fromEnv !== void 0 && fromEnv !== "") return fromEnv;
	return await storedGitHubToken();
}
/** Read the stored github.com credential (GCM) and return its token. */
function storedGitHubToken() {
	return new Promise((resolve) => {
		const child = spawn("git", ["credential", "fill"], {
			env: {
				...process.env,
				GIT_TERMINAL_PROMPT: "0",
				GCM_INTERACTIVE: "Never"
			},
			windowsHide: true
		});
		let stdout = "";
		let settled = false;
		const finish = (token) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(token);
		};
		const timer = setTimeout(() => {
			child.kill();
			finish(void 0);
		}, 1e4);
		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString("utf8");
		});
		child.on("error", () => {
			finish(void 0);
		});
		child.on("close", () => {
			finish(stdout.match(/^password=(.+)$/m)?.[1]);
		});
		child.stdin.on("error", () => {
			finish(void 0);
		});
		child.stdin.write("protocol=https\nhost=github.com\n\n");
		child.stdin.end();
	});
}
/**
* Ensure the configured GitHub remote exists, creating it when
* `config.autoCreateRepo` is set and a token is available. Returns `skipped`
* when the URL is not GitHub-shaped or no token is present — the subsequent
* git push then reports the actual failure.
*/
async function ensureRepoExists(config, env = process.env) {
	const parsed = parseGitHubRepo(config.remoteUrl);
	if (parsed === void 0) return "skipped";
	const token = await tokenFor(config, env);
	if (token === void 0) return "skipped";
	if (await repoExists(token, parsed.owner, parsed.name)) return "exists";
	await createGitHubRepo(token, parsed.name, config.repoPrivate);
	return "created";
}
//#endregion
//#region lib/types/service.js
/**
* The dsh-git-sync service: owns the mirror engine and the per-session opt-in
* manifest, and coordinates with `ctx.sessionPersistence` to mirror enabled
* session artifacts and write pulled changes back to the local store.
* @module @deepseek-ai/dsh-git-sync/service
*/
/**
* The `ctx.gitSync` service. Created once per plugin instance; reads and writes
* the mirror manifest through the {@link GitSyncEngine}.
*/
var GitSync = class extends Service {
	static inject = ["sessionPersistence"];
	engine;
	config;
	settingsAccess;
	settingsWatchDispose;
	constructor(ctx, config) {
		super(ctx, "gitSync");
		this.config = config;
		this.engine = new GitSyncEngine({
			syncDir: config.syncDir,
			remoteUrl: config.remoteUrl,
			branch: config.branch,
			authorName: config.authorName,
			authorEmail: config.authorEmail
		});
	}
	/** Attach the settings read/write handle (registered by the plugin entry). */
	setSettingsAccess(access) {
		this.settingsWatchDispose?.();
		this.settingsWatchDispose = void 0;
		this.settingsAccess = access;
		if (access !== void 0) {
			this.settingsWatchDispose = access.watch((next, prev) => {
				if (next.loginRequest !== prev.loginRequest) this.runGitHubLogin();
				else if (next.statusRequest !== prev.statusRequest) this.refreshAuthStatus();
			});
			this.refreshAuthStatus();
		}
	}
	/**
	* Open the GitHub browser login (Git Credential Manager). Runs detached so the
	* host never blocks; the credential lands in the OS store and the status is
	* refreshed when GCM exits.
	*/
	runGitHubLogin() {
		this.refreshAuthStatus("opening login…");
		try {
			const child = spawn("git", [
				"credential-manager",
				"github",
				"login"
			], {
				stdio: "ignore",
				windowsHide: true,
				env: { ...process.env }
			});
			child.on("error", () => {
				this.refreshAuthStatus();
			});
			child.on("exit", () => {
				this.refreshAuthStatus();
			});
		} catch {
			this.refreshAuthStatus();
		}
	}
	/** Check whether a GitHub credential is stored, and publish the result. */
	async refreshAuthStatus(pending) {
		const access = this.settingsAccess;
		if (access === void 0) return;
		if (pending !== void 0) {
			await access.update({ authStatus: pending }).catch(() => {});
			return;
		}
		const status = await this.checkGitHubAuth();
		await access.update({ authStatus: status }).catch(() => {});
	}
	checkGitHubAuth() {
		return new Promise((resolve) => {
			const child = spawn("git", ["credential", "fill"], {
				env: {
					...process.env,
					GIT_TERMINAL_PROMPT: "0",
					GCM_INTERACTIVE: "Never"
				},
				windowsHide: true
			});
			let stdout = "";
			let settled = false;
			const finish = (status) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve(status);
			};
			const timer = setTimeout(() => {
				child.kill();
				finish("unknown");
			}, 15e3);
			child.stdout.on("data", (chunk) => {
				stdout += chunk.toString("utf8");
			});
			child.on("error", () => {
				finish("unknown");
			});
			child.on("close", () => {
				finish(stdout.includes("password=") ? "logged-in" : "not-logged-in");
			});
			child.stdin.on("error", () => {
				finish("unknown");
			});
			child.stdin.write("protocol=https\nhost=github.com\n\n");
			child.stdin.end();
		});
	}
	/**
	* The effective config: the cordis `config:` block as the base, with the user
	* settings layer (when a settings provider is composed) winning for the
	* editable fields. Reads the settings live, so a settings-card edit applies
	* without restart.
	*/
	effectiveConfig() {
		return {
			...this.config,
			...this.settingsAccess?.read() ?? {}
		};
	}
	/** The effective periodic interval in milliseconds; 0 disables the timer. */
	intervalMs() {
		const minutes = this.effectiveConfig().intervalMinutes;
		return minutes > 0 ? minutes * 6e4 : 0;
	}
	/** The master switch value (settings, then config; manifest is legacy). */
	async isEnabled() {
		return this.effectiveConfig().enabled;
	}
	/** Flip the master switch: persist into settings when available, else manifest. */
	async setEnabled(enabled) {
		if (this.settingsAccess !== void 0) {
			await this.settingsAccess.update({ enabled });
			return;
		}
		const manifest = await this.loadManifest();
		manifest.enabled = enabled;
		await this.engine.writeManifest(manifest);
	}
	/** Opt a session in (true) or out (false) of the mirror. */
	async setSessionSync(id, enabled, header) {
		const manifest = await this.loadManifest();
		manifest.sessions[id] = header === void 0 ? { enabled } : {
			enabled,
			header
		};
		await this.engine.writeManifest(manifest);
		try {
			await this.engine.commitManifest();
		} catch {}
	}
	/** Whether a specific session is opted into sync. */
	async isSessionSynced(id) {
		const manifest = await this.loadManifest();
		return Boolean(manifest.sessions[id]?.enabled);
	}
	/** The ids of every session opted into sync, regardless of local presence. */
	async listEnabled() {
		const manifest = await this.loadManifest();
		return Object.keys(manifest.sessions).filter((id) => manifest.sessions[id]?.enabled);
	}
	/** Upload locally-enabled sessions, then pull and apply remote changes. */
	async syncNow() {
		const effective = this.effectiveConfig();
		if (!effective.enabled) return {
			ok: true,
			pushed: false,
			updated: [],
			conflict: false,
			message: "sync is disabled"
		};
		if (effective.remoteUrl.trim() === "") return {
			ok: true,
			pushed: false,
			updated: [],
			conflict: false,
			message: "no remote configured"
		};
		this.engine.remoteUrl = effective.remoteUrl;
		this.engine.branch = effective.branch;
		await this.engine.ensureRepo();
		let created = false;
		if (effective.autoCreateRepo) created = await ensureRepoExists(effective) === "created";
		const enabled = new Set(await this.listEnabled());
		const snapshots = [];
		const headers = await this.ctx.sessionPersistence.list();
		const localHeader = /* @__PURE__ */ new Map();
		for (const header of headers) {
			localHeader.set(header.id, header);
			if (!enabled.has(header.id)) continue;
			const loc = this.ctx.sessionPersistence.locate(header);
			if (loc?.kind === "jsonl") snapshots.push({
				id: header.id,
				contentPath: loc.path
			});
		}
		const push = await this.engine.pushSessions(snapshots);
		const pull = await this.engine.pull();
		const updated = pull.updated;
		if (updated.length > 0) await this.applyRemote(updated, localHeader);
		return {
			ok: true,
			pushed: push.pushed,
			updated,
			conflict: pull.conflict !== void 0,
			message: [
				created ? "repo created" : "",
				push.message,
				pull.message
			].filter(Boolean).join(" · ")
		};
	}
	/** The manifest as currently stored (for diagnostics). */
	async loadManifest() {
		const raw = await this.engine.readManifest();
		if (typeof raw === "object" && raw !== null && "sessions" in raw) {
			const parsed = raw;
			return {
				version: parsed.version ?? 1,
				note: parsed.note ?? "Managed by dsh-git-sync.",
				enabled: parsed.enabled ?? this.config.enabled,
				sessions: parsed.sessions ?? {}
			};
		}
		return {
			version: 1,
			note: "Managed by dsh-git-sync.",
			enabled: this.config.enabled,
			sessions: {}
		};
	}
	async applyRemote(updated, localHeader) {
		const manifest = await this.loadManifest();
		for (const id of updated) {
			const header = localHeader.get(id) ?? manifest.sessions[id]?.header;
			if (header === void 0) continue;
			const loc = this.ctx.sessionPersistence.locate(header);
			if (loc?.kind !== "jsonl") continue;
			const mirror = this.engine.mirrorPath(id, loc.path);
			try {
				const { copyFile, mkdir } = await import("node:fs/promises");
				const { dirname } = await import("node:path");
				await mkdir(dirname(loc.path), { recursive: true });
				await copyFile(mirror, loc.path);
			} catch {}
		}
	}
};
//#endregion
//#region lib/types/config.js
/**
* dsh-git-sync host config. The `config:` block of the plugin's loader row is
* validated against this schemastery schema before `apply` runs; every
* deployment-varying value is a field here (no hardcoded tunables).
* @module @deepseek-ai/dsh-git-sync/config
*/
const Config = z.object({
	enabled: z.boolean().default(false),
	remoteUrl: z.string().default(""),
	branch: z.string().default("main"),
	intervalMinutes: z.number().step(1).min(0).default(10),
	syncDir: z.string().default(dshHomePath("git-sync")),
	authorName: z.string().default("dsh-git-sync"),
	authorEmail: z.string().default("dsh-git-sync@localhost"),
	autoCreateRepo: z.boolean().default(false),
	repoPrivate: z.boolean().default(true),
	apiTokenEnv: z.string().default("GITHUB_TOKEN")
});
/**
* Resolve a loader-provided config (possibly partial — a patch row restates
* only the keys it owns) into a fully-defaulted {@link Config}. Schemastery
* validates and documents the defaults; this applies them at runtime, matching
* the `??` pattern the goal service uses for its own config.
*/
function resolveConfig(config) {
	return {
		enabled: config?.enabled ?? false,
		remoteUrl: config?.remoteUrl ?? "",
		branch: config?.branch ?? "main",
		intervalMinutes: config?.intervalMinutes ?? 10,
		syncDir: config?.syncDir ?? dshHomePath("git-sync"),
		authorName: config?.authorName ?? "dsh-git-sync",
		authorEmail: config?.authorEmail ?? "dsh-git-sync@localhost",
		autoCreateRepo: config?.autoCreateRepo ?? false,
		repoPrivate: config?.repoPrivate ?? true,
		apiTokenEnv: config?.apiTokenEnv ?? "GITHUB_TOKEN"
	};
}
//#endregion
//#region lib/types/settings.js
/**
* dsh-git-sync user settings: a registered settings namespace that surfaces the
* editable configuration card in Settings → Plugins → Plugin configuration.
* When the settings service is present (desktop / web), its resolved values are
* authoritative over the cordis `config:` block for the editable fields, so the
* user never needs to hand-edit a yaml for day-to-day configuration.
* @module @deepseek-ai/dsh-git-sync/settings
*/
/** The settings namespace id (lowercase kebab-case per the namespace brand). */
const GIT_SYNC_SETTINGS_NAMESPACE = "git-sync";
/** Schemastery schema: schema defaults feed the card's initial values. */
const SettingsSchema = z.object({
	enabled: z.boolean().default(false),
	remoteUrl: z.string().default(""),
	branch: z.string().default("main"),
	intervalMinutes: z.number().step(1).min(0).default(10),
	autoCreateRepo: z.boolean().default(false),
	repoPrivate: z.boolean().default(true),
	apiTokenEnv: z.string().default("GITHUB_TOKEN"),
	loginRequest: z.number(),
	statusRequest: z.number(),
	authStatus: z.string()
});
/**
* Register the namespace and hand its scope to the caller. The card appears in
* the settings UI automatically once a settings provider is composed; without
* one the plugin stays config-file-driven.
* @param ctx - host context.
* @param onAccess - receives the scope-based read/write handle after registration.
*/
function installGitSyncSettings(ctx, onAccess) {
	ctx.inject(["settings"], (sctx) => {
		const scope = sctx.settings.register(settingsNamespace(GIT_SYNC_SETTINGS_NAMESPACE), SettingsSchema);
		onAccess({
			read: () => scope.get(),
			update: async (patch) => {
				await scope.update(patch);
			},
			watch: (callback) => scope.watch(callback)
		});
	});
}
//#endregion
//#region lib/types/index.js
/**
* dsh-git-sync: per-session opt-in multi-device sync of session/memory data
* over git. Nothing syncs until the user opts a session in AND turns the master
* switch on. Conflicts resolve by keeping the local copy (last-write-wins).
* @module @deepseek-ai/dsh-git-sync
*/
/** Cordis function-plugin name. */
const name = "git-sync";
/** Services required before the sync service and command can run. */
const inject = ["sessionPersistence", "commands"];
/** Build a human-readable status line from a sync cycle. */
function statusLine(status) {
	const parts = [];
	parts.push(status.pushed ? "pushed ✓" : "no local changes");
	parts.push(`${status.updated.length} pulled`);
	if (status.conflict) parts.push("conflict: kept local ⚠");
	return `${parts.join(" · ")} — ${status.message}`;
}
/** Run a sync and render the outcome for the calling channel. */
async function runSync(service) {
	try {
		return {
			kind: "success",
			text: statusLine(await service.syncNow())
		};
	} catch (error) {
		return {
			kind: "error",
			text: `sync failed: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
/**
* Install the sync service, the `/sync` command, and the periodic timer.
* @param ctx - Cordis context.
* @param config - validated plugin config (loader has already applied defaults).
*/
function apply(ctx, config) {
	const service = new GitSync(ctx, resolveConfig(config));
	installGitSyncSettings(ctx, (access) => {
		service.setSettingsAccess(access);
	});
	const dispose = ctx.commands.register({
		name: "sync",
		description: "sync enabled sessions with the shared git remote",
		input: { hint: "[on|off|enable [session]|disable [session]|list]" },
		handler: async (invocation) => {
			const [arg0, arg1] = (invocation.rawInput ?? "").trim().split(/\s+/);
			switch (arg0) {
				case "on":
					await service.setEnabled(true);
					return {
						kind: "success",
						text: "sync enabled. Opt sessions in, then /sync."
					};
				case "off":
					await service.setEnabled(false);
					return {
						kind: "success",
						text: "sync disabled."
					};
				case "enable": {
					const id = arg1 ?? invocation.agent.session.id;
					const header = (await ctx.sessionPersistence.list()).find((h) => h.id === id);
					await service.setSessionSync(id, true, header);
					return {
						kind: "success",
						text: `session ${id} opted into sync.`
					};
				}
				case "disable": {
					const id = arg1 ?? invocation.agent.session.id;
					await service.setSessionSync(id, false);
					return {
						kind: "success",
						text: `session ${id} removed from sync.`
					};
				}
				case "list": {
					const headers = await ctx.sessionPersistence.list();
					const lines = [];
					for (const header of headers) {
						const on = await service.isSessionSynced(header.id);
						lines.push(`${on ? "✓" : "·"} ${header.id}${on ? "  (syncing)" : ""}`);
					}
					return {
						kind: "success",
						text: lines.length > 0 ? lines.join("\n") : "no sessions found"
					};
				}
				case "":
				case "now": return await runSync(service);
				default: return {
					kind: "error",
					text: "usage: /sync [on|off|enable [session]|disable [session]|list]"
				};
			}
		}
	});
	let timer;
	let stopped = false;
	const scheduleNext = () => {
		const ms = service.intervalMs();
		if (ms <= 0 || stopped) return;
		timer = setTimeout(() => {
			service.syncNow().catch((error) => {
				console.error(`[dsh-git-sync] periodic sync failed: ${error instanceof Error ? error.message : String(error)}`);
			}).finally(() => scheduleNext());
		}, ms);
		timer.unref?.();
	};
	scheduleNext();
	ctx.effect(() => () => {
		stopped = true;
		if (timer !== void 0) clearTimeout(timer);
		dispose();
	}, "git-sync: command + periodic timer");
}
//#endregion
export { Config, GitSync, GitSyncEngine, apply, inject, name };
