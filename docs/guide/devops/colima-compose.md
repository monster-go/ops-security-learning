# Docker + Docker Compose + Colima 跨平台完全指南

> **一句话**：在你自己的电脑上把 Docker 环境配好，能拉镜像、跑容器、用 `docker compose` 管理多服务，是一切容器化工作的起点。

---

## 目录

1. [快速决策：我该用什么？](#一快速决策我该用什么)
2. [Docker Engine 安装](#二docker-engine-安装)
   - [Linux (Ubuntu / Debian)](#21-linux-ubuntu--debian)
   - [Linux (CentOS / RHEL / Fedora)](#22-linux-centos--rhel--fedora)
   - [macOS](#23-macos)
   - [Windows](#24-windows)
3. [Docker Desktop vs 替代方案](#三docker-desktop-vs-替代方案)
4. [Colima — macOS 上的轻量替代](#四colima--macos-上的轻量替代)
   - [安装 Colima](#41-安装-colima)
   - [启动、停止、状态](#42-启动停止状态)
   - [配置与高级用法](#43-配置与高级用法)
   - [多实例管理](#44-多实例管理)
5. [Docker Compose](#五docker-compose)
   - [安装 Docker Compose](#51-安装-docker-compose)
   - [Compose 基础使用](#52-compose-基础使用)
   - [Compose 文件结构速览](#53-compose-文件结构速览)
6. [Docker 核心命令速查](#六docker-核心命令速查)
   - [镜像管理](#61-镜像管理)
   - [容器管理](#62-容器管理)
   - [网络与卷](#63-网络与卷)
   - [日志与调试](#64-日志与调试)
7. [跨平台常见问题](#七跨平台常见问题)

---

## 一、快速决策：我该用什么？

| 你的系统 | 推荐方案 | 理由 |
|---------|---------|------|
| **Linux (Ubuntu/CentOS)** | Docker Engine 直接安装 | Linux 原生支持容器，不需要虚拟机层 |
| **macOS (Intel)** | Docker Desktop **或** Colima | Docker Desktop 开箱即用；Colima 更轻量、免费 |
| **macOS (Apple Silicon M1/M2/M3)** | Docker Desktop **或** Colima | 两者都已原生支持 ARM64；Colima 资源占用更少 |
| **Windows (WSL2)** | Docker Desktop with WSL2 backend | 最佳 Windows 体验，与 Linux 容器无缝集成 |

> 💡 **个人开发机推荐**：Linux 直接装 Docker Engine；macOS 优先尝试 Colima（免费、轻量、够用）；Windows 用 Docker Desktop。

---

## 二、Docker Engine 安装

### 2.1 Linux (Ubuntu / Debian)

**方法一：官方一键脚本（最省事）**

```bash
# 如果不想手动加源，官方提供了一键脚本
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 把当前用户加入 docker 组（避免每次 sudo）
sudo usermod -aG docker $USER

# 登出重新登录，或直接执行：
newgrp docker

# 验证
docker version
docker run hello-world
```

> 🧠 **原理**：`get.docker.com` 脚本会检测你的发行版 → 添加官方 Docker 源 → 安装 `docker-ce`、`docker-ce-cli`、`containerd.io` → 启动服务。

**方法二：手动加源安装（适合离线或有代理需求）**

```bash
# 卸载旧版本
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  sudo apt-get remove -y $pkg
done

# 安装依赖
sudo apt-get update
sudo apt-get install -y ca-certificates curl

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 添加 apt 源
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

# 安装 Docker
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证
sudo docker run hello-world
```

#### 安装后验证

```bash
# 检查服务状态
systemctl status docker

# 查看版本
docker --version
docker compose version
```

---

### 2.2 Linux (CentOS / RHEL / Fedora)

```bash
# 卸载旧版本
sudo yum remove -y docker docker-client docker-client-latest docker-common \
                  docker-latest docker-latest-logrotate docker-logrotate docker-engine

# 安装依赖
sudo yum install -y yum-utils

# 添加 Docker 源
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 把当前用户加入 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker run hello-world
```

---

### 2.3 macOS

#### macOS —— Docker Desktop 方式

1. 访问 [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) 下载
2. 双击 `.dmg`，将 Docker 拖入 Applications
3. 打开 Docker.app，等待守财奴图标（鲸鱼 🐋）不再转圈
4. 验证：

```bash
docker version
docker run hello-world
```

> ⚠️ **注意**：Docker Desktop for macOS 从 2022 年起对**大型企业**（员工 >250 人 / 年收入 >$10M）收费，个人和小团队仍免费。

#### macOS —— Colima 方式（推荐替代方案）

详细见 [第四节：Colima](#四colima--macos-上的轻量替代)。

---

### 2.4 Windows

#### Windows —— Docker Desktop with WSL2（推荐）

**前置条件**：

1. 安装 WSL2，参考 [WSL 官方文档](https://learn.microsoft.com/zh-cn/windows/wsl/install)
2. 在 PowerShell（管理员）中：
```powershell
wsl --install -d ubuntu
```

**安装 Docker Desktop**：
1. 下载 [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
2. 安装时确保勾选 **Use WSL 2 instead of Hyper-V**
3. 安装完成后在 Settings → Resources → WSL Integration 中选择你要集成的发行版
4. 验证：
```bash
docker version
docker run hello-world
```

---

## 三、Docker Desktop vs 替代方案

| 对比维度 | Docker Desktop | Colima | 裸 Docker Engine |
|---------|:-------------:|:------:|:----------------:|
| **平台** | macOS / Windows | macOS / Linux | Linux only |
| **License** | 大型企业收费 | 完全免费 | 完全免费 |
| **底层实现** | 自带虚拟机 | Lima 虚拟机 | 原生 |
| **资源占用** | 较高（~2GB RAM） | 低（可调） | 极低 |
| **GUI 界面** | ✅ 有 | ❌ 无（CLI only） | ❌ 无 |
| **开箱即用** | ✅ 优秀 | ✅ 需要配 | ✅ 原生 |
| **Kubernetes** | ✅ 内置 | ❌ 需额外装 | ❌ 需额外装 |

---

## 四、Colima — macOS 上的轻量替代

### 4.1 安装 Colima

**前置条件**：安装 [Homebrew](https://brew.sh/)

```bash
# 安装 Colima
brew install colima

# 安装 Docker CLI（Colima 只提供虚拟机运行时，需要 docker 命令行工具）
brew install docker

# 安装 Docker Compose（可选，推荐装）
brew install docker-compose

# 验证
colima --version
docker --version
```

> 🧠 **原理**：Colima 在 macOS 上通过 Lima 启动一个轻量 Linux 虚拟机，内部运行 containerd，对外暴露 Docker Socket。你装的 `docker` CLI 连接的是 Colima 的虚拟机，和 Docker Desktop 体验一致。

---

### 4.2 启动、停止、状态

```bash
# 启动 Colima（默认配置）
colima start

# 启动并指定资源配置
colima start --cpu 4 --memory 8 --disk 60

# 查看 Colima 状态
colima status

# 停止 Colima（暂停虚拟机，保留数据）
colima stop

# 重启 Colima
colima restart

# 完全删除 Colima 虚拟机（清空所有数据）
colima delete

# 查看当前配置
colima list

# 检查当前 docker 连接的是谁的 socket
docker context show
# 输出应为：colima（如果正确连接）
```

#### 典型输出解读

```bash
$ colima status
INFO[0000] colima is running using docker runtime
INFO[0000] arch: aarch64
INFO[0000] runtime: docker
INFO[0000] pid: 12345
INFO[0000] status: Running  ← 重点看这一行

$ colima status
colima is not running  ← 没启动
```

---

### 4.3 配置与高级用法

```bash
# 启动时指定容器运行时（默认 docker，可选 containerd）
colima start --runtime containerd

# 指定 Kubernetes 版本（搭配 k3s）
colima start --kubernetes

# 指定网络参数
colima start --network-address

# 使用配置文件启动
colima start --edit  # 用默认编辑器编辑 YAML 配置

# 手动创建配置文件
colima start \
  --cpu 4 \
  --memory 8 \
  --disk 100 \
  --runtime docker \
  --kubernetes \
  --network-address \
  --vm-type vz \          # 推荐 Apple Silicon 使用 vz 类型
  --vz-rosetta             # Apple Silicon 启用 Rosetta 二进制翻译
```

**推荐配置（Apple Silicon MacBook，16GB RAM）**：

```bash
colima stop
colima start \
  --cpu 4 \
  --memory 8 \
  --disk 60 \
  --vm-type vz \
  --vz-rosetta
```

> 🧠 **vz vs qemu**：`vz` 是 Apple 原生的虚拟化框架，性能比默认的 `qemu` 好很多（Apple Silicon 必选）。`--vz-rosetta` 让 x86 镜像也能通过 Rosetta 2 运行，但兼容性不如原生 ARM64 镜像。

---

### 4.4 多实例管理

Colima 支持同时运行多个虚拟机实例，但默认的 docker context 只能连一个。

```bash
# 创建命名实例
colima start my-project --cpu 2 --memory 4

# 列出所有实例
colima list

# 切换 Docker context 到指定实例
docker context use colima-my-project

# 停止指定实例
colima stop my-project

# 删除指定实例
colima delete my-project
```

---

## 五、Docker Compose

### 5.1 安装 Docker Compose

Docker Compose 有两个版本：
- **v1（已弃用）**：独立的 `docker-compose` 二进制文件
- **v2（当前版本）**：Docker CLI 插件 `docker compose`（没有横杠）

#### 安装方式

**方式一：Docker Compose Plugin（推荐）**

```bash
# 如果你是用 get.docker.com 或官方源装的 Docker，应该自带 compose 插件
docker compose version

# 如果没有，手动装：
# Ubuntu/Debian
sudo apt-get install -y docker-compose-plugin

# CentOS/RHEL
sudo yum install -y docker-compose-plugin

# macOS (Homebrew)
brew install docker-compose
```

**方式二：独立二进制安装（v2）**

```bash
# 查看最新版本：https://github.com/docker/compose/releases
DOCKER_COMPOSE_VERSION="v2.29.0"

# 下载（按你的架构选择）
sudo curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose

# 验证
docker-compose --version
```

**方式三：macOS 通过 Colima（已完成，见上文）**

```bash
brew install docker-compose
# 这样装的是 v2 插件版本，可以通过 docker compose 使用
```

#### 验证安装

```bash
# v2（插件版，推荐使用这个）
docker compose version

# v1（独立版，如果装了的话）
docker-compose --version
```

---

### 5.2 Compose 基础使用

```bash
# 假设你的项目目录里有 docker-compose.yml

# 启动所有服务（前台模式，可以看到日志）
docker compose up

# 启动所有服务（后台守护模式）
docker compose up -d

# 停止并移除所有容器
docker compose down

# 停止但不移除容器（可再 up 快速恢复）
docker compose stop

# 启动已停止的容器
docker compose start

# 重启服务
docker compose restart

# 查看运行中的服务状态
docker compose ps

# 查看所有服务日志
docker compose logs

# 跟踪日志（类似 tail -f）
docker compose logs -f

# 查看特定服务的日志
docker compose logs -f web

# 重新构建镜像后启动
docker compose up -d --build

# 列出所有镜像
docker compose images

# 进入正在运行的容器
docker compose exec web bash

# 查看服务依赖的端口映射
docker compose port web 80
```

#### 常用组合

```bash
# 日常开发：重新构建 + 后台启动
docker compose up -d --build

# 清理后重启
docker compose down -v && docker compose up -d

# 仅重启某个服务
docker compose restart nginx
```

---

### 5.3 Compose 文件结构速览

```yaml
version: "3.8"           # API 版本（最新的 3.x 兼容大多数情况）

services:                # 定义你的服务（即容器）
  web:                   # 服务名
    build: .             # 从当前目录的 Dockerfile 构建
    ports:
      - "8080:80"        # 宿主机端口:容器端口
    volumes:
      - ./src:/app       # 挂载卷（开发热重载）
      - app_data:/data   # 命名卷（数据持久化）
    environment:
      - DB_HOST=db       # 环境变量
    depends_on:
      - db               # 依赖关系（先启动 db）

  db:
    image: mysql:8.0
    volumes:
      - db_data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpass

volumes:                 # 声明的命名卷
  app_data:
  db_data:
```

> 🧠 **快速记忆**：Compose 文件就是告诉你「哪些容器一起跑、它们之间怎么连、数据放哪里」。

---

## 六、Docker 核心命令速查

### 6.1 镜像管理

```bash
# 搜索镜像
docker search nginx

# 拉取镜像（默认从 Docker Hub）
docker pull nginx:latest
docker pull nginx:1.25-alpine    # 指定标签

# 列出本地镜像
docker images

# 删除镜像
docker rmi nginx:latest

# 删除所有未被使用的镜像（dangling images）
docker image prune

# 删除所有未被任何容器引用的镜像
docker image prune -a

# 查看镜像详情
docker inspect nginx:latest

# 将镜像保存为 tar 文件（离线传输）
docker save -o nginx.tar nginx:latest

# 从 tar 文件加载镜像
docker load -i nginx.tar

# 查看镜像分层历史
docker history nginx:latest
```

---

### 6.2 容器管理

```bash
# 创建并启动容器
docker run nginx:latest                    # 前台运行
docker run -d nginx:latest                 # 后台运行（detach）
docker run -d --name my-nginx nginx:latest # 指定容器名
docker run -d -p 8080:80 nginx:latest      # 端口映射
docker run -it ubuntu bash                 # 交互式运行（退出后容器停止）

# 列出容器
docker ps                                 # 运行中的
docker ps -a                              # 所有（含已停止的）
docker ps -q                              # 只显示 ID（用于组合命令）

# 停止 / 启动 / 重启
docker stop my-nginx
docker start my-nginx
docker restart my-nginx

# 暂停 / 恢复（不停止进程，仅暂停）
docker pause my-nginx
docker unpause my-nginx

# 进入正在运行的容器
docker exec -it my-nginx bash
docker exec -it my-nginx sh               # Alpine 镜像用 sh

# 容器内执行单条命令
docker exec my-nginx ls /etc/nginx

# 查看容器日志
docker logs my-nginx
docker logs -f my-nginx                   # 跟踪日志
docker logs --tail 100 my-nginx           # 只看最后 100 行

# 复制文件
docker cp my-file.txt my-nginx:/tmp/      # 宿主机 → 容器
docker cp my-nginx:/etc/nginx/nginx.conf . # 容器 → 宿主机

# 删除容器
docker rm my-nginx                        # 删除已停止的
docker rm -f my-nginx                     # 强制删除（不管是否运行）

# 清理所有已停止的容器
docker container prune

# 查看容器资源占用
docker stats

# 查看容器进程
docker top my-nginx
```

#### docker run 常用参数速查

| 参数 | 作用 | 示例 |
|------|------|------|
| `-d` | 后台运行 | `docker run -d nginx` |
| `-it` | 交互式终端 | `docker run -it ubuntu bash` |
| `--name` | 指定容器名 | `docker run --name my-nginx nginx` |
| `-p` | 端口映射 | `docker run -p 8080:80 nginx` |
| `-v` | 挂载卷 | `docker run -v /host:/container nginx` |
| `-e` | 设置环境变量 | `docker run -e MYSQL_ROOT_PASSWORD=root mysql` |
| `--network` | 指定网络 | `docker run --network my-net nginx` |
| `--restart` | 重启策略 | `docker run --restart=always nginx` |
| `--rm` | 退出后自动删除 | `docker run --rm -it ubuntu bash` |

---

### 6.3 网络与卷

```bash
# ---- 网络 ----

# 列出网络
docker network ls

# 创建自定义桥接网络
docker network create my-net

# 将容器连接到网络
docker network connect my-net my-nginx

# 断开网络
docker network disconnect my-net my-nginx

# 查看网络详情（含哪些容器）
docker network inspect my-net

# 删除网络
docker network rm my-net

# ---- 卷 ----

# 列出卷
docker volume ls

# 创建卷
docker volume create my-volume

# 查看卷详情
docker volume inspect my-volume

# 删除卷
docker volume rm my-volume

# 清理所有未被使用的卷
docker volume prune

# ---- 容器创建时使用卷 ----
# 命名卷（由 docker 管理）
docker run -d -v my-volume:/data nginx

# 绑定挂载（使用宿主机路径）
docker run -d -v /host/path:/container/path nginx

# tmpfs 挂载（内存中，容器停止后消失）
docker run -d --tmpfs /tmp nginx
```

---

### 6.4 日志与调试

```bash
# 查看容器日志
docker logs my-container
docker logs -f --tail 50 my-container

# 查看 Docker daemon 日志（排错时用）
# Linux (systemd)
sudo journalctl -u docker -f

# macOS (Docker Desktop)
# 直接在 Docker Desktop GUI 中查看
# 或：~/Library/Containers/com.docker.docker/Data/log/

# Colima
colima logs

# 查看容器内部进程
docker top my-container

# 查看容器资源使用
docker stats

# 查看容器改动（与镜像对比）
docker diff my-container

# 导出容器文件系统为 tar
docker export -o my-container.tar my-container

# 导入 tar 为镜像
docker import my-container.tar my-image:tag

# 提交容器的改动为新镜像（不推荐日常使用）
docker commit my-container my-image:tag
```

---

## 七、跨平台常见问题

### Q1：docker: command not found

```bash
# Linux：确认 Docker 是否安装
which docker
# 如果没装：参考第二节安装

# macOS：确认 docker CLI 是否安装
brew list docker
# 如果没装：brew install docker

# 装过但依然找不到：检查 PATH
echo $PATH | grep docker
# Colima 用户：确保 /usr/local/bin 在 PATH 中
export PATH="/usr/local/bin:$PATH"
```

### Q2：权限不足 — Got permission denied

```bash
# Linux：当前用户不在 docker 组
sudo usermod -aG docker $USER
newgrp docker   # 或重新登录

# macOS (Colima)：docker context 没设置对
docker context show
docker context use colima
```

### Q3：macOS 上 Docker Desktop vs Colima 切换

```bash
# 查看当前 context
docker context ls

# 切换到 Docker Desktop
docker context use default

# 切换到 Colima
docker context use colima

# 新建 context（当需要自定义时）
docker context create my-context --docker "host=unix:///var/run/docker.sock"
```

### Q4：Colima 启动失败 / 端口冲突

```bash
# 查看 Colima 日志
colima logs

# 清理出错的实例
colima stop
colima delete

# 重新创建
colima start

# 如果某个宿主机端口被占用，通过 -p 映射到别的端口
# 注意：Colima 的端口转发是用 ssh -L 做的，修改配置可能更复杂
# 推荐在 docker run 时指定不同端口
```

### Q5：镜像拉取慢

```bash
# 配置镜像加速器（Docker Desktop 在 Settings → Docker Engine 中配置）
# Linux 编辑 /etc/docker/daemon.json
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker

# Colima 配置镜像加速
colima stop
colima start --edit
# 在编辑器中添加：
# docker:
#   registry-mirrors:
#     - https://docker.mirrors.ustc.edu.cn
#     - https://hub-mirror.c.163.com
```

### Q6：磁盘空间暴涨

```bash
# 查看 Docker 占用磁盘
docker system df

# 一个命令清理所有（慎用：会删停止的容器、未使用的网络、 dangling 镜像、未使用的构建缓存）
docker system prune -a --volumes

# 逐步清理
docker container prune          # 清理停止的容器
docker image prune -a            # 清理未使用的镜像
docker volume prune              # 清理未使用的卷
docker builder prune             # 清理构建缓存

# 详细排查见同目录下的
# → Docker-Disk-Space-Check-and-Cleanup-Guide.md
```

### Q7：容器内时区不对

```bash
# 运行容器时挂载宿主机时区
docker run -d \
  -v /etc/localtime:/etc/localtime:ro \
  -v /etc/timezone:/etc/timezone:ro \
  nginx

# 或通过环境变量设置（部分镜像支持）
docker run -e TZ=Asia/Shanghai nginx

# Dockerfile 中设置（推荐做基础镜像时做）
# ENV TZ=Asia/Shanghai
# RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

---

## 快速验收清单

完成本文后，你应该能在你的机器上顺利执行以下命令：

```bash
# ── Docker 验证 ──
docker --version                    # ✅ 打印版本
docker run hello-world              # ✅ 成功输出 Hello from Docker!

# ── Colima 验证（macOS 用户）──
colima status                       # ✅ 显示 Running
docker context show                 # ✅ 显示 colima

# ── Docker Compose 验证 ──
docker compose version              # ✅ 打印版本

# ── 基础操作验证 ──
docker pull nginx:alpine            # ✅ 成功拉取镜像
docker run -d -p 8080:80 --name test-nginx nginx:alpine   # ✅ 启动容器
curl http://localhost:8080          # ✅ 返回 Nginx 欢迎页
docker stop test-nginx              # ✅ 停止容器
docker rm test-nginx                # ✅ 删除容器
```

---

> **相关文档**：[Docker 磁盘清理](./docker-disk-cleanup.md) · [Git](./git.md)
