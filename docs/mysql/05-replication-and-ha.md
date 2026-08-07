# 05 — 主从复制与高可用

> 对应 [MySQL 概览](/mysql/) 第 5 节

---

## 5.1 什么是主从复制？

主从复制（Replication）是指**一个主库（Source）将数据变更同步到一个或多个从库（Replica）**的机制。

```
                        ┌──────────┐
         写入 ─────────→ │  主库     │
                        │  (Source) │
                        └────┬─────┘
                             │ binlog
                             │
               ┌─────────────┼─────────────┐
               │             │             │
               ▼             ▼             ▼
          ┌─────────┐  ┌─────────┐  ┌─────────┐
          │ 从库 A   │  │ 从库 B   │  │ 从库 C   │
          │(Replica) │  │(Replica) │  │(Replica) │
          └─────────┘  └─────────┘  └─────────┘
               │             │             │
          ←─── 读取 ───────────────── ───→
```

**主从复制的用途：**
- **读写分离**：写走主库，读走从库，分担主库压力
- **灾备**：主库挂了，可以切换到从库
- **备份/分析**：在从库做备份或跑分析查询，不影响主库

---

## 5.2 复制原理

```
主库            从库
─────────────────────────────────────
1. 写入数据
2. 写入 binlog
                 3. I/O 线程拉取 binlog
                 4. 写入 relay log
                 5. SQL 线程重放 relay log
                 6. 数据写入从库
```

**三个关键线程：**
| 线程 | 位置 | 作用 |
|------|------|------|
| Binlog dump | 主库 | 发送 binlog 到从库 |
| I/O thread | 从库 | 接收主库的 binlog，写入 relay log |
| SQL thread | 从库 | 读取 relay log 并执行 |

---

## 5.3 配置异步复制

### 准备工作

需要两台 MySQL 实例（可以用虚拟机或 Docker）：

```
主库: 192.168.1.10:3306
从库: 192.168.1.20:3306
```

### 第一步：主库配置

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf（主库）
[mysqld]
server-id = 1                    # 唯一值，不能和从库重复
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
expire_logs_days = 7
```

```bash
sudo systemctl restart mysql
```

### 第二步：在主库创建复制用户

```sql
CREATE USER 'replicator'@'192.168.1.%' IDENTIFIED BY 'ReplPass123!';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'192.168.1.%';
FLUSH PRIVILEGES;

-- 记录 binlog 位置
SHOW MASTER STATUS;
-- 输出示例：
-- File: mysql-bin.000003, Position: 1567
```

### 第三步：从库配置

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf（从库）
[mysqld]
server-id = 2                    # 必须与主库不同
log_bin = /var/log/mysql/mysql-bin
relay_log = /var/log/mysql/mysql-relay-bin
read_only = ON                   # 从库设为只读（防止误写）
```

```bash
sudo systemctl restart mysql
```

### 第四步：从库连接主库

```sql
-- 在从库上执行
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.1.10',
  SOURCE_PORT=3306,
  SOURCE_USER='replicator',
  SOURCE_PASSWORD='ReplPass123!',
  SOURCE_LOG_FILE='mysql-bin.000003',
  SOURCE_LOG_POS=1567;

-- MySQL 8.0.23+ 语法：
START REPLICA;

-- 旧版语法（兼容）：
-- START SLAVE;
```

### 第五步：验证复制

```sql
-- 在主库查看
SHOW REPLICA HOSTS;

-- 在从库查看
SHOW REPLICA STATUS\G
-- 重点看：
--   Replica_IO_Running: Yes
--   Replica_SQL_Running: Yes
--   Seconds_Behind_Source: 0
```

---

## 5.4 半同步复制

异步复制的问题：主库写入成功就返回客户端，binlog 可能还没传到从库。如果此时主库宕机，数据就会丢失。

**半同步复制**保证至少有一个从库确认收到 binlog 后，主库才返回写入成功。

### 启用半同步复制

```bash
# 主库安装插件
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
SET GLOBAL rpl_semi_sync_source_enabled = 1;

# 从库安装插件
INSTALL PLUGIN rpl_semi_sync_replica SONAME 'semisync_replica.so';
SET GLOBAL rpl_semi_sync_replica_enabled = 1;

# 从库重启复制
STOP REPLICA;
START REPLICA;

# 在配置文件中持久化
# 主库加：rpl_semi_sync_source_enabled = 1
# 从库加：rpl_semi_sync_replica_enabled = 1
```

---

## 5.5 读写分离概念

**读写分离**在应用层或代理层实现：

```
                  ┌──────────┐
                  │  应用     │
                  └────┬─────┘
                       │
                 ┌─────┴─────┐
                 │  读写分离   │
                 │  代理层    │
                 │ (ProxySQL/ │
                 │  MySQL Router)
                 └──┬─────┬──┘
                    │     │
             写入   │     │  读取
                    ▼     ▼
               ┌────────┐  ┌────────┐
               │ 主库    │  │ 从库    │
               │ (写)    │  │ (读)    │
               └────────┘  └────────┘
```

常见实现方案：

| 方案 | 说明 |
|------|------|
| **应用层实现** | 框架配多数据源（写库/读库），代码里区分 |
| **ProxySQL** | 中间代理层，对应用透明，支持自动读写分离和故障检测 |
| **MySQL Router** | MySQL 官方路由，轻量级 |

---

## 5.6 故障切换思路

### 主库宕机时的切换流程

```
1. 确认主库不可用（应用连接失败 / 监控告警）
2. 选择一个从库提升为新主库
3. 其他从库重新指向新主库
4. 切换应用连接（DNS/代理/配置重载）
```

### 手动提升从库

```sql
-- 在从库上执行
STOP REPLICA;
RESET REPLICA ALL;
SET GLOBAL read_only = OFF;

-- 现在这个从库已经成为新主库
```

### 自动化方案（了解）

| 方案 | 说明 |
|------|------|
| **MHA** (Master High Availability) | 经典方案，自动检测主库故障并 promote 从库 |
| **Orchestrator** | 现代方案，支持拓扑管理和自动故障恢复 |
| **InnoDB Cluster** | MySQL 8.0 官方方案，基于 Group Replication |

---

## 5.7 复制运维注意事项

```sql
-- 查看复制延迟
SHOW REPLICA STATUS\G
-- Seconds_Behind_Source: 0   ← 理想值

-- 跳过复制错误（谨慎使用！只在确认无影响时）
SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;
START REPLICA;

-- 重新同步从库（当主从数据不一致时）
-- 需要重新全量备份 → 恢复到从库 → 重新建立复制
```

**常见复制延迟原因：**
- 从库硬件性能不如主库
- 主库有大量写入，从库 SQL 线程单线程重放跟不上
- 从库上也跑着分析查询（长查询堵住）

---

## 5.8 验证清单

- [ ] 主从复制的三个关键线程是什么？
- [ ] 如何配置一个基本的异步复制？
- [ ] 半同步复制解决了什么问题？
- [ ] Seconds_Behind_Source 表示什么？过大说明什么问题？
- [ ] 主库宕机后，如何手动提升从库为新主库？
- [ ] 读写分离有哪些实现方案？

---

*[上一章：性能调优](04-performance-tuning.md) · [下一章：监控](06-monitoring.md)*
