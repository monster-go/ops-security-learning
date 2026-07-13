# Git 完全指南：版本控制原理与实践

> **适用阶段**：Phase 3 第 10 周 — CI/CD 概念（也可作为全课程通用工具）  
> **文档版本**：v1.0  
> **创建日期**：2026-07-07  
> **实验环境**：本机（macOS / Linux）+ GitHub / Gitee 远程仓库

---

## 目录

1. [什么是 Git](#1-什么是-git)
2. [Git 工作原理](#2-git-工作原理)
3. [安装与首次配置](#3-安装与首次配置)
4. [基础工作流](#4-基础工作流)
5. [查看历史与对比差异](#5-查看历史与对比差异)
6. [分支与合并](#6-分支与合并)
7. [远程仓库与协作](#7-远程仓库与协作)
8. [撤销、回退与救场](#8-撤销回退与救场)
9. [暂存与储藏（stash）](#9-暂存与储藏stash)
10. [.gitignore 与敏感信息](#10-gitignore-与敏感信息)
11. [标签与发布版本](#11-标签与发布版本)
12. [运维与安全场景](#12-运维与安全场景)
13. [故障排查手册](#13-故障排查手册)
14. [验收自测清单](#14-验收自测清单)
15. [命令速查表](#15-命令速查表)
16. [参考资源](#16-参考资源)

---

## 1. 什么是 Git

**Git** 是一个**分布式版本控制系统**（Distributed Version Control System，DVCS）。它记录文件的每一次变更，让你可以：

- 随时回到任意历史版本
- 多人并行开发而不互相覆盖
- 在出问题时快速定位「谁、什么时候、改了什么」

### 1.1 生活类比：Git 是「带时光机的项目档案室」

想象你在写一本运维手册：

| 没有 Git | 有 Git |
|----------|--------|
| `手册_v1.doc`、`手册_v2_最终版.doc`、`手册_v2_最终版_真的最终.doc` | 一个项目目录，完整变更历史都在 |
| 不知道某段话是谁改的 | 每次修改都有作者、时间、说明 |
| 两人同时改同一文件，后保存的覆盖先保存的 | 分支并行开发，最后合并 |
| 改坏了只能手动找备份 | `git log` 看历史，`git checkout` 回到任意版本 |

### 1.2 为什么运维必须会 Git

| 场景 | Git 的作用 |
|------|-----------|
| 管理配置文件（Nginx、Ansible Playbook） | 版本化 + 变更审计 |
| CI/CD 流水线 | 代码提交触发自动构建部署 |
| 基础设施即代码（IaC） | Terraform / K8s YAML 多人协作 |
| 事故回溯 | `git blame` 查谁引入了问题配置 |
| 开源工具学习 | clone 官方仓库、提 Issue / PR |

### 1.3 Git vs SVN vs 复制文件夹

| 特性 | 复制文件夹 | SVN（集中式） | Git（分布式） |
|------|-----------|--------------|--------------|
| 完整历史 | ❌ | ✅（需连服务器） | ✅（本地就有） |
| 离线工作 | ✅ | ❌ | ✅ |
| 分支成本 | — | 较高 | 极低 |
| 行业主流 | — | 老旧项目 | **当前标准** |

---

## 2. Git 工作原理

### 2.1 三棵树（Three Trees）

Git 管理文件时，有三个核心区域：

```
┌─────────────────┐    git add     ┌─────────────────┐   git commit   ┌─────────────────┐
│  工作区          │  ──────────>  │  暂存区          │  ──────────>  │  本地仓库        │
│  Working Tree   │               │  Staging Area   │               │  Repository     │
│  (你编辑的文件)   │               │  (index)        │               │  (.git 目录)    │
└─────────────────┘               └─────────────────┘               └─────────────────┘
        ^                                                                   │
        │                          git checkout / restore                   │
        └───────────────────────────────────────────────────────────────────┘
```

| 区域 | 说明 | 类比 |
|------|------|------|
| **工作区** | 你看到的项目文件 | 书桌上的草稿 |
| **暂存区** | `git add` 后等待提交的内容 | 装进信封、还没寄出的稿件 |
| **本地仓库** | `git commit` 后永久保存的快照 | 档案馆里的正式存档 |

### 2.2 提交（Commit）是什么

每次 `git commit` 会生成一个**快照**（snapshot），用 **SHA-1 哈希**（如 `a3f2b1c`）唯一标识。

```
commit a3f2b1c (HEAD -> main)
│  Author: ops@example.com
│  Date:   2026-07-07
│  Message: 添加 Nginx 配置模板
│
├── nginx.conf
├── deploy.sh
└── README.md
```

**关键理解**：Git 不是按文件存储「差异」，而是存储**每次提交的完整快照**（内部有去重优化，但概念上是快照）。

### 2.3 分支（Branch）是什么

分支只是指向某个提交的**可移动指针**。

```
main:    A ── B ── C ── D  (HEAD -> main)
                  \
feature:           E ── F   (HEAD -> feature)
```

创建分支成本极低（只是移动一个指针），这是 Git 取代 SVN 的核心优势之一。

### 2.4 远程仓库

```
你的笔记本                    GitHub / GitLab
┌──────────────┐            ┌──────────────┐
│  本地仓库     │  git push  │  远程仓库     │
│  (.git)      │ ────────> │  (origin)    │
│              │ <──────── │              │
│              │  git pull  │              │
└──────────────┘            └──────────────┘
```

每个开发者的本地都有**完整仓库副本**，不依赖中央服务器也能提交、查看历史。

---

## 3. 安装与首次配置

### 3.1 安装 Git

```bash
# macOS（Xcode Command Line Tools 或 Homebrew）
xcode-select --install
# 或
brew install git

# Ubuntu / Debian
sudo apt update && sudo apt install -y git

# 验证
git --version
# 期望输出：git version 2.x.x
```

### 3.2 全局身份配置（必做）

```bash
git config --global user.name "你的名字"
git config --global user.email "you@example.com"

# 查看配置
git config --global --list

# 删除某条配置
git config --global --unset user.name
git config --global --unset credential.helper
```

> **注意**：`user.email` 会出现在每次提交记录中。如果推送到 GitHub，建议与账号邮箱一致，这样贡献图才能正确统计。

### 3.3 推荐配置

```bash
# 默认分支名用 main（现代惯例）
git config --global init.defaultBranch main

# 命令输出着色
git config --global color.ui auto

# macOS 推荐：记住 HTTPS 凭据
git config --global credential.helper osxkeychain

# Linux 可缓存凭据 1 小时
# git config --global credential.helper 'cache --timeout=3600'

# 推送时只推当前分支（更安全）
git config --global push.default current

# 拉取时使用 rebase（保持线性历史，可选）
git config --global pull.rebase false   # 新手建议先 false
```

### 3.4 配置层级

| 层级 | 文件位置 | 作用范围 |
|------|---------|---------|
| `--system` | `/etc/gitconfig` | 全系统 |
| `--global` | `~/.gitconfig` | 当前用户 |
| `--local` | `.git/config` | 当前仓库 |

优先级：`local` > `global` > `system`

---

## 4. 基础工作流

### 4.1 创建仓库

**方式一：本地初始化**

```bash
mkdir ~/git-practice && cd ~/git-practice
git init
# 输出：Initialized empty Git repository in .../git-practice/.git/
```

**方式二：克隆远程仓库**

```bash
git clone https://github.com/user/repo.git
cd repo

# 指定目录名
git clone https://github.com/user/repo.git my-local-name
```

### 4.2 标准日常循环

```bash
# 1. 查看状态（最常用命令之一）
git status

# 2. 编辑文件后，查看改了什么
git diff

# 3. 将变更加入暂存区
git add filename.txt          # 单个文件
git add .                     # 当前目录所有变更
git add -p filename.txt       # 交互式，只暂存部分修改

# 4. 提交到本地仓库
git commit -m "描述这次改了什么"
git commit -am "修改并提交已跟踪文件（跳过 git add）"   # 仅对已跟踪文件有效

# 5. 推送到远程（有远程仓库时）
git push
```

### 4.3 动手练习：第一个仓库

```bash
mkdir ~/git-practice && cd ~/git-practice
git init

cat > README.md <<'EOF'
# 运维练习项目
这是我的第一个 Git 仓库。
EOF

git add README.md
git commit -m "初始化项目：添加 README"

cat >> README.md <<'EOF'

## 待办
- [ ] 学习 git status
- [ ] 学习 git log
EOF

git add README.md
git commit -m "添加待办清单"

git log --oneline
```

期望输出类似：

```
b2c3d4e 添加待办清单
a1b2c3d 初始化项目：添加 README
```

### 4.4 文件状态一览

```
         git add                git commit
Untracked ──────> Staged ──────> Committed
   │                  │               │
   │    git restore   │  git restore  │
   └──────────────────┴───────────────┘
              (回到未暂存 / 丢弃工作区修改)
```

| 状态 | `git status` 显示 | 含义 |
|------|------------------|------|
| Untracked | 红色，`Untracked files` | 新文件，Git 还没跟踪 |
| Modified | 红色，`Changes not staged` | 已跟踪文件被修改，未暂存 |
| Staged | 绿色，`Changes to be committed` | 已暂存，等待提交 |
| Committed | `nothing to commit, working tree clean` | 工作区干净 |

### 4.5 文件删除、移动与清理

```bash
# 删除文件并从 Git 中移除跟踪（同时删工作区文件）
git rm old-config.conf
git commit -m "删除废弃配置"

# 只从 Git 移除跟踪，保留本地文件（常用于 .gitignore 误提交，详见 10.3）
git rm --cached .env

# 重命名或移动文件（Git 能识别 rename，比 delete + add 更好）
git mv nginx.conf nginx.conf.bak
git mv scripts/deploy.sh bin/deploy.sh

# 清理未跟踪的文件/目录（危险！先用 -n 预演）
git clean -n              # 预演：哪些会被删
git clean -fd             # 删除未跟踪的文件和目录
git clean -fdx            # 连 .gitignore 忽略的文件也删（更危险）
```

---

## 5. 查看历史与对比差异

### 5.1 git log

```bash
# 简洁一行显示
git log --oneline

# 图形化分支历史
git log --oneline --graph --all

# 查看最近 5 条
git log -5

# 查看某文件的修改历史
git log -- nginx.conf

# 查看每次提交的具体改动
git log -p

# 谁在哪行写了什么（排障神器）
git blame nginx.conf
```

### 5.2 git diff

```bash
# 工作区 vs 暂存区（还没 git add 的改动）
git diff

# 暂存区 vs 最后一次提交（已经 git add 的改动）
git diff --staged
# 等价于
git diff --cached

# 两次提交之间
git diff a1b2c3d..b2c3d4e

# 只看某个文件
git diff HEAD -- deploy.sh
```

### 5.3 git show

```bash
# 查看某次提交的详情
git show a1b2c3d
git show HEAD
git show HEAD~1    # 上一次提交
```

---

## 6. 分支与合并

### 6.1 分支基本操作

```bash
# 查看分支
git branch          # 本地分支
git branch -a       # 所有分支（含远程）

# 创建分支
git branch feature-nginx

# 切换分支
git checkout feature-nginx
# 或（Git 2.23+ 推荐）
git switch feature-nginx

# 创建并切换（常用）
git checkout -b feature-nginx
# 或
git switch -c feature-nginx

# 删除分支
git branch -d feature-nginx      # 已合并才删
git branch -D feature-nginx      # 强制删除
```

### 6.2 合并（Merge）

```bash
# 在 main 分支上，合并 feature 分支
git switch main
git merge feature-nginx

# 禁止 fast-forward，强制生成合并提交（保留分支历史）
git merge --no-ff feature-nginx -m "合并 feature-nginx"
```

**Fast-forward 合并**（无分叉，直接前移指针）：

```
合并前：
main:    A ── B
                \
feature:         C ── D

合并后（fast-forward）：
main:    A ── B ── C ── D
```

**三方合并**（有分叉，产生合并提交）：

```
合并前：
main:    A ── B ── E
                \
feature:         C ── D

合并后：
main:    A ── B ── E ── M
                \     /
feature:         C ── D
```

### 6.3 解决合并冲突

当两人改了同一文件的同一区域，Git 无法自动合并：

```bash
git merge feature-nginx
# Auto-merging nginx.conf
# CONFLICT (content): Merge conflict in nginx.conf
# Automatic merge failed; fix conflicts and then commit the result.
```

冲突文件内容示例：

```
<<<<<<< HEAD
    listen 80;
=======
    listen 8080;
>>>>>>> feature-nginx
```

**解决步骤**：

```bash
# 1. 手动编辑文件，保留正确内容，删除冲突标记
# 2. 标记为已解决
git add nginx.conf

# 3. 完成合并提交
git commit -m "合并 feature-nginx：统一端口为 80"

# 如果想放弃合并
git merge --abort
```

### 6.4 Rebase（变基，进阶）

```bash
git switch feature-nginx
git rebase main
```

把 feature 分支的提交「挪到」main 最新提交之后，历史更线性：

```
rebase 前：
main:    A ── B ── C
                \
feature:         D ── E

rebase 后：
main:    A ── B ── C
                    \
feature:             D' ── E'
```

> **黄金法则**：不要对已经推送到公共远程的分支做 rebase，会改写历史，影响他人。

```bash
# 冲突解决后继续
git rebase --continue

# 跳过当前提交（慎用）
git rebase --skip

# 放弃 rebase，回到 rebase 前状态
git rebase --abort
```

### 6.5 Cherry-pick（摘取提交）

把**某一个**提交单独应用到当前分支，常用于 hotfix：

```bash
git switch main
git cherry-pick a1b2c3d          # 摘取指定提交
git cherry-pick -n a1b2c3d       # 只应用改动，不自动 commit

# 冲突时：解决后
git add .
git cherry-pick --continue

# 放弃
git cherry-pick --abort
```

### 6.6 动手练习：分支合并

```bash
cd ~/git-practice

git switch -c add-scripts
cat > deploy.sh <<'EOF'
#!/bin/bash
echo "Deploying..."
EOF
chmod +x deploy.sh
git add deploy.sh
git commit -m "添加部署脚本"

git switch main
git merge add-scripts
git log --oneline --graph

git branch -d add-scripts
```

---

## 7. 远程仓库与协作

### 7.1 管理远程仓库

```bash
# 查看远程
git remote -v

# 添加远程（origin 是约定俗成的名字）
git remote add origin https://github.com/user/repo.git

# 修改远程 URL
git remote set-url origin git@github.com:user/repo.git

# 重命名远程（例如把 origin 改成 github）
git remote rename origin github

# 删除远程（只删本地关联，不会删除 GitHub 上的仓库）
git remote remove origin
# 等价写法
git remote rm origin

# 查看某个远程的详细信息
git remote show origin
```

> **注意**：`git remote remove` 只是取消本地与远程的绑定，**不会**删除 GitHub / GitLab 上的远程仓库本身。要删平台上的仓库，需到网页端 Settings 里操作。

### 7.2 推送与拉取

```bash
# 首次推送并建立跟踪关系
git push -u origin main

# 之后直接推
git push

# 拉取并合并
git pull

# 只下载不合并（更安全，先看再合）
git fetch origin
git log origin/main..main    # 看本地比远程多了什么
git merge origin/main
```

### 7.3 跟踪分支（Upstream）

```bash
# 查看跟踪关系
git branch -vv

# 设置当前分支跟踪远程分支
git branch -u origin/main
```

### 7.4 协作流程：Fork + Pull Request

开源项目或团队常用的协作模式：

```
1. Fork 仓库到自己账号
2. git clone 自己的 Fork
3. git checkout -b my-feature
4. 开发、commit、push 到自己的 Fork
5. 在 GitHub/GitLab 上发起 Pull Request（PR）
6. Code Review 通过后，维护者合并到主仓库
```

**同步上游更新**（Fork 后保持与主仓库同步）：

```bash
git remote add upstream https://github.com/original/repo.git
git fetch upstream
git switch main
git merge upstream/main
git push origin main
```

### 7.5 SSH vs HTTPS

| 方式 | URL 格式 | 优点 |
|------|---------|------|
| HTTPS | `https://github.com/user/repo.git` | 简单，防火墙友好 |
| SSH | `git@github.com:user/repo.git` | 免输密码，运维推荐 |

配置 SSH 密钥（配合 [SSH 完全指南](./ssh-guide.md)）：

```bash
ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519_github
cat ~/.ssh/id_ed25519_github.pub
# 将公钥添加到 GitHub → Settings → SSH and GPG keys

# ~/.ssh/config 片段
# Host github.com
#   HostName github.com
#   User git
#   IdentityFile ~/.ssh/id_ed25519_github

ssh -T git@github.com
# Hi username! You've successfully authenticated...
```

### 7.6 远程分支管理

```bash
# 查看远程分支
git branch -r

# 拉取远程新分支信息，并清理已删除的远程分支引用
git fetch --prune
# 或
git remote prune origin

# 基于远程分支创建本地跟踪分支
git switch -c feature-nginx origin/feature-nginx
# 或（远程分支已存在时）
git switch --track origin/feature-nginx

# 推送本地分支到远程
git push -u origin feature-nginx

# 删除远程分支
git push origin --delete feature-nginx
# 简写
git push -d origin feature-nginx

# 删除本地的远程跟踪分支（远程已删，本地还有 origin/xxx 时）
git branch -dr origin/feature-nginx
```

### 7.7 强制推送（慎用）

```bash
# 危险：覆盖远程历史
git push --force
git push -f

# 相对安全：仅当远程未被他人更新时才强制推送
git push --force-with-lease
```

> **团队规范**：`main` / `master` 分支禁止 force push；只在个人 feature 分支、且确认无人协作时使用 `--force-with-lease`。

---

## 8. 撤销、回退与救场

### 8.1 场景决策树

```
改坏了？先别慌，看你在哪个阶段：
│
├─ 工作区改了，还没 add
│   └─ git restore <file>          丢弃工作区修改
│
├─ 已经 add，还没 commit
│   └─ git restore --staged <file>  取消暂存（保留文件修改）
│
├─ 已经 commit，还没 push
│   ├─ 修改最后一次提交信息/内容
│   │   └─ git commit --amend
│   └─ 回退提交（保留工作区修改）
│       └─ git reset --soft HEAD~1
│
├─ 已经 push 到远程
│   └─ git revert <commit>         生成「反向提交」，不改写历史（安全）
│
└─ 想回到某个历史版本看看
    └─ git checkout <commit>       分离 HEAD 状态（只看不改）
```

### 8.2 常用撤销命令

```bash
# 丢弃工作区对某文件的修改（危险！不可恢复）
git restore nginx.conf

# 从历史版本恢复某文件（不切换分支）
git restore --source=HEAD~1 nginx.conf
git restore --source=a1b2c3d nginx.conf

# 取消暂存（文件修改还在）
git restore --staged nginx.conf

# 修改最后一次提交（仅限未 push 或确定无人基于它开发）
git add forgotten-file.txt
git commit --amend -m "修正：补充遗漏文件"

# 软回退：撤销提交，改动保留在暂存区
git reset --soft HEAD~1

# 混合回退（默认）：撤销提交，改动保留在工作区
git reset HEAD~1

# 硬回退（危险！丢弃所有改动）
git reset --hard HEAD~1

# 安全回退已推送的提交（推荐）
git revert a1b2c3d
git push
```

### 8.3 找回「丢失」的提交

```bash
# reflog 记录 HEAD 的所有移动
git reflog

# 从 reflog 中找到 commit，恢复
git checkout a1b2c3d
# 或
git reset --hard a1b2c3d
```

> **记住**：只要 commit 过，哪怕 reset 了， reflog 里通常还能找回来（默认保留 90 天）。

---

## 9. 暂存与储藏（stash）

正在开发到一半，突然要切换分支修紧急 Bug？

```bash
# 储藏当前所有未提交的修改
git stash

# 查看储藏列表
git stash list

# 恢复最近一次储藏（并删除 stash 记录）
git stash pop

# 恢复但不删除
git stash apply

# 给储藏加说明
git stash push -m "nginx 配置改到一半"

# 删除某条储藏
git stash drop stash@{0}
```

---

## 10. .gitignore 与敏感信息

### 10.1 为什么需要 .gitignore

有些文件**不应该**进入版本库：

| 类型 | 示例 |
|------|------|
| 编译产物 | `*.o`, `dist/`, `__pycache__/` |
| 依赖目录 | `node_modules/`, `vendor/` |
| 密钥与凭据 | `.env`, `*.pem`, `id_rsa` |
| 日志与临时文件 | `*.log`, `*.tmp`, `.DS_Store` |
| 本地 IDE 配置 | `.idea/`, `.vscode/settings.json` |

### 10.2 示例 .gitignore

```gitignore
# 敏感信息（运维重点！）
.env
.env.*
*.pem
*.key
secrets/
credentials.json

# 系统文件
.DS_Store
Thumbs.db

# 日志
*.log
logs/

# 编辑器
.idea/
*.swp

# 依赖
node_modules/
```

### 10.3 已经误提交敏感文件怎么办

```bash
# 1. 从仓库移除但保留本地文件
git rm --cached .env

# 2. 加入 .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "移除误提交的 .env 并加入 gitignore"

# 3. 如果已经 push——密钥必须轮换！
#    Git 历史里仍然有，需要用 git filter-repo 或 BFG 清理历史
```

> **安全铁律**：密码、API Key、私钥一旦推送到远程，就视为**已泄露**，必须立即轮换，不能只靠删除文件。

### 10.4 检查是否包含敏感信息

```bash
# 搜索可能泄露的密钥
git log -p | grep -i "password\|secret\|api_key\|BEGIN RSA"

# 使用 gitleaks（推荐）
# docker run -v $(pwd):/repo zricethezav/gitleaks detect -s /repo
```

---

## 11. 标签与发布版本

```bash
# 轻量标签
git tag v1.0.0

# 附注标签（推荐，含作者、日期、说明）
git tag -a v1.0.0 -m "首个稳定版本"

# 查看标签
git tag
git show v1.0.0

# 给历史提交打标签
git tag -a v0.9.0 a1b2c3d -m "Beta 版本"

# 推送标签到远程
git push origin v1.0.0
git push origin --tags    # 推送所有标签

# 删除标签
git tag -d v1.0.0
git push origin --delete v1.0.0
```

运维场景：Ansible Playbook、K8s Manifest 用 tag 标记「生产环境当前版本」。

---

## 12. 运维与安全场景

### 12.1 用 Git 管理服务器配置

```
server-configs/          # 一个 Git 仓库
├── nginx/
│   ├── prod/
│   └── staging/
├── systemd/
├── ufw/
└── scripts/
    └── deploy.sh
```

工作流：

```bash
# 1. 修改配置
vim nginx/prod/site.conf

# 2. 本地测试（nginx -t）
# 3. 提交
git add nginx/prod/site.conf
git commit -m "prod: 添加 HTTPS 重定向"

# 4. 推送后，目标服务器拉取并应用
ssh vm-ops "cd /opt/configs && git pull && sudo nginx -t && sudo systemctl reload nginx"
```

### 12.2 Git 与 CI/CD

```
开发者 push 代码
       │
       ▼
┌──────────────┐
│  Git 远程仓库  │  GitHub / GitLab / Gitea
└──────┬───────┘
       │ webhook 触发
       ▼
┌──────────────┐
│  CI 流水线    │  自动测试 → 构建镜像 → 部署
│  (Actions 等) │
└──────────────┘
```

对应课程第 10 周 CI/CD 概念，Git 是整个流水线的起点。

### 12.3 部署密钥（Deploy Key）

服务器只需要**只读**拉取权限时，用 Deploy Key 而非个人账号：

```bash
# 在服务器上生成专用密钥
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "vm-ops-deploy" -N ""

# 将 deploy_key.pub 添加到 GitHub 仓库 → Settings → Deploy keys
# 克隆
GIT_SSH_COMMAND='ssh -i ~/.ssh/deploy_key' git clone git@github.com:org/configs.git
```

### 12.4 审计与合规

```bash
# 谁改了这行配置？
git blame /etc/nginx/sites-enabled/default

# 某时间段的所有变更
git log --since="2026-07-01" --until="2026-07-07" --oneline

# 谁提交最多？
git shortlog -sn
```

### 12.5 导出与搜索

```bash
# 导出某版本代码为 tar 包（不含 .git，适合部署打包）
git archive --format=tar.gz --output=release-v1.0.0.tar.gz v1.0.0

# 在版本库中搜索内容（比 grep 更准确，只搜已跟踪文件）
git grep "listen 80"
git grep -n "password" -- '*.conf'
```

### 12.6 安全注意事项

| 风险 | 防护 |
|------|------|
| 密钥进仓库 | `.gitignore` + pre-commit hook + gitleaks |
| 未授权推送 | 分支保护规则（Branch Protection） |
| 强制推送覆盖历史 | 禁止 `git push --force` 到 main（团队规范） |
| 大文件撑爆仓库 | Git LFS 或外部对象存储 |

---

## 13. 故障排查手册

### 13.1 提交被拒绝：non-fast-forward

```
! [rejected]        main -> main (non-fast-forward)
```

**原因**：远程有你本地没有的提交。

```bash
git pull --rebase origin main
# 解决冲突后
git push
```

### 13.2 合并冲突太多，想重来

```bash
git merge --abort
# 或
git rebase --abort
```

### 13.3 不小心在 main 上开发了

```bash
# 把当前改动带到新分支
git switch -c feature/my-work
# main 回到远程状态
git switch main
git reset --hard origin/main
```

### 13.4 detached HEAD 状态

```bash
# /checkout 到某个 commit 而非分支时会出现
# 想保留改动：
git switch -c rescue-branch

# 不保留，回到 main：
git switch main
```

### 13.5 换行符问题（Windows / macOS / Linux）

```bash
# 统一用 LF，避免跨平台 diff 噪音
git config --global core.autocrlf input   # macOS / Linux
# git config --global core.autocrlf true  # Windows
```

### 13.6 权限问题：Permission denied (publickey)

```bash
# 测试 SSH 连接
ssh -T git@github.com

# 检查 agent 是否加载密钥
ssh-add -l
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519
```

### 13.7 仓库太大，clone 慢

```bash
# 浅克隆（只拉最近历史）
git clone --depth 1 https://github.com/user/large-repo.git

# 只克隆单个分支
git clone -b main --single-branch https://github.com/user/repo.git
```

---

## 14. 验收自测清单

完成以下任务，说明 Git 基础已达标：

### 基础操作

- [ ] 能解释工作区、暂存区、本地仓库三者的关系
- [ ] 能独立完成 `init` → `add` → `commit` → `log` 全流程
- [ ] 能使用 `git diff` 和 `git status` 判断当前状态
- [ ] 能配置 `user.name` 和 `user.email`

### 分支与远程

- [ ] 能创建分支、切换分支、合并分支
- [ ] 能手动解决一次合并冲突
- [ ] 能 `clone` 远程仓库并 `push` / `pull`
- [ ] 能配置 SSH 密钥连接 GitHub（或 Gitee）

### 救场能力

- [ ] 能使用 `git restore` 撤销工作区修改
- [ ] 能使用 `git stash` 临时储藏改动
- [ ] 知道 `git reset` 和 `git revert` 的区别
- [ ] 能使用 `git reflog` 找回误删的提交

### 运维意识

- [ ] 能编写合理的 `.gitignore`，不包含密钥和 `.env`
- [ ] 能使用 `git blame` 和 `git log` 做变更审计
- [ ] 能描述 Git 在 CI/CD 流程中的位置
- [ ] 知道误提交密钥后必须轮换，不能只删除文件

### 实操考核（建议）

```bash
# 在 ~/git-practice 完成：
# 1. 创建仓库，至少 3 次有意义的 commit
# 2. 创建 feature 分支，修改后合并回 main
# 3. 推送到 GitHub 私人仓库
# 4. 故意制造冲突并解决
# 5. 用 git revert 撤销某次提交
```

---

## 15. 命令速查表

### 日常

```bash
git status                          # 当前状态
git add <file>                      # 暂存
git commit -m "msg"                 # 提交
git commit -am "msg"                # 已跟踪文件修改并提交
git rm <file>                       # 删除并取消跟踪
git mv <old> <new>                  # 移动/重命名
git clean -fd                       # 清理未跟踪文件（先 git clean -n 预演）
git push                            # 推送
git pull                            # 拉取并合并
git log --oneline --graph --all     # 历史图
```

### 分支

```bash
git branch                          # 列本地分支
git branch -a                       # 列所有分支
git switch -c <branch>              # 创建并切换
git switch -                        # 切回上一个分支
git merge <branch>                  # 合并
git merge --no-ff <branch>          # 非 fast-forward 合并
git cherry-pick <commit>            # 摘取单个提交
git branch -d <branch>              # 删除本地分支
```

### 撤销

```bash
git restore <file>                  # 丢弃工作区修改
git restore --staged <file>         # 取消暂存
git restore --source=<commit> <file>  # 从历史恢复文件
git reset --soft HEAD~1             # 撤销提交，保留暂存
git revert <commit>                 # 安全反向提交
git reflog                          # 找回丢失提交
git stash / git stash pop           # 储藏 / 恢复
```

### 远程

```bash
git clone <url>                     # 克隆
git remote -v                       # 查看远程
git remote add <name> <url>         # 添加远程
git remote remove <name>            # 删除远程（rm 等价）
git remote set-url <name> <url>     # 修改 URL
git fetch --prune                   # 拉取并清理失效远程分支
git push -u origin <branch>         # 首次推送并跟踪
git push -d origin <branch>         # 删除远程分支
git push --force-with-lease         # 有条件的强制推送
```

### 诊断

```bash
git diff                            # 未暂存的改动
git diff --staged                   # 已暂存的改动
git blame <file>                    # 逐行归因
git show <commit>                   # 查看提交详情
git grep "<pattern>"                # 在仓库中搜索
git archive -o out.tar.gz <tag>     # 导出指定版本
```

---

## 16. 参考资源

| 资源 | 类型 | 链接 |
|------|------|------|
| Pro Git（官方书，有中文版） | 书籍 | https://git-scm.com/book/zh/v2 |
| Git 官方文档 | 文档 | https://git-scm.com/docs |
| Learn Git Branching | 交互教程 | https://learngitbranching.js.org/?locale=zh_CN |
| GitHub Skills | 实战练习 | https://skills.github.com |
| Oh Shit, Git!?! | 救场指南 | https://ohshitgit.com |
| gitignore 模板库 | 模板 | https://github.com/github/gitignore |

---

*本文档为 `ops-security-learning` 课程配套笔记。完成学习后请在 `PROGRESS.md` 对应章节打勾记录。*
