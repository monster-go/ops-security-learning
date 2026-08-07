# 密码学与 HTTPS

> **适用场景**：理解加密、哈希、数字证书，排查 HTTPS 相关问题

## 核心概念

- 对称加密 vs 非对称加密
- 哈希函数：MD5（已不安全）、SHA-256
- 密码存储：bcrypt、argon2，**禁止明文存储**
- HTTPS 握手过程（简化版）
- 数字证书与 CA 机构

## 动手练习

```bash
# 生成哈希
echo -n "password123" | sha256sum

# 查看网站证书
openssl s_client -connect www.google.com:443 </dev/null 2>/dev/null | openssl x509 -text -noout | head -20
```

## 实践检查清单

- [ ] 能解释 HTTPS 为什么比 HTTP 安全
- [ ] 能说明为什么不能只用 MD5 存储密码
- [ ] 能查看并读懂证书中的颁发者和有效期
