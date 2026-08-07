# 02 — 用户与安全加固

> 对应 [MySQL 概览](/mysql/) 第 2 节

---

## 2.1 用户管理

### 创建用户

```sql
-- 创建用户（指定密码）
CREATE USER 'opsuser'@'192.168.1.%' IDENTIFIED BY 'StrongPassword123!';

-- 创建用户（限制只能从 localhost 登录）
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'AnotherStrongPass!';
```

**说明：** `'user'@'host'` 中的 host 部分支持通配符 `%`（任意主机）和 IP 段（如 `192.168.1.%`）。

### 删除用户

```sql
DROP USER 'opsuser'@'192.168.1.%';
```

### 修改密码

```sql
-- MySQL 8.0 推荐方式
ALTER USER 'appuser'@'localhost' IDENTIFIED BY 'NewStrongPassword!';

-- 强制用户下次登录改密码
ALTER USER 'appuser'@'localhost' PASSWORD EXPIRE;
```

### 查看所有用户

```sql
SELECT User, Host, account_locked, password_expired FROM mysql.user;
```

---

## 2.2 权限体系

MySQL 权限分多个层级，从全局到列级：

```
全局层        → GRANT ALL ON *.* TO ...
数据库层      → GRANT ALL ON opsdb.* TO ...
表层级        → GRANT SELECT ON opsdb.users TO ...
列层级        → GRANT SELECT(col1, col2) ON opsdb.users TO ...
存储过程层    → GRANT EXECUTE ON PROCEDURE opsdb.proc TO ...
```

### GRANT / REVOKE

```sql
-- 授予指定数据库的全部权限
GRANT ALL PRIVILEGES ON opsdb.* TO 'appuser'@'localhost';

-- 授予只读权限
GRANT SELECT ON opsdb.* TO 'readonly'@'%';

-- 授予部分权限（增删改查 + 执行）
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON opsdb.* TO 'appuser'@'localhost';

-- 赋予授予其他用户的权限（WITH GRANT OPTION — 谨慎使用！）
GRANT ALL ON opsdb.* TO 'admin'@'localhost' WITH GRANT OPTION;

-- 回收权限
REVOKE DELETE ON opsdb.* FROM 'appuser'@'localhost';

-- 刷新权限（修改权限表后执行）
FLUSH PRIVILEGES;
```

### 查看用户权限

```sql
-- 查看当前用户权限
SHOW GRANTS;

-- 查看指定用户权限
SHOW GRANTS FOR 'appuser'@'localhost';
```

---

## 2.3 安全加固清单

### ❌ 禁止 root 远程登录

```sql
-- 检查 root 是否可以从远程登录
SELECT User, Host FROM mysql.user WHERE User='root';

-- 如果有除 localhost/127.0.0.1 以外的 Host，删除
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1');
FLUSH PRIVILEGES;
```

### ❌ 删除匿名用户

```sql
-- 检查是否存在匿名用户（Host 非空且 User 为空）
SELECT User, Host FROM mysql.user WHERE User='';

-- 删除
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'%';
```

### 🔑 配置密码策略

MySQL 8.0 使用 `validate_password` 组件：

```sql
-- 安装密码策略组件
INSTALL COMPONENT 'file://component_validate_password';

-- 查看策略配置
SHOW VARIABLES LIKE 'validate_password%';
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `validate_password.policy` | MEDIUM | 策略等级 (LOW/MEDIUM/STRONG) |
| `validate_password.length` | 8 | 最小密码长度 |
| `validate_password.mixed_case_count` | 1 | 大小写字母至少各 1 个 |
| `validate_password.number_count` | 1 | 至少 1 个数字 |
| `validate_password.special_char_count` | 1 | 至少 1 个特殊字符 |

```sql
-- 调整策略（开发环境可适度放宽）
SET GLOBAL validate_password.policy = LOW;
SET GLOBAL validate_password.length = 6;
```

### 🔐 SSL/TLS 加密连接

```sql
-- 检查 SSL 是否启用
SHOW VARIABLES LIKE '%ssl%';

-- 强制特定用户使用 SSL
ALTER USER 'appuser'@'%' REQUIRE SSL;

-- 检查用户认证要求
SELECT User, Host, ssl_type FROM mysql.user;
```

默认安装的 MySQL 8.0 会自动生成自签名证书并启用 SSL。可以在连接时验证：

```bash
mysql -u appuser -p -h 192.168.1.100 --ssl-ca=/etc/mysql/ca.pem
```

### 📝 审计日志

MySQL Enterprise 有官方的审计日志插件。社区版可以使用 **Percona Audit Log Plugin** 或通过通用日志（谨慎）做简单审计。

```sql
-- 开启通用查询日志（生产慎用，记录所有 SQL，性能开销大）
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- 生产推荐：开启慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 1;
```

---

## 2.4 最小权限原则

> 只给用户完成其工作所必需的最小权限。

**实践建议：**

| 角色 | 建议权限 | 说明 |
|------|---------|------|
| 应用写用户 | `SELECT, INSERT, UPDATE, DELETE` + `EXECUTE` | 不建表、不删表 |
| 应用读用户 | `SELECT` | 只读 |
| DBA | `ALL ON *.*` | 全权限，通常限制只能从堡垒机登录 |
| 备份用户 | `SELECT, RELOAD, LOCK TABLES, REPLICATION CLIENT` | 配合 mysqldump |
| 监控用户 | `SELECT, PROCESS, SHOW DATABASES, REPLICATION CLIENT` | 够用 |

**示例：创建最佳实践的备份用户**
```sql
CREATE USER 'backup'@'localhost' IDENTIFIED BY 'BackupPass123!';
GRANT SELECT, RELOAD, LOCK TABLES, REPLICATION CLIENT, SHOW VIEW, EVENT ON *.* TO 'backup'@'localhost';
```

---

## 2.5 验证清单

- [ ] 如何创建用户并授予最小权限？
- [ ] 为什么禁止 root 远程登录？
- [ ] 如何查看所有用户和他们的权限？
- [ ] validate_password 组件有哪些配置项？
- [ ] 如何强制用户使用 SSL 连接？
- [ ] 备份用户和监控用户分别需要哪些权限？

---

*[上一章：安装与基础使用](01-install-and-basics.md) · [下一章：备份与恢复](03-backup-and-recovery.md)*
