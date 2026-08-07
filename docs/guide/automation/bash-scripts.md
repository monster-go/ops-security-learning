# Bash 脚本与巡检

> **适用场景**：日常运维自动化、系统巡检、定时任务与进程守护

## 示例：系统巡检脚本

```bash
#!/bin/bash
# 保存为 ~/bin/health-check.sh

echo "=== 系统巡检 $(date) ==="
echo "--- 磁盘 ---"
df -h | grep -E '^/dev'
echo "--- 内存 ---"
free -h
echo "--- 负载 ---"
uptime
echo "--- 失败登录 ---"
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5
echo "--- 监听端口 ---"
ss -tlnp
```

## 学习要点

- 变量、条件判断、循环
- 函数、`$1` `$2` 参数
- `set -euo pipefail` 安全写法
- 用 `crontab` 定时执行脚本
- **进程守护**：Supervisor 安装、program 配置、`supervisorctl` 管理
- **选型理解**：cron（到点执行）vs Supervisor（进程常驻、崩溃重启）vs systemd（系统服务）

## Supervisor 动手练习

```bash
# 1. 安装 Supervisor
sudo apt update && sudo apt install -y supervisor
sudo systemctl enable --now supervisor

# 2. 编写 program 配置（示例：守护一个简单 HTTP 服务）
sudo tee /etc/supervisor/conf.d/demoapp.conf <<'EOF'
[program:demoapp]
command=/usr/bin/python3 -m http.server 8000 --bind 127.0.0.1
directory=/srv/webapp
user=devops
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/demoapp.stdout.log
stderr_logfile=/var/log/supervisor/demoapp.stderr.log
EOF

# 3. 加载配置并查看状态
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl status
curl -s http://127.0.0.1:8000/
```

## 实践检查清单

- [ ] 能独立编写 30 行以上的 Bash 巡检脚本
- [ ] 脚本能通过 `shellcheck` 检查（可选）
- [ ] 已配置 cron 每日自动执行
- [ ] 能用 Supervisor 守护一个长期运行进程，并验证崩溃后自动重启
- [ ] 能说明 cron 与 Supervisor 各自适用的场景

## 深度文档

- [crontab 完全指南](/guide/linux/crontab) — 定时任务
- [Supervisor 完全指南](/guide/automation/supervisor) — 进程守护
