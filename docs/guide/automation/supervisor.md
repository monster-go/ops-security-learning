# Supervisor 完全指南：进程守护原理与实践

> **适用场景**：Web 应用进程守护、崩溃自动重启、多进程管理  
> **文档版本**：v1.0  
> **创建日期**：2026-08-07  
> **实验环境**：vm-ops（Ubuntu Server 22.04 LTS）

---

## 目录

1. [什么是 Supervisor](#1-什么是-supervisor)
2. [Supervisor 与 crontab 的区别](#2-supervisor-与-crontab-的区别)
3. [工作原理](#3-工作原理)
4. [安装与目录结构](#4-安装与目录结构)
5. [配置文件详解](#5-配置文件详解)
6. [实战：守护 Web 应用进程](#6-实战守护-web-应用进程)
7. [supervisorctl 常用命令](#7-supervisorctl-常用命令)
8. [与 systemd 的关系](#8-与-systemd-的关系)
9. [日志与排障](#9-日志与排障)
10. [安全与运维建议](#10-安全与运维建议)
11. [实践检查清单](#11-实践检查清单)
12. [参考资源](#12-参考资源)

---

## 1. 什么是 Supervisor

**Supervisor** 是一个用 Python 编写的**进程管理工具**，专门用来**启动、监控、自动重启**长期运行的程序（daemon / worker）。

### 1.1 生活类比

| 类比 | 对应 |
|------|------|
| 幼儿园老师看着小朋友，摔倒了扶起来 | Supervisor 监控进程，崩溃后自动重启 |
| 7×24 值班台 | 进程必须一直在线，不能「跑完就下班」 |
| Nginx 前面的应用工人 | Gunicorn / uWSGI / Node 进程由 Supervisor 看护 |

cron 是**闹钟**（到点叫醒干一件事）；Supervisor 是**保姆**（盯着孩子别走丢、别摔倒）。

### 1.2 典型使用场景

- Python Web：Gunicorn、uWSGI、Celery Worker / Beat
- Node.js：PM2 的替代方案之一（Supervisor 更偏传统 Linux 运维栈）
- 自定义守护脚本：数据采集 agent、消息消费者
- 开发 / 测试环境快速托管多个进程

### 1.3 不适合的场景

| 场景 | 更合适的工具 |
|------|-------------|
| 每天凌晨备份一次 | [crontab](/guide/linux/crontab) |
| 系统级核心服务（ssh、nginx） | **systemd**（`systemctl`） |
| 容器内单进程 | 容器编排 / Docker restart policy |
| 复杂分布式调度 | Kubernetes、Nomad 等 |

---

## 2. Supervisor 与 crontab 的区别

```
                    运维自动化两大方向
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
      时间驱动                           状态驱动
    「何时执行？」                      「是否还活着？」
           │                               │
           ▼                               ▼
        crontab                         Supervisor
     周期性、短任务                      长期运行、需重启
```

| 维度 | crontab | Supervisor |
|------|---------|------------|
| **解决的问题** | 定时执行 | 进程守护 |
| **进程生命周期** | 启动 → 结束（或周期性重复） | 启动 → 持续运行 → 异常则重启 |
| **配置核心** | 时间表达式 `分 时 日 月 周` | program 块：command、autorestart 等 |
| **管理接口** | `crontab -e` / `-l` | `supervisorctl status/start/stop` |
| **日志** | 自行重定向 | 内置 stdout/stderr 日志文件 |
| **开机自启** | cron 服务启动后按表执行 | supervisord 拉起 → 再拉起子进程 |
| **典型场景** | 定时备份、日志清理 | 进程守护、Web 应用 |

**组合示例**（生产常见架构）：

```
Supervisor 7×24 守护 Gunicorn（Web 应用）
        +
cron 每天 3:00 跑 mysqldump 备份
        +
cron 每 5 分钟跑磁盘巡检脚本
```

📖 crontab 深度文档 → [/guide/linux/crontab](/guide/linux/crontab)

---

## 3. 工作原理

### 3.1 架构

```
┌──────────────────────────────────────────────────────────┐
│  supervisord（主守护进程，由 systemd 或 init 拉起）          │
│    │                                                      │
│    ├── 读取 /etc/supervisor/supervisord.conf              │
│    ├── 读取 /etc/supervisor/conf.d/*.conf                 │
│    │                                                      │
│    ├── program:web (gunicorn)  ──监控──▶ 崩溃则 restart    │
│    ├── program:worker (celery)                            │
│    └── program:sync-script                                  │
│                                                           │
│  supervisorctl ◀──Unix Socket / TCP──▶ supervisord        │
└──────────────────────────────────────────────────────────┘
```

### 3.2 关键行为

| 配置项 | 行为 |
|--------|------|
| `autostart=true` | supervisord 启动时自动拉起该程序 |
| `autorestart=true` | 进程异常退出时自动重启 |
| `startretries=N` | 连续启动失败 N 次后进入 FATAL 状态 |
| `stopsignal=TERM` | 停止时发送的信号（默认 SIGTERM） |

### 3.3 进程状态

`supervisorctl status` 常见状态：

| 状态 | 含义 |
|------|------|
| `RUNNING` | 正常运行 |
| `STOPPED` | 已停止 |
| `STARTING` | 正在启动 |
| `BACKOFF` | 启动失败，等待重试 |
| `FATAL` | 多次启动失败，放弃 |
| `EXITED` | 正常退出（若 autorestart=false） |

---

## 4. 安装与目录结构

### 4.1 在 vm-ops 上安装

```bash
sudo apt update
sudo apt install -y supervisor
sudo systemctl enable supervisor
sudo systemctl start supervisor
sudo systemctl status supervisor
```

### 4.2 主要路径（Ubuntu/Debian）

| 路径 | 说明 |
|------|------|
| `/etc/supervisor/supervisord.conf` | 主配置（末尾 include conf.d） |
| `/etc/supervisor/conf.d/*.conf` | 各 program 配置（推荐放这里） |
| `/var/log/supervisor/supervisord.log` | supervisord 自身日志 |
| `/var/run/supervisor.sock` | supervisorctl 通信 socket |
| 程序 stdout/stderr | 由配置中的 `stdout_logfile` 等指定 |

### 4.3 验证安装

```bash
sudo supervisorctl status
# 无配置 program 时可能显示空或 only supervisord
```

---

## 5. 配置文件详解

### 5.1 最小 program 示例

```ini
; /etc/supervisor/conf.d/myapp.conf

[program:myapp]
command=/srv/myapp/venv/bin/gunicorn -w 2 -b 127.0.0.1:8000 app:app
directory=/srv/myapp
user=devops
autostart=true
autorestart=true
startsecs=3
startretries=3
stopwaitsecs=10
stdout_logfile=/var/log/supervisor/myapp.stdout.log
stderr_logfile=/var/log/supervisor/myapp.stderr.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
environment=LANG="en_US.UTF-8",APP_ENV="production"
```

### 5.2 常用指令说明

| 指令 | 说明 |
|------|------|
| `command` | 要执行的完整命令（建议绝对路径） |
| `directory` | 工作目录（相对路径、找 .env 等） |
| `user` | 以哪个用户运行（不要用 root，除非必要） |
| `autostart` | supervisord 启动时是否自动启动 |
| `autorestart` | 意外退出是否重启；`unexpected` 仅非 0 退出码重启 |
| `startsecs` | 运行超过 N 秒才视为启动成功 |
| `redirect_stderr` | 把 stderr 合并到 stdout 日志 |
| `numprocs` | 启动多个同名进程（配合 `process_name`） |

### 5.3 进程组 `[group:]`

管理多个相关 program：

```ini
[group:webstack]
programs=nginx-app,celery-worker
priority=999
```

```bash
sudo supervisorctl restart webstack:*
```

### 5.4 修改配置后生效

```bash
# 检查语法（supervisor 4.2+）
sudo supervisord -n -c /etc/supervisor/supervisord.conf &
# 或直接 reload

sudo supervisorctl reread      # 读取新配置
sudo supervisorctl update      # 应用变更（增删 program）
sudo supervisorctl restart myapp # 重启单个 program
```

---

## 6. 实战：守护 Web 应用进程

以下用 **Python Flask + Gunicorn** 演示（不依赖外部数据库，适合 vm-ops）。

### 6.1 准备应用

```bash
sudo mkdir -p /srv/demoapp
sudo chown "$USER":"$USER" /srv/demoapp
cd /srv/demoapp

python3 -m venv venv
source venv/bin/activate
pip install flask gunicorn

cat > app.py <<'EOF'
from flask import Flask
app = Flask(__name__)

@app.route("/")
def index():
    return "<h1>Supervisor Demo</h1><p>Process is supervised.</p>"
EOF

# 手动试跑（Ctrl+C 退出）
gunicorn -w 2 -b 127.0.0.1:8000 app:app
curl -s http://127.0.0.1:8000/
deactivate
```

### 6.2 编写 Supervisor 配置

```bash
sudo tee /etc/supervisor/conf.d/demoapp.conf <<'EOF'
[program:demoapp]
command=/srv/demoapp/venv/bin/gunicorn -w 2 -b 127.0.0.1:8000 app:app
directory=/srv/demoapp
user=devops
autostart=true
autorestart=true
startsecs=3
stdout_logfile=/var/log/supervisor/demoapp.stdout.log
stderr_logfile=/var/log/supervisor/demoapp.stderr.log
stopwaitsecs=10
EOF
```

若当前用户不是 devops，可改为你的用户名，或先创建 devops 用户：

```bash
# 可选：与课程其他实验保持一致
sudo useradd -m -s /bin/bash devops 2>/dev/null || true
sudo chown -R devops:devops /srv/demoapp
```

### 6.3 启动与验证

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status demoapp

curl -s http://127.0.0.1:8000/
```

### 6.4 验证「自动重启」

```bash
# 记下 PID
sudo supervisorctl status demoapp

# 模拟进程崩溃：杀掉 gunicorn master
sudo pkill -f "gunicorn.*demoapp" || sudo kill -9 <PID>

# 等待几秒
sleep 3
sudo supervisorctl status demoapp   # 应回到 RUNNING
curl -s http://127.0.0.1:8000/
```

### 6.5 与 Nginx 反向代理配合（可选）

若已完成 [Web 服务部署](/guide/network/web-deployment) 中的 Nginx 配置，可增加：

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

架构：

```
浏览器 → Nginx:80 → Gunicorn:8000（Supervisor 守护）
```

---

## 7. supervisorctl 常用命令

交互式：

```bash
sudo supervisorctl
```

常用子命令：

```bash
# 查看所有 program 状态
sudo supervisorctl status

# 启动 / 停止 / 重启
sudo supervisorctl start demoapp
sudo supervisorctl stop demoapp
sudo supervisorctl restart demoapp

# 批量
sudo supervisorctl restart all
sudo supervisorctl stop demoapp:*

# 配置热更新
sudo supervisorctl reread
sudo supervisorctl update

# 重新加载 supervisord 自身（较少用）
sudo supervisorctl reload

# 查看实时日志（需配置好 stdout_logfile）
sudo tail -f /var/log/supervisor/demoapp.stdout.log
```

一键非交互：

```bash
sudo supervisorctl restart demoapp
```

---

## 8. 与 systemd 的关系

现代 Ubuntu 上，很多系统服务由 **systemd** 管理；Supervisor 并未被取代，而是分工不同：

| 层级 | 工具 | 示例 |
|------|------|------|
| OS 级系统服务 | systemd | ssh、nginx、cron、supervisor 自身 |
| 应用级多进程 | Supervisor | 多个 Gunicorn worker、Celery、自定义脚本 |
| 定时任务 | cron | 备份、巡检 |

**Supervisor 自身**通常由 systemd 拉起：

```bash
systemctl status supervisor
```

```
systemd ──▶ supervisor.service ──▶ supervisord ──▶ your-app (gunicorn)
```

**何时优先 systemd 而非 Supervisor？**

- 单一、标准的系统服务 unit（如只有一个 nginx）
- 需要与 journald 深度集成、依赖顺序复杂

**何时用 Supervisor？**

- 同一台机器上多个**应用进程**需要统一看护
- 开发语言运行时进程（Python/Node）频繁变更命令行
- 团队已有 Supervisor 配置规范

---

## 9. 日志与排障

### 9.1 排查流程

```
1. supervisor 服务是否正常？
   └── systemctl status supervisor

2. program 什么状态？
   └── supervisorctl status

3. 看程序 stderr 日志
   └── tail /var/log/supervisor/<app>.stderr.log

4. 看 supervisord 主日志
   └── tail /var/log/supervisor/supervisord.log

5. command 能否手动以相同 user 执行？
   └── sudo -u devops /srv/demoapp/venv/bin/gunicorn ...
```

### 9.2 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| `FATAL` | 命令路径错、权限不足、端口占用 | 查 stderr 日志；手动执行 command |
| 反复 `BACKOFF` | startsecs 内进程退出 | 检查应用配置、依赖是否就绪 |
| `spawn err` | 用户无权限访问目录/venv | 检查 `user`、`directory` 权限 |
| 改了 conf 不生效 | 未 update | `reread && update` |
| 端口已被占用 | 上次进程未释放 | `ss -tlnp` 查占用；stop 后 restart |

### 9.3 调试技巧

前台运行 supervisord（仅调试，勿在生产长期用）：

```bash
sudo supervisord -n -c /etc/supervisor/supervisord.conf
```

提高日志级别（主配置 `[supervisord]` 段）：

```ini
loglevel=debug
```

---

## 10. 安全与运维建议

### 10.1 权限最小化

- `user=` 使用专用应用账号，避免 root
- 限制 `/etc/supervisor/conf.d/` 写权限（仅 root / 配置管理）
- 命令中使用绝对路径，防止 PATH 劫持

### 10.2 审计

```bash
ls -la /etc/supervisor/conf.d/
grep -r "command=" /etc/supervisor/conf.d/
```

异常迹象：下载远程脚本、bash -i 反向 shell、写入 /tmp 的可疑 command。

### 10.3 生产建议

- 日志轮转：配置 `stdout_logfile_maxbytes` 和 `backups`
- 监控：对 `FATAL` / `BACKOFF` 状态告警（Prometheus exporter 或简单 cron 巡检）
- 发布流程：先 `supervisorctl stop` → 部署代码 → `start`，或使用 graceful reload（视应用而定）
- 容器化后：评估是否还需要 Supervisor（单容器单进程时常用 Docker restart policy）

---

## 11. 实践检查清单

在 vm-ops 上完成：

- [ ] 已安装 Supervisor，且 `systemctl status supervisor` 为 active
- [ ] 能编写 `/etc/supervisor/conf.d/` 下的 program 配置并 `update` 生效
- [ ] 能用 `supervisorctl status` 查看 RUNNING 状态
- [ ] 手动 kill 子进程后，Supervisor 能在几秒内自动重启
- [ ] 能查看 stdout/stderr 日志定位启动失败原因
- [ ] 能清晰说明 Supervisor 与 crontab 的区别和配合方式
- [ ] 能说明 Supervisor 与 systemd 各自负责的层级

---

## 12. 参考资源

| 资源 | 说明 |
|------|------|
| [Supervisor 官方文档](http://supervisord.org/) | 配置项权威参考 |
| `man supervisord` / `man supervisorctl` | 手册页 |
| [Bash 脚本与巡检](/guide/automation/bash-scripts) | 自动化与进程守护 |
| [/guide/linux/crontab](/guide/linux/crontab) | 定时任务对比与 crontab 教程 |

---

*本文档为 ops-security-learning 深度笔记，随课程更新。*
