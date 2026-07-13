# 04 — 性能调优

> 对应 [notes/mysql-guide.md](../notes/mysql-guide.md) 第 4 节

---

## 4.1 调优方法论

```
定位瓶颈 → 分析原因 → 调整参数 → 验证效果
```

常见的 MySQL 性能瓶颈按优先级：

```
SQL 语句慢  →  90% 的慢都是 SQL 或索引问题（先查这里）
内存不足    →  Buffer Pool 太小 → 磁盘 IO 飙升
连接数爆炸  →  应用层连接池设置不当
锁竞争      →  行锁 / 表锁导致并发下降
```

**调优原则：** 先看是否 SQL 问题（慢查询日志），再调操作系统和 MySQL 参数。不要在不清楚瓶颈前盲目改参数。

---

## 4.2 定位慢查询

### 开启慢查询日志

```sql
-- 查看当前慢查询设置
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';

-- 开启慢查询日志（生产可用，注意磁盘空间）
SET GLOBAL slow_query_log = ON;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 1;  -- 超过 1 秒记录
```

```bash
# 查看慢查询日志
sudo tail -f /var/log/mysql/slow.log
```

### pt-query-digest（Percona Toolkit）

```bash
# 安装 Percona Toolkit
sudo apt install -y percona-toolkit

# 分析慢查询日志
pt-query-digest /var/log/mysql/slow.log

# 结果按查询总耗时排序，排在最前面的就是最需要优化的查询
```

---

## 4.3 EXPLAIN 读懂执行计划

```sql
EXPLAIN SELECT * FROM users WHERE status = 1 ORDER BY created_at DESC\G
```

**关键列解读：**

| 列 | 含义 | 好 / 坏 |
|----|------|---------|
| `type` | 访问方式 | `const` > `ref` > `range` > `index` > **`ALL`** |
| `key` | 使用的索引 | 有值最好，`NULL` 表示没用到索引 |
| `rows` | 扫描行数估计 | 越小越好 |
| `Extra` | 附加信息 | `Using index`（好），**`Using filesort`**（坏，需要优化排序），**`Using temporary`**（坏，使用了临时表） |

**常见调优信号：**
- `type = ALL` → 全表扫描，需要加索引
- `Extra = Using filesort` → ORDER BY 没有走索引
- `Extra = Using temporary` → GROUP BY 或 DISTINCT 需要优化
- `rows` 远大于预期 → 统计信息可能过时（执行 `ANALYZE TABLE`）

---

## 4.4 关键配置参数

### 内存类参数（最重要）

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]

# InnoDB Buffer Pool — MySQL 最重要的性能参数
# 建议设为可用内存的 60–75%
# 例如 8GB 服务器 → 5-6GB
innodb_buffer_pool_size = 6G

# MySQL 8.0 支持在线调整
# SET GLOBAL innodb_buffer_pool_size = 6 * 1024 * 1024 * 1024;
```

### InnoDB 事务与 IO 参数

```ini
# 日志文件大小（影响写入性能）
innodb_log_file_size = 512M          # 默认 48M，建议 256M-2G
innodb_log_buffer_size = 64M         # 默认 16M

# IO 线程数（4 核以上可适当增加）
innodb_read_io_threads = 8
innodb_write_io_threads = 8

# 刷盘策略（平衡性能与数据安全）
innodb_flush_log_at_trx_commit = 2   # 0=最快但丢1秒数据 / 1=最安全 / 2=折中
```

### 连接类参数

```ini
# 最大连接数（根据应用并发调整）
max_connections = 500                # 默认 151

# 连接超时（防止僵尸连接占用池）
wait_timeout = 600                   # 默认 28800（8小时）
interactive_timeout = 600            # 默认 28800（8小时）
```

---

## 4.5 连接池（应用层）

**不要在 MySQL 层频繁创建和销毁连接**——这不仅慢，而且会导致 `Too many connections`。

连接池原理：

```
应用 ─→ 连接池（维护 N 个长连接）─→ MySQL
         ↑ 重用连接
         ↑ 限制最大连接数
         ↑ 自动超时回收
```

| 语言/框架 | 常用连接池 |
|-----------|-----------|
| Python | SQLAlchemy pool_size |
| Java | HikariCP（默认）|
| Node.js | mysql2 pool |
| Go | database/sql 内置连接池 |

> 最佳实践：连接池最大连接数 ≤ MySQL `max_connections` 的 80%，留余量给 DBA 直接连入排查。

---

## 4.6 常见 SQL 优化技巧

```sql
-- ❌ 慢：无索引
SELECT * FROM orders WHERE status = 'pending';

-- ✅ 快：加索引
CREATE INDEX idx_status ON orders(status);

-- ❌ 慢：SELECT * 拖太多数据
SELECT * FROM users WHERE email LIKE '%@example.com';

-- ✅ 快：前模糊匹配不走索引，考虑全文索引
ALTER TABLE users ADD FULLTEXT INDEX ft_email(email);
-- 或改用等值查询
SELECT id, username FROM users WHERE email = 'alice@example.com';

-- ❌ 慢：分页偏移过大
SELECT * FROM logs ORDER BY id LIMIT 100000, 20;

-- ✅ 快：游标分页（位点分页）
SELECT * FROM logs WHERE id > 100000 ORDER BY id LIMIT 20;

-- ❌ 慢：ORM 的 N+1 查询
-- 循环中每条记录都发一次 SQL

-- ✅ 快：JOIN 一次查出
SELECT u.*, o.* FROM users u LEFT JOIN orders o ON u.id = o.user_id;
```

---

## 4.7 监控调优效果

```sql
-- 查看 InnoDB 状态（buffer pool 命中率、读写量）
SHOW ENGINE INNODB STATUS\G

-- 关键指标
SHOW GLOBAL STATUS LIKE '%innodb_buffer_pool_read%';  -- 看命中率
SHOW GLOBAL STATUS LIKE '%slow_queries%';              -- 看慢查询数量变化
SHOW GLOBAL STATUS LIKE '%threads_connected%';         -- 看连接数
```

---

## 4.8 验证清单

- [ ] 如何开启慢查询日志并定位慢 SQL？
- [ ] EXPLAIN 中 `type=ALL` 和 `Using filesort` 分别意味着什么？
- [ ] `innodb_buffer_pool_size` 的建议值是多少？为什么它是最重要的参数？
- [ ] max_connections 设置过高会有什么后果？
- [ ] 连接池的作用是什么？应该怎么配置大小？

---

*[上一章：备份与恢复](03-backup-and-recovery.md) · [下一章：主从复制与高可用](05-replication-and-ha.md)*
