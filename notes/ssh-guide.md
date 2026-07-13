# SSH 完全指南：原理、配置与实践

> **适用阶段**：Phase 1 第 3 周 — SSH 与防火墙  
> **文档版本**：v1.1  
> **创建日期**：2026-07-07  
> **更新日期**：2026-07-07  
> **实验环境**：vm-ops（Ubuntu Server 22.04 LTS）

---

## 目录

1. [什么是 SSH](#1-什么是-ssh)
2. [SSH 工作原理](#2-ssh-工作原理)
3. [核心组件与文件](#3-核心组件与文件)
   - [3.3 核心组件参数详解](#33-核心组件参数详解)
4. [认证方式对比](#4-认证方式对比)
5. [密钥管理实战](#5-密钥管理实战)
6. [客户端常用命令与 -o 选项](#6-客户端常用命令与--o-选项)
7. [服务端配置详解](#7-服务端配置详解)
8. [SSH 隧道与端口转发](#8-ssh-隧道与端口转发)
9. [文件传输：SCP 与 SFTP](#9-文件传输scp-与-sftp)
10. [安全加固最佳实践](#10-安全加固最佳实践)
11. [故障排查手册](#11-故障排查手册)
12. [运维与安全场景案例](#12-运维与安全场景案例)
13. [验收自测清单](#13-验收自测清单)
14. [参考资源](#14-参考资源)

---

## 1. 什么是 SSH

**SSH**（Secure Shell，安全外壳协议）是一种加密的网络协议，用于在不安全的网络中安全地远程登录服务器、执行命令和传输文件。

### 1.1 为什么需要 SSH

在 SSH 出现之前，系统管理员普遍使用 **Telnet** 和 **rlogin** 进行远程管理。这些协议以**明文**传输用户名、密码和命令内容，攻击者只需在同一网段抓包，就能窃取凭据。

SSH 解决了三个核心问题：

| 问题 | SSH 的解决方案 |
|------|----------------|
| 窃听（Eavesdropping） | 全程加密通信 |
| 中间人攻击（MITM） | 主机密钥指纹验证 |
| 伪造身份 | 密钥认证 + 密码认证 |

### 1.2 典型使用场景

- 远程登录 Linux/Unix 服务器执行命令
- 自动化部署（Ansible、Git、CI/CD 通过 SSH 连接目标机）
- 安全传输文件（SCP、SFTP、rsync over SSH）
- 穿透内网访问服务（本地/远程端口转发）
- 跳板机（Bastion Host）访问隔离网络中的机器

### 1.3 默认端口

- **22/TCP**：SSH 标准端口（可修改，见加固章节）
- 防火墙中常写作 `ssh` 服务名，等价于 TCP 22

---

## 2. SSH 工作原理

### 2.1 协议版本

现代系统使用 **SSH-2**（SSH Protocol 2.0）。SSH-1 因设计缺陷已废弃，OpenSSH 7.0+ 默认禁用。

### 2.2 连接建立流程（简化）

```
客户端                                    服务端 (sshd)
   │                                          │
   │──── 1. TCP 三次握手（端口 22）───────────>│
   │                                          │
   │<─── 2. 服务端发送版本 + 主机公钥 ─────────│
   │                                          │
   │──── 3. 密钥交换（Diffie-Hellman 等）────>│
   │     协商出对称会话密钥                      │
   │                                          │
   │<─── 4. 加密通道建立完成 ─────────────────│
   │                                          │
   │──── 5. 用户认证（密码/公钥/其他）────────>│
   │                                          │
   │<─── 6. 认证成功，进入 Shell/命令模式 ─────│
```

**关键理解**：

1. **传输层加密**：连接建立后，所有数据（包括密码）都在加密通道内传输。
2. **主机验证**：首次连接时，客户端会提示保存服务端**主机公钥指纹**（`~/.ssh/known_hosts`），防止中间人冒充。
3. **用户认证**：加密通道建立后，才进行用户身份验证。

### 2.3 加密算法层次

| 层次 | 作用 | 常见算法 |
|------|------|----------|
| 密钥交换 | 协商会话密钥 | curve25519-sha256、ecdh-sha2-nistp256 |
| 对称加密 | 加密实际数据 | chacha20-poly1305、aes256-gcm |
| 消息认证 | 防篡改 | hmac-sha2-256 |
| 主机密钥 | 服务端身份标识 | ed25519、rsa、ecdsa |
| 用户密钥 | 客户端身份认证 | ed25519、rsa |

---

## 3. 核心组件与文件

### 3.1 软件组件

| 组件 | 说明 |
|------|------|
| `ssh` | 客户端，发起连接 |
| `sshd` | 服务端守护进程（SSH Daemon） |
| `ssh-keygen` | 生成密钥对 |
| `ssh-copy-id` | 将公钥部署到远程 `authorized_keys` |
| `scp` | 基于 SSH 的文件复制 |
| `sftp` | 基于 SSH 的文件传输协议 |

Ubuntu/Debian 安装：

```bash
# 客户端和服务端通常已预装，若缺失：
sudo apt update
sudo apt install -y openssh-client openssh-server
sudo systemctl enable --now ssh
```

### 3.2 重要文件路径

**客户端（你的笔记本 / 本机）**

| 路径 | 权限 | 说明 |
|------|------|------|
| `~/.ssh/id_ed25519` | 600 | 私钥，**绝不能泄露** |
| `~/.ssh/id_ed25519.pub` | 644 | 公钥，可分发到服务器 |
| `~/.ssh/known_hosts` | 644 | 已信任的服务端主机密钥 |
| `~/.ssh/config` | 600 | 客户端连接配置（别名、跳板机等） |

**服务端（vm-ops）**

| 路径 | 权限 | 说明 |
|------|------|------|
| `/etc/ssh/sshd_config` | 644 | 服务端主配置文件 |
| `/etc/ssh/ssh_host_*_key` | 600 | 服务端主机私钥 |
| `/etc/ssh/ssh_host_*_key.pub` | 644 | 服务端主机公钥 |
| `~/.ssh/authorized_keys` | 600 | 允许登录该用户的公钥列表 |
| `/var/log/auth.log` | — | 认证日志（Ubuntu/Debian） |

**权限要求（非常重要）**

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_ed25519
```

权限过宽时，`sshd` 会**拒绝**使用密钥认证，这是常见的踩坑点。

### 3.3 核心组件参数详解

以下按工具逐一说明**常用参数、适用场景和完整命令示例**。建议配合 `man <命令>` 查阅完整手册。

---

#### 3.3.1 `ssh` — 客户端连接

**基本语法**

```bash
ssh [选项] [用户@]主机 [命令]
```

**连接类参数**

| 参数 | 长选项 | 说明 | 示例 |
|------|--------|------|------|
| `-p` | — | 指定端口 | `ssh -p 2222 devops@vm-ops` |
| `-i` | — | 指定私钥文件 | `ssh -i ~/.ssh/deploy_key devops@vm-ops` |
| `-l` | — | 指定用户名（等价于 user@） | `ssh -l devops vm-ops` |
| `-4` / `-6` | — | 强制 IPv4 / IPv6 | `ssh -4 devops@vm-ops` |
| `-J` | — | 跳板机（可多个，逗号分隔） | `ssh -J bastion devops@10.0.0.5` |
| `-W` | — | 转发到目标主机:端口（底层隧道） | `ssh -W 10.0.0.5:22 bastion` |

**执行与交互类参数**

| 参数 | 说明 | 示例 |
|------|------|------|
| 末尾加命令 | 执行后退出，不进入交互 Shell | `ssh devops@vm-ops "hostname && uptime"` |
| `-t` | 强制分配伪终端（sudo、交互程序需要） | `ssh -t devops@vm-ops sudo reboot` |
| `-T` | 禁用伪终端（纯命令执行） | `ssh -T git@github.com` |
| `-n` | 从 `/dev/null` 读 stdin（脚本后台执行时用） | `ssh -n devops@vm-ops long-task.sh` |
| `-f` | 后台运行（常与 `-N` 隧道联用） | `ssh -f -N -L 8080:localhost:80 devops@vm-ops` |
| `-N` | 不执行远程命令，仅做端口转发 | `ssh -N -L 3307:db:3306 devops@vm-ops` |

**端口转发类参数**

| 参数 | 格式 | 说明 |
|------|------|------|
| `-L` | `[bind:]port:host:hostport` | 本地转发：本机端口 → 远端可达地址 |
| `-R` | `[bind:]port:host:hostport` | 远程转发：远端端口 → 本机/他机地址 |
| `-D` | `[bind:]port` | 动态 SOCKS5 代理 |

```bash
# 本地转发：本机 8080 → 经 vm-ops 访问 10.0.0.5:80
ssh -L 8080:10.0.0.5:80 devops@vm-ops -N

# 仅绑定本机（默认）；绑定所有网卡需加 bind 地址
ssh -L 0.0.0.0:8080:10.0.0.5:80 devops@vm-ops -N

# 远程转发：vm-ops 的 9000 → 你本机 3000
ssh -R 9000:localhost:3000 devops@vm-ops -N

# 动态代理
ssh -D 1080 devops@vm-ops -N
```

**调试与安全类参数**

| 参数 | 说明 |
|------|------|
| `-v` / `-vv` / `-vvv` | 递增详细程度，排障用 |
| `-q` | 静默模式，减少输出 |
| `-o Option=value` | 覆盖配置项（见第 6 章） |
| `-F configfile` | 指定配置文件 |
| `-o BatchMode=yes` | 非交互模式，失败即退出（脚本必备） |

**实战示例：脚本中远程执行**

```bash
#!/bin/bash
set -euo pipefail

HOST="devops@192.168.56.10"
KEY="$HOME/.ssh/id_ed25519"

# 非交互执行巡检，超时 10 秒
ssh -i "$KEY" \
    -o BatchMode=yes \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=accept-new \
    "$HOST" 'df -h / && free -h'
```

**预期输出示例**

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        40G  8.2G   30G  22% /
               total        used        free
Mem:           3.8Gi       512Mi       3.1Gi
```

---

#### 3.3.2 `sshd` — 服务端守护进程

`sshd` 通常由 systemd 管理，不直接手工启动；运维主要接触**配置**和**诊断命令**。

**常用管理命令**

```bash
# 查看状态（Ubuntu 服务名是 ssh，不是 sshd）
sudo systemctl status ssh

# 启动 / 停止 / 重启
sudo systemctl start ssh
sudo systemctl stop ssh
sudo systemctl restart ssh        # 修改配置后使用
sudo systemctl reload ssh         # 平滑重载（不断现有连接，部分配置需 restart）

# 开机自启
sudo systemctl enable ssh
sudo systemctl is-enabled ssh
```

**sshd 诊断命令**

| 命令 | 作用 |
|------|------|
| `sudo sshd -t` | 检查 `sshd_config` 语法，**改配置后必跑** |
| `sudo sshd -T` | 输出当前生效的全部配置（展开默认值） |
| `sudo sshd -T \| grep password` | 过滤查看认证相关生效项 |
| `ss -tlnp \| grep ssh` | 确认监听地址和端口 |

```bash
# 检查语法
sudo sshd -t
# 无输出 = 语法正确

# 查看实际生效的 PasswordAuthentication
sudo sshd -T | grep -i passwordauthentication
# 输出示例：passwordauthentication no
```

**sshd 直接启动参数（了解即可）**

```bash
# 调试模式：前台运行 + 输出日志到终端（排障时用，-d 可叠加最多 3 次）
sudo /usr/sbin/sshd -D -d -p 22
# Ctrl+C 结束；不要在生产环境长期开着
```

---

#### 3.3.3 `ssh-keygen` — 密钥生成与管理

**基本语法**

```bash
ssh-keygen [选项] [-f 密钥路径] [-C 注释]
```

**生成密钥**

| 参数 | 说明 | 示例 |
|------|------|------|
| `-t` | 算法类型 | `ed25519`、`rsa`、`ecdsa` |
| `-b` | 密钥位数（RSA/ECDSA） | `-t rsa -b 4096` |
| `-f` | 输出文件路径 | `-f ~/.ssh/vm-ops-key` |
| `-C` | 注释（写入公钥末尾，便于识别） | `-C "devops@laptop-2026"` |
| `-N` | 新 passphrase（空字符串 `""` 表示无密码） | `-N "my-secret"` |
| `-q` | 静默模式 | 脚本生成时用 |

```bash
# 交互式生成（推荐学习时使用）
ssh-keygen -t ed25519 -C "ops-learning@$(hostname)"

# 非交互式生成（自动化脚本用）
ssh-keygen -t ed25519 \
  -f ~/.ssh/vm-ops-deploy \
  -C "deploy-key-vm-ops" \
  -N "" \
  -q

# 生成 RSA 4096（兼容老系统）
ssh-keygen -t rsa -b 4096 -f ~/.ssh/legacy_rsa -C "legacy"
```

**密钥维护**

| 参数 | 作用 | 示例 |
|------|------|------|
| `-l` | 查看公钥/私钥指纹 | `ssh-keygen -l -f ~/.ssh/id_ed25519.pub` |
| `-lf` | 查看 authorized_keys 中所有指纹 | `ssh-keygen -lf ~/.ssh/authorized_keys` |
| `-y` | 从私钥导出公钥 | `ssh-keygen -y -f ~/.ssh/id_ed25519` |
| `-p` | 修改 passphrase | `ssh-keygen -p -f ~/.ssh/id_ed25519` |
| `-R` | 从 known_hosts 删除主机记录 | `ssh-keygen -R 192.168.56.10` |
| `-F` | 查询 known_hosts 中某主机 | `ssh-keygen -F vm-ops` |

```bash
# 查看公钥指纹（部署前核对用）
ssh-keygen -l -f ~/.ssh/id_ed25519.pub
# 256 SHA256:xxxxxxxxxxxx  ops-learning@my-mac (ED25519)

# 服务器重装后，客户端清除旧主机密钥
ssh-keygen -R 192.168.56.10
ssh-keygen -R vm-ops   # 若 config 里配置了 Host 别名
```

**实战：为不同环境使用不同密钥**

```bash
# 生成运维密钥 + 部署密钥（职责分离）
ssh-keygen -t ed25519 -f ~/.ssh/id_ops    -C "personal-ops"
ssh-keygen -t ed25519 -f ~/.ssh/id_deploy -C "ci-deploy-only"

# ~/.ssh/config 中为不同 Host 指定 IdentityFile
```

---

#### 3.3.4 `ssh-copy-id` — 公钥部署

**基本语法**

```bash
ssh-copy-id [选项] [用户@]主机
```

| 参数 | 说明 | 示例 |
|------|------|------|
| `-i` | 指定公钥文件（可多个，逗号分隔） | `-i ~/.ssh/id_ed25519.pub` |
| `-p` | SSH 端口 | `-p 2222` |
| `-o` | 传递 ssh 选项 | `-o StrictHostKeyChecking=no`（仅实验环境） |
| `-f` | 强制模式，不询问 | 脚本中使用 |

```bash
# 标准用法：会要求输入一次远程用户密码
ssh-copy-id -i ~/.ssh/id_ed25519.pub devops@192.168.56.10

# 非标准端口
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 2222 devops@192.168.56.10

# 部署到多台（循环示例）
for host in 192.168.56.10 192.168.56.11 192.168.56.12; do
  ssh-copy-id -i ~/.ssh/id_ed25519.pub "devops@${host}"
done
```

**预期输出**

```
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/home/you/.ssh/id_ed25519.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s)...
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
devops@192.168.56.10's password:        ← 最后一次输入密码

Number of key(s) added: 1
```

**手动等价操作**（`ssh-copy-id` 失败时的备选）

```bash
PUBKEY=$(cat ~/.ssh/id_ed25519.pub)
ssh devops@192.168.56.10 "umask 077; mkdir -p ~/.ssh && echo '$PUBKEY' >> ~/.ssh/authorized_keys"
```

---

#### 3.3.5 `scp` — 安全复制

**基本语法**

```bash
scp [选项] 源路径 目标路径
# 远程路径格式：用户@主机:路径
```

| 参数 | 说明 | 示例 |
|------|------|------|
| `-r` | 递归复制目录 | `scp -r ./app/ devops@vm-ops:/srv/` |
| `-P` | 端口（**大写 P**，与 ssh 的 -p 不同） | `scp -P 2222 file devops@vm-ops:~` |
| `-i` | 指定私钥 | `scp -i ~/.ssh/id_ed25519 file devops@vm-ops:~` |
| `-p` | 保留修改时间、访问时间和权限 | `scp -p backup.tar.gz devops@vm-ops:~` |
| `-C` | 传输时压缩 | 慢网络传大文件时有用 |
| `-l` | 限速（Kbit/s） | `scp -l 8000 large.iso devops@vm-ops:~` |
| `-q` | 静默 | 脚本中使用 |
| `-v` | 详细输出 | 排障用 |

```bash
# 上传单文件
scp ./nginx.conf devops@192.168.56.10:/tmp/

# 下载日志
scp devops@192.168.56.10:/var/log/nginx/access.log ./logs/

# 递归上传静态资源，保留时间戳，限速 5MB/s
scp -rp -l 40960 ./static/ devops@vm-ops:/srv/webapp/html/

# 通过 config 别名
scp app.tar.gz vm-ops:/srv/webapp/
```

**注意**：`scp` 协议较老，OpenSSH 9+ 可用 `sftp` 替代部分场景；大目录增量同步优先用 `rsync`。

---

#### 3.3.6 `sftp` — 交互式 / 批处理文件传输

**启动方式**

```bash
sftp [选项] [用户@]主机
sftp -P 2222 devops@vm-ops          # 指定端口
sftp -i ~/.ssh/id_ed25519 devops@vm-ops
```

**交互式常用子命令**

| 命令 | 说明 | 示例 |
|------|------|------|
| `ls` / `lls` | 列远程 / 本地目录 | `ls -la` |
| `cd` / `lcd` | 切换远程 / 本地目录 | `cd /var/log` |
| `pwd` / `lpwd` | 显示远程 / 本地当前路径 | |
| `get` | 下载 | `get access.log` |
| `get -r` | 递归下载目录 | `get -r /srv/webapp/html` |
| `put` | 上传 | `put index.html` |
| `put -r` | 递归上传 | `put -r ./dist` |
| `mkdir` | 创建远程目录 | `mkdir backup` |
| `rm` / `rmdir` | 删除远程文件 / 空目录 | |
| `rename` | 重命名 | `rename old.log new.log` |
| `chmod` / `chown` | 修改远程权限（需服务端支持） | `chmod 644 file` |
| `bye` / `exit` / `quit` | 退出 | |

**批处理模式（脚本自动化）**

```bash
# 方式一：-b 批处理文件
cat > /tmp/sftp-batch.txt <<'EOF'
cd /srv/webapp
put ./dist/index.html
put ./dist/app.js
ls -la
bye
EOF
sftp -b /tmp/sftp-batch.txt devops@vm-ops

# 方式二：heredoc 管道
sftp devops@vm-ops <<'EOF'
put ./config.yml /etc/myapp/config.yml
bye
EOF
```

---

#### 3.3.7 `ssh-agent` 与 `ssh-add` — 私钥代理

私钥有 passphrase 时，每次 SSH 都要输入密码；`ssh-agent` 在内存中缓存解密后的私钥。

```bash
# 启动 agent（输出环境变量）
eval "$(ssh-agent -s)"
# Agent pid 12345

# 添加私钥（输入一次 passphrase）
ssh-add ~/.ssh/id_ed25519

# 查看已加载的密钥
ssh-add -l
ssh-add -L    # 输出公钥内容

# 删除 / 清空
ssh-add -d ~/.ssh/id_ed25519   # 删除指定
ssh-add -D                      # 清空全部

# 停止 agent
ssh-agent -k
```

**macOS 用户**：系统 Keychain 通常自动管理，可用 `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`。

**实战：CI 中使用 agent**

```bash
eval "$(ssh-agent -s)"
echo "$DEPLOY_PRIVATE_KEY" | ssh-add -
ssh -o BatchMode=yes devops@vm-ops "hostname"
```

---

#### 3.3.8 辅助工具速查

| 工具 | 用途 | 典型命令 |
|------|------|----------|
| `ssh-keyscan` | 批量采集主机公钥写入 known_hosts | `ssh-keyscan -H vm-ops >> ~/.ssh/known_hosts` |
| `sftp-server` | 服务端组件（由 sshd 自动调用） | 一般不手动执行 |
| `rsync` | 增量同步（走 SSH 通道） | `rsync -avz -e "ssh -p 22" ./data/ user@host:/data/` |

```bash
# 预先信任新服务器（自动化脚本用，需确认指纹来源可信）
ssh-keyscan -H 192.168.56.10 2>/dev/null >> ~/.ssh/known_hosts
```

---

## 4. 认证方式对比

### 4.1 密码认证

```
用户输入密码 → 加密传输到服务端 → 与系统密码（/etc/shadow）比对
```

| 优点 | 缺点 |
|------|------|
| 简单，无需提前配置 | 易受暴力破解（尤其弱密码） |
| 适合临时访问 | 密码可能被人肩窥、钓鱼、泄露 |
| | 不适合自动化脚本 |

### 4.2 公钥认证（推荐）

```
客户端用私钥签名 → 服务端用 authorized_keys 中的公钥验证
```

| 优点 | 缺点 |
|------|------|
| 私钥不离开本机，抗暴力破解 | 需提前部署公钥 |
| 适合自动化（Ansible、Git、CI） | 私钥丢失 = 需从所有服务器撤销 |
| 可配合 passphrase 加密私钥 | 权限配置要求严格 |

### 4.3 为什么密钥比密码更安全

1. **不可暴力穷举**：Ed25519 私钥空间极大，暴力破解不现实；密码可被字典攻击。
2. **私钥不出本机**：认证时只发送签名，不传输私钥本身。
3. **可撤销**：删除服务器上的公钥即可立即失效，无需改系统密码。
4. **可审计**：`authorized_keys` 中可限制来源 IP、命令、有效期。

### 4.4 其他认证方式（了解）

- **键盘交互认证**：多因素认证的变体
- **GSSAPI/Kerberos**：企业域环境
- **证书认证**：大规模环境用 SSH CA 签发短期证书

---

## 5. 密钥管理实战

### 5.1 生成 Ed25519 密钥（推荐）

```bash
# 在本机执行
ssh-keygen -t ed25519 -C "ops-learning@$(hostname)"

# 交互提示：
# - 保存路径：直接回车 → ~/.ssh/id_ed25519
# - passphrase：建议设置（私钥被盗时多一层保护）
```

**为什么选 Ed25519 而不是 RSA？**

| 特性 | Ed25519 | RSA 4096 |
|------|---------|----------|
| 密钥长度 | 256 bit | 4096 bit |
| 生成速度 | 快 | 慢 |
| 安全性 | 高 | 高 |
| 兼容性 | 现代系统均支持 | 老旧系统更好 |

若需兼容极老系统，可用：`ssh-keygen -t rsa -b 4096`

### 5.2 部署公钥到服务器

**方法一：ssh-copy-id（最简单）**

```bash
ssh-copy-id devops@192.168.56.10

# 指定密钥文件
ssh-copy-id -i ~/.ssh/id_ed25519.pub devops@192.168.56.10
```

**方法二：手动追加**

```bash
cat ~/.ssh/id_ed25519.pub | ssh devops@192.168.56.10 \
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**方法三：运维批量部署（Ansible 等）**

```yaml
# 示例：ansible playbook 片段
- name: Deploy SSH public key
  ansible.posix.authorized_key:
    user: devops
    key: "{{ lookup('file', '~/.ssh/id_ed25519.pub') }}"
```

### 5.3 验证密钥登录

```bash
# 显式指定私钥
ssh -i ~/.ssh/id_ed25519 devops@192.168.56.10

# 查看详细握手过程（排障用）
ssh -v devops@192.168.56.10
ssh -vvv devops@192.168.56.10   # 更详细
```

### 5.4 管理多台服务器：~/.ssh/config

```bash
# ~/.ssh/config 示例
Host vm-ops
    HostName 192.168.56.10
    User devops
    IdentityFile ~/.ssh/id_ed25519
    Port 22

Host vm-lab
    HostName 192.168.56.11
    User labuser
    IdentityFile ~/.ssh/id_ed25519

# 通过跳板机访问内网
Host internal-web
    HostName 10.0.0.50
    User deploy
    ProxyJump vm-ops
```

配置后，连接简化为：

```bash
ssh vm-ops          # 等价于 ssh devops@192.168.56.10
ssh internal-web    # 自动经 vm-ops 跳转
```

### 5.5 authorized_keys 高级选项

```bash
# 限制来源 IP + 禁止端口转发 + 只允许执行特定命令
from="192.168.56.0/24",no-port-forwarding,no-X11-forwarding,command="/usr/bin/backup.sh" ssh-ed25519 AAAA... deploy-key
```

---

## 6. 客户端常用命令与 -o 选项

### 6.1 基本连接

```bash
# 基本登录
ssh user@hostname

# 指定端口
ssh -p 2222 user@hostname

# 执行远程命令后退出（适合脚本）
ssh devops@vm-ops "df -h && uptime"

# 强制使用密钥认证，禁用密码
ssh -o PreferredAuthentications=publickey devops@vm-ops

# 需要 sudo 的交互命令必须分配终端
ssh -t devops@vm-ops "sudo journalctl -u nginx -n 20"
```

### 6.2 `-o` 选项详解（`~/.ssh/config` 中写法相同）

`-o` 可临时覆盖配置，是脚本和排障中最常用的方式。

**连接与超时**

| 选项 | 说明 | 推荐值 / 示例 |
|------|------|----------------|
| `ConnectTimeout=10` | 连接超时（秒） | 脚本中建议设置，避免挂死 |
| `ConnectionAttempts=3` | 重试次数 | `ConnectionAttempts=1` 快速失败 |
| `ServerAliveInterval=60` | 客户端心跳间隔（秒） | 防 NAT/防火墙断连 |
| `ServerAliveCountMax=3` | 几次心跳无响应后断开 | 配合上一项使用 |
| `TCPKeepAlive=yes` | 操作系统级 TCP 保活 | 默认 yes |

**认证相关**

| 选项 | 说明 | 示例 |
|------|------|------|
| `PreferredAuthentications=publickey` | 优先/仅用公钥 | 测试密钥登录 |
| `PasswordAuthentication=no` | 禁止密码 | 客户端侧强制 |
| `IdentitiesOnly=yes` | 仅使用 `-i` 或 config 指定的密钥 | 解决「Too many authentication failures」 |
| `PubkeyAuthentication=yes` | 启用公钥认证 | 默认 yes |
| `NumberOfPasswordPrompts=1` | 密码提示次数 | 减少暴力尝试窗口 |

**主机密钥 / 安全**

| 选项 | 说明 | 使用建议 |
|------|------|----------|
| `StrictHostKeyChecking=ask` | 未知主机时询问（默认） | 交互式手工连接 |
| `StrictHostKeyChecking=accept-new` | 新主机自动接受，已变更则拒绝 | **自动化脚本推荐** |
| `StrictHostKeyChecking=no` | 不验证（危险） | 仅临时实验环境 |
| `UserKnownHostsFile=~/.ssh/known_hosts` | 指定 known_hosts 路径 | 多环境隔离时可自定义 |
| `HashKnownHosts=yes` | 哈希存储主机名 | 隐私更好，排障稍麻烦 |

**跳转与转发**

| 选项 | 说明 | 示例 |
|------|------|------|
| `ProxyJump=bastion` | 跳板机（可用 Host 别名） | `ProxyJump=vm-ops` |
| `ProxyCommand=...` | 自定义跳板命令 | 见下方示例 |
| `LocalForward=8080:10.0.0.5:80` | config 中写本地转发 | 等价 `-L` |
| `RemoteForward=9000:localhost:3000` | config 中写远程转发 | 等价 `-R` |
| `DynamicForward=1080` | config 中写 SOCKS 代理 | 等价 `-D` |

```bash
# ProxyCommand 老式跳板写法（OpenSSH 7.3+ 建议用 ProxyJump）
ssh -o ProxyCommand="ssh -W %h:%p bastion" devops@10.0.0.50
```

**连接复用（加速重复连接）**

| 选项 | 说明 |
|------|------|
| `ControlMaster=auto` | 首个连接成为主连接，后续复用 |
| `ControlPath=~/.ssh/sockets/%r@%h-%p` | 复用套接字路径 |
| `ControlPersist=600` | 主连接关闭后保持 600 秒 |

```bash
# 首次连接建立主通道
ssh vm-ops

# 10 分钟内再次连接几乎瞬间完成
ssh vm-ops "hostname"
scp file vm-ops:/tmp/
```

使用前创建 sockets 目录：`mkdir -p ~/.ssh/sockets`

### 6.3 完整 ~/.ssh/config 实战模板

```bash
# ~/.ssh/config — 权限必须为 600
chmod 600 ~/.ssh/config

# ---- 全局默认 ----
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 10m
    IdentitiesOnly yes

# ---- 课程虚拟机 ----
Host vm-ops
    HostName 192.168.56.10
    User devops
    Port 22
    IdentityFile ~/.ssh/id_ed25519

Host vm-lab
    HostName 192.168.56.11
    User labuser
    IdentityFile ~/.ssh/id_ed25519

# ---- 经跳板访问内网 ----
Host bastion
    HostName 203.0.113.10
    User jump
    IdentityFile ~/.ssh/id_ed25519

Host internal-*
    User deploy
    ProxyJump bastion
    IdentityFile ~/.ssh/id_deploy

Host internal-web
    HostName 10.0.0.50

# ---- GitHub ----
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

配置后验证：

```bash
ssh -G vm-ops | grep -E '^(hostname|user|port|identityfile) '
# 输出解析后的实际连接参数
```

### 6.4 常用选项速查（命令行参数）

| 选项 | 作用 |
|------|------|
| `-p PORT` | 指定端口 |
| `-i FILE` | 指定私钥文件 |
| `-L` | 本地端口转发 |
| `-R` | 远程端口转发 |
| `-D` | 动态 SOCKS 代理 |
| `-N` | 不执行远程命令（仅转发） |
| `-f` | 后台运行 |
| `-J` | 跳板机（ProxyJump） |
| `-v/-vv/-vvv` | 调试输出 |

---

## 7. 服务端配置详解

主配置文件：`/etc/ssh/sshd_config`

修改后**必须**检查语法并重启：

```bash
sudo sshd -t                    # 检查配置语法
sudo systemctl restart ssh      # Ubuntu 服务名是 ssh，不是 sshd
```

### 7.1 关键配置项

```bash
# /etc/ssh/sshd_config 推荐学习配置

# ---- 基础 ----
Port 22                         # 可改为非标准端口（见安全权衡）
ListenAddress 0.0.0.0           # 监听所有网卡；可限制为内网 IP

# ---- 认证 ----
PubkeyAuthentication yes        # 启用公钥认证
PasswordAuthentication no       # 生产环境建议关闭密码登录
PermitEmptyPasswords no         # 禁止空密码
ChallengeResponseAuthentication no

# ---- 用户控制 ----
PermitRootLogin no              # 禁止 root 直接 SSH 登录
AllowUsers devops admin         # 白名单用户（可选）
# DenyUsers baduser             # 黑名单用户（可选）

# ---- 安全加固 ----
MaxAuthTries 3                  # 最多 3 次认证尝试
LoginGraceTime 60               # 登录超时 60 秒
ClientAliveInterval 300         # 服务端心跳检测
ClientAliveCountMax 2

# ---- 转发控制 ----
AllowTcpForwarding yes          # 需要隧道时保持 yes；严格环境可 no
X11Forwarding no                # 一般服务器不需要图形转发
AllowAgentForwarding no         # 按需开启

# ---- 加密算法（OpenSSH 8+ 默认值通常已足够安全）----
# Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
# KexAlgorithms curve25519-sha256
# HostKeyAlgorithms ssh-ed25519,rsa-sha2-512
```

### 7.2 配置项说明表（扩展）

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| `Port` | `22` 或高位端口 | 监听端口；改前先在防火墙放行新端口 |
| `ListenAddress` | `0.0.0.0` 或内网 IP | 限制仅内网网卡监听更安全 |
| `PermitRootLogin` | `no` | root 应通过 sudo 提权，不直接 SSH |
| `PasswordAuthentication` | `no` | 密钥部署完成后关闭 |
| `PubkeyAuthentication` | `yes` | 必须开启 |
| `PermitEmptyPasswords` | `no` | 禁止空密码账户登录 |
| `MaxAuthTries` | `3` | 单次连接最大认证尝试次数 |
| `LoginGraceTime` | `60` | 登录前等待时间（秒） |
| `AllowUsers` | 按需白名单 | 比 `DenyUsers` 更严格，推荐白名单思维 |
| `DenyUsers` | 按需 | 黑名单用户 |
| `AllowGroups` / `DenyGroups` | 按需 | 按组控制 |
| `ClientAliveInterval` | `300` | 服务端发心跳间隔（秒），0 表示禁用 |
| `ClientAliveCountMax` | `2` | 几次无响应后断开 |
| `AllowTcpForwarding` | 按需 | `no` 可禁止端口转发，影响 `-L/-R` |
| `GatewayPorts` | `no` | `yes` 允许远程转发绑定 0.0.0.0 |
| `X11Forwarding` | `no` | 服务器一般不需要图形转发 |
| `AllowAgentForwarding` | `no` | 是否允许 agent 转发到远端 |
| `UsePAM` | `yes` | Ubuntu 默认，账户锁定等依赖 PAM |
| `Banner` | 可选路径 | 登录前显示警告横幅 |

**查看当前生效值**

```bash
# 查看所有生效配置（含默认值展开）
sudo sshd -T | less

# 过滤认证相关
sudo sshd -T | grep -iE 'password|pubkey|permitroot|allowusers|port'
```

**Match 块：按用户/地址差异化策略**

```bash
# /etc/ssh/sshd_config 末尾可添加
Match User backup
    PasswordAuthentication no
    AllowTcpForwarding no
    ForceCommand /usr/local/bin/backup.sh

Match Address 10.0.0.0/8
    PasswordAuthentication no
```

修改后执行 `sudo sshd -t && sudo systemctl restart ssh`。

### 7.3 修改端口的利弊

```bash
# 改为 2222 端口
Port 2222
```

```bash
# 客户端需同步
ssh -p 2222 devops@vm-ops

# UFW 放行
sudo ufw allow 2222/tcp
sudo ufw delete allow ssh    # 可选：关闭 22 端口
```

| 改端口优点 | 改端口缺点 |
|------------|------------|
| 减少自动化扫描和日志噪音 | 不能防止针对性攻击 |
| 略微降低暴力破解频率 | 客户端配置更复杂，易忘 |

**结论**：改端口是辅助手段，**密钥认证 + 禁用密码**才是核心。

---

## 8. SSH 隧道与端口转发

SSH 隧道是运维中极其实用的能力，可在加密通道内转发其他协议流量。

### 8.0 转发语法统一格式

```
-L [bind_address:]port:host:hostport    # 本地转发
-R [bind_address:]port:host:hostport    # 远程转发
-D [bind_address:]port                  # 动态 SOCKS
```

- `bind_address` 省略时默认 `localhost`（仅本机可连）
- `host` 是**从 SSH 服务端视角**能解析到的地址

### 8.1 本地端口转发（-L）

**场景**：你在本机，想访问**远程服务器能访问**、但你直接访问不了的内网服务。

```
本机:8080 ──SSH隧道──> vm-ops ──> 内网数据库 10.0.0.5:3306
```

```bash
# 本机 8080 端口流量，经 vm-ops 转发到 10.0.0.5:3306
ssh -L 8080:10.0.0.5:3306 devops@vm-ops -N -f

# 绑定所有网卡（局域网其他设备也能用你机器的 8080）
ssh -L 0.0.0.0:8080:10.0.0.5:3306 devops@vm-ops -N -f

# 同时转发多个端口
ssh -L 8080:10.0.0.5:80 -L 3307:10.0.0.5:3306 devops@vm-ops -N -f

# 然后在本机连接
mysql -h 127.0.0.1 -P 3307 -u dbuser -p
curl http://127.0.0.1:8080/
```

**在 config 中持久化**

```bash
Host vm-ops-db
    HostName 192.168.56.10
    User devops
    LocalForward 3307 10.0.0.5:3306
    LocalForward 8080 10.0.0.5:80
```

```bash
ssh -N vm-ops-db    # 保持终端打开；或 ssh -f -N vm-ops-db 放后台
```

**数据流**：

```
你的应用 → localhost:8080 → SSH加密通道 → vm-ops → 10.0.0.5:3306
```

**验证隧道是否建立**

```bash
# 本机查看监听
ss -tlnp | grep 8080
# LISTEN 0 128 127.0.0.1:8080 ...

# 查看 ssh 隧道进程
ps aux | grep "ssh -L"
```

### 8.2 远程端口转发（-R）

**场景**：内网机器想暴露服务给外网（或给能 SSH 到你的机器的人）。

```
外部访问 云服务器:9000 ──SSH隧道──> 内网机器的 192.168.1.100:80
```

```bash
# 在内网机器上执行（能 SSH 到云服务器）
ssh -R 9000:localhost:80 user@cloud-server -N -f

# 访问者打开 http://cloud-server:9000 即访问内网 80 端口
```

**对外开放转发端口**（默认仅 cloud-server 本机可访问 9000）

```bash
# 云服务器 /etc/ssh/sshd_config
GatewayPorts yes          # 或 clientspecified

sudo systemctl restart ssh

# 内网机器绑定到 0.0.0.0
ssh -R 0.0.0.0:9000:localhost:80 user@cloud-server -N -f
```

> 远程转发（-R）有安全风险，仅在可信环境使用；生产环境优先用 VPN 或正向代理。

### 8.3 动态端口转发 / SOCKS 代理（-D）

**场景**：临时需要一个加密代理浏览内网或绕过网络限制。

```bash
ssh -D 1080 devops@vm-ops -N -f

# curl 走 SOCKS5
curl --socks5-hostname 127.0.0.1:1080 http://internal-app.local/

# 环境变量方式
export ALL_PROXY=socks5://127.0.0.1:1080
curl http://10.0.0.20/status
```

**浏览器配置**：SOCKS Host `127.0.0.1`，Port `1080`，类型 SOCKS5。

### 8.4 跳板机（ProxyJump）

```bash
# 单行：经 bastion 跳到内网
ssh -J devops@bastion devops@10.0.0.50

# 多级跳板（按顺序）
ssh -J bastion1,bastion2 devops@10.0.0.50

# 文件传输同样支持
scp -o ProxyJump=devops@bastion ./file devops@10.0.0.50:/tmp/
rsync -avz -e "ssh -J devops@bastion" ./data/ devops@10.0.0.50:/data/
```

### 8.5 长期隧道：autossh

SSH 隧道可能因网络抖动断开，`autossh` 自动重连。

```bash
sudo apt install -y autossh

autossh -M 0 -f -N \
  -o "ServerAliveInterval=30" \
  -o "ServerAliveCountMax=3" \
  -L 3307:10.0.0.5:3306 \
  devops@vm-ops
```

### 8.6 隧道使用注意

- 生产环境应对 `AllowTcpForwarding` 做策略管控
- 长期隧道用 `autossh` 保活
- 远程转发（-R）有安全风险，仅在可信环境使用
- 转发占用本机端口，冲突时用 `ss -tlnp` 排查

---

## 9. 文件传输：SCP、SFTP 与 rsync

两者都基于 SSH 加密，**不要**在生产环境使用 FTP（明文）。

### 9.1 SCP 详解

**方向判断口诀**：`scp 源 目标`，哪边有 `user@host:` 就是哪一侧。

```bash
# 本机 → 远程（上传）
scp ./app.tar.gz devops@vm-ops:/srv/webapp/

# 远程 → 本机（下载）
scp devops@vm-ops:/var/log/nginx/access.log ./logs/

# 远程 → 远程（经本机中转，数据流经你电脑）
scp devops@vm-ops:/backup/db.sql devops@vm-lab:/tmp/

# 递归复制目录
scp -r ./static/ devops@vm-ops:/srv/webapp/html/

# 保留权限和时间戳
scp -rp ./config/ devops@vm-ops:/etc/myapp/

# 指定端口（注意 scp 是大写 -P）
scp -P 2222 -i ~/.ssh/id_ed25519 file.txt devops@vm-ops:~/

# 限速 2MB/s，慢网络传大文件
scp -l 16384 large.iso devops@vm-ops:/tmp/
```

**scp 参数与 ssh 的差异**

| 功能 | ssh | scp |
|------|-----|-----|
| 指定端口 | `-p 2222`（小写） | `-P 2222`（**大写**） |
| 指定密钥 | `-i file` | `-i file` |
| 压缩传输 | 无 | `-C` |
| 递归目录 | 无 | `-r` |

**常见错误**

```bash
# 错误：远程目录不存在时，scp 可能把文件当成同名文件创建
scp file devops@vm-ops:/nonexistent/dir/
# 先确保目录存在：
ssh devops@vm-ops "mkdir -p /nonexistent/dir"
```

### 9.2 SFTP 详解

**交互式会话完整流程**

```bash
$ sftp devops@vm-ops
Connected to vm-ops.
sftp> lpwd                    # 本地当前目录
Local working directory: /Users/you/project
sftp> pwd                     # 远程当前目录
Remote working directory: /home/devops
sftp> cd /srv/webapp
sftp> mkdir releases
sftp> put ./dist/app.tar.gz releases/
Uploading ./dist/app.tar.gz to /srv/webapp/releases/app.tar.gz
sftp> ls -la releases/
sftp> get releases/app.tar.gz ./backup-app.tar.gz
sftp> bye
```

**非交互批处理（适合部署脚本）**

```bash
#!/bin/bash
set -euo pipefail

BATCH=$(mktemp)
trap 'rm -f "$BATCH"' EXIT

cat > "$BATCH" <<'EOF'
cd /srv/webapp/html
put ./dist/index.html
put ./dist/main.js
chmod 644 index.html main.js
ls -la
bye
EOF

sftp -b "$BATCH" -i ~/.ssh/id_ed25519 devops@192.168.56.10
echo "upload-ok"
```

### 9.3 rsync over SSH（推荐大文件/增量同步）

`rsync` 不是 OpenSSH 内置组件，但是运维最常用的「基于 SSH」同步工具。

**常用参数**

| 参数 | 说明 |
|------|------|
| `-a` | 归档模式（保留权限、时间、符号链接等） |
| `-v` | 详细输出 |
| `-z` | 传输压缩 |
| `-h` | 人类可读的大小 |
| `--progress` | 显示进度 |
| `--delete` | 删除目标端多余文件（**谨慎**） |
| `--exclude` | 排除文件 | `--exclude '.git'` |
| `-e` | 指定远程 shell | `-e "ssh -p 2222"` |
| `-n` / `--dry-run` | 预演，不实际传输 |

```bash
# 增量同步目录（最常用）
rsync -avz --progress ./dist/ devops@vm-ops:/srv/webapp/html/

# 指定 SSH 端口和密钥
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519" ./dist/ devops@vm-ops:/srv/webapp/

# 预演：看会传哪些文件，不真正执行
rsync -avzn --delete ./dist/ devops@vm-ops:/srv/webapp/html/

# 排除 node_modules 和 .git
rsync -avz --exclude 'node_modules' --exclude '.git' ./project/ devops@vm-ops:/srv/project/

# 下载远程目录到本机
rsync -avz devops@vm-ops:/var/log/nginx/ ./logs/nginx/
```

**scp vs rsync 选型**

| 场景 | 推荐工具 | 原因 |
|------|----------|------|
| 传单个配置文件 | scp | 最简单 |
| 首次全量传 5GB 目录 | rsync -avz | 可断点、显示进度 |
| 每日增量部署前端 | rsync --delete | 只传变更文件 |
| 交互浏览远程目录 | sftp | 支持 ls/cd/mkdir |
| 脚本批量上传几个文件 | sftp -b | 批处理清晰 |

### 9.4 文件传输实战：完整部署流程

**场景**：将本机 `./dist/` 部署到 vm-ops 的 Nginx 目录。

```bash
#!/bin/bash
# deploy-static.sh
set -euo pipefail

HOST="devops@192.168.56.10"
REMOTE_DIR="/srv/webapp/html"
KEY="$HOME/.ssh/id_ed25519"

echo "==> 1. 预演同步"
rsync -avzn --delete -e "ssh -i $KEY" ./dist/ "${HOST}:${REMOTE_DIR}/"

read -r -p "确认上传？(y/N) " ans
[[ "$ans" == "y" ]] || exit 0

echo "==> 2. 正式同步"
rsync -avz --delete -e "ssh -i $KEY" ./dist/ "${HOST}:${REMOTE_DIR}/"

echo "==> 3. 远程验证"
ssh -i "$KEY" "$HOST" "ls -la ${REMOTE_DIR}/ && curl -s -o /dev/null -w '%{http_code}\n' http://localhost/"

echo "deploy-done"
```

**预期输出**

```
==> 1. 预演同步
sending incremental file list
index.html
main.js
==> 2. 正式同步
sent 12,345 bytes  received 56 bytes  8,267.33 bytes/sec
==> 3. 远程验证
-rw-r--r-- 1 devops devops  1234 index.html
200
deploy-done
```

---

## 10. 安全加固最佳实践

结合课程 Phase 1 第 3 周与 Phase 4 第 12 周（蓝队加固）的完整清单。

### 10.1 加固步骤（vm-ops 实战）

```bash
# === 第一步：确保密钥登录可用 ===
# 在本机已完成 ssh-copy-id 后，开一个新终端测试：
ssh devops@<vm-ops-ip> "echo key-auth-ok"

# === 第二步：加固 sshd_config ===
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d)

sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config

sudo sshd -t && sudo systemctl restart ssh

# === 第三步：配置 UFW 防火墙 ===
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp      # 若已部署 Web 服务
sudo ufw enable
sudo ufw status verbose

# === 第四步：安装 fail2ban（防暴力破解）===
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

### 10.2 fail2ban 简述

fail2ban 监控日志（如 `/var/log/auth.log`），发现同一 IP 短时间内多次认证失败后，自动用防火墙封禁该 IP。

```bash
# 查看 sshd 监狱状态
sudo fail2ban-client status sshd
```

### 10.3 安全审计命令

```bash
# 谁可以免密登录
cat ~/.ssh/authorized_keys
sudo find /home -name authorized_keys -exec echo "== {} ==" \; -exec cat {} \;

# 最近 SSH 登录记录
last -a | head -20
grep "Accepted" /var/log/auth.log | tail -20

# 失败登录（暴力破解迹象）
grep "Failed password" /var/log/auth.log | tail -20
grep "Invalid user" /var/log/auth.log | tail -20

# 当前 SSH 连接
who
ss -tnp | grep ':22'
```

### 10.4 加固检查表

| 检查项 | 命令/方法 | 期望结果 |
|--------|-----------|----------|
| 密码登录已关闭 | `grep PasswordAuthentication /etc/ssh/sshd_config` | `no` |
| root 禁止登录 | `grep PermitRootLogin /etc/ssh/sshd_config` | `no` |
| 仅必要端口开放 | `sudo ufw status` | 仅 ssh、http 等 |
| authorized_keys 无异常 | 人工审查公钥注释 | 每条都认识 |
| fail2ban 运行中 | `systemctl is-active fail2ban` | `active` |

---

## 11. 故障排查手册

### 11.1 排障流程

```
1. 确认网络连通：ping / telnet IP 22
2. 确认服务运行：systemctl status ssh
3. 确认防火墙：ufw status / ss -tlnp | grep 22
4. 客户端调试：ssh -vvv user@host
5. 查看服务端日志：tail -f /var/log/auth.log
```

### 11.2 常见错误与解决

| 错误信息 | 可能原因 | 解决方法 |
|----------|----------|----------|
| `Connection refused` | sshd 未运行或端口错误 | `sudo systemctl start ssh`；检查 Port |
| `Connection timed out` | 防火墙/网络不通 | 检查 UFW、安全组、路由 |
| `Permission denied (publickey)` | 公钥未部署或权限错 | 检查 authorized_keys 和目录权限 700/600 |
| `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!` | 服务器重装或 MITM | 确认主机身份后 `ssh-keygen -R hostname` |
| `Too many authentication failures` | 客户端尝试了太多密钥 | `ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 user@host` |
| `Disconnected from authentication service` | MaxAuthTries 超限 | 等待或检查 fail2ban 是否封禁 |

### 11.3 权限问题一键修复（服务端）

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R $USER:$USER ~/.ssh
```

### 11.4 被 fail2ban 误封

```bash
# 在服务器上（需控制台或其他方式登录）
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip <你的IP>
```

---

## 12. 运维与安全场景案例（分步实战）

以下每个案例包含：**背景 → 前置条件 → 操作步骤 → 预期输出 → 验证方法 → 常见坑**。

---

### 案例 1：课程环境首次 SSH 登录 vm-ops

**背景**：Phase 0 刚装好 Ubuntu Server，要从本机 SSH 登录。

**前置条件**
- vm-ops 已启动，网络模式为 Host-Only 或桥接
- 安装系统时创建了用户 `devops`

**步骤 1：在 vm-ops 上确认 IP**

```bash
ip -4 addr show
# 或
hostname -I
```

**预期**：看到类似 `192.168.56.10`

**步骤 2：本机测试网络**

```bash
ping -c 3 192.168.56.10
nc -zv 192.168.56.10 22    # 测试 22 端口（macOS/Linux）
```

**预期**

```
3 packets transmitted, 3 packets received, 0.0% packet loss
Connection to 192.168.56.10 port 22 [tcp/ssh] succeeded!
```

**步骤 3：首次密码登录**

```bash
ssh devops@192.168.56.10
```

**预期**：提示 `Are you sure you want to continue connecting (yes/no)?`，输入 `yes` 后要求密码，登录成功看到 `devops@vm-ops:~$`。

**步骤 4：生成密钥并部署**

```bash
# 本机执行
ssh-keygen -t ed25519 -C "ops-learning@$(hostname)"
ssh-copy-id -i ~/.ssh/id_ed25519.pub devops@192.168.56.10
```

**步骤 5：验证密钥登录**

```bash
ssh devops@192.168.56.10 "echo key-auth-ok"
```

**预期**：直接输出 `key-auth-ok`，**不提示密码**。

**常见坑**
| 现象 | 原因 | 处理 |
|------|------|------|
| `Connection timed out` | IP 错或防火墙 | 检查虚拟机网络模式 |
| `Connection refused` | sshd 未运行 | 虚拟机控制台执行 `sudo systemctl start ssh` |
| 仍要密码 | 公钥未写入或权限错 | 检查 `~/.ssh/authorized_keys` 权限 600 |

---

### 案例 2：加固 SSH 并仅开放必要端口

**背景**：Phase 1 第 3 周验收任务。

**前置条件**
- 案例 1 已完成，密钥登录已验证
- **保留一个已登录的终端**，防止加固后把自己锁在外面

**步骤 1：备份配置**

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d)
```

**步骤 2：修改 sshd_config**

```bash
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config

sudo sshd -t && sudo systemctl restart ssh
```

**步骤 3：新开终端验证（不要关闭旧终端）**

```bash
ssh devops@192.168.56.10 "echo still-ok"
```

**步骤 4：配置 UFW**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status verbose
```

**预期 `ufw status`**

```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
```

**步骤 5：验证密码登录已禁用**

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no devops@192.168.56.10
```

**预期**：`Permission denied (publickey)` 或类似，**无法**用密码进入。

**常见坑**
| 现象 | 原因 | 处理 |
|------|------|------|
| 重启 ssh 后无法连接 | 未部署密钥就关了密码 | 用虚拟机控制台修复 `PasswordAuthentication yes` |
| `sshd -t` 报错 | 配置语法错误 | 恢复 `.bak` 备份文件 |

---

### 案例 3：Ansible 批量管理（自动化运维）

**背景**：Phase 2 后有多台服务器，用 SSH 密钥做无密码批量操作。

**步骤 1：配置 SSH**

```bash
# ~/.ssh/config
cat >> ~/.ssh/config <<'EOF'
Host vm-*
    User devops
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 5m
EOF
mkdir -p ~/.ssh/sockets
chmod 600 ~/.ssh/config
```

**步骤 2：编写 inventory**

```ini
# inventory.ini
[web]
vm-ops ansible_host=192.168.56.10
vm-web ansible_host=192.168.56.12

[web:vars]
ansible_python_interpreter=/usr/bin/python3
```

**步骤 3：测试连通**

```bash
ansible web -m ping -i inventory.ini
```

**预期**

```
vm-ops | SUCCESS => { "ping": "pong" }
vm-web | SUCCESS => { "ping": "pong" }
```

**步骤 4：批量执行命令**

```bash
ansible web -a "uptime" -i inventory.ini
ansible web -m copy -a "src=./nginx.conf dest=/tmp/nginx.conf" -i inventory.ini
```

**常见坑**
| 现象 | 原因 | 处理 |
|------|------|------|
| `UNREACHABLE` | 密钥未部署到某台机器 | 对该机器执行 `ssh-copy-id` |
| 第一台快、后续慢 | 未开连接复用 | 配置 `ControlMaster` |

---

### 案例 4：Git 通过 SSH 拉取私有仓库

**步骤 1：生成专用密钥（可选，与服务器密钥分离）**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_github -C "github-ops-learning"
```

**步骤 2：配置 ~/.ssh/config**

```bash
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_github
    IdentitiesOnly yes
```

**步骤 3：添加公钥到 GitHub**

```bash
cat ~/.ssh/id_github.pub
# 复制到 GitHub → Settings → SSH and GPG keys → New SSH key
```

**步骤 4：测试连接**

```bash
ssh -T git@github.com
```

**预期**

```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

**步骤 5：克隆与推送**

```bash
git clone git@github.com:username/private-repo.git
cd private-repo
git push origin main
```

**常见坑**
| 现象 | 原因 | 处理 |
|------|------|------|
| `Permission denied (publickey)` | 公钥未添加或用了错误密钥 | `ssh -vT git@github.com` 查看尝试了哪些 key |
| 要求 HTTPS 密码 | remote 是 HTTPS 地址 | `git remote set-url origin git@github.com:...` |

---

### 案例 5：临时访问内网数据库（本地转发）

**背景**：MySQL 只监听内网 `10.0.0.5:3306`，你在家办公，只有 bastion 能访问内网。

**拓扑**

```
你的笔记本 ──SSH──> bastion (vm-ops) ──内网──> MySQL 10.0.0.5:3306
     ↑                                              ↑
  localhost:3307  ←──────── 隧道 ────────────────────┘
```

**步骤 1：建立隧道**

```bash
ssh -f -N -L 3307:10.0.0.5:3306 devops@bastion
```

**步骤 2：验证端口监听**

```bash
ss -tlnp | grep 3307
```

**步骤 3：连接数据库**

```bash
mysql -h 127.0.0.1 -P 3307 -u appuser -p
# 或用 GUI 工具，Host=127.0.0.1, Port=3307
```

**步骤 4：用完后关闭隧道**

```bash
# 找到 ssh 隧道进程并结束
ps aux | grep "ssh -f -N -L 3307"
kill <pid>
```

**常见坑**
| 现象 | 原因 | 处理 |
|------|------|------|
| `channel open failed` | bastion 访问不了 10.0.0.5 | 在 bastion 上 `nc -zv 10.0.0.5 3306` |
| 端口已被占用 | 本地 3307 在用 | 换端口如 `-L 3308:...` |

---

### 案例 6：安全事件 — 发现异常 authorized_keys（蓝队）

**背景**：Phase 5 应急响应考核，服务器可能被植入后门密钥。

**步骤 1：枚举所有 authorized_keys**

```bash
sudo find /home /root -name authorized_keys 2>/dev/null | while read -r f; do
  echo "===== $f ====="
  sudo cat "$f"
  sudo ssh-keygen -lf "$f" 2>/dev/null
  echo
done
```

**步骤 2：审计要点**

- 每一行对应一把可登录的公钥
- 注释字段（末尾）应能识别：`user@host`、`ci-deploy` 等
- 关注 `from=`、`command=` 限制选项是否异常
- 对比 `ssh-keygen -lf` 输出的指纹是否与公司登记一致

**步骤 3：查登录日志**

```bash
# 近期成功登录
sudo grep "Accepted publickey" /var/log/auth.log | tail -30

# 失败/扫描
sudo grep -E "Failed password|Invalid user" /var/log/auth.log | tail -30

# 当前在线
who
w
```

**步骤 4：处置**

```bash
# 删除可疑行后（先备份！）
sudo cp /home/devops/.ssh/authorized_keys{,.bak}
sudo vim /home/devops/.ssh/authorized_keys

# 强制现有会话下线（修改配置后）
sudo systemctl restart ssh
```

**预期日志片段（正常）**

```
Accepted publickey for devops from 192.168.56.1 port 52341 ssh2: ED25519 SHA256:abc...
```

**预期日志片段（可疑）**

```
Accepted publickey for root from 203.0.113.99 port 44444 ssh2: RSA SHA256:xyz...
Invalid user admin from 198.51.100.5
Failed password for invalid user test from 198.51.100.6
```

---

### 案例 7：部署脚本远程执行（CI/CD 常见模式）

**完整可运行脚本**

```bash
#!/bin/bash
# deploy.sh — 从 CI 或本机执行
set -euo pipefail

HOST="devops@192.168.56.10"
KEY="${DEPLOY_KEY:-$HOME/.ssh/id_ed25519}"
APP_DIR="/srv/webapp"
SSH_OPTS=(-i "$KEY" -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)

echo "==> 预检查"
ssh "${SSH_OPTS[@]}" "$HOST" "test -d $APP_DIR"

echo "==> 同步文件"
rsync -avz --delete -e "ssh ${SSH_OPTS[*]}" ./build/ "${HOST}:${APP_DIR}/"

echo "==> 重载服务"
ssh "${SSH_OPTS[@]}" "$HOST" "sudo nginx -t && sudo systemctl reload nginx"

echo "==> 健康检查"
CODE=$(ssh "${SSH_OPTS[@]}" "$HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost/")
if [[ "$CODE" != "200" ]]; then
  echo "health-check failed: HTTP $CODE" >&2
  exit 1
fi
echo "deploy-ok (HTTP $CODE)"
```

**CI 中注入密钥的典型做法**

```bash
eval "$(ssh-agent -s)"
echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
mkdir -p ~/.ssh/sockets
./deploy.sh
```

---

### 案例 8：ssh-agent 管理带 passphrase 的私钥

**场景**：私钥有密码，一天内多次 SSH/Git 操作。

```bash
# 启动 agent
eval "$(ssh-agent -s)"

# 添加密钥（输入一次 passphrase）
ssh-add ~/.ssh/id_ed25519

# 确认已加载
ssh-add -l
# 256 SHA256:xxxx  ops-learning@my-mac (ED25519)

# 后续操作不再提示 passphrase
ssh vm-ops
git pull
scp file vm-ops:/tmp/
```

**macOS 持久化到钥匙串**

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
# ~/.ssh/config 中添加：
# Host *
#     UseKeychain yes
#     AddKeysToAgent yes
```

---

### 案例 9：排查 Permission denied (publickey) 全链路

**背景**：密钥明明部署了，仍然无法登录。按顺序执行以下命令。

**在本机**

```bash
# 1. 详细调试
ssh -vvv -i ~/.ssh/id_ed25519 devops@192.168.56.10 2>&1 | tee /tmp/ssh-debug.log

# 关注日志中：
# - Offering public key
# - Server accepts key  或 Authentications that can continue
```

**在服务器（通过虚拟机控制台登录）**

```bash
# 2. 检查权限
namei -l /home/devops/.ssh/authorized_keys
# 每一级目录应为 755 或 750，.ssh 为 700，authorized_keys 为 600

# 3. 修复权限
chmod 700 /home/devops/.ssh
chmod 600 /home/devops/.ssh/authorized_keys
chown -R devops:devops /home/devops/.ssh

# 4. 确认公钥内容
cat /home/devops/.ssh/authorized_keys

# 5. 查看服务端认证日志
sudo tail -20 /var/log/auth.log
```

**典型失败日志与对策**

| auth.log 片段 | 含义 | 处理 |
|---------------|------|------|
| `Authentication refused: bad ownership or modes` | .ssh 权限过宽 | `chmod 700` + `chmod 600` |
| `key not allowed` | 公钥不在 authorized_keys | 重新 `ssh-copy-id` |
| `User devops not allowed` | AllowUsers 限制 | 检查 `sshd_config` |
| `Connection closed by authenticating user` | SELinux/AppArmor（如启用） | 检查安全模块日志 |

---

### 案例 10：修改 SSH 端口完整流程

**背景**：将默认 22 改为 2222，同时保证不锁死自己。

**步骤 1：先放行新端口（在改配置之前！）**

```bash
sudo ufw allow 2222/tcp
```

**步骤 2：修改配置**

```bash
sudo sed -i 's/^#\?Port.*/Port 2222/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl restart ssh
```

**步骤 3：本机 config 同步**

```bash
# ~/.ssh/config
Host vm-ops
    HostName 192.168.56.10
    Port 2222
    User devops
```

**步骤 4：新终端验证**

```bash
ssh -p 2222 devops@192.168.56.10 "echo port-2222-ok"
# 或
ssh vm-ops "echo port-2222-ok"
```

**步骤 5：确认无误后关闭 22 端口**

```bash
sudo ufw delete allow ssh
sudo ufw status
```

**常见坑**：未先 `ufw allow 2222` 就改端口并重启，会被防火墙挡在外面。

---

### 案例 11：为备份任务创建受限密钥

**背景**：备份脚本只需以 `devops` 身份执行固定命令，不希望该密钥能登录 Shell。

**步骤 1：生成专用密钥**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_backup -C "backup-only" -N ""
```

**步骤 2：在服务器 authorized_keys 中添加限制**

```bash
# 在 vm-ops 的 ~/.ssh/authorized_keys 追加（一行）：
command="/usr/local/bin/backup.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,from="192.168.56.1" ssh-ed25519 AAAA... backup-only
```

**步骤 3：验证**

```bash
# 应能执行备份脚本
ssh -i ~/.ssh/id_backup devops@vm-ops

# 尝试交互命令会被拒绝或只能执行 backup.sh
ssh -i ~/.ssh/id_backup devops@vm-ops "bash"
```

**安全收益**：即使备份密钥泄露，攻击者也无法开隧道或获取完整 Shell（除非 backup.sh 本身有漏洞）。

## 13. 验收自测清单

完成本文档学习后，对照课程 Phase 1 第 3 周验收标准：

- [ ] 能解释 SSH 与 Telnet 的本质区别
- [ ] 能说出 SSH 连接建立的大致步骤（TCP → 密钥交换 → 认证）
- [ ] 能独立生成 Ed25519 密钥并部署到 vm-ops
- [ ] 能配置 `~/.ssh/config` 简化多主机连接
- [ ] 能修改 `sshd_config` 禁用密码登录和 root 登录
- [ ] 能配置 UFW 仅开放 SSH 和 HTTP
- [ ] 能说明为什么密钥比密码更安全
- [ ] 能使用 `scp` 或 `rsync` 传输文件
- [ ] 能完成一次本地端口转发（-L）
- [ ] 能从 `auth.log` 中发现失败登录尝试
- [ ] 能说出 `ssh`、`scp`、`ssh-keygen`、`ssh-copy-id` 的核心参数及区别（如 scp 的 `-P` vs ssh 的 `-p`）
- [ ] 能使用 `ssh -vvv` 和 `auth.log` 联合排查公钥认证失败
- [ ] 能配置 `ssh-agent` 并在脚本中用 `BatchMode=yes` 非交互执行
- [ ] 能用 `rsync -avz` 完成增量部署并用 `--dry-run` 预演
- [ ] 能配置 `ProxyJump` 和 `LocalForward` 访问内网服务
- [ ] 能使用 `authorized_keys` 的 `command=` 限制密钥权限

---

## 14. 参考资源

| 资源 | 说明 |
|------|------|
| [OpenSSH 官方手册](https://www.openssh.com/manual.html) | ssh、sshd_config 权威文档 |
| `man ssh` / `man sshd_config` | 本机手册页 |
| [Mozilla SSH 加固指南](https://infosec.mozilla.org/guidelines/openssh) | 生产级配置参考 |
| [SSH Academy](https://www.ssh.com/academy/ssh) | 协议与命令教程 |
| 课程 `CURRICULUM.md` 第 3 周 | 本仓库配套练习 |

---

## 附录 A：SSH 与相关概念关系图

```
                    ┌─────────────────┐
                    │   应用层操作     │
                    │  shell / scp    │
                    │  sftp / rsync   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   SSH 协议层    │
                    │  加密 / 认证    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    TCP 22       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │      IP         │
                    └─────────────────┘
```

## 附录 B：核心组件参数速查表

### ssh

```bash
ssh -p PORT -i KEY -J jump@host user@host "cmd"   # 连接并执行
ssh -f -N -L 8080:target:80 user@host              # 后台本地转发
ssh -o BatchMode=yes -o ConnectTimeout=10 user@host
ssh -G vm-ops                                       # 解析 config 后的实际参数
```

### ssh-keygen

```bash
ssh-keygen -t ed25519 -f ~/.ssh/key -C "comment" -N ""
ssh-keygen -l -f ~/.ssh/key.pub                    # 查看指纹
ssh-keygen -R hostname                               # 删除 known_hosts 记录
ssh-keygen -y -f ~/.ssh/key                          # 从私钥导出公钥
```

### ssh-copy-id

```bash
ssh-copy-id -i ~/.ssh/key.pub -p PORT user@host
```

### scp（注意 -P 大写）

```bash
scp -P PORT -i KEY -rpC file user@host:/path/
```

### sftp

```bash
sftp -P PORT -i KEY user@host
sftp -b batch.txt user@host                          # 批处理
```

### rsync

```bash
rsync -avz --progress -e "ssh -p 22 -i KEY" src/ user@host:/dest/
rsync -avzn --delete src/ user@host:/dest/           # 预演
```

### ssh-agent

```bash
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519 && ssh-add -l
```

### 服务端

```bash
sudo sshd -t && sudo systemctl restart ssh
sudo sshd -T | grep passwordauthentication
sudo tail -f /var/log/auth.log
sudo ufw allow ssh && sudo ufw status
```

---

*本文档为 `ops-security-learning` 课程配套笔记。完成学习后请在 `PROGRESS.md` Phase 1 第 3 周打勾记录。*
