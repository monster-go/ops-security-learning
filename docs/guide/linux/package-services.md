# 软件包与服务管理

> **适用场景**：安装软件、管理系统服务、理解 systemd

## 核心概念

- 包管理：`apt update`、`apt install`、`apt remove`、`dpkg`
- systemd 概念：unit、service、target
- 常用命令：`systemctl start/stop/restart/status/enable`
- 日志：`journalctl -u 服务名 -f`

## 动手练习

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

## 实践检查清单

- [ ] 能独立安装 nginx 并设置开机自启
- [ ] 能用 `journalctl` 查看服务日志
- [ ] 能解释 `enable` 和 `start` 的区别

## 延伸阅读

- [Web 服务部署](/guide/network/web-deployment)
- [日志与故障排查](/guide/network/logging-troubleshooting)
