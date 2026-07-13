# 🧪 实验三：主从复制与故障切换

> ⏱ 预估时长：60 min · 前置知识：[主从复制与高可用](../mysql/05-replication-and-ha.md)

---

## 实验目标

在 Docker 中搭建一主一从复制架构，模拟主库宕机并手动将从库提升为新主库。

---

## 实验环境

由于真实场景需要两台服务器，本实验使用 Docker 在同一台机器上创建两个 MySQL 容器：

```
服务         容器名         IP          端口
主库 (Source)  mysql-master  172.17.0.2  33061 → 3306
从库 (Replica) mysql-replica 172.17.0.3  33062 → 3306
```

---

## 步骤一：启动两个 MySQL 容器

```bash
# 创建 Docker 网络（确保容器互通）
docker network create mysql-lab

# 启动主库
docker run -d \
  --name mysql-master \
  --network mysql-lab \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -p 33061:3306 \
  mysql:8.0 \
  --server-id=1 \
  --log-bin=/var/log/mysql/mysql-bin \
  --binlog-format=ROW

# 启动从库
docker run -d \
  --name mysql-replica \
  --network mysql-lab \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -p 33062:3306 \
  mysql:8.0 \
  --server-id=2 \
  --log-bin=/var/log/mysql/mysql-bin \
  --binlog-format=ROW \
  --relay-log=/var/log/mysql/mysql-relay-bin \
  --read-only=ON

# 验证两个容器都在运行
docker ps | grep mysql
```

---

## 步骤二：在主库创建测试数据和复制用户

```bash
# 进入主库
docker exec -it mysql-master mysql -u root -p
```

```sql
-- 创建测试数据
CREATE DATABASE shop DEFAULT CHARACTER SET utf8mb4;
USE shop;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0
);
INSERT INTO products (name, price, stock) VALUES
('iPhone 15', 6999.00, 100),
('AirPods', 1299.00, 200),
('MacBook Air', 8999.00, 50);

-- 创建复制用户
CREATE USER 'repl'@'%' IDENTIFIED BY 'ReplPass2026!';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;

-- 记录当前 binlog 位置
SHOW MASTER STATUS;
-- 记下 File 和 Position 的值
```

---

## 步骤三：配置从库

```bash
# 进入从库
docker exec -it mysql-replica mysql -u root -p
```

```sql
-- 配置复制源（用上一步记录的 File 和 Position）
-- 获取主库的 IP：docker inspect mysql-master | grep IPAddress
-- 假设主库 IP 是 172.17.0.2

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-master',   -- Docker 网络可用容器名
  SOURCE_PORT=3306,
  SOURCE_USER='repl',
  SOURCE_PASSWORD='ReplPass2026!',
  SOURCE_LOG_FILE='mysql-bin.000003',
  SOURCE_LOG_POS=1567;

-- 启动复制
START REPLICA;

-- 验证状态
SHOW REPLICA STATUS\G
-- 确认：
--   Replica_IO_Running: Yes
--   Replica_SQL_Running: Yes
--   Seconds_Behind_Source: 0
```

---

## 步骤四：验证复制

在主库写入数据，确认同步到从库：

```bash
# 在主库插入新数据
docker exec mysql-master mysql -u root -p -e "
USE shop;
INSERT INTO products (name, price, stock) VALUES ('iPad', 3499.00, 80);
UPDATE products SET stock = stock - 10 WHERE name = 'iPhone 15';
"

# 在从库查询（应该看到同步结果）
docker exec mysql-replica mysql -u root -p -e "USE shop; SELECT * FROM products;"
```

验证从库只读：

```bash
docker exec mysql-replica mysql -u root -p -e "USE shop; INSERT INTO products (name, price, stock) VALUES ('test', 1, 1);"
# 应该报错：The MySQL server is running with the --read-only option
```

---

## 步骤五：模拟主库宕机

```bash
# 停止主库容器
docker stop mysql-master

# 确认主库已停
docker ps | grep mysql-master
```

---

## 步骤六：将从库提升为新主库

```bash
# 进入从库
docker exec -it mysql-replica mysql -u root -p
```

```sql
-- 停止复制
STOP REPLICA;

-- 重置复制配置
RESET REPLICA ALL;

-- 关闭只读模式
SET GLOBAL read_only = OFF;

-- 创建一个新的用户用于其他从库（如果有）
CREATE USER 'new_repl'@'%' IDENTIFIED BY 'NewReplPass2026!';
GRANT REPLICATION SLAVE ON *.* TO 'new_repl'@'%';
FLUSH PRIVILEGES;

-- 查看新主库的 binlog 位置
SHOW MASTER STATUS;
```

**从库 → 新主库提升完成！**

---

## 步骤七：验证新主库可写入

```bash
# 在新主库（原从库）写入数据
docker exec mysql-replica mysql -u root -p -e "
USE shop;
INSERT INTO products (name, price, stock) VALUES ('Apple Watch', 2999.00, 60);
SELECT * FROM products;
"

# 数据写入成功，主库切换完成！
```

---

## 步骤八：恢复原主库（可选）

如果原主库恢复了，可以将其作为新主库的从库重新加入：

```bash
# 重启原主库
docker start mysql-master

# 进入原主库，配置它指向新主库
docker exec mysql-master mysql -u root -p
```

```sql
-- 原主库保持只读（作为从库）
SET GLOBAL read_only = ON;

-- 配置复制（指向新主库）
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-replica',
  SOURCE_PORT=3306,
  SOURCE_USER='new_repl',
  SOURCE_PASSWORD='NewReplPass2026!',
  SOURCE_LOG_FILE='mysql-bin.00000X',  -- 用新主库的 SHOW MASTER STATUS 值
  SOURCE_LOG_POS=XXXX;

START REPLICA;

SHOW REPLICA STATUS\G
```

---

## 步骤九：清理实验环境

```bash
# 停止并删除容器
docker stop mysql-master mysql-replica
docker rm mysql-master mysql-replica

# 删除自定义网络
docker network rm mysql-lab
```

---

## 验收检查清单

- [ ] 能在一台机器上用 Docker 搭建两个 MySQL 实例
- [ ] 能配置主从复制并确认同步正常
- [ ] 能在主库写入后，从库实时看到数据
- [ ] 能验证从库处于只读状态
- [ ] 能模拟主库宕机后，将从库提升为新主库
- [ ] 能验证新主库可正常写入
- [ ] 理解复制延迟（Seconds_Behind_Source）的意义

---

## 排障提示

| 问题 | 解决 |
|------|------|
| 从库连不上主库 | 检查 Docker 网络、容器名、密码 |
| `Replica_IO_Running: Connecting` | 检查防火墙 / 复制用户权限 / 网络 |
| `Replica_SQL_Running: No` | `SHOW REPLICA STATUS\G` 看 `Last_SQL_Error`，处理错误或跳过 |
| 容器内 `localhost` 不对 | 连接时用容器名而非 `localhost` |
| binlog 位置对不上 | 在从库重新 `CHANGE REPLICATION SOURCE TO` 正确的 File 和 Position |

*[返回目录](../notes/mysql-guide.md)*
