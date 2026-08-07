# 定时任务

> **适用场景**：按时间表执行备份、清理、巡检等任务

## 核心概念

- cron：到点触发、执行完通常退出
- `crontab -e`：编辑当前用户的定时任务
- `/etc/crontab`、`/etc/cron.d/`：系统级任务
- 时间表达式：分 时 日 月 周
- 与 Supervisor / systemd 的分工：cron 管「到点跑一次」，守护进程管「一直跑着」

## 动手练习

```bash
# 编辑当前用户 crontab
crontab -e
# 示例：每天凌晨 2 点备份
# 0 2 * * * tar -czf /backup/webapp-$(date +\%Y\%m\%d).tar.gz /srv/webapp

# 查看已配置的任务
crontab -l
ls -la /etc/cron.*
```

## 实践检查清单

- [ ] 能编写一条 cron 定时任务
- [ ] 能区分用户 crontab 与 `/etc/crontab` 的格式差异
- [ ] 能说明 cron 与 Supervisor 各自适用的场景

## 完整教程

表达式、用户/系统级 cron、脚本规范与安全审计，见下方 [crontab](/guide/linux/crontab)。

## 延伸阅读

- [磁盘与存储](/guide/linux/disk) — 常与定时清理、备份一起用
- [Bash 脚本与巡检](/guide/automation/bash-scripts) — 用 cron 跑巡检脚本
- [Supervisor](/guide/automation/supervisor) — 需要常驻进程时用它，而不是 cron
