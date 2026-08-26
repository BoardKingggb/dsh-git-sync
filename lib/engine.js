import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
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
/** Convenience export the plugin/service uses for the default manifest shape. */
function createManifest() {
	return {
		version: 1,
		note: "Managed by dsh-git-sync. Do not hand-edit while a device is running.",
		sessions: {}
	};
}
/** Generate a unique marker for a pending write (not currently used by the engine). */
function pendingMarker() {
	return randomUUID();
}
//#endregion
export { GitSyncEngine, createManifest, pendingMarker };
