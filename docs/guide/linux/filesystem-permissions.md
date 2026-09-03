# 文件系统与用户权限

> **适用场景**：新建用户、目录权限、日志检索

## 核心概念

- 根目录结构：`/etc`、`/var`、`/home`、`/tmp`、`/usr` 各自用途
- 权限：`rwx`、数字表示法（755、644）、`umask`
- 用户管理：`useradd`、`usermod`、`passwd`、`/etc/passwd`、`/etc/shadow`
- 组管理：`groupadd`、`/etc/group`

## 动手练习

在 vm-ops 上完成：

```bash
# 1. 创建用户 devops，加入 sudo 组
sudo useradd -m -s /bin/bash devops
sudo usermod -aG sudo devops

# 2. 创建目录并设置权限
sudo mkdir -p /srv/webapp
sudo chown devops:devops /srv/webapp
sudo chmod 750 /srv/webapp

# 3. 练习 find 和 grep
find /var/log -name "*.log" -mtime -1
grep "Failed password" /var/log/auth.log
```

## 实践检查清单

- [ ] 能新建用户并赋予 sudo 权限
- [ ] 能解释 755 和 644 的区别
- [ ] 能用 `find` 和 `grep` 在日志中检索内容

## 延伸阅读

- [管道与文本过滤](/guide/linux/pipe-and-filter) — `cat`/`命令` + `|` + `grep` 筛信息
- [SSH 完全指南](/guide/linux/ssh) — 远程登录与用户认证
