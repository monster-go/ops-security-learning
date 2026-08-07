# Web 安全基础

> **适用场景**：理解 OWASP Top 10 常见漏洞，在 DVWA / PortSwigger 靶场练习

::: warning 合法提醒
仅在 vm-lab 或授权靶场进行 Web 安全实验。
:::

## 必学漏洞

| 漏洞 | 原理 | 练习环境 |
|------|------|----------|
| SQL 注入 | 用户输入拼接到 SQL 语句 | DVWA / PortSwigger |
| XSS | 恶意脚本注入页面 | DVWA / PortSwigger |
| 文件上传 | 上传恶意文件获取 Shell | DVWA |
| 命令注入 | 用户输入拼接到系统命令 | DVWA |

## DVWA 搭建（vm-lab）

```bash
docker run -d -p 80:80 vulnerables/web-dvwa
# 访问 http://<vm-lab-ip>/  默认用户 admin / password
```

## PortSwigger 练习建议

- SQL Injection 章节（前 5 个 Lab）
- Cross-site scripting 章节（前 3 个 Lab）

## 实践检查清单

- [ ] 能解释 SQL 注入成因和防御（参数化查询）
- [ ] 能在 DVWA 低难度完成 SQL 注入和 XSS
- [ ] 能使用 Burp Suite 拦截和修改 HTTP 请求

## 延伸阅读

- [密码学与 HTTPS](/guide/security/cryptography-https)
- [参考资源 — OWASP Top 10](/guide/resources)
