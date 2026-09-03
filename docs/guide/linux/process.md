# 进程管理

> **适用场景**：查看资源占用、定位异常进程、安全结束进程

## 核心概念

- `ps aux`：列出进程及所属用户、CPU/内存占用
- `top` / `htop`：交互式实时监控
- `kill` / `kill -9`：发送信号结束进程（优先温和信号）
- `nice` / `renice`：调整进程优先级
- 与服务的关系：长期服务优先用 `systemctl` / Supervisor，而不是只靠 `kill`

## 动手练习

```bash
# 按内存占用排序，看前几名
ps aux --sort=-%mem | head

# 按 CPU 占用排序
ps aux --sort=-%cpu | head

# 实时观察（退出按 q）
top

# 结束进程（先确认 PID）
# kill <PID>          # 默认 SIGTERM，优雅退出
# kill -9 <PID>       # SIGKILL，强制结束（慎用）
```

## 实践检查清单

- [ ] 能找出占用 CPU / 内存最高的进程
- [ ] 能区分 `kill` 与 `kill -9` 的适用场景
- [ ] 知道常驻服务应优先用 systemd / Supervisor 管理

## 延伸阅读

- [软件包与服务管理](/guide/linux/package-services) — systemd 与服务启停
- [管道与文本过滤](/guide/linux/pipe-and-filter) — `ps aux | grep` 筛进程
- [Linux 系统端口使用情况](/guide/network/port-usage) — 由端口反查占用进程
- [Supervisor](/guide/automation/supervisor) — 进程守护与崩溃重启
- [Bash 脚本与巡检](/guide/automation/bash-scripts) — 巡检脚本里采集进程与负载
