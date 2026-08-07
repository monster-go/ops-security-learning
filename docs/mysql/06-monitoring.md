# 06 — 监控

> 对应 [MySQL 概览](/mysql/) 第 6 节

---

## 6.1 为什么需要监控？

**没有监控 = 盲运维。**

| 你能回答这些问题吗？ | 回答不出来 → 需要监控 |
|---------------------|---------------------|
| 当前连接数多少？是否接近上限？ | ✅ |
| 今天慢查询比昨天多还是少？ | ✅ |
| Buffer Pool 命中率正常吗？ | ✅ |
| 磁盘还能撑几天？ | ✅ |
| 主从复制延迟了多少？ | ✅ |

---

## 6.2 即时健康检查

不需要任何监控工具，MySQL 内置了足够多的状态变量。

### 连接状态

```sql
-- 当前所有活跃连接
SHOW FULL PROCESSLIST;

-- 连接数统计
SHOW GLOBAL STATUS LIKE '%Threads_connected%';     -- 当前连接数
SHOW GLOBAL STATUS LIKE '%Threads_running%';       -- 正在执行的线程
SHOW GLOBAL STATUS LIKE '%Connection_errors%';     -- 连接错误

-- 最大连接数设置
SHOW VARIABLES LIKE 'max_connections';
```

### 查询状态

```sql
-- 总查询量和慢查询数
SHOW GLOBAL STATUS LIKE '%Questions%';              -- 累计查询次数
SHOW GLOBAL STATUS LIKE '%Slow_queries%';           -- 慢查询累计次数
SHOW GLOBAL STATUS LIKE '%Queries_per_second%';     -- QPS（需开启 Performance Schema）

-- 临时表和排序
SHOW GLOBAL STATUS LIKE '%Created_tmp%';            -- 临时表创建次数
SHOW GLOBAL STATUS LIKE '%Sort%';                   -- 排序相关指标
```

### InnoDB 状态

```sql
-- Buffer Pool 命中率
SHOW GLOBAL STATUS LIKE '%innodb_buffer_pool_read_requests%';   -- 总读请求
SHOW GLOBAL STATUS LIKE '%innodb_buffer_pool_reads%';           -- 从磁盘读取次数

-- 命中率 ≈ (read_requests - reads) / read_requests * 100%
-- 正常值应 > 99%，低于 95% 说明 Buffer Pool 太小

-- 行操作统计
SHOW GLOBAL STATUS LIKE '%Innodb_rows%';           -- rows_read / inserted / updated / deleted

-- InnoDB 事务信息
SHOW ENGINE INNODB STATUS\G
```

---

## 6.3 Performance Schema

Performance Schema 是 MySQL 内置的性能监控框架，默认在 MySQL 8.0 中启用。

```sql
-- 检查是否启用
SHOW VARIABLES LIKE 'performance_schema';

-- 查看语句级别的等待事件
SELECT * FROM performance_schema.events_waits_summary_global_by_event_name
WHERE COUNT_STAR > 0
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- 查看表 IO 统计
SELECT * FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA = 'opsdb'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

**简化查询：哪些表 IO 最重？**
```sql
SELECT OBJECT_SCHEMA, OBJECT_NAME,
       ROUND(SUM_TIMER_WAIT / 1000000000, 2) AS total_ns,
       COUNT_STAR AS total_ops
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'sys')
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

---

## 6.4 sys Schema

MySQL 8.0 自带 `sys` 数据库，封装了对 Performance Schema 的便于阅读的查询。

```sql
-- 查看当前有哪些查询正在执行
SELECT * FROM sys.processlist;

-- 查看所有慢查询（需要 Performance Schema + events_statements_history 启用）
SELECT * FROM sys.statement_analysis WHERE avg_latency > '1.00 s' \G

-- 查看 IO 最热的表和文件
SELECT * FROM sys.io_global_by_file_by_bytes ORDER BY total DESC LIMIT 10;

-- 查看内存使用情况
SELECT * FROM sys.memory_global_total;

-- 查看全表扫描次数较多的查询
SELECT * FROM sys.statements_with_full_table_scans LIMIT 10;
```

---

## 6.5 Prometheus + mysqld_exporter + Grafana

### 架构

```
MySQL ──→ mysqld_exporter ──→ Prometheus ──→ Grafana
                                ↑
                        定时拉取 metrics
```

### 部署步骤

```bash
# 1. 创建监控用户
mysql -u root -p -e "
  CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'ExporterPass123!' WITH MAX_USER_CONNECTIONS 3;
  GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';
"

# 2. 下载并启动 mysqld_exporter
wget https://github.com/prometheus/mysqld_exporter/releases/download/v0.15.1/mysqld_exporter-0.15.1.linux-amd64.tar.gz
tar xvf mysqld_exporter-*.tar.gz
export DATA_SOURCE_NAME='exporter:ExporterPass123!@(localhost:3306)/'
./mysqld_exporter &
# 默认监听 :9104

# 3. Prometheus 配置
# prometheus.yml 添加 job
# - job_name: 'mysql'
#   static_configs:
#     - targets: ['localhost:9104']

# 4. Grafana 导入仪表板
# 官方模板 ID: 7362 (MySQL Overview)
```

---

## 6.6 关键告警规则

| 告警项 | 阈值 | 说明 |
|--------|------|------|
| 连接数占比 | > 80% of max_connections | 接近连接上限 |
| 慢查询激增 | > 50/5min（基线对比）| 性能突然恶化 |
| Buffer Pool 命中率 | < 95% | 内存不足 |
| 主从复制延迟 | > 30s | 同步延迟 |
| 磁盘使用率 | > 85% | 需要扩容或清理 |

---

## 6.7 验证清单

- [ ] 如何用内置命令查看 MySQL 的当前连接数和慢查询数？
- [ ] Buffer Pool 命中率怎么计算？正常值是多少？
- [ ] Performance Schema 和 sys schema 有什么区别？
- [ ] mysqld_exporter 需要哪些 MySQL 权限？
- [ ] 你会设置哪些告警规则？

---

*[上一章：主从复制与高可用](05-replication-and-ha.md) · [下一章：常见故障排查](07-common-faults.md)*
