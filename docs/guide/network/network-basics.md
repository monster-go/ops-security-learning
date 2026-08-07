# 网络基础与排障

> **适用场景**：理解 TCP/IP、DNS、端口，排查服务连通性

## 核心概念

- OSI / TCP/IP 模型（重点：应用层、传输层、网络层）
- 常用端口：22(SSH)、80(HTTP)、443(HTTPS)、53(DNS)、3306(MySQL)
- DNS 解析流程
- 工具：`ping`、`traceroute`、`nslookup`/`dig`、`ss -tlnp`、`curl`

## 动手练习

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

## 实践检查清单

- [ ] 能解释 TCP 三次握手和四次挥手
- [ ] 能说出 5 个常见端口及用途
- [ ] 能用 `ss` 和 `curl` 排查服务连通性

## 延伸阅读

- [SSH 完全指南](/guide/linux/ssh) — 隧道与端口转发
