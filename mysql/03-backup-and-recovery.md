# 03 — 备份与恢复

> 对应 [notes/mysql-guide.md](../notes/mysql-guide.md) 第 3 节

---

## 3.1 为什么要做备份？

```
数据丢失场景                 恢复方案
────────────────────────────────────────────
误删除数据（DROP/TRUNCATE）  → 全量备份 + binlog PITR
表结构误操作（ALTER）        → 全量备份 + binlog PITR
磁盘损坏/实例崩溃            → 物理备份（或全量备份）
逻辑错误（数据被改错）       → 全量备份 + binlog PITR
```

**核心原则：** 全量备份 + 增量（binlog）备份缺一不可。只有全量备份没有 binlog，最多恢复到备份时刻。

---

## 3.2 逻辑备份 — mysqldump

`mysqldump` 生成可读的 SQL 语句，是最常用的逻辑备份工具。

### 常用示例

```bash
# 单库备份（生产推荐参数）
mysqldump -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  opsdb > opsdb_$(date +%F).sql

# 全库备份
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --flush-logs \
  --master-data=2 \
  > full_backup_$(date +%F).sql

# 仅备份表结构（不包含数据）
mysqldump -u root -p --no-data opsdb > schema_only.sql

# 压缩备份（推荐给文件较大的场景）
mysqldump -u root -p opsdb | gzip > opsdb_$(date +%F).sql.gz
```

### 参数解读

| 参数 | 作用 |
|------|------|
| `--single-transaction` | 开启事务获取一致性快照，不锁表（仅 InnoDB） |
| `--flush-logs` | 导出前刷新 binlog，新日志从此开始 |
| `--master-data=2` | 在导出文件中记录备份时刻的 binlog 位置（注释形式） |
| `--routines` | 备份存储过程和函数 |
| `--triggers` | 备份触发器 |
| `--events` | 备份事件调度器 |

### 恢复

```bash
# 恢复全量备份
mysql -u root -p < full_backup.sql

# 恢复到指定数据库
mysql -u root -p opsdb < opsdb_2026-01-01.sql
```

---

## 3.3 二进制日志 (binlog)

### 什么是 binlog？

binlog（Binary Log）记录所有对数据库产生变更的操作（DDL 和 DML，除了 SELECT/SHOW）。用途：
- **恢复**：基于时间点恢复（PITR）
- **复制**：主从同步的基础
- **审计**：查看过去的变更记录

### 配置 binlog

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin
expire_logs_days = 7
max_binlog_size = 100M
binlog_format = ROW
```

```bash
# 重载配置
sudo systemctl restart mysql
```

**binlog_format 三种格式：**

| 格式 | 记录方式 | 优缺点 |
|------|---------|--------|
| `STATEMENT` | 记录 SQL 语句 | 空间小，但非确定性函数结果可能不一致 |
| `ROW`（推荐） | 记录每行变更 | 最精确，恢复安全，但空间较大 |
| `MIXED` | 混合模式 | 默认用 STATEMENT，非安全时自动切 ROW |

> **生产环境建议使用 `ROW`**——虽然占用磁盘稍多，但恢复过程最精确，不会出现 STATEMENT 模式下因函数/时间导致的数据不一致。

### binlog 管理命令

```sql
-- 查看当前 binlog 状态
SHOW MASTER STATUS;

-- 查看所有 binlog 文件
SHOW BINARY LOGS;

-- 查看最后一个 binlog 中的事件
SHOW BINLOG EVENTS IN 'mysql-bin.000001' LIMIT 10;

-- 刷新 binlog（重新开始一个日志文件）
FLUSH LOGS;
```

---

## 3.4 基于时间点恢复（PITR）

PITR = Point-In-Time Recovery，利用全量备份 + binlog 将数据库恢复到任意时间点。

### 恢复流程

```
1️⃣ 恢复最近的全量备份
2️⃣ 从全量备份时刻到目标时间点，重放 binlog
```

### 实操步骤

```bash
# 1. 假设 10:00 做了全量备份
# 2. 10:30 发现误删了一张表

# 3. 恢复全量备份
mysql -u root -p < full_backup_2026-01-01.sql

# 4. 重放 10:00 到 10:29 的 binlog（避开误删时刻）
mysqlbinlog \
  --start-datetime="2026-01-01 10:00:01" \
  --stop-datetime="2026-01-01 10:29:59" \
  /var/log/mysql/mysql-bin.000001 \
  | mysql -u root -p
```

### 精确到位置点（更精确）

```bash
# 先查看 binlog 中的具体位置
mysqlbinlog /var/log/mysql/mysql-bin.000001 > binlog_dump.sql
# 找到误删 SQL 前的 position

# 恢复到指定位置之前
mysqlbinlog \
  --start-position=1567 \
  --stop-position=1892 \
  /var/log/mysql/mysql-bin.000001 \
  | mysql -u root -p
```

### PITR 注意事项

- **binlog 必须已开启**（`log_bin`）
- **全量备份时加 `--flush-logs`**，这样后续的 binlog 从新文件开始，恢复时更容易定位
- **保留足够的 binlog 天数**（`expire_logs_days`），至少覆盖两次全量备份之间的间隔
- **恢复前确认目标时间点**——如果不确定，先在测试库验证
- **恢复是重放逻辑操作**，不会影响其他数据库

---

## 3.5 物理备份 — XtraBackup（概念了解）

| 对比 | mysqldump | XtraBackup |
|------|-----------|------------|
| 备份方式 | SQL 语句 | 物理文件拷贝 |
| 速度 | 慢（大库）| 快 |
| 空间 | 文本小 | 与原库相近 |
| 恢复速度 | 慢（逐条执行 SQL）| 快（直接拷贝数据文件）|
| 适用场景 | 小库(< 50GB) | 大库(> 50GB) |

```bash
# XtraBackup 基本使用（需要先安装 percona-xtrabackup）
sudo apt install -y percona-xtrabackup-80

# 全量备份
xtrabackup --backup --target-dir=/backup/mysql/full/

# 准备恢复
xtrabackup --prepare --target-dir=/backup/mysql/full/

# 恢复
xtrabackup --copy-back --target-dir=/backup/mysql/full/
```

> 小库用 mysqldump 足够。当数据库超过 50GB 时，物理备份的优势才真正体现。

---

## 3.6 备份策略建议

| 场景 | 全量备份频率 | binlog 保留 | 恢复时间目标 |
|------|------------|------------|------------|
| 开发/测试 | 每周一次 | 3 天 | 可容忍数小时 |
| 小型生产 | 每天一次 | 7 天 | < 1 小时 |
| 中型生产 | 每天一次 + 每 6h | 14 天 | < 30 分钟 |

---

## 3.7 验证清单

- [ ] mysqldump 的 `--single-transaction` 是做什么的？
- [ ] binlog 有哪三种格式？生产推荐用哪种？
- [ ] PITR 的完整流程是什么？
- [ ] 如何用 `mysqlbinlog` 恢复到误删操作前？
- [ ] 物理备份（XtraBackup）和逻辑备份（mysqldump）各自适合什么场景？

---

*[上一章：用户与安全加固](02-user-and-security.md) · [下一章：性能调优](04-performance-tuning.md)*
