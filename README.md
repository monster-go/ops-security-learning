# 🛠️ 运维新兵训练营

> **从零开始，亲手摸过每一台服务器，才算真正入门。**

这是一套面向**零基础 / 转行 / 想系统补课**的运维与安全学习课程。  
不堆术语、不画大饼——每周有目标、有动手任务、有验收标准，学完能干活。

---

## 这门课想帮你解决什么？

很多人学运维的痛点是这样的：

| 痛点 | 我们的做法 |
|------|-----------|
| 教程太多，不知道从哪开始 | 16 周路线图，按周推进，不迷路 |
| 看了很多，动手为零 | 每周必有虚拟机实操 + 验收清单 |
| 运维和安全割裂 | 双线并进：先会管服务器，再懂怎么守、怎么攻 |
| 学完不知道算不算会 | 每阶段有明确「能独立完成 XX」的能力标准 |

**一句话定位**：不是让你背命令，而是让你**遇到问题时知道往哪查、怎么查、查完能修**。

---

## 课程风格：四句话记住

```
1. 先动手，再原理 —— 命令敲过一遍，概念自然长出来
2. 用故事记知识 —— 每台服务器都是一座城，你是守城的人
3. 错了是好事   —— 报错信息是最好的老师，贴出来一起排
4. 只练合法的   —— 自己的虚拟机 + 授权靶场，绝不越界
```

### 我们怎么讲？

- **生活类比优先**：SSH 是「带锁的远程大门」，防火墙是「小区门卫」，日志是「监控录像」
- **一图胜千言**：复杂流程用 ASCII 图 / 流程图，不堆文字墙
- **命令可复制**：文档里的命令块可以直接粘贴到终端跑
- **深度文档按需展开**：课程大纲写「学什么」，`notes/` 里写「怎么学透」

---

## 学习路线一览

```
Phase 0          Phase 1–2            Phase 2.5        Phase 3            Phase 4–5
环境搭建    →    Linux + 网络运维 →  数据库运维  →   容器与监控  →    安全攻防实战
 第 0 周          第 1–8 周             第 9 周         第 10–11 周        第 12–17 周
   │                  │                    │                │                   │
   ▼                  ▼                    ▼                ▼                   ▼
 虚拟机就绪      能独立管一台服务器    能管理 MySQL    懂现代工具链       能在靶场解题 + 应急响应
```

| 阶段 | 周次 | 你会获得的能力 |
|------|------|---------------|
| **Phase 0** | 第 0 周 | 实验环境就绪，完成基础自测 |
| **Phase 1** | 第 1–4 周 | 用户权限、服务管理、SSH 加固、磁盘与定时任务 |
| **Phase 2** | 第 5–8 周 | 网络排障、部署 Web 服务、写巡检脚本、读日志排障 |
| **Phase 2.5** | 第 9 周 | MySQL 部署、安全加固、备份恢复、性能调优与故障排查 |
| **Phase 3** | 第 10–11 周 | Docker 容器、监控与 CI/CD 概念 |
| **Phase 4** | 第 12–15 周 | 信息收集、系统加固、Web 安全、HTTPS 原理 |
| **Phase 5** | 第 16–17 周 | 权限提升（靶场）、应急响应、综合考核 |

📖 **完整大纲** → [CURRICULUM.md](./CURRICULUM.md)

---

## 快速开始（5 分钟）

### 1. 克隆仓库

```bash
git clone <your-repo-url> ~/code/ops-security-learning
cd ~/code/ops-security-learning
```

### 2. 准备实验环境

你需要：

- VirtualBox 或 VMware
- Ubuntu Server 22.04 LTS ISO
- 两台虚拟机：
  - **vm-ops**（运维练习机）：2 核 / 4GB / 40GB
  - **vm-lab**（安全靶机）：1 核 / 2GB / 20GB

详细步骤见 [CURRICULUM.md → Phase 0](./CURRICULUM.md#三phase-0环境搭建与自测第-0-周)。

### 3. 做基础自测

打开 [PROGRESS.md](./PROGRESS.md)，诚实填写 5 道自测题——系统会根据你的水平建议学习节奏。

### 4. 开始第一周

在终端或 AI 助手中说：

```
开始第 1 周
```

---

## 项目结构

```
ops-security-learning/
├── README.md              ← 你正在看的项目首页
├── CURRICULUM.md          ← 17 周完整课程大纲（主教材）
├── PROGRESS.md            ← 学习进度打卡表
├── notes/                 ← 深度专题笔记（随课程推进持续补充）
│   ├── ssh-guide.md       ← SSH 完全指南（Phase 1 第 3 周）
│   ├── git-guide.md       ← Git 完全指南（Phase 3 第 10 周）
│   ├── mysql-guide.md     ← MySQL 完全指南（Phase 2.5 第 9 周）
│   └── Docker-Disk-Space-Check-and-Cleanup-Guide.md
└── mysql/                 ← MySQL 深度教程多文件目录
    ├── cross-platform-install.md  ← 跨平台安装/卸载/安全配置
    ├── 01-install-and-basics.md
    ├── 02-user-and-security.md
    ├── 03-backup-and-recovery.md
    ├── 04-performance-tuning.md
    ├── 05-replication-and-ha.md
    ├── 06-monitoring.md
    ├── 07-common-faults.md
    ├── 08-uninstall-and-cleanup.md
    └── labs/
        ├── lab-01-deploy-and-harden.md
        ├── lab-02-pitr-recovery.md
        └── lab-03-replication-failover.md
```

### 核心文件怎么配合？

| 文件 | 角色 | 什么时候看 |
|------|------|-----------|
| `README.md` | 招生简章 + 导航 | 第一次来、忘了从哪继续 |
| `CURRICULUM.md` | 课程表 + 教案 | 每周学习的主线 |
| `PROGRESS.md` | 学习日记 | 每完成一节就打勾 |
| `notes/` | 工具书 / 速查手册 | 某个专题想深挖时 |
| `mysql/` | MySQL 深度分章教程 | 系统学习或速查 MySQL 专项 |

---

## 每周学习循环

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  读本周目标  │ ──▶ │  理论 + 类比 │ ──▶ │  虚拟机实操  │ ──▶ │  验收打勾   │
│ CURRICULUM  │     │  讲师讲解    │     │  敲命令排错  │     │  PROGRESS   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        卡住了？贴报错
                                        「卡住了」→ 一起排
```

### 常用口令

| 你说 | 会发生什么 |
|------|-----------|
| `开始第 X 周` | 按 CURRICULUM 对应章节教学 |
| `我做完了` | 出题验收，确认是否达标 |
| `卡住了` | 贴终端报错，一起排查 |
| `复习第 X 周` | 回顾该周重点 |

---

## 已发布的深度笔记

| 笔记 | 对应周次 | 内容 |
|------|---------|------|
| [SSH 完全指南](./notes/ssh-guide.md) | Phase 1 第 3 周 | 原理、密钥、隧道、加固、排障 |
| [Git 完全指南](./notes/git-guide.md) | Phase 3 第 10 周 | 版本控制、分支协作、撤销救场、CI/CD 衔接 |
| [MySQL 完全指南](./notes/mysql-guide.md) | Phase 2.5 第 9 周 | 安装、安全、备份恢复、调优、复制、排障、卸载 |
| [Docker 磁盘清理指南](./notes/Docker-Disk-Space-Check-and-Cleanup-Guide.md) | Phase 3 第 9 周 → 第 10 周 | overlay2 原理、空间排查、安全清理 |

> 更多笔记会随学习进度持续更新到 `notes/` 目录。

---

## 合法边界（必读）

这门课包含安全攻防内容，但**所有实验必须在授权范围内进行**：

| ✅ 可以做 | ❌ 不可以做 |
|----------|-----------|
| 在自己的虚拟机练习 | 未经授权扫描或攻击真实服务器 |
| 使用 TryHackMe、HackTheBox 等靶场 | 对公网 IP 做渗透测试 |
| 学攻击原理以理解防御 | 将技术用于未授权入侵 |

---

## 推荐工具与资源

### 实验环境

- [VirtualBox](https://www.virtualbox.org/) — 免费虚拟机
- [Ubuntu Server 22.04 LTS](https://ubuntu.com/download/server) — 课程标准系统

### 运维学习

- [Linux Journey](https://linuxjourney.com) — 免费 Linux 入门
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials) — 实战向文章

### 安全靶场

- [TryHackMe](https://tryhackme.com) — 新手友好，有引导
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) — Web 安全免费课程
- [HackTheBox](https://www.hackthebox.com) — 进阶实战

---

## 适合谁 / 不适合谁

**适合：**
- 想转行运维或 DevOps 的零基础同学
- 会一点 Linux 但不成体系、想补课的开发者
- 对网络安全好奇、想从蓝队视角入门的人

**暂时不适合：**
- 已有 3 年以上运维经验、只想查某个命令的同学（直接看 `notes/` 即可）
- 不愿意搭虚拟机、只想「看看」不动手的人

---

## 贡献与反馈

这是一份**持续生长**的学习资料：

- 发现错误或过时内容 → 提 Issue 或直接 PR
- 学完某周有心得 → 可以补充到 `PROGRESS.md` 的笔记区
- 某个专题学透了 → 欢迎往 `notes/` 贡献深度文档

---

<p align="center">
  <strong>运维不是背命令，是在服务器出问题时不慌。</strong><br>
  打开 <a href="./PROGRESS.md">PROGRESS.md</a>，填完自测，然后说一句「开始第 0 周」——我们出发。
</p>
