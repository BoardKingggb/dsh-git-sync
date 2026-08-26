/** `gitSync` namespace dictionaries (the settings card copy). */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "gitSync";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    readonly 'card.title': "Git 同步 (dsh-git-sync)";
    readonly 'card.description': "多设备共享会话/记忆的开关与仓库配置。";
    readonly 'field.enabled': "总开关";
    readonly 'field.remoteUrl': "GitHub 仓库";
    readonly 'field.remoteUrlHint': "如 git@github.com:<账号>/<仓库>.git 或 https 地址";
    readonly 'field.branch': "分支";
    readonly 'field.intervalMinutes': "同步间隔(分钟，0=仅手动)";
    readonly 'field.autoCreateRepo': "首次自动建仓";
    readonly 'action.save': "保存";
    readonly 'action.saving': "保存中…";
    readonly 'action.discard': "放弃";
    readonly 'action.login': "登录 GitHub";
    readonly 'action.refreshStatus': "检查状态";
    readonly 'auth.status': "GitHub 登录状态";
    readonly 'auth.status.logged-in': "已登录";
    readonly 'auth.status.not-logged-in': "未登录";
    readonly 'auth.status.unknown': "状态未知";
    readonly 'auth.status.opening': "正在打开浏览器登录…";
    readonly 'auth.hint': "登录会打开浏览器并授权 Git Credential Manager，完成后自动保存凭据。";
    readonly 'state.readOnly': "当前文档不可写。";
    readonly 'state.saveFailed': "保存失败，请重试。";
    readonly 'state.unsaved': "有未保存的修改";
    readonly 'state.collapse': "折叠";
    readonly 'state.expand': "展开";
};
/** English dictionary, key-identical to the Chinese source of truth. */
export declare const en: Record<SyncKey, string>;
/** Key domain of the `gitSync` namespace (zh is the source of truth). */
export type SyncKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map