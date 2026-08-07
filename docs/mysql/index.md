# 🐬 MySQL 完全指南

> **面向对象**：已完成 Linux 运维基础，熟悉 Ubuntu 命令行操作的运维/开发人员。  
> **定位**：系统性 MySQL 运维教程——从部署加固到调优排障，完整覆盖数据库运维的核心场景。  
> **适用场景**：MySQL 部署、安全加固、备份恢复、性能调优与故障排查

---

## 阅读方式

本文档是 MySQL 教程的**目录页**。每节给出 2–5 段核心概要 + 指向下方 `mysql/` 目录对应文件的完整讲解链接。

### 概览流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MySQL 运维学习路径                              │
├─────────────────────────────────────────────────────────────────────┤
│  安装与基础使用 ──→ 用户与安全加固 ──→ 备份与恢复 ──→ 性能调优      │
│        │                    │                │              │        │
│        └──── 基础知识 ──────┘    排障 ←─── 监控              │        │
│                                                              │        │
│  主从复制与高可用 ←────────────────────────────────────────────┘        │
│        │                                                             │
│  卸载与清理 ←── 实验验证                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📒 跨平台速查手册

> 如果你需要的是**不同操作系统的安装、启动、停止、卸载和安全配置**，而不是深入 MySQL 运维本身，直接看这里：

👉 [**MySQL 跨平台安装与安全配置完全指南**](/mysql/cross-platform-install)

覆盖 Linux（Ubuntu/Debian 的 apt、官方 APT 源、通用二进制包；RHEL/CentOS 的 dnf、官方 YUM 源）、macOS（Homebrew、DMG、Tarball）、Windows（MSI、ZIP 绿色版）和 Docker 跨平台统一部署。每个渠道都含安装→启动→停止→卸载→安全配置的完整闭环。

---

## 章节索引

### 1️⃣ [安装与基础使用](/mysql/01-install-and-basics)

涵盖 MySQL 8.0 在 Ubuntu 上的多种安装方式（apt / Docker / 源码编译），以及 CLI 客户端 `mysql` 的基本用法。学完可独立完成建库、建表、CRUD 和导入导出操作。

**核心速查：**
```bash
# 安装
sudo apt update && sudo apt install -y mysql-server-8.0
sudo systemctl start mysql

# 连接
mysql -u root -p

# 常用 SQL
SHOW DATABASES;
USE mysql;
SELECT User, Host FROM user;
CREATE DATABASE opsdb DEFAULT CHARACTER SET utf8mb4;
```

**更多内容 →** [`mysql/01-install-and-basics.md`](/mysql/01-install-and-basics)

---

### 2️⃣ [用户与安全加固](/mysql/02-user-and-security)

深入 MySQL 的权限体系——用户管理、GRANT 授权原理、最小权限原则。同时覆盖安全加固的必要步骤：删除匿名用户、禁止 root 远程登录、密码策略插件、SSL 加密连接和审计日志。

**安全底线清单：**
| 检查项 | 命令 |
|--------|------|
| 删除匿名用户 | `DROP USER IF EXISTS ''@'localhost';` |
| 禁止 root 远程 | `DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost','127.0.0.1');` |
| 配置密码策略 | `INSTALL COMPONENT 'file://component_validate_password';` |
| 查看所有用户 | `SELECT User, Host FROM mysql.user;` |

**更多内容 →** [`mysql/02-user-and-security.md`](/mysql/02-user-and-security)

---

### 3️⃣ [备份与恢复](/mysql/03-backup-and-recovery)

讲解逻辑备份（`mysqldump`）和物理备份（`XtraBackup`），重点在二进制日志（`binlog`）的原理和基于时间点恢复（PITR）。运维必备技能——模拟误删数据后精确恢复到误操作前一刻。

**关键命令速记：**
```bash
# 全量备份
mysqldump --all-databases --single-transaction --flush-logs > backup.sql

# 查看 binlog 位置
SHOW MASTER STATUS;

# PITR 恢复
mysqlbinlog --start-datetime="2026-01-01 10:00:00" \
            --stop-datetime="2026-01-01 10:30:00" \
            binlog.000001 | mysql -u root
```

**更多内容 →** [`mysql/03-backup-and-recovery.md`](/mysql/03-backup-and-recovery)

---

### 4️⃣ [性能调优](/mysql/04-performance-tuning)

以"定位慢查询 → 分析执行计划 → 调整参数 → 验证效果"为闭环，介绍 MySQL 调优的实战方法。不深入 InnoDB 内部实现，聚焦可操作的调优工具和参数。

**调优三板斧：**
1. **慢查询日志** — 找到要优化的 SQL
2. **EXPLAIN** — 读懂查询如何执行
3. **innodb_buffer_pool_size** — 最重要的性能参数，建议设为可用内存的 60–75%

**更多内容 →** [`mysql/04-performance-tuning.md`](/mysql/04-performance-tuning)

---

### 5️⃣ [主从复制与高可用](/mysql/05-replication-and-ha)

从零配置 MySQL 异步复制和半同步复制，理解读写分离架构和故障切换的基本思路。以"实战能用上"为标准，不深入 Group Replication 或 InnoDB Cluster 的复杂拓扑。

**一句话理解复制：**
> 主库将变更写入 binlog → 从库的 I/O 线程拉取 binlog 写入 relay log → SQL 线程重放 relay log → 从库追上主库状态。

**更多内容 →** [`mysql/05-replication-and-ha.md`](/mysql/05-replication-and-ha)

---

### 6️⃣ [监控](/mysql/06-monitoring)

使用 MySQL 内置的 Performance Schema 和系统变量来观察数据库健康状态。同时介绍 Prometheus + mysqld_exporter + Grafana 的监控栈搭建。

**即时健康检查三连：**
```sql
-- 当前活跃连接
SHOW FULL PROCESSLIST;

-- 关键状态指标
SHOW GLOBAL STATUS LIKE '%Threads_connected%';
SHOW GLOBAL STATUS LIKE '%Innodb_rows_read%';

-- 慢查询统计
SHOW GLOBAL STATUS LIKE '%Slow_queries%';
```

**更多内容 →** [`mysql/06-monitoring.md`](/mysql/06-monitoring)

---

### 7️⃣ [常见故障排查](/mysql/07-common-faults)

汇总运维中最常遇到的 MySQL 故障场景及处理步骤——连接不上、Too many connections、死锁、表损坏、磁盘空间满等。每个场景都给排查思路和解决命令。

**排障优先级：**
```
服务不可达 → 检查端口/bind-address/防火墙
连接被拒   → 检查用户权限/host
连接满     → 检查 max_connections + 连接池
慢/卡死    → 检查锁 + 慢查询 + 磁盘 IO
数据异常   → 检查 binlog + 备份
```

**更多内容 →** [`mysql/07-common-faults.md`](/mysql/07-common-faults)

---

### 8️⃣ [卸载与清理](/mysql/08-uninstall-and-cleanup)

安全卸载 MySQL 和清理环境的完整流程——包括备份数据、逐层卸载包、删除数据目录、清理残余配置。同时涵盖 Docker 部署的清理方法。

**更多内容 →** [`mysql/08-uninstall-and-cleanup.md`](/mysql/08-uninstall-and-cleanup)

---

## 🧪 动手实验

> **建议**：按顺序完成以下实验，巩固各章节知识。

| # | 实验 | 时长 | 前置知识 | 内容 |
|---|------|------|---------|------|
| 1 | [部署与安全加固](/mysql/labs/lab-01-deploy-and-harden) | 60 min | 章节 1、2 | 从零部署 → 安全加固 → 验证 |
| 2 | [基于时间点的恢复（PITR）](/mysql/labs/lab-02-pitr-recovery) | 45 min | 章节 3 | 模拟误删 → binlog 精确恢复 |
| 3 | [主从复制与故障切换](/mysql/labs/lab-03-replication-failover) | 60 min | 章节 5 | 配置主从 → 模拟宕机 → 切换 |

---

## 参考资源

| 资源 | 说明 |
|------|------|
| [MySQL 官方文档](https://dev.mysql.com/doc/refman/8.0/en/) | 第一手权威资料 |
| [Percona Blog](https://www.percona.com/blog/) | 实战调优和排障案例 |
| [MySQL Performance Blog](https://mysqlperf.github.io/) | 性能相关深度文章 |

---

*发现错误或希望补充？欢迎提 Issue / PR。*
