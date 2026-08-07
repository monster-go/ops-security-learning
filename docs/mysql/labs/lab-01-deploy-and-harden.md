# 🧪 实验一：MySQL 部署与安全加固

> ⏱ 预估时长：60 min · 前置知识：[安装与基础使用](/mysql/01-install-and-basics)、[用户与安全加固](/mysql/02-user-and-security)

---

## 实验目标

在 Ubuntu 虚拟机上完成 MySQL 8.0 的完整部署和安全加固，最后通过一个验证脚本来确认配置合规。

---

## 环境要求

- Ubuntu 22.04/24.04 虚拟机（或 Docker 容器）
- sudo 权限
- 至少 1GB 可用内存

---

## 步骤一：部署 MySQL

```bash
# 1. 更新 apt 并安装
sudo apt update
sudo apt install -y mysql-server-8.0

# 2. 验证安装
mysql --version

# 3. 确保服务运行
sudo systemctl status mysql

# 4. 运行安全初始化脚本
sudo mysql_secure_installation
```

**安全初始化时建议选择：**
- 设置 root 密码 ✅
- 删除匿名用户 ✅
- 禁止 root 远程登录 ✅
- 删除 test 数据库 ✅
- 刷新权限表 ✅

---

## 步骤二：创建应用用户

连接 MySQL：

```bash
sudo mysql -u root -p
```

创建三个权限不同的用户：

```sql
-- 1. 应用读写用户（只能操作 opsdb 库）
CREATE USER 'app_write'@'192.168.1.%' IDENTIFIED BY 'AppWrite2026!';
GRANT SELECT, INSERT, UPDATE, DELETE ON opsdb.* TO 'app_write'@'192.168.1.%';

-- 2. 应用只读用户
CREATE USER 'app_read'@'192.168.1.%' IDENTIFIED BY 'AppRead2026!';
GRANT SELECT ON opsdb.* TO 'app_read'@'192.168.1.%';

-- 3. 备份用户
CREATE USER 'backup'@'localhost' IDENTIFIED BY 'Backup2026!';
GRANT SELECT, RELOAD, LOCK TABLES, REPLICATION CLIENT, SHOW VIEW ON *.* TO 'backup'@'localhost';

FLUSH PRIVILEGES;

-- 验证
SELECT User, Host FROM mysql.user;
SHOW GRANTS FOR 'app_write'@'192.168.1.%';
```

---

## 步骤三：安全加固

### 3.1 确认 root 不能远程登录

```sql
SELECT User, Host FROM mysql.user WHERE User='root';
-- 应该只显示 root@localhost 和 root@127.0.0.1
```

### 3.2 检查是否有匿名用户

```sql
SELECT User, Host FROM mysql.user WHERE User='';
-- 应该返回空
```

### 3.3 配置密码策略

```sql
INSTALL COMPONENT 'file://component_validate_password';
SHOW VARIABLES LIKE 'validate_password%';
```

### 3.4 启用慢查询日志

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 2;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

### 3.5 检查 SSL 状态

```sql
SHOW VARIABLES LIKE '%ssl%';
-- have_ssl 应为 YES
```

### 3.6 确认端口和 bind-address

```bash
sudo grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf
sudo ss -tlnp | grep 3306
```

---

## 步骤四：验证配置

创建测试库并验证用户权限：

```bash
# 用 root 创建测试库和表
sudo mysql -u root -p -e "
CREATE DATABASE opsdb DEFAULT CHARACTER SET utf8mb4;
CREATE TABLE opsdb.users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100)
);
INSERT INTO opsdb.users (username, email) VALUES ('alice', 'alice@example.com');
"
```

验证用户权限范围：

```bash
# 验证 app_read 能读不能写（应该报错）
mysql -u app_read -p -h 127.0.0.1 -e "SELECT * FROM opsdb.users;"
mysql -u app_read -p -h 127.0.0.1 -e "INSERT INTO opsdb.users (username) VALUES ('test');"
# 第二句应该报权限错误

# 验证 app_write 能读写
mysql -u app_write -p -h 127.0.0.1 -e "INSERT INTO opsdb.users (username) VALUES ('bob'); SELECT * FROM opsdb.users;"
```

---

## 实践检查清单

- [ ] MySQL 8.0 安装完成，服务正常运行
- [ ] 已运行 `mysql_secure_installation` 完成初始安全设置
- [ ] root 用户仅能从 localhost 登录
- [ ] 无匿名用户
- [ ] 创建了三个用户（app_write / app_read / backup），各权限符合预期
- [ ] 密码策略组件已安装
- [ ] 慢查询日志已开启
- [ ] SSL 已启用
- [ ] 应用只读用户无法写入数据

---

## 排障提示

| 问题 | 解决 |
|------|------|
| `sudo mysql` 能进但 `mysql -u root -p` 进不去 | root 使用 `auth_socket` 插件，改为 `mysql_native_password` |
| 远程无法连接 | 检查 `bind-address` 和 UFW 防火墙 |
| 安装密码策略报错 | MySQL 8.0 需用 `INSTALL COMPONENT` 而非 `INSTALL PLUGIN` |

*[返回目录](/mysql/)*
