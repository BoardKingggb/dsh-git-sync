# dsh-client-ui-git-sync

`dsh-git-sync` 插件的设置卡片。在 **设置 → 插件 → 插件配置** 里加入一张卡片，用于编辑 `git-sync` 设置命名空间（总开关、GitHub 仓库、分支、同步间隔、自动建仓）。

## 行为

- 在 `settings.plugin.item` 槽位按 `git-sync` 命名空间渲染一张卡片；仅当 host 的 `@deepseek-ai/dsh-git-sync` 插件提供该命名空间时显示。
- 暂存编辑在保存时写入设置文档；host 插件实时读取，保存的仓库/开关改动在下次 `/sync` 生效。

## Model Experience

该插件对模型透明：不向请求添加上下文，也不引入工具 schema，只有一张设置卡片及其背后的命名空间写入。

#### Token effect

无直接 token 影响。

#### KV Cache effect

独立模型请求；插件不会使请求复用失效。

## Known Limitations and Deferred Work

- **按保存批量写入，无单字段重置。** 保存时写入所有已编辑字段；把某个字段恢复默认还不是独立操作。
- **布尔字段用复选框、其它字段用文本输入**（暂无更丰富的控件）。
