# Web 服务部署

> **适用场景**：Nginx 静态站点、虚拟主机、HTTPS 概念

## 核心概念

- 反向代理概念
- Let's Encrypt / Certbot（HTTPS 证书）
- 负载均衡基本概念

## 动手练习

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

## 实践检查清单

- [ ] 能通过浏览器访问 vm-ops 上的静态站点
- [ ] 能解释正向代理和反向代理的区别
- [ ] 知道 HTTPS 证书的作用

## 延伸阅读

- [Supervisor 完全指南](/guide/automation/supervisor) — 守护 Web 应用进程
- [日志与故障排查](/guide/network/logging-troubleshooting)
