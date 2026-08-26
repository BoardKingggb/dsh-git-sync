# dsh-git-sync

English | [中文](README.zh.md)

面向会话的**按需开启（opt-in）** 多设备同步：通过 git 镜像你显式开启的会话/记忆数据，并跨设备共享到一个远端仓库（例如私有 GitHub 仓库）。只有在某个会话被开启同步**且**总开关打开时才会同步。

这是**私有实验包**：遵守仓库通常的工程与安全要求，但不承诺发布与稳定性。

## 为什么 opt-in

冲突处理刻意保持简单：镜像按会话切换，rebase 冲突时**保留本地**（最后写入者胜）。要求每个会话单独开启，意味着只有用户接受“可能被覆盖”的对话才会被共享，因此 v1 不需要复杂的合并机制。

## 安装 / 启用

把插件加入 profile 与 web bundle（见 [bundle 接线](../../bundle/web-app/README.md)），然后配置：

```yaml
# cordis.patch.yml（或 profile overlay）
- id: git-sync
  name: @deepseek-ai/dsh-git-sync
  config:
    enabled: false          # 总开关，默认关闭
    remoteUrl: git@github.com:you/dsh-sync-store.git
    branch: main
    intervalMinutes: 10     # 0 表示禁用周期同步
    autoCreateRepo: false
```

## 用法

- `/sync` — 执行一次同步（先推送已开启的会话，再拉取）。
- `/sync on` / `/sync off` — 切换总开关（持久化在镜像 manifest）。
- `/sync enable <session-id>` / `/sync disable <session-id>` — 开启/关闭某个会话的同步。
- 会话头部的同步按钮（client 插件）内部调用 `ctx.gitSync.setSessionSync` 来开关会话，无需敲命令。

## 数据

镜像默认位于 `<dsh home>/git-sync`，包含 `sessions/<session-id>/<artifact>` 与 `manifest.json`（记录总开关与每个开启会话的 header）。只有开启的会话会被复制；`.dsh` 的凭据、缓存与日志从不被触碰。

## Model Experience

该插件对模型透明：不向请求添加上下文，也不引入系统提示或工具 schema，只做后台 git 工作与一个斜杠命令。

#### Token effect

无直接 token 影响。

#### KV Cache effect

独立模型请求；插件不会使请求复用失效。

## Known Limitations and Deferred Work

- **按整文件而非内容合并。** 两台设备在同一间隔内编辑*同一个*会话会在文件层面冲突并保留本地，这一窗口内在远端写入的消息会被丢弃。
- **跨设备 `cwd` 映射。** 镜像文件按会话 id（而非工作区 `cwd` slug）存储；拉取时会话被放回本机自己的 `cwd` 分组下。
- **v1 无实时冲突提示 UI。** 冲突在 `/sync` 状态行与同步日志中报告，暂无专门面板。
- **原生头部按钮是后续项。** v1 通过 `/sync enable|disable` 命令暴露会话 opt-in。
