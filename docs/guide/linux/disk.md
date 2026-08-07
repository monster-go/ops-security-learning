# 磁盘与存储

> **适用场景**：查看磁盘占用、定位大文件、理解挂载与块设备

## 核心概念

- `df -h`：按文件系统查看可用空间
- `du -sh`：按目录统计占用
- `lsblk`：查看块设备与分区树
- `mount` / `/etc/fstab`：挂载点与开机挂载
- 日志轮转：`logrotate`（避免日志撑满磁盘）

## 动手练习

```bash
# 查看各分区使用率
df -h

# 找出占用最大的目录（从根目录往下收窄）
sudo du -sh /* 2>/dev/null | sort -hr | head
sudo du -sh /var/* 2>/dev/null | sort -hr | head

# 查看块设备
lsblk
```

## 实践检查清单

- [ ] 能用 `df -h` 判断哪个分区空间紧张
- [ ] 能用 `du` 定位占用最高的目录
- [ ] 能看懂 `lsblk` 输出的磁盘与分区关系

## 延伸阅读

- [Docker 磁盘清理](/guide/devops/docker-disk-cleanup) — 容器场景下的磁盘占满排查
- [定时任务](/guide/linux/cron) — 用 cron 做定期清理 / 备份
