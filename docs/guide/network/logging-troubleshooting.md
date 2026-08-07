# 日志与故障排查

> **适用场景**：读懂系统日志，建立排障思路

## 关键日志文件

| 日志路径 | 内容 |
|----------|------|
| `/var/log/syslog` | 系统综合日志 |
| `/var/log/auth.log` | 登录认证日志 |
| `/var/log/nginx/access.log` | Web 访问日志 |
| `/var/log/nginx/error.log` | Web 错误日志 |
| `journalctl` | systemd 服务日志 |

## 排障流程

```
1. 确认现象（服务不可用？慢？报错？）
2. 查看服务状态（systemctl status）
3. 查看相关日志（journalctl / tail）
4. 检查配置（nginx -t / 配置文件语法）
5. 检查资源（df / free / ss）
6. 检查网络（curl / ping / 防火墙）
7. 修复并验证
```

## 实践检查清单

- [ ] 能根据 nginx 502 错误独立完成排查
- [ ] 能从 auth.log 中发现暴力破解尝试
- [ ] 能写一份简单的故障排查记录
