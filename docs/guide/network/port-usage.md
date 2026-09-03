# Linux 系统端口使用情况

> **适用场景**：查谁在监听某端口、端口被占用无法启动服务、排查异常对外连接  
> **归属**：网络与服务（在 [网络基础与排障](/guide/network/network-basics) 之上「端口」概念后的实操篇）

---

## 核心概念

- **端口**：传输层（TCP/UDP）上区分应用的数字标识，范围 `0–65535`
- **监听（LISTEN）**：进程在本机某地址:端口上等待连接（服务端）
- **已建立（ESTABLISHED）**：与对端已完成握手的活跃连接
- **常用工具**：`ss`（推荐）、`lsof`、`fuser`；旧系统可能还有 `netstat`

| 状态（常见） | 含义 |
|-------------|------|
| `LISTEN` | 正在监听，等待接入 |
| `ESTABLISHED` | 连接已建立 |
| `TIME_WAIT` | 主动关闭方等待，通常短暂，大量出现需关注 |
| `CLOSE_WAIT` | 对端已关，本端未关完，可能是程序未正确 `close` |

---

## 1. 用 ss 查看端口（首选）

现代发行版优先用 `ss`（iproute2），比 `netstat` 更快、信息更全。

```bash
# TCP 监听端口 + 进程名/PID（需 root 才能看到全部进程）
sudo ss -tlnp

# UDP 监听
sudo ss -ulnp

# TCP + UDP 一起看
sudo ss -tulnp

# 只看某个端口（例：80）
sudo ss -tlnp 'sport = :80'

# 查看已建立的连接
sudo ss -tnp state established

# 按目标地址过滤（例：连到某 IP）
sudo ss -tnp dst 192.168.56.10
```

**常用选项速记：**

| 选项 | 含义 |
|------|------|
| `-t` / `-u` | TCP / UDP |
| `-l` | 仅监听 |
| `-n` | 不解析服务名，直接显示数字端口 |
| `-p` | 显示进程（常需 `sudo`） |
| `-a` | 显示所有状态（含已建立） |

**输出怎么读（示意）：**

```
LISTEN  0  511  0.0.0.0:80  0.0.0.0:*  users:(("nginx",pid=1234,fd=6))
```

- `0.0.0.0:80`：在所有 IPv4 网卡上监听 80
- `127.0.0.1:3306`：仅本机可连（更安全）
- `users:(("nginx",pid=1234,...))`：占用进程是 nginx，PID 1234

---

## 2. 用 lsof / fuser 查「谁占用了端口」

服务启动报 `Address already in use` 时，先锁定占用进程：

```bash
# 谁占用了 TCP 8080
sudo lsof -iTCP:8080 -sTCP:LISTEN

# 或更宽泛
sudo lsof -i :8080

# fuser：直接给出占用该端口的 PID
sudo fuser -v 8080/tcp
```

确认 PID 后，可结合进程管理：

```bash
ps -fp <PID>
# 若确认为多余进程，优先用对应服务管理工具停止
# sudo systemctl stop <服务名>
# 不要一上来 kill -9
```

---

## 3. 常见运维场景

### 3.1 服务起不来：端口已被占用

```bash
sudo ss -tlnp 'sport = :3306'
# 或
sudo lsof -iTCP:3306 -sTCP:LISTEN
```

处理思路：停掉旧进程 / 改应用监听端口 / 确认是否有第二个实例误启。

### 3.2 本机能否通某端口

```bash
# 本机
ss -tlnp | grep 443
curl -I https://127.0.0.1

# 从另一台机器（需安装）
nc -vz 192.168.56.10 22
# 或
curl -v telnet://192.168.56.10:22
```

监听正常但仍不通：再查防火墙（`ufw` / `firewalld` / 云安全组）和 `bind` 地址是否只绑了 `127.0.0.1`。

### 3.3 排查异常对外连接

```bash
# 本机发起的 TCP 连接（看对端 IP:端口）
sudo ss -tnp state established

# 按进程过滤（例：某 PID）
sudo ss -tnp | grep <PID>
```

配合 `ps`、审计日志判断是否预期业务流量。

### 3.4 统计监听与连接数量

```bash
# 监听端口数量
sudo ss -tln | wc -l

# 按状态汇总
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn
```

---

## 4. 与 netstat 的对应关系

旧文档或老系统常见 `netstat`，与 `ss` 大致对应：

| 目的 | ss | netstat（若仍可用） |
|------|-----|---------------------|
| TCP 监听 + 进程 | `ss -tlnp` | `netstat -tlnp` |
| UDP 监听 | `ss -ulnp` | `netstat -ulnp` |
| 所有 TCP | `ss -tanp` | `netstat -tanp` |

Ubuntu 上 `netstat` 多来自 `net-tools` 包，新环境以 `ss` 为准即可。

---

## 5. 常用端口速查（运维向）

| 端口 | 协议 | 典型服务 |
|------|------|---------|
| 22 | TCP | SSH |
| 53 | UDP/TCP | DNS |
| 80 / 443 | TCP | HTTP / HTTPS |
| 3306 | TCP | MySQL |
| 5432 | TCP | PostgreSQL |
| 6379 | TCP | Redis |
| 8080 | TCP | 常见备用 HTTP / 应用端口 |

完整对照可用：`grep 服务名 /etc/services` 或 `getent services ssh`。

---

## 实践检查清单

- [ ] 能用 `ss -tlnp` 列出本机 TCP 监听端口及进程
- [ ] 能定位「端口被占用」对应的 PID，并安全停掉或改端口
- [ ] 能区分 `0.0.0.0` 与 `127.0.0.1` 监听的安全含义
- [ ] 能用 `ss` 查看 ESTABLISHED 连接，排查异常外连

---

## 延伸阅读

- [网络基础与排障](/guide/network/network-basics) — TCP/IP、DNS、常用端口概念
- [进程管理](/guide/linux/process) — 根据 PID 查看与结束进程
- [软件包与服务管理](/guide/linux/package-services) — 用 systemd 启停占用端口的服务
- [日志与故障排查](/guide/network/logging-troubleshooting) — 连通性问题的整体排障流程
- [SSH 完全指南](/guide/linux/ssh) — 端口转发与改 SSH 端口
