# dsh-git-sync

> 按会话手动开启的多设备共享：把你想共享的 DeepSeek Harness 会话/记忆同步到同一个 GitHub 仓库，多台设备自动双向同步。

English | [中文](README.zh.md)

![dsh](https://img.shields.io/badge/DeepSeek%20Harness-plugin-blue) ![npm](https://img.shields.io/npm/v/@sanzhihema/dsh-git-sync) ![license](https://img.shields.io/npm/l/@sanzhihema/dsh-git-sync)

## 它做什么

- **按会话手动开启（opt-in）**：只有你打开总开关**并且**开启某个会话后，才会同步。只有你主动开启的会话会被共享。
- **基于 git 传输**：开启的会话镜像到 `~/.dsh/git-sync`，定时或手动 push/pull 到你的 GitHub 仓库。
- **设置卡片**：在 **设置 → 插件 → 插件配置** 里有一张卡片，包含总开关、GitHub 仓库、分支、同步间隔、自动建仓，以及 **登录 GitHub** 按钮和登录状态。
- **斜杠命令**：`/sync`、`/sync enable|disable`、`/sync list`、`/sync on|off`。

## 安装

在任何 DSH 机器上执行（设置卡片会作为依赖自动一起安装）：

```sh
dsh plugin --profile desktop add @sanzhihema/dsh-git-sync
```

然后**重启 DSH**。

## 快速开始（第一次使用，一步步来）

1. **重启 DSH**，让插件和设置卡片加载。
2. 打开 **设置 → 插件 → 插件配置**，展开 **Git 同步 (dsh-git-sync)** 卡片。
3. 点 **「登录 GitHub」** —— 浏览器会弹出 GitHub 登录页，授权后回到 DSH，状态变为 **已登录**（绿色）。（用的是 Git Credential Manager，凭据存在系统凭据管理器里。）
4. 填 **GitHub 仓库**（例如 `https://github.com/<账号>/<仓库>.git` 或 `git@github.com:<账号>/<仓库>.git`），打开 **总开关**，点 **保存**。
   - 想让插件自动建仓库？打开 **自动建仓**（会用刚才登录存的 token，不需要单独设 PAT）。
   - 仓库务必用**私有**——里面会存会话数据。
5. 在你想共享的会话里输入 **`/sync enable`**（不用填 id，开启的就是**当前会话**）。
6. 输入 **`/sync`** 立即推送。此时 GitHub 仓库里会出现 `sessions/<会话id>/session.jsonl.zstd` 和 `manifest.json`。

## 命令

| 命令 | 作用 |
|---|---|
| `/sync` | 先推送已开启的会话，再拉取远端更新 |
| `/sync on` / `/sync off` | 总开关 |
| `/sync enable [会话id]` | 开启当前会话（不填 id = 当前会话） |
| `/sync disable [会话id]` | 关闭某个会话 |
| `/sync list` | 列出所有会话（含 id 和同步状态） |
| `/sync now` | 等同于 `/sync` |

## 多设备共享

每台机器上：

1. `dsh plugin --profile desktop add @sanzhihema/dsh-git-sync`
2. 重启，打开卡片，点一次 **「登录 GitHub」**（每台机器各登录一次）。
3. 填**同一个仓库**（remoteUrl），打开总开关。
4. 在要共享的会话里 `/sync enable`，然后 `/sync`。

同一个 GitHub 仓库就是共享存储：任何一台设备 pull 后，会话都会出现在本地会话列表里。

## 自动建仓

如果远端仓库还不存在，在卡片上打开 **自动建仓**。首次 `/sync` 会创建一个**私有**仓库，凭据来源：
- 环境变量 `GITHUB_TOKEN`（如果设置了），否则
- 用卡片「登录 GitHub」时 Git Credential Manager 存下的 token。

## 工作原理

```
DSH 会话 (~/.dsh/sessions/<会话id>/session.jsonl.zstd)
        │  /sync enable（按会话开启，记入 manifest.json）
        ▼
镜像    ~/.dsh/git-sync/sessions/<会话id>/…（一个 git 仓库）
        │  /sync 或定时：git add + commit + push
        ▼
GitHub  <你的仓库>/sessions/<会话id>/session.jsonl.zstd + manifest.json
        ▲  其它设备：git pull --rebase，文件落回 ~/.dsh/sessions
```

- 只有开启的会话会进镜像；凭据、缓存、日志绝不会进仓库。
- 冲突（两台设备同时改同一会话）时**保留本地**（最后写入者胜）——只对你能接受被覆盖的会话开启同步。

## 设置卡片字段

| 字段 | 含义 |
|---|---|
| 总开关 (Enabled) | 主开关，默认关闭 |
| GitHub 仓库 (GitHub remote) | 共享仓库地址（SSH 或 HTTPS） |
| 分支 (Branch) | 跟踪的分支，默认 `main` |
| 同步间隔（分钟） | 周期同步；`0` = 仅手动 |
| 自动建仓 (Auto-create repo) | 首次同步时若仓库不存在则自动创建私有仓库 |

## 常见问题

- **`/sync` 提示 `no remote configured`** —— 在卡片上填好 GitHub 仓库并保存。
- **`/sync` 提示 `sync is disabled`** —— 在卡片上打开总开关（或 `/sync on`）。
- **执行 `/sync enable` 后 GitHub 仓库是空的** —— `/sync enable` 只是标记会话；要再跑 `/sync`（或等周期任务）才会推送。
- **推送报认证错误** —— 在卡片上点「登录 GitHub」，或在终端确认 `git ls-remote <仓库地址> HEAD` 能通。
- **`couldn't find remote ref main`** —— 远端是空仓库；第一次 `/sync` 推送会自动创建分支。
- **国内直连 GitHub 不通** —— 插件用的是本机 git，给 github.com 配代理即可（`git config --global http.https://github.com.proxy http://127.0.0.1:<端口>`）。

## Model Experience

该插件对模型透明：不向请求添加上下文，不引入工具 schema，只做后台 git 工作、一个斜杠命令和一张设置卡片。

#### Token effect

无直接 token 影响。

#### KV Cache effect

独立模型请求；插件不会使请求复用失效。

## Known Limitations and Deferred Work

- **按整文件而非内容合并。** 两台设备在同一间隔内编辑*同一个*会话会在文件层面冲突并保留本地，这一窗口内在远端写入的消息会被丢弃。
- **跨设备 `cwd` 映射。** 镜像文件按会话 id（而非工作区 `cwd`）存储；拉取时会话被放回本机自己的 `cwd` 分组下。
- **设置卡片控件较简单。** 布尔字段用复选框、其它字段用文本输入；暂不支持单字段恢复默认。

## License

MIT
