# Docker 容器入门

> **适用场景**：容器化部署、镜像构建、本地开发环境

## 核心概念

- 容器 vs 虚拟机
- 镜像、容器、仓库（Registry）
- Dockerfile 基本指令：`FROM`、`RUN`、`COPY`、`EXPOSE`、`CMD`

## 动手练习

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

## 实践检查清单

- [ ] 能解释容器和虚拟机的区别
- [ ] 能编写简单 Dockerfile 并构建镜像
- [ ] 能用 `docker ps`、`docker logs` 管理容器

## 延伸阅读

- [Colima / Compose 跨平台指南](/guide/devops/colima-compose)
- [Docker 磁盘清理指南](/guide/devops/docker-disk-cleanup)
