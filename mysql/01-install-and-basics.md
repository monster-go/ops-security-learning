# 01 — 安装与基础使用

> 对应 [notes/mysql-guide.md](../notes/mysql-guide.md) 第 1 节

---

## 1.1 安装方式对比

| 方式 | 适合场景 | 复杂度 |
|------|---------|--------|
| **apt** | 开发/测试机、快速部署 | ⭐ |
| **Docker** | 隔离环境、版本切换 | ⭐⭐ |
| **源码编译** | 定制化安装、生产环境（不推荐新手） | ⭐⭐⭐⭐ |

---

## 1.2 apt 安装 MySQL 8.0（推荐）

```bash
# 更新包索引
sudo apt update

# 安装 MySQL 8.0
sudo apt install -y mysql-server-8.0

# 验证安装
mysql --version

# 启动服务
sudo systemctl start mysql

# 设置开机自启
sudo systemctl enable mysql

# 检查状态
sudo systemctl status mysql
```

**安全初始化脚本：**
```bash
sudo mysql_secure_installation
```
该脚本交互式引导你完成以下安全设置：
1. 设置 root 密码（如果初始为空）
2. 删除匿名用户
3. 禁止 root 远程登录
4. 删除 test 数据库
5. 刷新权限表

> **注意**：MySQL 8.0 的 root 默认使用 `auth_socket` 认证插件——你需要在系统中以 `sudo mysql` 登录，或用 `ALTER USER` 改为密码认证。

---

## 1.3 Docker 部署 MySQL

```bash
# 拉取镜像并运行
docker run -d \
  --name mysql-ops \
  -e MYSQL_ROOT_PASSWORD=your_strong_password \
  -e MYSQL_DATABASE=opsdb \
  -p 3306:3306 \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# 进入容器内的 CLI
docker exec -it mysql-ops mysql -u root -p
```

**数据持久化说明：** `-v mysql-data:/var/lib/mysql` 将数据目录挂载为 Docker volume，即使容器删除数据也不会丢失。

---

## 1.4 客户端连接

```bash
# 本地连接（root + 密码）
mysql -u root -p

# 指定主机和端口
mysql -h 192.168.1.100 -P 3306 -u opsuser -p

# 连接后查看版本和当前用户
mysql> SELECT VERSION(), CURRENT_USER();

# 退出
mysql> EXIT;
```

---

## 1.5 数据库与表 CRUD

### 数据库操作

```sql
-- 查看所有数据库
SHOW DATABASES;

-- 创建数据库（指定字符集）
CREATE DATABASE opsdb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE opsdb;

-- 删除数据库
DROP DATABASE opsdb;
```

### 表操作

```sql
-- 创建表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 查看表结构
DESC users;

-- 修改表（新增字段）
ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL;

-- 删除表
DROP TABLE users;
```

### 数据 CRUD

```sql
-- INSERT
INSERT INTO users (username, email, status) VALUES
('alice', 'alice@example.com', 1),
('bob', 'bob@example.com', 1);

-- SELECT
SELECT * FROM users WHERE status = 1;
SELECT username, email FROM users ORDER BY created_at DESC LIMIT 10;

-- UPDATE
UPDATE users SET last_login = NOW() WHERE username = 'alice';

-- DELETE
DELETE FROM users WHERE username = 'bob' AND status = 0;
```

---

## 1.6 索引基础

```sql
-- 单列索引
CREATE INDEX idx_email ON users(email);

-- 复合索引（注意列顺序：等值条件放前面）
CREATE INDEX idx_status_created ON users(status, created_at);

-- 查看表的索引
SHOW INDEX FROM users;

-- 删除索引
DROP INDEX idx_email ON users;

-- 添加唯一索引
CREATE UNIQUE INDEX idx_username ON users(username);
```

**索引核心原则：**
- **不是越多越好**——每个索引都会拖慢写入速度
- **复合索引最左前缀原则**：`(a, b, c)` 的索引能覆盖 `a`、`a,b`、`a,b,c` 的查询条件，但不能覆盖 `b,c`
- **高选择性的列放前面**——`status(1/0)` 的选择性很低，不适合单独建索引

---

## 1.7 数据导入导出

```bash
# 导出单个数据库
mysqldump -u root -p opsdb > opsdb_backup.sql

# 导出全部数据库
mysqldump -u root -p --all-databases --single-transaction > full_backup.sql

# 导出单张表
mysqldump -u root -p opsdb users > users_backup.sql

# 导入
mysql -u root -p opsdb < opsdb_backup.sql
```

**重要参数说明：**
- `--single-transaction`：导出时开启事务，确保一致性快照，不锁表（仅 InnoDB 有效）
- `--flush-logs`：导出前刷新 binlog，方便后续增量恢复
- `--routines` / `--triggers`：同时导出存储过程和触发器

---

## 1.8 验证清单

完成本节后，你应该能回答：

- [ ] 如何安装 MySQL 8.0 并启动服务？
- [ ] `mysql_secure_installation` 做了哪些安全配置？
- [ ] 如何创建数据库和表，指定字符集？
- [ ] INSERT / SELECT / UPDATE / DELETE 四种基本操作怎么写？
- [ ] 索引的最左前缀原则是什么？
- [ ] 如何使用 mysqldump 全量导出数据库？

---

*[上一级：MySQL 完全指南](../notes/mysql-guide.md) · [下一章：用户与安全加固](02-user-and-security.md)*
