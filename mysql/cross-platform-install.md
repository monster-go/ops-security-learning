# MySQL 跨平台安装与安全配置完全指南

> **定位**：独立于现有课程章节的速查手册，覆盖 Linux / macOS / Windows 三大操作系统下 MySQL 的安装、启动、停止、卸载及安全配置。  
> **关联**：[Phase 2.5 第 9 周](../CURRICULUM.md#六phase-25mysql-数据库运维第-9-周) · [01 安装与基础使用](01-install-and-basics.md) · [02 用户与安全加固](02-user-and-security.md)

---

## 速查目录

| 操作系统 | 主要安装渠道 | 包管理器 | 部署难度 |
|---------|-------------|---------|---------|
| **Ubuntu / Debian** | 默认 apt · MySQL 官方 APT · Docker · 通用二进制 | `apt` | ⭐ |
| **RHEL / CentOS / Rocky** | 默认 dnf · MySQL 官方 YUM · Docker · 通用二进制 | `dnf` / `yum` | ⭐⭐ |
| **macOS** | Homebrew · 官方 DMG · 通用二进制 · Docker | `brew` | ⭐⭐ |
| **Windows** | MSI Installer · ZIP 压缩包 · Docker | `winget` (可选) | ⭐⭐ |

---

## 图例：安装渠道全景

```
                  MySQL 安装渠道全景
                ┌──────────────────────┐
                │    官方 APT/YUM 源    │ ← 生产推荐（获取最新稳定版）
                ├──────────────────────┤
                │     系统自带源         │ ← 最方便，但版本较旧
                ├──────────────────────┤
                │    Docker 容器         │ ← 环境隔离，版本切换灵活
                ├──────────────────────┤
                │   通用二进制包         │ ← 通用性强，适合无包管理器环境
                ├──────────────────────┤
                │     Homebrew          │ ← macOS 最推荐的方式
                ├──────────────────────┤
                │    MSI / ZIP         │ ← Windows 官方安装/免安装
                └──────────────────────┘
```

---

# 第一部分：Linux 系列

---

## 一、Ubuntu / Debian（apt 系）

### 1.1 渠道一：使用系统默认源（最快）

```bash
# 更新索引并安装
sudo apt update
sudo apt install -y mysql-server

# 验证安装
mysql --version

# 查看安装的包
dpkg -l | grep mysql
```

**特点**：速度最快，但版本不是最新的（Ubuntu 22.04 默认带 MySQL 8.0.x，可能落后 1-2 个小版本）。

---

### 1.2 渠道二：使用 MySQL 官方 APT 源（生产推荐）

从 MySQL 官方仓库安装，获取最新稳定版。

```bash
# 1. 下载官方 APT 仓库配置包
wget https://dev.mysql.com/get/mysql-apt-config_0.8.33-1_all.deb

# 2. 安装配置包（期间会弹出交互界面，选择 MySQL 8.0 版本）
sudo dpkg -i mysql-apt-config_0.8.33-1_all.deb

# 3. 更新索引
sudo apt update

# 4. 安装 MySQL（会安装官方源中的最新版）
sudo apt install -y mysql-server

# 5. 验证版本
mysql --version
```

> **交互界面说明**：`dpkg -i` 执行后会弹出一个蓝底菜单，选择 `MySQL Server & Cluster` → 选 `mysql-8.0` → 选 `Ok` 确认即可。全程约 10 秒。

**卸载官方源配置（可选）：**
```bash
dpkg -l | grep mysql-apt-config
sudo dpkg -r mysql-apt-config
```

---

### 1.3 渠道三：通用二进制包（Generic Tarball）

适合**无包管理器**或需要**自定义安装路径**的场景。

```bash
# 1. 下载 MySQL 8.0 通用二进制包
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.40-linux-glibc2.28-x86_64.tar.xz

# 2. 解压到指定目录
sudo tar -xvf mysql-8.0.40-linux-glibc2.28-x86_64.tar.xz -C /usr/local/
sudo mv /usr/local/mysql-8.0.40-linux-glibc2.28-x86_64 /usr/local/mysql

# 3. 创建 mysql 用户和组（如果不存在）
sudo groupadd mysql
sudo useradd -r -g mysql -s /bin/false mysql

# 4. 初始化数据目录
sudo mkdir -p /usr/local/mysql/data
sudo chown -R mysql:mysql /usr/local/mysql
sudo /usr/local/mysql/bin/mysqld --initialize-insecure --user=mysql --basedir=/usr/local/mysql --datadir=/usr/local/mysql/data

# 5. 复制配置文件
sudo cp /usr/local/mysql/support-files/mysql.server /etc/init.d/mysql

# 6. 启动
sudo /usr/local/mysql/bin/mysqld_safe --user=mysql &

# 7. 加入 PATH（写入 ~/.bashrc 或 ~/.zshrc）
echo 'export PATH=$PATH:/usr/local/mysql/bin' >> ~/.bashrc
source ~/.bashrc
```

**适用场景：**
- 需要精确控制安装路径（如 `/opt/mysql`）
- 无法访问互联网下载包
- 同一台机器要装多个 MySQL 版本

---

### 1.4 启动与停止（Ubuntu/Debian）

```bash
# ─── systemd 方式（默认安装推荐方式） ───

# 启动
sudo systemctl start mysql

# 停止
sudo systemctl stop mysql

# 重启
sudo systemctl restart mysql

# 查看状态
sudo systemctl status mysql

# 查看是否开机自启
sudo systemctl is-enabled mysql

# 设置开机自启
sudo systemctl enable mysql

# 禁用开机自启
sudo systemctl disable mysql


# ─── 传统 init.d 方式（通用二进制安装） ───

# 启动
sudo /etc/init.d/mysql start

# 停止
sudo /etc/init.d/mysql stop

# 重启
sudo /etc/init.d/mysql restart

# 查看状态
sudo /etc/init.d/mysql status


# ─── mysqld_safe 方式（通用二进制，前台运行） ───

# 启动
sudo mysqld_safe --user=mysql &

# 停止
sudo mysqladmin -u root -p shutdown
```

---

### 1.5 卸载（Ubuntu/Debian）

```bash
# ─── apt 安装的卸载 ───

# 1. 停止服务
sudo systemctl stop mysql

# 2. 卸载包
sudo apt remove --purge mysql-server mysql-client mysql-common -y

# 3. 清理残留依赖
sudo apt autoremove -y
sudo apt autoclean

# 4. 删除数据目录和日志（⚠️ 确保已备份）
sudo rm -rf /var/lib/mysql
sudo rm -rf /var/log/mysql
sudo rm -rf /etc/mysql

# 5. 验证已清除
dpkg -l | grep mysql
# 输出应为空


# ─── 官方 APT 源安装的额外步骤 ───

# 除了上述步骤，还需移除官方源配置
sudo dpkg -r mysql-apt-config
sudo rm -f /etc/apt/sources.list.d/mysql.list


# ─── 通用二进制安装的卸载 ───

# 1. 停止服务
sudo /usr/local/mysql/bin/mysqladmin -u root -p shutdown

# 2. 删除安装目录
sudo rm -rf /usr/local/mysql

# 3. 删除数据目录
sudo rm -rf /usr/local/mysql/data

# 4. 删除服务脚本
sudo rm -f /etc/init.d/mysql

# 5. 删除 mysql 用户（可选）
sudo userdel mysql
sudo groupdel mysql

# 6. 清除 PATH 配置
# 编辑 ~/.bashrc 删除 export PATH 那一行
```

---

## 二、RHEL / CentOS / Rocky Linux（yum/dnf 系）

### 2.1 渠道一：使用系统默认源（AppStream）

```bash
# RHEL 8/9、Rocky Linux 8/9 默认包含 MySQL 模块
sudo dnf install -y mysql-server

# 或者 CentOS 7（yum）
sudo yum install -y mariadb-server   # CentOS 7 默认是 MariaDB

# 验证
mysql --version

# 启动
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

> **注意**：RHEL/CentOS 7 默认的 MySQL 兼容版是 MariaDB（mysql 命令是 MariaDB 的符号链接）。如果需要"真 MySQL"，请使用官方 YUM 源（渠道二）。

---

### 2.2 渠道二：使用 MySQL 官方 YUM 源（生产推荐）

```bash
# 1. 下载官方 YUM 仓库 RPM
wget https://dev.mysql.com/get/mysql80-community-release-el9-5.noarch.rpm
# 注意：el9 对应 RHEL 9 / Rocky 9，el8 对应 RHEL 8 / Rocky 8，el7 对应 CentOS 7

# 2. 安装仓库配置
sudo dnf install -y mysql80-community-release-el9-5.noarch.rpm

# 3. 导入 GPG 密钥
sudo rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023

# 4. 安装 MySQL
sudo dnf install -y mysql-server

# 5. 启动
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 6. 获取初始 root 临时密码
sudo grep 'temporary password' /var/log/mysqld.log
# 输出示例：A temporary password is generated for root@localhost: >k!X8m?pSd2a
```

**GPG 密钥失效处理**：如果安装时遇到 GPG 签名验证失败：
```bash
# 更新 GPG 密钥
sudo rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
# 或禁用 GPG 检查（不推荐，仅临时方案）
sudo dnf install -y mysql-server --nogpgcheck
```

---

### 2.3 启动与停止（RHEL 系）

```bash
# systemd 方式（所有官方/系统源安装）
sudo systemctl start mysqld      # 注意服务名是 mysqld，不是 mysql
sudo systemctl stop mysqld
sudo systemctl restart mysqld
sudo systemctl status mysqld
sudo systemctl enable mysqld
sudo systemctl disable mysqld
```

---

### 2.4 卸载（RHEL 系）

```bash
# ─── 系统源 / 官方 YUM 源安装的统一卸载 ───

# 1. 停止服务
sudo systemctl stop mysqld

# 2. 卸载 MySQL 包
sudo dnf remove -y mysql-server mysql mysql-common
# CentOS 7: sudo yum remove -y mysql-server mysql

# 3. 删除数据目录（⚠️ 确认已备份）
sudo rm -rf /var/lib/mysql

# 4. 删除日志和配置
sudo rm -rf /var/log/mysqld.log
sudo rm -rf /etc/my.cnf
sudo rm -rf /etc/my.cnf.d/

# 5. 删除官方 YUM 仓库配置（如果用了官方源）
sudo dnf remove -y mysql80-community-release
sudo rm -f /etc/yum.repos.d/mysql-community.repo
sudo rm -f /etc/yum.repos.d/mysql-community-source.repo

# 6. 验证
rpm -qa | grep mysql
# 输出应为空
```

---

## 三、Docker 安装 MySQL（跨平台）

Docker 是最**统一**的 MySQL 部署方式——在所有操作系统上的操作完全一致。

```bash
# ─── 运行 MySQL 8.0 容器 ───

docker run -d \
  --name mysql-server \
  -e MYSQL_ROOT_PASSWORD=StrongPass123! \
  -e MYSQL_DATABASE=appdb \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=AppUserPass123! \
  -p 3306:3306 \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# 参数说明：
#   -d                   后台运行
#   --name               容器名
#   -e MYSQL_ROOT_PASSWORD   root 密码
#   -e MYSQL_DATABASE    自动创建数据库
#   -e MYSQL_USER        自动创建普通用户
#   -p 3306:3306         端口映射（宿主机:容器）
#   -v mysql-data:...    数据持久化 volume
#   mysql:8.0            镜像版本标签
```

### 3.1 版本标签参考

| 标签 | 说明 |
|------|------|
| `mysql:8.0` | MySQL 8.0 最新版（推荐） |
| `mysql:8.0.40` | 固定到某个小版本 |
| `mysql:8.4` | MySQL 8.4 LTS |
| `mysql:9.0` | MySQL 9.0 Innovation |
| `mysql:latest` | 当前最新版（不固定，生产不推荐） |
| `mysql:8.0-oracle` | 基于 Oracle Linux 的镜像 |
| `mysql:8.0-ubi9` | 基于 Red Hat UBI 的镜像 |

### 3.2 Docker 启动与停止

```bash
# 启动
docker start mysql-server

# 停止
docker stop mysql-server

# 重启
docker restart mysql-server

# 查看日志
docker logs mysql-server
docker logs -f mysql-server    # 持续跟踪

# 进入容器
docker exec -it mysql-server mysql -u root -p
```

### 3.3 Docker MySQL 的卸载

```bash
# 1. 停止并删除容器
docker stop mysql-server
docker rm mysql-server

# 2. 删除镜像（可选）
docker rmi mysql:8.0

# 3. 删除数据 volume（⚠️ 重要：数据会永久丢失！）
docker volume rm mysql-data

# 4. 清理所有未使用的 Docker 资源
docker system prune

# 5. 验证
docker ps -a | grep mysql   # 应无输出
docker volume ls | grep mysql  # 应无输出
```

---

# 第二部分：macOS

---

## 四、macOS 安装 MySQL

### 4.1 渠道一：Homebrew（最推荐）

```bash
# 1. 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 搜索可用的 MySQL 版本
brew search mysql

# 3. 安装最新版
brew install mysql

# 4. 安装指定版本
brew install mysql@8.0

# 5. 验证
mysql --version
```

### 4.2 渠道二：官方 DMG 安装包

```bash
# 1. 下载 DMG
# 浏览器访问 https://dev.mysql.com/downloads/mysql/
# 选择 macOS → 下载 DMG 包

# 2. 命令行安装（假设已下载到 ~/Downloads）
cd ~/Downloads
sudo hdiutil attach mysql-8.0.40-macos14-x86_64.dmg
sudo installer -pkg /Volumes/MySQL\ 8.0.40/mysql-8.0.40-macos14-x86_64.pkg -target /
sudo hdiutil detach /Volumes/MySQL\ 8.0.40

# DMG 安装器会在安装最后弹出 root 临时密码框——务必保存！
# 如果错过，查看 /usr/local/mysql/data/$(hostname).err 中的 [Note] A temporary password is generated...
```

### 4.3 渠道三：通用二进制包（Tarball）

```bash
# 1. 下载
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.40-macos14-x86_64.tar.gz

# 2. 解压
tar -xvf mysql-8.0.40-macos14-x86_64.tar.gz
sudo mv mysql-8.0.40-macos14-x86_64 /usr/local/mysql

# 3. 初始化
cd /usr/local/mysql
sudo mkdir data
sudo bin/mysqld --initialize --user=root --datadir=/usr/local/mysql/data
# 记下输出的临时 root 密码

# 4. 加入 PATH
echo 'export PATH=$PATH:/usr/local/mysql/bin' >> ~/.zshrc
source ~/.zshrc
```

---

### 4.4 启动与停止（macOS）

```bash
# ─── Homebrew 安装 ───

# 启动
brew services start mysql

# 停止
brew services stop mysql

# 重启
brew services restart mysql

# 查看状态
brew services list | grep mysql

# 手动启动（不使用服务）
mysql.server start

# 手动停止
mysql.server stop


# ─── DMG / 通用二进制安装 ───

# 使用 macOS LaunchDaemon
sudo launchctl load /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist

# 停止
sudo launchctl unload /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist

# 手动启动
/usr/local/mysql/support-files/mysql.server start

# 手动停止
/usr/local/mysql/support-files/mysql.server stop
```

---

### 4.5 卸载（macOS）

```bash
# ─── Homebrew 安装的卸载 ───

# 1. 停止服务
brew services stop mysql

# 2. 卸载
brew uninstall mysql

# 3. 清理残留
brew cleanup

# 4. 删除数据目录（⚠️ 确认已备份）
rm -rf /usr/local/var/mysql

# 5. 验证
brew list | grep mysql   # 应无输出


# ─── DMG 安装的卸载 ───

# 1. 停止服务
sudo /usr/local/mysql/support-files/mysql.server stop

# 2. 卸载 MySQL 包（逐个删除）
# DMG 安装会注册多个 pkg，需要全部移除
sudo rm -rf /usr/local/mysql*
sudo rm -rf /Library/StartupItems/MySQLCOM
sudo rm -rf /Library/Receipts/mysql*

# 3. 删除 LaunchDaemon
sudo rm -f /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist

# 4. 删除配置文件
sudo rm -f /etc/my.cnf

# 5. 清理 PATH 中的 MySQL 条目
# 编辑 ~/.zshrc 或 ~/.bash_profile，删除包含 mysql 的 PATH 行

# 6. 验证
ls /usr/local/mysql* 2>/dev/null   # 应该显示 "No such file"
```

---

# 第三部分：Windows

---

## 五、Windows 安装 MySQL

### 5.1 渠道一：MSI Installer（推荐）

MySQL Installer 是 Windows 上的官方安装向导，可以一步完成 MySQL 服务器、客户端、Shell、Router 等的安装。

**① 下载**
- 访问 https://dev.mysql.com/downloads/installer/
- 下载 `mysql-installer-community-8.0.xx.msi`（推荐在线版，安装时下载组件）

**② 安装步骤**
```
1. 运行 MSI
2. 选择安装类型：
   - "Developer Default"（开发用，安装全部组件）
   - "Server only"（仅安装服务器，推荐）
   - "Custom"（自定义选择组件）
3. 检查需求 → Next
4. 自动下载和安装所选组件
5. 配置 MySQL Server：
   a. Config Type: "Development Machine" / "Server Machine" / "Dedicated Machine"
      - Development Machine: 使用最少内存（开发机适用）
      - Server Machine: 中等内存（同时跑其他服务）
      - Dedicated Machine: 使用全部可用内存（专用于 MySQL）
   b. 连接方式: TCP/IP, 端口 3306
   c. 认证方式: 默认 "Use Strong Password Encryption"（推荐）
   d. 设置 root 密码
   e. 创建 MySQL 用户（可选）
   f. Windows Service 配置：
      - "Configure MySQL Server as a Windows Service"
      - Service Name: MySQL80
      - "Start the MySQL Server at System Startup"（开机自启）
6. Apply Configuration → Finish
```

**③ 验证安装**
```powershell
# 命令提示符或 PowerShell
mysql --version

# 连接测试
mysql -u root -p
```

### 5.2 渠道二：ZIP 压缩包（免安装绿色版）

适合**不想用安装程序**或需要**多个 MySQL 实例**的场景。

```powershell
# 1. 下载 ZIP 包
# 访问 https://dev.mysql.com/downloads/mysql/
# 选择 Microsoft Windows → 下载 ZIP Archive

# 2. 解压到目标目录，例如 C:\mysql-8.0.40-winx64

# 3. 创建配置文件 C:\mysql-8.0.40-winx64\my.ini
@"
[mysqld]
basedir=C:/mysql-8.0.40-winx64
datadir=C:/mysql-8.0.40-winx64/data
port=3306
mysqlx-port=33060
"@ | Out-File -FilePath C:\mysql-8.0.40-winx64\my.ini -Encoding ASCII

# 4. 以管理员身份运行 PowerShell，初始化数据目录
cd C:\mysql-8.0.40-winx64
.\bin\mysqld --initialize --console
# 记住输出的临时 root 密码

# 5. 安装为 Windows 服务（可选，推荐）
.\bin\mysqld --install MySQL80

# 6. 启动
net start MySQL80
```

### 5.3 Windows 上的 Docker 安装

与 Linux/macOS 完全一致，需要先安装 Docker Desktop：

```powershell
# 1. 拉取并运行（命令与 Linux/macOS 完全一致）
docker run -d `
  --name mysql-server `
  -e MYSQL_ROOT_PASSWORD=StrongPass123! `
  -p 3306:3306 `
  -v mysql-data:/var/lib/mysql `
  mysql:8.0

# 2. 验证
docker ps
docker exec mysql-server mysql -u root -p
```

### 5.4 启动与停止（Windows）

```powershell
# ─── Windows 服务方式（MSI 安装 / ZIP 注册服务） ───

# 启动
net start MySQL80

# 停止
net stop MySQL80

# 重启
net stop MySQL80 && net start MySQL80

# 使用 PowerShell
Start-Service MySQL80
Stop-Service MySQL80
Restart-Service MySQL80

# 查看服务状态
sc query MySQL80
Get-Service MySQL80


# ─── 手动方式（ZIP 未注册服务） ───

# 启动
C:\mysql-8.0.40-winx64\bin\mysqld --console

# 停止（另开一个终端）
C:\mysql-8.0.40-winx64\bin\mysqladmin -u root -p shutdown
```

---

### 5.5 卸载（Windows）

```powershell
# ─── MSI 安装的卸载 ───

# 方法一：通过 MySQL Installer 卸载（推荐）
# 运行 "MySQL Installer - Community"
# → 点击 "Remove" → 勾选所有 MySQL 组件 → "Execute"

# 方法二：通过 Windows 设置卸载
# 设置 → 应用 → 应用和功能
# 逐个找到 MySQL 相关条目并卸载：
#   - MySQL Server 8.0
#   - MySQL Connector/ODBC 等
#   - MySQL Documentation
#   - MySQL Installer - Community（最后卸载这个）

# 方法三：命令行卸载（PowerShell 管理员）
wmic product where "name like 'MySQL%%'" call uninstall


# ─── ZIP 安装的卸载 ───
# 1. 停止并删除服务
net stop MySQL80
sc delete MySQL80

# 2. 删除整个 MySQL 目录
Remove-Item -Recurse -Force C:\mysql-8.0.40-winx64

# 3. 删除数据目录（如果不在 mysql 目录内）
Remove-Item -Recurse -Force C:\mysql-data


# ─── 清理残留（所有安装方式通用） ───
# 1. 删除数据目录
Remove-Item -Recurse -Force "C:\ProgramData\MySQL"
Remove-Item -Recurse -Force "C:\Program Files\MySQL"

# 2. 清理注册表（⚠️ 谨慎操作）
# 运行 regedit，删除：
# HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\MySQL80
# HKEY_LOCAL_MACHINE\SOFTWARE\MySQL AB

# 3. 清理环境变量
# 系统属性 → 环境变量 → 从 PATH 中删除 MySQL 相关条目
```

---

# 第四部分：安全配置（跨平台通用）

> 以下配置适用于所有操作系统和所有安装方式。

---

## 六、安全初始化

### 6.1 mysql_secure_installation（通用）

```bash
# 所有平台的交互式安全向导
sudo mysql_secure_installation
```

该脚本会依次询问：

| 步骤 | 建议操作 | 说明 |
|------|---------|------|
| 输入 root 密码 | 输入当前密码或回车（用 auth_socket 时直接回车） | |
| 设置 VALIDATE PASSWORD 组件 | Y → 选择策略等级 (0=LOW, 1=MEDIUM, 2=STRONG) | 生产用 MEDIUM |
| 修改 root 密码 | 视需要 | 如果初始化密码较弱可以改 |
| 删除匿名用户 | **Y** ✅ | 必选 |
| 禁止 root 远程登录 | **Y** ✅ | 必选 |
| 删除 test 数据库 | **Y** ✅ | 必选 |
| 刷新权限表 | **Y** ✅ | 必选 |

### 6.2 非交互式安全配置（脚本化）

适合自动化部署场景：

```bash
# 方式一：通过 SQL 语句一步到位
sudo mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPass123!';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF
```

---

## 七、安全加固清单（全平台）

以下安全配置**不依赖操作系统**，所有平台通用。

### 7.1 密码策略

```bash
# 安装密码策略组件
mysql -u root -p -e "INSTALL COMPONENT 'file://component_validate_password';"

# 查看当前策略
mysql -u root -p -e "SHOW VARIABLES LIKE 'validate_password%';"

# 设置策略等级（MEDIUM: 大小写+数字+特殊字符，至少8位）
mysql -u root -p -e "SET GLOBAL validate_password.policy = MEDIUM;"
mysql -u root -p -e "SET GLOBAL validate_password.length = 8;"
```

### 7.2 用户与权限

```bash
# 查看所有用户和允许登录的主机
mysql -u root -p -e "SELECT User, Host, plugin FROM mysql.user;"

# 创建最小权限的应用用户
mysql -u root -p -e "
CREATE USER 'app'@'192.168.1.%' IDENTIFIED BY 'AppPass2026!';
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'app'@'192.168.1.%';
FLUSH PRIVILEGES;
"
```

### 7.3 审计与日志

```bash
# 开启慢查询日志（全平台）
mysql -u root -p -e "
SET GLOBAL slow_query_log = ON;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 2;
"

# 开启 binlog（全平台，需在配置文件中持久化）
# 在 my.cnf / my.ini 中添加：
# [mysqld]
# server-id = 1
# log_bin = mysql-bin
# binlog_format = ROW
# expire_logs_days = 7
```

### 7.4 网络安全

| 配置项 | 说明 |
|--------|------|
| 绑定地址 | `bind-address = 127.0.0.1` 仅本地访问，或 `0.0.0.0` 允许网络访问 |
| 默认端口 | 3306，可改为非标准端口（如 3307）：`port = 3307` |
| SSL/TLS | 强制用户使用 SSL：`ALTER USER 'app'@'%' REQUIRE SSL;` |
| 防火墙 | 用系统防火墙限制 3306 端口的来源 IP |

### 7.5 安全配置检查清单

```
□ root 密码已设置且强度足够
□ 已删除匿名用户
□ 禁止 root 远程登录
□ 已删除 test 数据库
□ validate_password 组件已安装
□ 应用用户使用最小权限原则
□ 慢查询日志已开启
□ binlog 已开启（ROW 格式）
□ 防火墙限制了 MySQL 端口访问
□ 生产环境不使用默认端口？
□ 数据目录权限正确（仅 mysql 用户可访问）
```

---

## 八、快速参考：各平台命令对比

| 操作 | Ubuntu (apt) | RHEL (dnf) | macOS (Homebrew) | Windows |
|------|-------------|------------|-----------------|---------|
| 安装 | `apt install mysql-server` | `dnf install mysql-server` | `brew install mysql` | MSI Installer |
| 启动 | `systemctl start mysql` | `systemctl start mysqld` | `brew services start mysql` | `net start MySQL80` |
| 停止 | `systemctl stop mysql` | `systemctl stop mysqld` | `brew services stop mysql` | `net stop MySQL80` |
| 重启 | `systemctl restart mysql` | `systemctl restart mysqld` | `brew services restart mysql` | `net stop && net start` |
| 状态 | `systemctl status mysql` | `systemctl status mysqld` | `brew services list` | `sc query MySQL80` |
| 开机自启 | `systemctl enable mysql` | `systemctl enable mysqld` | 默认自动 | 默认自动 |
| 卸载 | `apt remove --purge mysql-server` | `dnf remove mysql-server` | `brew uninstall mysql` | 控制面板卸载 |
| 数据目录 | `/var/lib/mysql` | `/var/lib/mysql` | `/usr/local/var/mysql` | `C:\ProgramData\MySQL` |
| 配置文件 | `/etc/mysql/my.cnf` | `/etc/my.cnf` | `/usr/local/etc/my.cnf` | `C:\ProgramData\MySQL\my.ini` |
| 日志目录 | `/var/log/mysql/` | `/var/log/mysqld.log` | `/usr/local/var/mysql/` | `C:\ProgramData\MySQL\Data\` |

---

## 九、验证清单

完成本指南后，你应该能：

- [ ] 在 Ubuntu 上用 apt、官方 APT 源、通用二进制包三种方式安装 MySQL
- [ ] 在 RHEL/CentOS 上用 dnf 和官方 YUM 源安装 MySQL
- [ ] 在 macOS 上用 Homebrew、DMG、通用二进制包安装 MySQL
- [ ] 在 Windows 上用 MSI 和 ZIP 压缩包安装 MySQL
- [ ] 在任意平台上用 Docker 部署 MySQL
- [ ] 用 systemd / launchctl / services.msc / brew services 启动和停止 MySQL
- [ ] 正确且彻底地卸载 MySQL（各渠道对应不同的清理步骤）
- [ ] 运行 `mysql_secure_installation` 完成基础安全加固
- [ ] 配置密码策略、用户权限、审计日志
- [ ] 锁定端口和网络访问

---

*[返回 MySQL 完全指南](../notes/mysql-guide.md) · [上一章：安装与基础使用](01-install-and-basics.md)*
