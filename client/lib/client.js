window.__ModuleLoader__.load({
	id: "@sanzhihema/dsh-client-ui-git-sync",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region src/client/GitSyncCard.tsx
		/**
		* The git-sync plugin's settings card: toggle the master switch, set the GitHub
		* remote, branch, interval, and auto-create flag, and save them into the
		* `git-sync` settings namespace.
		* @module @sanzhihema/dsh-client-ui-git-sync/GitSyncCard
		*/
		const cardStyle = {
			border: "1px solid rgba(128,128,128,0.25)",
			borderRadius: 8,
			margin: "8px 0",
			background: "rgba(128,128,128,0.06)"
		};
		const headerStyle = {
			display: "flex",
			flexDirection: "column",
			alignItems: "flex-start",
			gap: 4,
			width: "100%",
			padding: "10px 12px",
			border: "none",
			background: "transparent",
			color: "inherit",
			font: "inherit",
			textAlign: "left",
			cursor: "pointer"
		};
		const titleStyle = { fontWeight: 600 };
		const descStyle = {
			fontSize: 12,
			opacity: .7
		};
		const pendingStyle = {
			fontSize: 12,
			color: "#e5a93d"
		};
		const bodyStyle = {
			padding: "4px 12px 12px",
			display: "flex",
			flexDirection: "column",
			gap: 8
		};
		const rowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8
		};
		const labelStyle = {
			flex: "0 0 180px",
			fontSize: 13
		};
		const inputStyle = {
			flex: 1,
			padding: "4px 8px",
			borderRadius: 6,
			border: "1px solid rgba(128,128,128,0.35)",
			background: "rgba(0,0,0,0.15)",
			color: "inherit",
			font: "inherit"
		};
		const hintStyle = {
			fontSize: 11,
			opacity: .6,
			marginLeft: 188
		};
		const footerStyle = {
			display: "flex",
			justifyContent: "flex-end",
			gap: 8,
			marginTop: 4
		};
		const buttonStyle = {
			padding: "5px 14px",
			borderRadius: 6,
			border: "1px solid rgba(128,128,128,0.35)",
			background: "transparent",
			color: "inherit",
			cursor: "pointer"
		};
		const saveButtonStyle = {
			...buttonStyle,
			background: "rgba(79,140,255,0.85)",
			color: "#fff",
			border: "none"
		};
		const smallButtonStyle = {
			...buttonStyle,
			padding: "3px 10px",
			fontSize: 12
		};
		const loginButtonStyle = {
			...saveButtonStyle,
			padding: "3px 10px",
			fontSize: 12
		};
		const statusStyle = {
			fontSize: 13,
			fontWeight: 600
		};
		const noteStyle = {
			fontSize: 12,
			color: "#e05e5e"
		};
		function TextField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rowStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					style: labelStyle,
					htmlFor: props.id,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: props.id,
					type: "text",
					style: inputStyle,
					value: String(props.value.value),
					onChange: (event) => {
						props.onEdit(event.currentTarget.value);
					}
				})]
			}), props.hint !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: hintStyle,
				children: props.hint
			}) : null] });
		}
		function NumberField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rowStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					style: labelStyle,
					htmlFor: props.id,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: props.id,
					type: "text",
					inputMode: "numeric",
					style: inputStyle,
					value: String(props.value.value),
					onChange: (event) => {
						const text = event.currentTarget.value;
						const parsed = Number(text);
						props.onEdit(Number.isFinite(parsed) && text.trim() !== "" ? parsed : text);
					}
				})]
			});
		}
		function BoolField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rowStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					style: labelStyle,
					htmlFor: props.id,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: props.id,
					type: "checkbox",
					checked: props.value.value === true,
					onChange: (event) => {
						props.onEdit(event.currentTarget.checked);
					}
				})]
			});
		}
		/**
		* Render the git-sync settings card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card, or nothing when the namespace is not served.
		*/
		function GitSyncCard(props) {
			const { t } = props;
			const state = props.useGitSyncCard((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			if (!state.available) return null;
			const disabled = !state.writable;
			let statusText;
			let statusColor = "#9aa2b1";
			switch (state.authStatus) {
				case "logged-in":
					statusText = t("auth.status.logged-in");
					statusColor = "#3ecf8e";
					break;
				case "not-logged-in":
					statusText = t("auth.status.not-logged-in");
					statusColor = "#e05e5e";
					break;
				case "unknown":
					statusText = t("auth.status.unknown");
					break;
				default:
					statusText = state.authStatus.startsWith("opening") ? t("auth.status.opening") : state.authStatus;
					break;
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				style: cardStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					style: headerStyle,
					"aria-expanded": open,
					"aria-label": `${t(open ? "state.collapse" : "state.expand")}: ${t("card.title")}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: titleStyle,
							children: t("card.title")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: descStyle,
							children: t("card.description")
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: pendingStyle,
							children: t("state.unsaved")
						}) : null
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: bodyStyle,
					children: [
						!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: noteStyle,
							children: t("state.readOnly")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: rowStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: labelStyle,
									children: t("auth.status")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...statusStyle,
										color: statusColor
									},
									children: statusText
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: smallButtonStyle,
									onClick: props.refreshStatus,
									children: t("action.refreshStatus")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: loginButtonStyle,
									onClick: props.login,
									children: t("action.login")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: hintStyle,
							children: t("auth.hint")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BoolField, {
							id: "git-sync-enabled",
							label: t("field.enabled"),
							value: state.enabled,
							onEdit: (value) => {
								props.edit("enabled", value);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextField, {
							id: "git-sync-remote",
							label: t("field.remoteUrl"),
							hint: t("field.remoteUrlHint"),
							value: state.remoteUrl,
							onEdit: (value) => {
								props.edit("remoteUrl", value);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextField, {
							id: "git-sync-branch",
							label: t("field.branch"),
							value: state.branch,
							onEdit: (value) => {
								props.edit("branch", value);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
							id: "git-sync-interval",
							label: t("field.intervalMinutes"),
							value: state.intervalMinutes,
							onEdit: (value) => {
								props.edit("intervalMinutes", value);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BoolField, {
							id: "git-sync-autocreate",
							label: t("field.autoCreateRepo"),
							value: state.autoCreateRepo,
							onEdit: (value) => {
								props.edit("autoCreateRepo", value);
							}
						}),
						state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: noteStyle,
							children: t("state.saveFailed")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: footerStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: buttonStyle,
								disabled: disabled || !state.dirty || state.saving,
								onClick: props.discard,
								children: t("action.discard")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: saveButtonStyle,
								disabled: disabled || !state.dirty || state.saving,
								onClick: props.save,
								children: t(state.saving ? "action.saving" : "action.save")
							})]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/git-sync-card.ts
		/** The settings namespace the host dsh-git-sync plugin registered. */
		const GIT_SYNC_NS = "git-sync";
		/** Bridges the `git-sync` scope onto the card's staged form. */
		var GitSyncCardController = class {
			scope;
			store;
			drafts = /* @__PURE__ */ new Map();
			saving = false;
			failed = false;
			/** @param scope - the bound settings scope for the `git-sync` namespace. */
			constructor(scope) {
				this.scope = scope;
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(this.projection());
				this.scope.subscribe(() => {
					this.publish();
				});
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
					save: () => {
						this.save();
					},
					discard: () => {
						this.drafts.clear();
						this.failed = false;
						this.publish();
					},
					login: () => {
						this.scope.set("loginRequest", Date.now());
					},
					refreshStatus: () => {
						this.scope.set("statusRequest", Date.now());
					}
				};
			}
			sectionValue(field) {
				return this.scope.getSnapshot().value?.[field];
			}
			userHas(field) {
				const user = this.scope.getSnapshot().user;
				return user !== void 0 && Object.hasOwn(user, field);
			}
			fieldState(field) {
				const draft = this.drafts.get(field);
				if (draft !== void 0) return {
					value: draft,
					overridden: true
				};
				const stored = this.sectionValue(field);
				return {
					value: typeof stored === "boolean" || typeof stored === "number" ? stored : typeof stored === "string" ? stored : "",
					overridden: this.userHas(field)
				};
			}
			projection() {
				const snap = this.scope.getSnapshot();
				const storedStatus = this.sectionValue("authStatus");
				return {
					available: snap.status === "ready",
					writable: snap.writable,
					dirty: this.drafts.size > 0,
					saving: this.saving,
					failed: this.failed,
					authStatus: typeof storedStatus === "string" ? storedStatus : "unknown",
					enabled: this.fieldState("enabled"),
					remoteUrl: this.fieldState("remoteUrl"),
					branch: this.fieldState("branch"),
					intervalMinutes: this.fieldState("intervalMinutes"),
					autoCreateRepo: this.fieldState("autoCreateRepo")
				};
			}
			publish() {
				this.store.set(this.projection());
			}
			async save() {
				if (this.drafts.size === 0 || this.saving) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				try {
					for (const [field, value] of this.drafts) await this.scope.set(field, value);
					this.drafts.clear();
				} catch {
					this.failed = true;
				} finally {
					this.saving = false;
					this.publish();
				}
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/** `gitSync` namespace dictionaries (the settings card copy). */
		/** Dictionary namespace owned by this plugin. */
		const NS = "gitSync";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"card.title": "Git 鍚屾 (dsh-git-sync)",
			"card.description": "澶氳澶囧叡浜細璇?璁板繂鐨勫紑鍏充笌浠撳簱閰嶇疆銆?,
			"field.enabled": "鎬诲紑鍏?,
			"field.remoteUrl": "GitHub 浠撳簱",
			"field.remoteUrlHint": "濡?git@github.com:<璐﹀彿>/<浠撳簱>.git 鎴?https 鍦板潃",
			"field.branch": "鍒嗘敮",
			"field.intervalMinutes": "鍚屾闂撮殧(鍒嗛挓锛?=浠呮墜鍔?",
			"field.autoCreateRepo": "棣栨鑷姩寤轰粨",
			"action.save": "淇濆瓨",
			"action.saving": "淇濆瓨涓€?,
			"action.discard": "鏀惧純",
			"action.login": "鐧诲綍 GitHub",
			"action.refreshStatus": "妫€鏌ョ姸鎬?,
			"auth.status": "GitHub 鐧诲綍鐘舵€?,
			"auth.status.logged-in": "宸茬櫥褰?,
			"auth.status.not-logged-in": "鏈櫥褰?,
			"auth.status.unknown": "鐘舵€佹湭鐭?,
			"auth.status.opening": "姝ｅ湪鎵撳紑娴忚鍣ㄧ櫥褰曗€?,
			"auth.hint": "鐧诲綍浼氭墦寮€娴忚鍣ㄥ苟鎺堟潈 Git Credential Manager锛屽畬鎴愬悗鑷姩淇濆瓨鍑嵁銆?,
			"state.readOnly": "褰撳墠鏂囨。涓嶅彲鍐欍€?,
			"state.saveFailed": "淇濆瓨澶辫触锛岃閲嶈瘯銆?,
			"state.unsaved": "鏈夋湭淇濆瓨鐨勪慨鏀?,
			"state.collapse": "鎶樺彔",
			"state.expand": "灞曞紑"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"card.title": "Git Sync (dsh-git-sync)",
			"card.description": "Per-session multi-device sync of sessions/memory via git.",
			"field.enabled": "Enabled",
			"field.remoteUrl": "GitHub remote",
			"field.remoteUrlHint": "e.g. git@github.com:<owner>/<repo>.git or https URL",
			"field.branch": "Branch",
			"field.intervalMinutes": "Sync interval (minutes, 0 = manual only)",
			"field.autoCreateRepo": "Auto-create repo on first sync",
			"action.save": "Save",
			"action.saving": "Saving鈥?,
			"action.discard": "Discard",
			"action.login": "Sign in with GitHub",
			"action.refreshStatus": "Check status",
			"auth.status": "GitHub auth",
			"auth.status.logged-in": "Signed in",
			"auth.status.not-logged-in": "Not signed in",
			"auth.status.unknown": "Unknown",
			"auth.status.opening": "Opening browser login鈥?,
			"auth.hint": "Opens the browser to authorize Git Credential Manager; the credential is stored automatically.",
			"state.readOnly": "The settings document is not writable.",
			"state.saveFailed": "Save failed; please retry.",
			"state.unsaved": "Unsaved changes",
			"state.collapse": "Collapse",
			"state.expand": "Expand"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services for locale registration, the settings scope, and the card slot. */
		const inject = [
			"slots",
			"locale",
			"settingsScope"
		];
		/**
		* Client plugin body: register the dictionary and the settings card.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-git-sync: card dictionaries");
			const card = new GitSyncCardController(ctx.settingsScope.bind({ namespace: GIT_SYNC_NS }));
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: GIT_SYNC_NS,
				locale: NS,
				inject: () => card.inject()
			}, GitSyncCard));
		}
		//#endregion
		exports.GIT_SYNC_NS = GIT_SYNC_NS;
		exports.GitSyncCard = GitSyncCard;
		exports.GitSyncCardController = GitSyncCardController;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
