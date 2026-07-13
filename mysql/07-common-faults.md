# 07 — 常见故障排查

> 对应 [notes/mysql-guide.md](../notes/mysql-guide.md) 第 7 节

---

## 7.1 故障排查流程

每次遇到 MySQL 问题，按同一套流程走：

```
1. 确认现象         → 完全连不上？慢？报错信息？
2. 检查服务状态     → systemctl status mysql
3. 检查网络/防火墙  → ss -tlnp | grep 3306, ufw status
4. 检查权限         → SHOW GRANTS
5. 检查资源         → df -h, free -h, SHOW GLOBAL STATUS
6. 检查日志         → /var/log/mysql/error.log, journalctl -u mysql
7. 定位并修复
8. 验证
```

---

## 7.2 场景一：无法连接 MySQL

**现象：** `ERROR 2003 (HY000): Can't connect to MySQL server on 'host' (111)`  
或 `ERROR 1045 (28000): Access denied for user`

### 排查步骤

```bash
# 1. MySQL 是否在运行？
sudo systemctl status mysql

# 2. MySQL 监听在哪个地址？
sudo ss -tlnp | grep mysql
# 应该看到 0.0.0.0:3306 或 127.0.0.1:3306

# 3. 如果只监听 127.0.0.1（无法远程连接）
# 检查 bind-address 配置
sudo grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf
# 修改为 bind-address = 0.0.0.0

# 4. 防火墙是否放行了 3306？
sudo ufw status | grep 3306
sudo ufw allow 3306/tcp
```

**权限问题分析：**
```sql
-- 查看用户允许从哪里连接
SELECT User, Host FROM mysql.user;

-- 密码错误
ALTER USER 'appuser'@'%' IDENTIFIED BY 'CorrectPassword';
FLUSH PRIVILEGES;
```

---

## 7.3 场景二：Too many connections

**现象：** `ERROR 1040 (HY000): Too many connections`

### 紧急处理

```bash
# 1. 增加最大连接数（全局，不需要重启）
mysql -u root -p -e "SET GLOBAL max_connections = 1000;"

# 2. 查看当前连接（找出异常）
mysql -u root -p -e "SHOW FULL PROCESSLIST;"

# 3. 杀掉闲得久的连接
mysql -u root -p -e "SHOW FULL PROCESSLIST;" | grep Sleep | awk '{print $1}' | head -20
mysql -u root -p -e "KILL 1234; KILL 5678;"  # 替换为实际连接ID
```

### 根因排查

```sql
-- 按用户分组连接数
SELECT user, COUNT(*) FROM information_schema.processlist GROUP BY user;

-- 按状态分组
SELECT state, COUNT(*) FROM information_schema.processlist GROUP BY state;

-- 检查应用连接池配置是否合理
SHOW VARIABLES LIKE 'max_connections';
SHOW GLOBAL STATUS LIKE '%connection_errors%';
```

**常见原因：**
- 应用连接池设置太大，且没有复用
- 连接泄漏（代码里用了连接没关闭）
- 突发流量打爆连接池

---

## 7.4 场景三：数据库变慢

**现象：** 查询突然变慢，页面超时

### 排查步骤

```bash
# 1. 是否有锁等待？
mysql -u root -p -e "SHOW FULL PROCESSLIST;"
# 看到大量 "Waiting for table metadata lock" → 有 DDL 阻塞
# 看到大量 "Lock wait timeout" → 行锁竞争

# 2. 检查 InnoDB 锁
mysql -u root -p -e "SELECT * FROM performance_schema.data_lock_waits\G"

# 3. 找到阻塞的源头事务
# 查看当前事务
SELECT * FROM information_schema.innodb_trx\G
```

### 常见锁场景处理

```sql
-- 找到长时间运行的事务的 trx_mysql_thread_id
SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id
FROM information_schema.innodb_trx
WHERE trx_state = 'RUNNING'
ORDER BY trx_started;

-- 杀死长时间运行的查询（用上面的 trx_mysql_thread_id）
KILL 1234;  -- 替换为实际线程ID
```

---

## 7.5 场景四：死锁

**现象：** 应用报 `ERROR 1213 (40001): Deadlock found when trying to get lock`

### 什么是死锁？

```
事务 A: UPDATE users SET ... WHERE id=1;  (持有 id=1 的锁)
事务 B: UPDATE users SET ... WHERE id=2;  (持有 id=2 的锁)
事务 A: UPDATE users SET ... WHERE id=2;  (等待事务 B 释放 id=2 → 死锁)
事务 B: UPDATE users SET ... WHERE id=1;  (等待事务 A 释放 id=1 → 死锁)
```

MySQL InnoDB 会自动检测死锁并回滚其中一个事务（通常是影响较小的那个）。

### 排查

```sql
-- 查看最近一次死锁的信息
SHOW ENGINE INNODB STATUS\G
-- 看 LATEST DETECTED DEADLOCK 段落
```

### 预防死锁

```sql
-- 固定锁获取顺序（所有事务按相同顺序更新行）
-- ❌ 不固定
BEGIN; UPDATE users SET ... WHERE id=1; UPDATE users SET ... WHERE id=2; COMMIT;
BEGIN; UPDATE users SET ... WHERE id=2; UPDATE users SET ... WHERE id=1; COMMIT;  -- 可能死锁

-- ✅ 固定（按 id 从小到大）
BEGIN; UPDATE users SET ... WHERE id=1; UPDATE users SET ... WHERE id=2; COMMIT;
BEGIN; UPDATE users SET ... WHERE id=1; UPDATE users SET ... WHERE id=2; COMMIT;
```

---

## 7.6 场景五：主从复制中断

**现象：** 从库 `Replica_IO_Running` 或 `Replica_SQL_Running` 为 No

```sql
-- 查看精确错误
SHOW REPLICA STATUS\G
-- 看 Last_IO_Error 和 Last_SQL_Error
```

**常见原因及处理：**

| 错误 | 原因 | 处理 |
|------|------|------|
| `Got fatal error 1236` | binlog 被清理了 | 重新同步从库 |
| `Duplicate entry` | 从库上有重复数据 | 跳过或修复数据 |
| `Could not execute Write_rows` | 表结构不一致 | 检查并修正表结构 |

**临时跳过错误（确认不影响数据后）：**
```sql
STOP REPLICA;
SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;
START REPLICA;
```

---

## 7.7 场景六：磁盘空间满

**现象：** 数据写不进去，报 `ERROR 1021 (HY000): Disk full`

```bash
# 1. 确认磁盘使用
df -h

# 2. 找大文件
du -sh /var/lib/mysql/*/
du -sh /var/log/mysql/*

# 3. 清理 binlog（确认不需要后）
mysql -u root -p -e "PURGE BINARY LOGS BEFORE '2026-01-01 00:00:00';"

# 4. 清理慢查询日志（如果过大）
sudo truncate -s 0 /var/log/mysql/slow.log

# 5. 收缩 ibdata1（如果启用了 innodb_file_per_table=OFF → 生产应该 ON）
```

---

## 7.8 场景七：表损坏

**现象：** 查询某张表时报 `Table 'xxx' is marked as crashed`

```bash
# 方法一：CHECK TABLE + REPAIR TABLE
mysql -u root -p -e "CHECK TABLE opsdb.users;"
mysql -u root -p -e "REPAIR TABLE opsdb.users;"

# 方法二：使用 mysqlcheck 命令行工具
mysqlcheck -u root -p --auto-repair opsdb

# 方法三：使用 myisamchk（仅 MyISAM 表）
sudo myisamchk -r /var/lib/mysql/opsdb/users.MYI
```

> **注意**：频繁出现表损坏 → 检查硬件（磁盘坏道、内存故障）或 MySQL 异常关闭。

---

## 7.9 验证清单

- [ ] 服务器连不上 MySQL，你能按什么流程排查？
- [ ] Too many connections 时怎么紧急处理？怎么找根因？
- [ ] 怎么写 SQL 能避免死锁？
- [ ] 主从复制中断了，怎么找原因？
- [ ] 磁盘空间满了，除了加磁盘还有什么办法？
- [ ] 表损坏怎么修复？

---

*[上一章：监控](06-monitoring.md) · [下一章：卸载与清理](08-uninstall-and-cleanup.md)*
