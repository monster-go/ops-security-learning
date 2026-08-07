# crontab 完全指南：定时任务原理与实践

> **适用场景**：定时备份、日志清理、巡检脚本、安全审计  
> **文档版本**：v1.0  
> **创建日期**：2026-08-07  
> **实验环境**：Ubuntu Server 22.04 LTS（建议本地虚拟机 vm-ops）

---

## 目录

1. [什么是 crontab](#1-什么是-crontab)
2. [crontab 与 Supervisor 的区别](#2-crontab-与-supervisor-的区别)
3. [工作原理](#3-工作原理)
4. [时间表达式详解](#4-时间表达式详解)
5. [用户级与系统级 cron](#5-用户级与系统级-cron)
6. [实战：从零配置定时任务](#6-实战从零配置定时任务)
7. [脚本编写最佳实践](#7-脚本编写最佳实践)
8. [日志与排障](#8-日志与排障)
9. [安全审计（蓝队视角）](#9-安全审计蓝队视角)
10. [实践检查清单](#10-实践检查清单)
11. [参考资源](#11-参考资源)

---

## 1. 什么是 crontab

**crontab**（cron table，计划任务表）是 Linux 上用来**按时间表自动执行命令或脚本**的机制。

### 1.1 生活类比

把服务器想象成一座城：

| 类比 | 对应 |
|------|------|
| 保安每天凌晨 2 点巡逻 | cron 定时执行巡检脚本 |
| 每周一早上发周报 | cron 每周一 9:00 跑报表脚本 |
| 每月 1 号清理过期日志 | cron 每月固定日期执行清理 |

cron 是**闹钟 + 自动执行器**：到点了就干活，干完通常就退出。

### 1.2 典型使用场景

- 数据库 / 文件备份（每天凌晨）
- 日志清理、磁盘空间检查
- 证书到期提醒、SSL 续期（配合 certbot）
- 定时跑巡检脚本、同步数据
- 生成日报 / 周报

### 1.3 不适合的场景

| 场景 | 更合适的工具 |
|------|-------------|
| Web 应用进程挂了要自动拉起 | [Supervisor](/guide/automation/supervisor) |
| 需要 7×24 常驻的后台服务 | systemd / Supervisor |
| 精确到秒级、复杂依赖的调度 | systemd timer / 专业调度器 |
| 分布式任务队列 | Celery、RabbitMQ 等 |

---

## 2. crontab 与 Supervisor 的区别

两者都涉及「自动化」，但解决的问题完全不同：

```
┌─────────────────────────────────────────────────────────────────┐
│                        你要解决什么问题？                          │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
   「到某个时间点执行一次」              「进程要一直跑着，挂了要重启」
         │                                    │
         ▼                                    ▼
      crontab                              Supervisor
   （定时闹钟）                            （进程保姆）
```

| 维度 | crontab | Supervisor |
|------|---------|------------|
| **核心职责** | 按时间表触发任务 | 守护长期运行的进程 |
| **运行模式** | 到点启动 → 执行 → 退出 | 持续监控 → 崩溃自动重启 |
| **触发方式** | 5 段/6 段时间表达式 | 系统启动时拉起 + 异常重启 |
| **典型任务** | 备份、清理、巡检、报表 | Gunicorn、Celery Worker、自定义守护进程 |
| **日志** | 需自己重定向或配置 MAILTO | 内置 stdout/stderr 捕获 |
| **管理命令** | `crontab -e` / `crontab -l` | `supervisorctl start/stop/restart` |
| **配置文件** | 用户 crontab、`/etc/cron.*` | `/etc/supervisor/conf.d/*.conf` |

**一句话记忆**：

- **cron** = 「几点几分跑什么」—— 适合**周期性、短生命周期**的任务
- **Supervisor** = 「这个进程必须活着」—— 适合**长期运行、需要看护**的服务

两者可以配合：cron 每天凌晨 3 点跑备份脚本；Supervisor 7×24 守护你的 Web 应用进程。

📖 Supervisor 深度文档 → [/guide/automation/supervisor](/guide/automation/supervisor)

---

## 3. 工作原理

### 3.1 cron 守护进程

系统里有一个常驻进程 **`cron`**（或 `crond`），每分钟醒来一次，检查有没有任务「该跑了」：

```
每分钟整点
    │
    ▼
cron 读取任务列表
    ├── /var/spool/cron/crontabs/<用户名>   ← 用户 crontab
    ├── /etc/crontab
    ├── /etc/cron.d/*
    ├── /etc/cron.hourly/*
    ├── /etc/cron.daily/*
    ├── /etc/cron.weekly/*
    └── /etc/cron.monthly/*
    │
    ▼
匹配当前时间的条目 → fork 子进程执行命令
```

### 3.2 环境变量陷阱（重要）

cron 执行时的环境**非常精简**，和你在 SSH 里交互式登录不同：

| 项目 | 交互式 Shell | cron 环境 |
|------|-------------|-----------|
| PATH | 通常含 `/usr/local/bin` 等 | 往往只有 `/usr/bin:/bin` |
| 当前目录 | 你的 home 或上次 cd 的位置 | 通常是用户 home 或 `/` |
| Shell 配置 | 会加载 `.bashrc` | **不会**加载 |

因此脚本里应使用**绝对路径**，或在 crontab 开头显式设置：

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=ops@example.com
```

### 3.3 查看 cron 服务状态

```bash
# Ubuntu 使用 cron.service
sudo systemctl status cron
sudo systemctl enable cron
```

---

## 4. 时间表达式详解

### 4.1 标准 5 段格式

```
┌───────────── 分钟 (0-59)
│ ┌─────────── 小时 (0-23)
│ │ ┌───────── 日 (1-31)
│ │ │ ┌─────── 月 (1-12)
│ │ │ │ ┌───── 星期 (0-7，0 和 7 都是周日)
│ │ │ │ │
* * * * *  command
```

### 4.2 特殊符号

| 符号 | 含义 | 示例 |
|------|------|------|
| `*` | 任意值 | `* * * * *` = 每分钟 |
| `,` | 列举 | `0 9,18 * * *` = 每天 9:00 和 18:00 |
| `-` | 范围 | `0 9-17 * * 1-5` = 工作日 9–17 点整点 |
| `/` | 步长 | `*/5 * * * *` = 每 5 分钟 |
| `@reboot` | 开机执行一次 | `@reboot /path/to/init.sh` |

### 4.3 常用示例

```cron
# 每天凌晨 2:00 备份
0 2 * * * /usr/local/bin/backup.sh

# 每 5 分钟检查磁盘
*/5 * * * * /usr/local/bin/disk-check.sh

# 每周一 9:00 发周报
0 9 * * 1 /usr/local/bin/weekly-report.sh

# 每月 1 号 3:30 清理旧日志
30 3 1 * * /usr/local/bin/log-cleanup.sh

# 工作日 8:30 启动某脚本
30 8 * * 1-5 /usr/local/bin/morning-job.sh
```

### 4.4 在线验证

编写复杂表达式时，可用 [crontab.guru](https://crontab.guru/) 验证含义（把表达式贴进去即可看到人类可读解释）。

### 4.5 `%` 转义

在 crontab 里，`%` 有特殊含义（换行相关）。若命令里需要 `%`（如 `date +%Y%m%d`），在 crontab 中要写成 `\%`：

```cron
0 2 * * * tar -czf /backup/webapp-$(date +\%Y\%m\%d).tar.gz /srv/webapp
```

---

## 5. 用户级与系统级 cron

### 5.1 用户 crontab（最常用）

每个用户可拥有自己的计划任务表：

```bash
# 编辑当前用户的 crontab
crontab -e

# 列出当前用户的任务
crontab -l

# 删除当前用户所有 cron 任务（慎用）
crontab -r

# 从文件导入（会覆盖现有任务）
crontab /path/to/my-crontab.txt
```

首次 `crontab -e` 会提示选择编辑器，推荐 `nano` 或 `vim`。

任务实际存储在（需 root 查看）：

```bash
sudo ls -la /var/spool/cron/crontabs/
```

### 5.2 系统 crontab：`/etc/crontab`

```bash
cat /etc/crontab
```

格式比用户 crontab **多一列「运行用户」**：

```
# m h dom mon dow user  command
0  2  *   *   *   root  /usr/local/bin/system-backup.sh
```

### 5.3 `/etc/cron.d/` 目录

适合软件包或运维团队 Drop-in 式添加任务，格式同 `/etc/crontab`（含 user 字段）：

```bash
# 示例：/etc/cron.d/myapp
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 3 * * * deploy /opt/myapp/scripts/nightly-sync.sh
```

### 5.4 预置周期目录

| 目录 | 触发频率 | 说明 |
|------|---------|------|
| `/etc/cron.hourly/` | 每小时 | 脚本需可执行 |
| `/etc/cron.daily/` | 每天 | 如 `logrotate`、`apt` 相关 |
| `/etc/cron.weekly/` | 每周 | |
| `/etc/cron.monthly/` | 每月 | |

```bash
ls -la /etc/cron.daily/
```

### 5.5 权限控制

限制哪些用户能用 crontab：

| 文件 | 作用 |
|------|------|
| `/etc/cron.allow` | 仅列表内用户可用（存在则生效，优先级高） |
| `/etc/cron.deny` | 列表内用户不可用 |

若两者都不存在，通常仅 root 和普通用户默认可用（视发行版而定）。

---

## 6. 实战：从零配置定时任务

以下在 **vm-ops** 上完成。

### 6.1 实验一：每日备份脚本

**Step 1 — 准备目录与脚本**

```bash
sudo mkdir -p /backup /srv/webapp
sudo mkdir -p /usr/local/bin

sudo tee /usr/local/bin/webapp-backup.sh <<'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backup"
SOURCE="/srv/webapp"
STAMP=$(date +%Y%m%d-%H%M%S)
LOG="/var/log/webapp-backup.log"

mkdir -p "$BACKUP_DIR"
tar -czf "${BACKUP_DIR}/webapp-${STAMP}.tar.gz" "$SOURCE" 2>>"$LOG"
echo "[$(date '+%F %T')] backup ok: webapp-${STAMP}.tar.gz" >> "$LOG"

# 保留最近 7 天
find "$BACKUP_DIR" -name 'webapp-*.tar.gz' -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/webapp-backup.sh
```

**Step 2 — 手动试跑**

```bash
sudo /usr/local/bin/webapp-backup.sh
ls -lh /backup/
tail /var/log/webapp-backup.log
```

**Step 3 — 写入 crontab**

```bash
crontab -e
```

添加（测试时可改为下一分钟执行，如当前 14:23 则写 `24 14 * * *`）：

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

# 每天凌晨 2:00 备份 webapp
0 2 * * * /usr/local/bin/webapp-backup.sh
```

**Step 4 — 验证**

```bash
crontab -l
# 等待触发后检查
tail -f /var/log/webapp-backup.log
```

### 6.2 实验二：用 cron 跑巡检脚本

若已完成 [Bash 脚本与巡检](/guide/automation/bash-scripts) 中的 `health-check.sh`：

```bash
chmod +x ~/bin/health-check.sh

crontab -e
```

```cron
# 每天早上 8:00 系统巡检
0 8 * * * /home/devops/bin/health-check.sh >> /var/log/health-check.log 2>&1
```

### 6.3 实验三：/etc/cron.d 方式（适合团队规范）

```bash
sudo tee /etc/cron.d/ops-learning <<'EOF'
# Ops Learning 示例任务
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# 每 10 分钟检查磁盘使用率
*/10 * * * * root /usr/local/bin/disk-alert.sh
EOF

sudo chmod 644 /etc/cron.d/ops-learning
```

配套脚本示例：

```bash
sudo tee /usr/local/bin/disk-alert.sh <<'EOF'
#!/bin/bash
THRESHOLD=85
USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$USAGE" -ge "$THRESHOLD" ]; then
  echo "[$(date)] WARNING: root disk ${USAGE}%" >> /var/log/disk-alert.log
fi
EOF
sudo chmod +x /usr/local/bin/disk-alert.sh
```

---

## 7. 脚本编写最佳实践

### 7.1 必做清单

```bash
#!/bin/bash
set -euo pipefail          # 出错即停、未定义变量报错、管道失败传递

LOG="/var/log/my-job.log"
exec >> "$LOG" 2>&1        # 统一日志输出

echo "=== job start: $(date) ==="

# 使用绝对路径
/usr/bin/find /tmp -type f -mtime +7 -delete

echo "=== job end: $(date) ==="
```

### 7.2 避免并发重叠

若任务可能跑超过一个周期，用 `flock` 防止重复执行：

```bash
#!/bin/bash
exec 200>/var/lock/my-job.lock
flock -n 200 || exit 0

# 实际任务逻辑
/usr/local/bin/long-running-task.sh
```

crontab 中：

```cron
* * * * * /usr/local/bin/my-job-with-lock.sh
```

### 7.3 与 systemd timer 的简要对比

| 特性 | cron | systemd timer |
|------|------|---------------|
| 学习成本 | 低，表达式直观 | 稍高，需 unit 文件 |
| 日志集成 | 需自行处理 | 与 journalctl 集成好 |
| 依赖/随机延迟 | 弱 | 支持 `OnCalendar`、随机延迟等 |
| 基础场景 | 日常定时任务 | 进阶自动化 |

本课程以 **cron** 为主；生产环境若已深度使用 systemd，timer 也是值得了解的替代方案。

---

## 8. 日志与排障

### 8.1 任务没跑？排查流程

```
1. cron 服务是否在运行？
   └── systemctl status cron

2. 语法是否正确？
   └── crontab -l 检查；用 crontab.guru 验证表达式

3. 脚本手动执行是否成功？
   └── sudo -u <user> /path/to/script.sh

4. 路径 / 权限 / 环境变量？
   └── 脚本是否 +x？是否用了绝对路径？

5. 查看系统日志
   └── grep CRON /var/log/syslog
```

### 8.2 查看 cron 执行记录

```bash
# Ubuntu 通常在 syslog
grep CRON /var/log/syslog | tail -20

# 或实时跟踪
sudo tail -f /var/log/syslog | grep CRON
```

典型日志：

```
CRON[12345]: (devops) CMD (/usr/local/bin/webapp-backup.sh)
```

### 8.3 邮件通知

若未重定向输出且系统配置了邮件，`cron` 会把 stdout/stderr 邮件给 `MAILTO` 指定的地址。无邮件服务器时建议显式写日志：

```cron
MAILTO=""
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

### 8.4 常见错误

| 现象 | 常见原因 | 处理 |
|------|---------|------|
| 命令找不到 | PATH 不含命令路径 | crontab 设 PATH 或脚本用绝对路径 |
| 脚本不执行 | 没 chmod +x | `chmod +x script.sh` |
| `%` 被截断 | 未转义 | 写成 `\%` |
| 时区不对 | 系统时区与预期不符 | `timedatectl` 检查 |
| 静默失败 | 无日志 | 加重定向 `>> log 2>&1` |

---

## 9. 安全审计（蓝队视角）

cron 是攻击者建立**持久化后门**的高频位置（见 [Linux 系统加固](/guide/security/system-hardening)、[应急响应](/guide/security/incident-response)）。

### 9.1 审计命令

```bash
# 当前用户
crontab -l

# 所有用户（需 root）
sudo ls -la /var/spool/cron/crontabs/
sudo cat /var/spool/cron/crontabs/*

# 系统级
cat /etc/crontab
ls -la /etc/cron.d/
ls -la /etc/cron.{hourly,daily,weekly,monthly}/

# 找最近改动的 cron 相关文件
sudo find /etc/cron* /var/spool/cron -type f -mtime -7 2>/dev/null
```

### 9.2 可疑迹象

- 下载并执行远程脚本的条目：`curl | bash`、`wget -O - | sh`
- 写入 `/tmp`、`/dev/shm` 等非常规路径
- 伪装成系统任务名（如 `systemd-update`）
- 隐藏字符、异常用户名

### 9.3 加固建议

- 限制 `cron.allow` / `cron.deny`
- 对 `/etc/cron.*` 做配置管理（Git + 审查）
- 定期自动化审计脚本 + 告警

---

## 10. 实践检查清单

在 vm-ops 上完成以下检查：

- [ ] 能解释 cron 5 段表达式，并写出「每天 3:15」和「每 10 分钟」的规则
- [ ] 能用 `crontab -e` 添加任务，用 `crontab -l` 查看
- [ ] 能说明用户 crontab 与 `/etc/crontab` 的格式差异
- [ ] 编写的脚本使用绝对路径，且手动执行与 cron 执行结果一致
- [ ] 能从 `/var/log/syslog` 中找到 CRON 执行记录
- [ ] 能说出 crontab 与 Supervisor 各自适用的 3 个场景
- [ ] 能列出至少 3 条 cron 审计命令

---

## 11. 参考资源

| 资源 | 说明 |
|------|------|
| [crontab.guru](https://crontab.guru/) | 在线表达式解释 |
| `man 5 crontab` | crontab 文件格式 |
| `man 8 cron` | cron 守护进程 |
| [定时任务](/guide/linux/cron) | 概要导读 |
| [/guide/automation/supervisor](/guide/automation/supervisor) | 进程守护对比与 Supervisor 教程 |

---

*本文档为 ops-security-learning 深度笔记，随课程更新。*
