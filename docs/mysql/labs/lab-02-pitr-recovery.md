# 🧪 实验二：基于时间点的恢复（PITR）

> ⏱ 预估时长：45 min · 前置知识：[备份与恢复](/mysql/03-backup-and-recovery)

---

## 实验目标

模拟数据库被误操作（DROP TABLE），通过全量备份 + binlog 精确恢复到误删前的状态。

---

## 环境要求

- MySQL 8.0 实例（可以直接使用实验一的环境）
- binlog 已开启

---

## 实验设计

```
时间线：
  T1  创建测试数据库和数据
  T2  执行全量备份 (mysqldump)
  T3  插入更多数据
  T4  模拟误操作 (DROP TABLE)
  T5  PITR 恢复到 T3→T4 之间
```

---

## 步骤一：准备环境

确认 binlog 已开启：

```sql
SHOW VARIABLES LIKE 'log_bin';
-- 如果 OFF，需要在 /etc/mysql/mysql.conf.d/mysqld.cnf 中加入以下内容后重启
-- [mysqld]
-- server-id = 1
-- log_bin = /var/log/mysql/mysql-bin
-- binlog_format = ROW
```

---

## 步骤二：创建测试数据

```sql
-- 创建测试库
CREATE DATABASE pitr_test DEFAULT CHARACTER SET utf8mb4;
USE pitr_test;

-- 创建订单表
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 插入初始数据（模拟 T1 时刻已有数据）
INSERT INTO orders (product, amount, status) VALUES
('笔记本', 5999.00, 'paid'),
('鼠标', 199.00, 'pending'),
('键盘', 399.00, 'shipped');

-- 记录当前时间（记为 T1，后续恢复时会用到）
SELECT NOW();
-- 记下这个时间，比如 2026-07-09 10:00:00
```

---

## 步骤三：全量备份（T2 时刻）

```bash
# 记录当前数据库和 binlog 位置
mysql -u root -p -e "USE pitr_test; SELECT COUNT(*) FROM orders;"
mysql -u root -p -e "SHOW MASTER STATUS;"

# 全量备份
mysqldump -u root -p \
  --single-transaction \
  --flush-logs \
  --master-data=2 \
  pitr_test > /tmp/pitr_full_backup.sql

echo "备份完成时间: $(date)"
# 记下这个时间，比如 2026-07-09 10:05:00 (T2)
```

检查备份文件中的 binlog 位置：

```bash
grep "CHANGE MASTER" /tmp/pitr_full_backup.sql
-- 记录下备份时的 binlog 文件名和位置
```

---

## 步骤四：模拟备份后的操作（T3 时刻）

```sql
USE pitr_test;

-- 模拟正常业务数据
INSERT INTO orders (product, amount, status) VALUES
('显示器', 2499.00, 'paid'),
('耳机', 599.00, 'pending'),
('音箱', 899.00, 'paid');

-- 更新已有订单
UPDATE orders SET status = 'shipped' WHERE product = '鼠标';

-- 验证数据
SELECT * FROM orders;
-- 应该看到 6 条记录

-- 记录当前时间
SELECT NOW();
-- 记下这个时间，比如 2026-07-09 10:10:00 (T3)
```

---

## 步骤五：模拟误操作（T4 时刻）

```sql
-- ⚠️ 模拟误删除
DROP TABLE orders;

-- 确认表已删除
SHOW TABLES;
```

---

## 步骤六：执行 PITR 恢复

### 6.1 恢复全量备份

```bash
mysql -u root -p pitr_test < /tmp/pitr_full_backup.sql

# 验证恢复后的数据（应该有 3 条）
mysql -u root -p -e "USE pitr_test; SELECT * FROM orders;"
```

### 6.2 查看备份到误删之间的 binlog

```bash
# 查看备份后新生成的 binlog
sudo ls -la /var/log/mysql/

# 用 mysqlbinlog 查看内容，找到 DROP TABLE 的位置
sudo mysqlbinlog /var/log/mysql/mysql-bin.00000X \
  | grep -n "DROP TABLE\|orders" | head -20
```

### 6.3 恢复到误删前

```bash
# 用 mysqlbinlog 重放从备份后到误删前的操作
# 注意替换 --start-position 为备份文件记录的 position
# 注意替换 --stop-position 为 DROP TABLE 之前的 position

sudo mysqlbinlog \
  --start-datetime="2026-07-09 10:05:01" \
  --stop-datetime="2026-07-09 10:14:59" \
  /var/log/mysql/mysql-bin.00000X \
  | mysql -u root -p pitr_test

# 如果用时间点不准确，改用 position
sudo mysqlbinlog \
  --start-position=<备份时的position> \
  --stop-position=<DROP TABLE前的position> \
  /var/log/mysql/mysql-bin.00000X \
  | mysql -u root -p pitr_test
```

### 6.4 验证恢复结果

```sql
USE pitr_test;
SELECT * FROM orders;
-- 应该看到 6 条记录（3条初始 + 3条备份后新增）
-- DROP TABLE 操作被跳过，数据完整恢复！
```

---

## 步骤七：清理

```bash
# 删除测试库
mysql -u root -p -e "DROP DATABASE pitr_test;"

# 删除备份文件
rm /tmp/pitr_full_backup.sql
```

---

## 实践检查清单

- [ ] 能查看 binlog 是否开启
- [ ] 能使用 mysqldump 做全量备份并记录 binlog 位置
- [ ] 能通过全量备份恢复数据
- [ ] 能用 `mysqlbinlog` 重放增量操作
- [ ] 能精确恢复到误操作前的状态
- [ ] 理解 `--start-datetime` 和 `--stop-datetime` / `--start-position` 和 `--stop-position` 的使用

---

## 排障提示

| 问题 | 解决 |
|------|------|
| `mysqlbinlog` 找不到文件 | 检查 `/var/log/mysql/` 或确认 `log_bin` 路径 |
| 恢复后数据不对 | 时间或位置参数有误，在测试库重新试试 |
| 备份时 `--flush-logs` 没生成新 binlog | 大小写敏感，确认参数写法 |
| binlog 文件过多 | `PURGE BINARY LOGS BEFORE '2026-01-01';` 清理旧的 |

*[返回目录](/mysql/)*
