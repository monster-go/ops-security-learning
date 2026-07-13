# 运维 + 网络安全 学习课程

> **学习目录**：`~/code/ops-security-learning/`  
> **文档版本**：v1.0  
> **创建日期**：2026-06-26  
> **教学方式**：后续按本文档的章节顺序，逐周推进，每完成一节在 `PROGRESS.md` 中打勾记录。

---

## 一、学习原则（必读）

### 1.1 合法边界

| 可以做 | 不可以做 |
|--------|----------|
| 在自己的虚拟机/本地环境练习 | 未经授权扫描或攻击任何真实服务器 |
| 使用 HackTheBox、TryHackMe 等授权靶场 | 对公网 IP 进行渗透测试 |
| 学习攻击原理以理解防御 | 将技术用于未授权入侵或隐藏痕迹 |
| 完成实验后清理测试痕迹 | 传播恶意工具或协助他人入侵 |

### 1.2 两条主线关系

```
运维（蓝队基础）          安全（攻防理解）
     │                        │
     ├─ Linux 系统管理 ────────┤
     ├─ 网络与服务 ────────────┤
     ├─ 日志与监控 ────────────┤
     └─ 自动化与容器 ──────────┘
              ↓
        合格的安全工程师 / 运维工程师
```

**建议路径**：先运维基础（约 5–7 周）→ 再安全专项（约 8–12 周）→ 综合实战靶场。

### 1.3 实验环境要求

在开始前，准备以下环境（第 0 周完成）：

- [ ] 安装 VirtualBox 或 VMware
- [ ] 下载 Ubuntu Server 22.04 LTS ISO
- [ ] 创建 2 台虚拟机：
  - **vm-ops**：运维练习机（2 核 CPU / 4GB 内存 / 40GB 磁盘）
  - **vm-lab**：安全靶机（1 核 CPU / 2GB 内存 / 20GB 磁盘）
- [ ] 本机安装：VS Code、终端、Wireshark（可选）
- [ ] 注册账号：TryHackMe、PortSwigger Web Security Academy（均免费）

---

## 二、课程总览（约 17 周）

| 阶段 | 周次 | 主题 | 目标 |
|------|------|------|------|
| **Phase 0** | 第 0 周 | 环境搭建与基础自测 | 虚拟机就绪，明确当前水平 |
| **Phase 1** | 第 1–4 周 | Linux 运维基础 | 能独立管理一台 Ubuntu 服务器 |
| **Phase 2** | 第 5–8 周 | 网络、服务与自动化运维 | 能部署 Web 服务、写脚本、看日志 |
| **Phase 2.5** | 第 9 周 | MySQL 数据库运维 | 能独立部署、加固、备份与调优 MySQL |
| **Phase 3** | 第 10–11 周 | 监控、容器与 CI/CD 入门 | 理解现代运维工具链 |
| **Phase 4** | 第 12–15 周 | 网络安全基础与 Web 安全 | 理解 OWASP Top 10，能在靶场解题 |
| **Phase 5** | 第 16–17 周 | 系统安全、蓝队与综合实战 | 能审计系统、在 HTB 做简单机器 |

---

## 三、Phase 0：环境搭建与自测（第 0 周）

### 3.1 任务清单

- [ ] 创建 `~/code/ops-security-learning/` 目录（已完成）
- [ ] 搭建 vm-ops 和 vm-lab 两台虚拟机
- [ ] vm-ops 配置静态 IP，能通过 SSH 从本机登录
- [ ] 填写 `PROGRESS.md` 中的「基础自测」部分

### 3.2 基础自测题（诚实填写，用于调整进度）

1. 能否在终端使用 `cd`、`ls`、`grep`、`find`？（是/否）
2. 能否解释 TCP 三次握手？（是/否/略懂）
3. 能否用 Python 或 Bash 写 10 行以上的脚本？（是/否）
4. 是否了解 HTTP 状态码 200、404、500？（是/否）
5. 是否用过 Docker？（是/否）

**自测结果 ≤ 2 个「是」**：从 Phase 1 第 1 周完整学习，不跳节。  
**自测结果 3–4 个「是」**：Phase 1 可压缩到 2–3 周。  
**自测结果 5 个「是」**：Phase 1 快速复习后进入 Phase 2。

---

## 四、Phase 1：Linux 运维基础（第 1–4 周）

### 第 1 周：Linux 文件系统与用户权限

**学习目标**：理解 Linux 目录结构、用户/组/权限模型。

**理论学习**
- 根目录结构：`/etc`、`/var`、`/home`、`/tmp`、`/usr` 各自用途
- 权限：`rwx`、数字表示法（755、644）、`umask`
- 用户管理：`useradd`、`usermod`、`passwd`、`/etc/passwd`、`/etc/shadow`
- 组管理：`groupadd`、`/etc/group`

**动手练习（在 vm-ops 上完成）**
```bash
# 1. 创建用户 devops，加入 sudo 组
sudo useradd -m -s /bin/bash devops
sudo usermod -aG sudo devops

# 2. 创建目录并设置权限
sudo mkdir -p /srv/webapp
sudo chown devops:devops /srv/webapp
sudo chmod 750 /srv/webapp

# 3. 练习 find 和 grep
find /var/log -name "*.log" -mtime -1
grep "Failed password" /var/log/auth.log
```

**验收标准**
- [ ] 能新建用户并赋予 sudo 权限
- [ ] 能解释 755 和 644 的区别
- [ ] 能用 `find` 和 `grep` 在日志中检索内容

---

### 第 2 周：软件包管理与系统服务

**学习目标**：安装软件、管理系统服务、理解 systemd。

**理论学习**
- 包管理：`apt update`、`apt install`、`apt remove`、`dpkg`
- systemd 概念：unit、service、target
- 常用命令：`systemctl start/stop/restart/status/enable`
- 日志：`journalctl -u 服务名 -f`

**动手练习**
```bash
# 1. 安装并启动 nginx
sudo apt update && sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx

# 2. 查看 nginx 日志
sudo journalctl -u nginx --since "1 hour ago"
sudo tail -f /var/log/nginx/access.log
```

**验收标准**
- [ ] 能独立安装 nginx 并设置开机自启
- [ ] 能用 `journalctl` 查看服务日志
- [ ] 能解释 `enable` 和 `start` 的区别

---

### 第 3 周：SSH 与防火墙

**学习目标**：安全远程管理服务器，配置基础防火墙。

**理论学习**
- SSH 密钥认证 vs 密码认证
- `/etc/ssh/sshd_config` 关键配置项
- UFW 防火墙：`ufw allow`、`ufw deny`、`ufw status`
- fail2ban 概念（防暴力破解）

**动手练习**
```bash
# 1. 在本机生成 SSH 密钥并部署到 vm-ops
ssh-keygen -t ed25519 -C "ops-learning"
ssh-copy-id devops@<vm-ops-ip>

# 2. 加固 SSH（在 vm-ops 上）
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# 3. 配置 UFW
sudo ufw default deny incoming
sudo ufw allow ssh
sudo ufw enable
sudo ufw status verbose
```

**验收标准**
- [ ] 能用密钥登录，禁用密码登录
- [ ] 能配置 UFW 仅开放 SSH 和 HTTP 端口
- [ ] 能说明为什么密钥比密码更安全

---

### 第 4 周：磁盘、进程与定时任务

**学习目标**：管理磁盘空间、排查进程问题、配置定时任务。

**理论学习**
- 磁盘：`df -h`、`du -sh`、`lsblk`、`mount`
- 进程：`ps aux`、`top`/`htop`、`kill`、`nice`
- cron：`crontab -e`、`/etc/cron.d/`、时间表达式
- 日志轮转：`logrotate` 概念

**动手练习**
```bash
# 1. 查看磁盘和内存
df -h
free -h
ps aux --sort=-%mem | head

# 2. 创建备份定时任务（每天凌晨 2 点备份 /srv/webapp）
crontab -e
# 添加：0 2 * * * tar -czf /backup/webapp-$(date +\%Y\%m\%d).tar.gz /srv/webapp

# 3. 查看当前所有 cron 任务
crontab -l
ls -la /etc/cron.*
```

**验收标准**
- [ ] 能找出占用磁盘最多的目录
- [ ] 能编写一条 cron 定时任务
- [ ] 能定位并结束异常进程

---

## 五、Phase 2：网络、服务与自动化（第 5–8 周）

### 第 5 周：网络基础

**学习目标**：理解 TCP/IP、DNS、端口，能用基本网络工具排障。

**理论学习**
- OSI / TCP/IP 模型（重点：应用层、传输层、网络层）
- 常用端口：22(SSH)、80(HTTP)、443(HTTPS)、53(DNS)、3306(MySQL)
- DNS 解析流程
- 工具：`ping`、`traceroute`、`nslookup`/`dig`、`ss -tlnp`、`curl`

**动手练习**
```bash
# 1. 查看监听端口
ss -tlnp

# 2. DNS 查询
dig google.com
nslookup google.com

# 3. 测试 HTTP
curl -I http://localhost
curl -v https://www.example.com
```

**验收标准**
- [ ] 能解释 TCP 三次握手和四次挥手
- [ ] 能说出 5 个常见端口及用途
- [ ] 能用 `ss` 和 `curl` 排查服务连通性

---

### 第 6 周：Web 服务部署（Nginx + 静态站点）

**学习目标**：部署网站、理解虚拟主机、配置 HTTPS 概念。

**动手练习**
```bash
# 1. 创建简单静态站点
sudo mkdir -p /srv/webapp/html
echo "<h1>Ops Learning</h1>" | sudo tee /srv/webapp/html/index.html

# 2. 配置 nginx 虚拟主机
sudo tee /etc/nginx/sites-available/webapp <<'EOF'
server {
    listen 80;
    server_name _;
    root /srv/webapp/html;
    index index.html;
}
EOF
sudo ln -sf /etc/nginx/sites-available/webapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**理论学习**
- 反向代理概念
- Let's Encrypt / Certbot（HTTPS 证书）
- 负载均衡基本概念

**验收标准**
- [ ] 能通过浏览器访问 vm-ops 上的静态站点
- [ ] 能解释正向代理和反向代理的区别
- [ ] 知道 HTTPS 证书的作用

---

### 第 7 周：Bash 脚本自动化

**学习目标**：用 Shell 脚本完成日常运维自动化。

**示例脚本：系统巡检**
```bash
#!/bin/bash
# 保存为 ~/bin/health-check.sh

echo "=== 系统巡检 $(date) ==="
echo "--- 磁盘 ---"
df -h | grep -E '^/dev'
echo "--- 内存 ---"
free -h
echo "--- 负载 ---"
uptime
echo "--- 失败登录 ---"
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5
echo "--- 监听端口 ---"
ss -tlnp
```

**学习任务**
- 变量、条件判断、循环
- 函数、`$1` `$2` 参数
- `set -euo pipefail` 安全写法
- 用 `crontab` 定时执行脚本

**验收标准**
- [ ] 能独立编写 30 行以上的 Bash 巡检脚本
- [ ] 脚本能通过 `shellcheck` 检查（可选）
- [ ] 已配置 cron 每日自动执行

---

### 第 8 周：日志管理与故障排查

**学习目标**：读懂系统日志，建立排障思路。

**关键日志文件**
| 日志路径 | 内容 |
|----------|------|
| `/var/log/syslog` | 系统综合日志 |
| `/var/log/auth.log` | 登录认证日志 |
| `/var/log/nginx/access.log` | Web 访问日志 |
| `/var/log/nginx/error.log` | Web 错误日志 |
| `journalctl` | systemd 服务日志 |

**排障流程**
```
1. 确认现象（服务不可用？慢？报错？）
2. 查看服务状态（systemctl status）
3. 查看相关日志（journalctl / tail）
4. 检查配置（nginx -t / 配置文件语法）
5. 检查资源（df / free / ss）
6. 检查网络（curl / ping / 防火墙）
7. 修复并验证
```

**验收标准**
- [ ] 能根据 nginx 502 错误独立完成排查
- [ ] 能从 auth.log 中发现暴力破解尝试
- [ ] 能写一份简单的故障排查记录

---

## 六、Phase 2.5：MySQL 数据库运维（第 9 周）

> **适用对象**：已完成 Phase 1–2（Linux 基础 + 网络服务）、能管理一台 Ubuntu 服务器的学习者。  
> **本章定位**：面向"已经会装 MySQL、想深入管理、调优和排障"的运维工程师，内容覆盖从安装到高可用的完整链路。
> 
> 📖 完整深度文档见 → [`notes/mysql-guide.md`](./notes/mysql-guide.md)（索引页）  
> 📂 章节文件见 → [`mysql/`](./mysql/) 目录

---

### 第 9 周：MySQL 部署、管理与调优

**学习目标**：能独立完成 MySQL 的部署、安全加固、备份恢复、性能调优、主从配置，并具备常见故障排查能力。

**理论学习**

| 章节 | 核心内容 |
|------|---------|
| [安装与基础使用](./mysql/01-install-and-basics.md) | apt/Docker 部署、mysql 客户端、数据库/表 CRUD、索引基础 |
| [用户与安全加固](./mysql/02-user-and-security.md) | 用户管理、权限体系（GRANT/REVOKE）、密码策略、SSL 连接、审计日志 |
| [备份与恢复](./mysql/03-backup-and-recovery.md) | mysqldump 详解、物理备份概念、binlog 原理、PITR 恢复 |
| [性能调优](./mysql/04-performance-tuning.md) | 慢查询日志、EXPLAIN 执行计划、InnoDB 关键参数、连接池 |
| [主从复制与高可用](./mysql/05-replication-and-ha.md) | 异步/半同步复制、读写分离概念、故障切换思路 |
| [监控](./mysql/06-monitoring.md) | Performance Schema、内置指标、Prometheus + mysqld_exporter |
| [常见故障排查](./mysql/07-common-faults.md) | 无法连接、Too many connections、死锁、表损坏修复 |
| [卸载与清理](./mysql/08-uninstall-and-cleanup.md) | 备份后安全卸载、Docker 清理、数据目录彻底清除 |

**动手练习**

本周含 3 个动手实验，建议依次完成：

| 实验 | 时长 | 目标 |
|------|------|------|
| [实验一：部署与安全加固](./mysql/labs/lab-01-deploy-and-harden.md) | 60 min | 从零部署 MySQL 8.0，完成完整安全加固 |
| [实验二：基于时间点的恢复（PITR）](./mysql/labs/lab-02-pitr-recovery.md) | 45 min | 模拟误删数据，用 binlog 精确恢复 |
| [实验三：主从复制与故障切换](./mysql/labs/lab-03-replication-failover.md) | 60 min | 配置主从复制，模拟主库宕机并切换 |

**验收标准**
- [ ] 能通过 apt 或 Docker 全新安装 MySQL 8.0
- [ ] 能独立完成安全加固（禁止 root 远程、删除匿名用户、配置密码策略）
- [ ] 能用 mysqldump + binlog 完成一次完整的 PITR 恢复
- [ ] 能配置主从复制并模拟主库宕机后的故障切换
- [ ] 能通过 EXPLAIN 分析一条慢查询并给出优化建议

---

## 七、Phase 3：现代运维工具链（第 10–11 周）

### 第 10 周：Docker 容器入门

**学习目标**：理解容器概念，能构建和运行 Docker 容器。

**理论学习**
- 容器 vs 虚拟机
- 镜像、容器、仓库（Registry）
- Dockerfile 基本指令：`FROM`、`RUN`、`COPY`、`EXPOSE`、`CMD`

**动手练习**
```bash
# 1. 安装 Docker（vm-ops）
sudo apt install -y docker.io
sudo usermod -aG docker $USER

# 2. 运行 nginx 容器
docker run -d -p 8080:80 --name my-nginx nginx

# 3. 编写 Dockerfile
mkdir ~/docker-web && cd ~/docker-web
cat > Dockerfile <<'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
EXPOSE 80
EOF
echo "<h1>Docker Web</h1>" > index.html
docker build -t my-web .
docker run -d -p 8081:80 my-web
```

**验收标准**
- [ ] 能解释容器和虚拟机的区别
- [ ] 能编写简单 Dockerfile 并构建镜像
- [ ] 能用 `docker ps`、`docker logs` 管理容器

---

### 第 11 周：监控入门与 CI/CD 概念

**学习目标**：了解监控体系，理解 CI/CD 基本流程。

**理论学习**
- 监控三要素：Metrics（指标）、Logs（日志）、Traces（链路）
- 工具了解：Prometheus + Grafana、ELK Stack
- CI/CD 流程：代码提交 → 自动测试 → 自动构建 → 自动部署
- 工具了解：GitHub Actions、GitLab CI、Jenkins

**动手练习（轻量）**
```bash
# 安装 node_exporter（了解即可）
# 或用 docker 快速体验 Grafana
docker run -d -p 3000:3000 grafana/grafana
```

**验收标准**
- [ ] 能画出 CI/CD 基本流程图
- [ ] 能解释 Metrics 和 Logs 的区别
- [ ] 知道 Prometheus 和 Grafana 各自的角色

---

## 八、Phase 4：网络安全基础（第 12–15 周）

> 从此阶段开始，所有实验**仅在 vm-lab 或授权靶场**进行。

### 第 12 周：安全概论与信息收集

**学习目标**：建立安全思维，了解合法渗透测试流程。

**理论学习**
- 白帽 / 灰帽 / 黑帽的区别
- 渗透测试标准流程：信息收集 → 漏洞扫描 → 漏洞利用 → 提权 → 报告
- OWASP、PTES、MITRE ATT&CK 框架简介
- 信息收集：被动收集 vs 主动扫描

**工具了解（仅在靶场使用）**
- Nmap：端口扫描、服务识别
- 基本用法：`nmap -sV -sC <target>`

**TryHackMe 练习**
- 完成房间：**Intro to Cyber Security**
- 完成房间：**Nmap**

**验收标准**
- [ ] 能描述完整渗透测试流程
- [ ] 能用 Nmap 扫描靶机开放端口
- [ ] 能解释主动扫描的法律风险

---

### 第 13 周：Linux 安全加固（蓝队视角）

**学习目标**：从防御角度加固 Ubuntu，能发现常见异常。

**加固清单**
```bash
# 1. SSH 加固
#    - 禁用 root 登录
#    - 仅密钥认证
#    - 修改默认端口（可选）

# 2. 审计 SSH 密钥
cat ~/.ssh/authorized_keys
cat /etc/passwd | grep -v nologin

# 3. 审计定时任务
crontab -l
ls -la /etc/cron.*
cat /etc/crontab

# 4. 审计开机服务
systemctl list-unit-files --state=enabled

# 5. 审计监听端口
ss -tlnp

# 6. 审计 SUID 文件
find / -perm -4000 -type f 2>/dev/null

# 7. 安装 auditd
sudo apt install -y auditd
```

**验收标准**
- [ ] 能完成一份 Ubuntu 安全加固检查表
- [ ] 能发现 authorized_keys 中的异常密钥
- [ ] 能列出所有 SUID 文件并判断是否合理

---

### 第 14 周：Web 安全（OWASP Top 10 入门）

**学习目标**：理解常见 Web 漏洞原理，在 DVWA 靶场练习。

**必学漏洞**
| 漏洞 | 原理 | 练习环境 |
|------|------|----------|
| SQL 注入 | 用户输入拼接到 SQL 语句 | DVWA / PortSwigger |
| XSS | 恶意脚本注入页面 | DVWA / PortSwigger |
| 文件上传 | 上传恶意文件获取 Shell | DVWA |
| 命令注入 | 用户输入拼接到系统命令 | DVWA |

**DVWA 搭建（vm-lab）**
```bash
# 使用 Docker 快速搭建
docker run -d -p 80:80 vulnerables/web-dvwa
# 访问 http://<vm-lab-ip>/  默认用户 admin / password
```

**PortSwigger 练习**
- 完成 SQL Injection 章节（前 5 个 Lab）
- 完成 Cross-site scripting 章节（前 3 个 Lab）

**验收标准**
- [ ] 能解释 SQL 注入成因和防御（参数化查询）
- [ ] 能在 DVWA 低难度完成 SQL 注入和 XSS
- [ ] 能使用 Burp Suite 拦截和修改 HTTP 请求

---

### 第 15 周：密码学基础与 HTTPS

**学习目标**：理解加密、哈希、数字证书，不陷入数学细节。

**理论学习**
- 对称加密 vs 非对称加密
- 哈希函数：MD5（已不安全）、SHA-256
- 密码存储：bcrypt、argon2，**禁止明文存储**
- HTTPS 握手过程（简化版）
- 数字证书与 CA 机构

**动手练习**
```bash
# 生成哈希
echo -n "password123" | sha256sum

# 查看网站证书
openssl s_client -connect www.google.com:443 </dev/null 2>/dev/null | openssl x509 -text -noout | head -20
```

**验收标准**
- [ ] 能解释 HTTPS 为什么比 HTTP 安全
- [ ] 能说明为什么不能只用 MD5 存储密码
- [ ] 能查看并读懂证书中的颁发者和有效期

---

## 九、Phase 5：综合实战（第 16–17 周）

### 第 16 周：系统渗透与权限提升（靶场）

**学习目标**：在授权环境理解提权思路，重点学防御检测。

**理论学习**
- 提权类型：垂直提权（普通用户 → root）、水平提权（同级用户）
- Linux 提权常见向量（防御视角）：
  - SUID/SGID 滥用
  - 内核漏洞
  - 计划任务配置错误
  - 敏感文件权限（`/etc/passwd` 可写）
  - sudo 配置不当（`sudo -l`）

**TryHackMe 练习**
- **Linux Fundamentals** 系列（如果未做过）
- **Basic Pentesting** 房间

**验收标准**
- [ ] 能在 TryHackMe 完成至少 2 个 Easy 房间
- [ ] 能列出 5 种 Linux 提权向量及对应防御措施
- [ ] 能使用 `sudo -l` 和 `find / -perm -4000` 做审计

---

### 第 17 周：应急响应与综合考核

**学习目标**：模拟「服务器被入侵」场景，练习应急响应流程。

**应急响应流程**
```
1. 隔离：断网或限制访问（保留证据）
2. 保全：备份日志和内存快照
3. 分析：
   - 检查 auth.log 异常登录
   - 检查 authorized_keys
   - 检查 cron / systemd 异常服务
   - 检查异常进程和网络连接
4. 清除：删除后门、修复漏洞
5. 恢复：从干净备份恢复服务
6. 总结：写 incident report，修补防御
```

**综合考核任务（在 vm-lab 模拟）**

假设 vm-lab 被「入侵」，请完成：
1. 找出攻击者添加的后门用户
2. 找出异常 cron 任务
3. 找出异常 SSH 密钥
4. 修复所有问题并写一份 1 页的事件报告

**HackTheBox 练习**
- 完成 1 台 Easy 难度的 retired 机器

**验收标准**
- [ ] 能独立完成一次完整的应急响应流程
- [ ] 能撰写简单安全事件报告
- [ ] 能在 HackTheBox 完成 1 台 Easy 机器

---

## 九、推荐学习资源

### 运维
| 资源 | 类型 | 链接 |
|------|------|------|
| Linux Journey | 免费教程 | https://linuxjourney.com |
| DigitalOcean Community | 教程文章 | https://www.digitalocean.com/community/tutorials |
| 《鸟哥的 Linux 私房菜》 | 书籍 | 基础篇即可 |

### 安全
| 资源 | 类型 | 链接 |
|------|------|------|
| TryHackMe | 靶场 | https://tryhackme.com |
| HackTheBox | 靶场 | https://www.hackthebox.com |
| PortSwigger Academy | Web 安全 | https://portswigger.net/web-security |
| DVWA | Web 靶场 | https://github.com/digininja/DVWA |
| OWASP Top 10 | 标准文档 | https://owasp.org/www-project-top-ten/ |
| MITRE ATT&CK | 攻击框架 | https://attack.mitre.org |

### 工具
| 工具 | 用途 |
|------|------|
| Nmap | 端口扫描 |
| Burp Suite Community | Web 抓包与测试 |
| Wireshark | 网络抓包分析 |
| Metasploit | 渗透框架（靶场用） |
| LinPEAS | Linux 提权检测脚本（防御学习） |

---

## 十、后续上课方式

每次学习时，按以下流程进行：

1. **你告诉我**：当前进度（参考 `PROGRESS.md`）和本周可用的学习时间
2. **我按本文档**：讲解本周理论 → 给出练习任务 → 检查你的操作结果
3. **你完成练习**：在虚拟机或靶场上动手，遇到报错把终端输出贴给我
4. **验收打勾**：完成后更新 `PROGRESS.md`，进入下一周

**常用口令**
- 「开始第 X 周」→ 我按对应章节教学
- 「我做完了」→ 我出题验收
- 「卡住了」→ 贴报错，我帮你排查
- 「复习第 X 周」→ 回顾该周重点

---

## 十一、进度追踪

详见同目录下的 `PROGRESS.md`，每完成一周的任务后打勾记录。

---

*本文档会随学习进度更新。当前版本涵盖 17 周完整路线，从零基础到能独立完成基础运维和靶场实战。*
