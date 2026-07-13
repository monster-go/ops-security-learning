# Docker 磁盘空间不足排查与清理指南

## 一、问题现象

```
failed to create runc console socket: mkdir /tmp/pty3517470442: no space left on device: unknown
```

## 二、核心概念

### 2.1 文件系统挂载机制

- **挂载会覆盖目录**：当你在一个目录上挂载另一个文件系统时，原目录的内容会被"隐藏"，显示的是新文件系统的内容
- **示例**：
  - `/dev/nvme0n1p1` 挂载在 `/`（物理磁盘）
  - `devtmpfs` 挂载在 `/dev`（内存文件系统）
  - `/dev` 的内容来自 `devtmpfs`，不占用磁盘空间

### 2.2 df -h 字段说明

| 字段 | 说明 |
|------|------|
| Filesystem | 文件系统名称/设备 |
| Size | 总容量 |
| Used | 已使用空间 |
| Avail | 可用空间 |
| Use% | 使用百分比 |
| Mounted on | 挂载点 |

### 2.3 Docker overlay2 存储驱动

- **作用**：管理容器和镜像的文件系统层
- **位置**：`/var/lib/docker/overlay2/`
- **特点**：
  - 每个层对应一个目录
  - 镜像层（只读）+ 容器层（可写）
  - 多个 overlay 挂载共享底层存储设备

### 2.4 Docker 目录结构

```
/var/lib/docker/
├── containers/     # 容器日志和元数据（主要占用：日志文件）
├── overlay2/       # 镜像和容器文件系统层
├── images/         # 镜像元数据
├── volumes/        # 数据卷
└── buildkit/       # 构建缓存
```

## 三、排查步骤

### 步骤1：确认磁盘空间使用情况

```bash
# 查看所有文件系统使用情况
df -h

# 查看根分区使用情况
df -h /

# 查看 /tmp 目录空间（问题通常出现在这里）
df -h /tmp
```

### 步骤2：定位占用空间最大的目录

```bash
# 查看根目录下各目录占用空间（按大小排序）
du -h --max-depth=1 / 2>/dev/null | sort -hr | head -15

# 查看 /var 目录占用
du -h --max-depth=1 /var/ 2>/dev/null | sort -hr | head -15

# 查看 /var/lib 目录占用
du -h --max-depth=1 /var/lib/ 2>/dev/null | sort -hr | head -15
```

### 步骤3：排查 Docker 占用

```bash
# 查看 Docker 目录占用
du -h --max-depth=1 /var/lib/docker/ 2>/dev/null | sort -hr | head -15

# 查看容器目录占用（通常是日志文件）
du -h --max-depth=1 /var/lib/docker/containers/ 2>/dev/null | sort -hr | head -15

# 查看 overlay2 占用
du -h --max-depth=1 /var/lib/docker/overlay2/ 2>/dev/null | sort -hr | head -15
```

### 步骤4：识别具体容器

```bash
# 查看所有容器（包括已停止的）
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"

# 查看容器ID对应的容器名称
docker ps -a | grep <容器ID前12位>

# 查看具体容器的日志文件大小
ls -lh /var/lib/docker/containers/<完整容器ID>/*.log
```

### 步骤5：查看 Docker 系统使用情况

```bash
# 查看 Docker 磁盘使用情况
docker system df

# 查看详细的层信息
docker system df -v
```

## 四、清理方法

### 4.1 清理容器日志（针对正在运行的容器）

```bash
# 查看日志文件大小
du -sh /var/lib/docker/containers/<容器ID>/

# 查看日志文件详情
ls -lh /var/lib/docker/containers/<容器ID>/*.log

# 清空日志文件（不会影响正在运行的容器）
truncate -s 0 /var/lib/docker/containers/<容器ID>/*-json.log

# 批量清理所有容器的日志（只清理大于100M的）
find /var/lib/docker/containers/ -name "*-json.log" -size +100M -exec truncate -s 0 {} \;
```

### 4.2 使用 Docker 命令清理（推荐）

```bash
# 清理未使用的资源（最安全）
docker system prune

# 清理未使用的镜像（包括悬空镜像）
docker image prune -a

# 清理所有未使用的资源（包括未使用的镜像和卷）
docker system prune -a --volumes

# 只清理已停止的容器
docker container prune

# 只清理未使用的网络
docker network prune

# 只清理未使用的卷
docker volume prune

# 清理构建缓存
docker builder prune
```

### 4.3 清理特定容器/镜像

```bash
# 停止容器
docker stop <容器名或ID>

# 删除容器（必须先停止）
docker rm <容器名或ID>

# 删除镜像
docker rmi <镜像ID>

# 强制删除镜像（如果有容器在使用）
docker rmi -f <镜像ID>
```

## 五、预防措施

### 5.1 配置容器日志轮转

在 `docker-compose.yml` 中配置：

```yaml
services:
  your-service:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"      # 单个日志文件最大 10MB
        max-file: "3"        # 最多保留 3 个日志文件
```

或者在运行容器时：

```bash
docker run --log-opt max-size=10m --log-opt max-file=3 ...
```

### 5.2 全局 Docker 日志配置

编辑 `/etc/docker/daemon.json`：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

然后重启 Docker：

```bash
systemctl restart docker
```

### 5.3 定期清理脚本

创建清理脚本 `cleanup-docker.sh`：

```bash
#!/bin/bash
# 清理 Docker 未使用的资源
docker system prune -f

# 清理大于100M的容器日志
find /var/lib/docker/containers/ -name "*-json.log" -size +100M -exec truncate -s 0 {} \;

# 显示清理后的空间使用
df -h /var/lib/docker
docker system df
```

添加到 crontab（每周执行一次）：

```bash
0 2 * * 0 /path/to/cleanup-docker.sh >> /var/log/docker-cleanup.log 2>&1
```

## 六、常用排查命令速查

```bash
# 磁盘空间
df -h                    # 查看所有文件系统
df -h /                  # 查看根分区
df -i                    # 查看 inode 使用情况

# 目录占用
du -h --max-depth=1 / 2>/dev/null | sort -hr | head -20
du -sh /* 2>/dev/null | sort -hr

# Docker 相关
docker ps -a            # 查看所有容器
docker images           # 查看所有镜像
docker system df        # Docker 磁盘使用
docker system df -v     # 详细磁盘使用

# 查找大文件
find / -type f -size +100M 2>/dev/null | xargs ls -lh | sort -k5 -hr | head -20
```

## 七、问题排查流程图

```
1. 发现错误：no space left on device
   ↓
2. 确认磁盘使用：df -h
   ↓
3. 定位大目录：du -h --max-depth=1 / | sort -hr
   ↓
4. 排查 Docker：du -h /var/lib/docker/*
   ↓
5. 识别问题容器：docker ps -a + du containers/
   ↓
6. 清理日志/资源：truncate 或 docker system prune
   ↓
7. 配置预防措施：日志轮转配置
```

## 八、注意事项

1. **不要直接删除** `/var/lib/docker/overlay2/` 下的目录
2. **清理前确认**没有重要数据需要保留
3. **正在运行的容器**日志清理使用 `truncate`，不要直接删除文件
4. **使用 Docker 命令清理**更安全，会自动处理依赖关系
5. **清理后可能需要重启**相关容器

## 九、典型案例

### 案例1：PHP-FPM 容器日志占用 11G

**问题**：
- 容器 `laradock-zy-php-fpm-1` 日志文件占用 11G
- 容器已运行 9 个月，日志持续增长

**解决**：
```bash
# 1. 清空日志
truncate -s 0 /var/lib/docker/containers/6532a5aefc72c645191e1505ac45ae1b799ccc725b782604191423856a775f3a/*-json.log

# 2. 配置日志轮转（在 docker-compose.yml 中）
php-fpm:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"

# 3. 重启容器
docker-compose restart php-fpm
```

### 案例2：Nginx 访问日志文件过大（正在写入中）

**问题**：
- `cash_access.log` 文件很大，nginx 正在持续写入
- 需要清空文件但不影响 nginx 服务

**立即解决**：
```bash
# 清空日志文件（不会影响正在写入的 nginx 进程）
truncate -s 0 /var/log/nginx/cash_access.log

# 或者使用重定向
> /var/log/nginx/cash_access.log

# 验证文件已清空
ls -lh /var/log/nginx/cash_access.log
```

**重要说明**：
- ✅ **可以使用**：`truncate -s 0` 或 `> filename` - 清空文件内容，不影响已打开的文件描述符
- ❌ **不能使用**：`rm filename` - 删除文件会导致 nginx 继续写入已删除的文件（inode 仍被占用），空间不会释放

**长期解决方案**：

1. **优化 logrotate 配置**（`/etc/logrotate.d/nginx` 或容器内的 logrotate 配置）：
```bash
/var/log/nginx/*.log {
    daily
    missingok
    rotate 7              # 只保留 7 天（原来是 32 天）
    compress
    delaycompress
    notifempty
    create 0644 www-data root
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

2. **在 nginx 配置中限制日志大小**（nginx 1.19.5+）：
```nginx
access_log /var/log/nginx/cash_access.log combined buffer=64k flush=1m;
# 可以添加 open_log_file_cache 来优化性能
```

3. **手动触发日志轮转**：
```bash
# 测试 logrotate 配置
logrotate -d /etc/logrotate.d/nginx

# 强制执行日志轮转
logrotate -f /etc/logrotate.d/nginx
```

---

**文档版本**：v1.0  
**最后更新**：2025年3月  
**适用场景**：Docker 环境磁盘空间不足排查与清理

