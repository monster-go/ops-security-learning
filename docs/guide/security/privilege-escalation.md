# 权限提升与防御

> **适用场景**：在授权环境理解提权思路，从防御视角加固系统

::: warning 合法提醒
提权练习仅在 TryHackMe、HackTheBox 等授权靶场进行。
:::

## 核心概念

- 提权类型：垂直提权（普通用户 → root）、水平提权（同级用户）
- Linux 提权常见向量（防御视角）：
  - SUID/SGID 滥用
  - 内核漏洞
  - 计划任务配置错误
  - 敏感文件权限（`/etc/passwd` 可写）
  - sudo 配置不当（`sudo -l`）

## 推荐练习（TryHackMe）

- Linux Fundamentals 系列
- Basic Pentesting 房间

## 实践检查清单

- [ ] 能在 TryHackMe 完成至少 2 个 Easy 房间
- [ ] 能列出 5 种 Linux 提权向量及对应防御措施
- [ ] 能使用 `sudo -l` 和 `find / -perm -4000` 做审计

## 延伸阅读

- [Linux 系统加固](/guide/security/system-hardening)
- [crontab 安全审计](/guide/linux/crontab)
