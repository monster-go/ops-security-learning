# Linux 系统加固

> **适用场景**：从防御角度加固 Ubuntu，审计常见入侵痕迹

## 加固清单

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

## 实践检查清单

- [ ] 能完成一份 Ubuntu 安全加固检查表
- [ ] 能发现 authorized_keys 中的异常密钥
- [ ] 能列出所有 SUID 文件并判断是否合理

## 延伸阅读

- [SSH 完全指南 — 安全加固](/guide/linux/ssh)
- [crontab 完全指南 — 安全审计](/guide/linux/crontab)
- [应急响应](/guide/security/incident-response)
