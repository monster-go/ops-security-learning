# 08 — 卸载与清理

> 对应 [notes/mysql-guide.md](../notes/mysql-guide.md) 第 8 节

---

## 8.1 卸载前的准备

**⚠️ 卸载前一定要先备份数据！**

```bash
# 全量备份数据
mysqldump -u root -p --all-databases --single-transaction --routines --triggers --events > pre_uninstall_backup.sql

# 或者直接备份数据目录（物理备份）
sudo cp -r /var/lib/mysql /var/lib/mysql_backup_$(date +%F)

# 记录当前配置（方便日后参考）
sudo cp -r /etc/mysql /etc/mysql_backup_$(date +%F)
```

---

## 8.2 apt 安装的卸载

### 完全卸载 MySQL

```bash
# 1. 停止服务
sudo systemctl stop mysql

# 2. 卸载 MySQL 软件包
sudo apt remove --purge mysql-server mysql-client mysql-common -y

# 3. 清理残留依赖
sudo apt autoremove -y

# 4. 删除数据目录（⚠️ 确认已备份后再执行）
sudo rm -rf /var/lib/mysql

# 5. 删除日志和配置
sudo rm -rf /var/log/mysql
sudo rm -rf /etc/mysql

# 6. 删除 apt 缓存
sudo apt autoclean
```

### 检查是否彻底清理

```bash
# 检查是否有残余包
dpkg -l | grep mysql

# 检查是否还有残留目录
ls -la /var/lib/mysql 2>/dev/null
ls -la /etc/mysql 2>/dev/null

# 检查 3306 端口是否还在监听
ss -tlnp | grep 3306
```

---

## 8.3 Docker 部署的清理

```bash
# 1. 停止容器
docker stop mysql-ops

# 2. 删除容器
docker rm mysql-ops

# 3. 删除镜像（可选）
docker rmi mysql:8.0

# 4. 删除 volume（⚠️ 确认已备份后再执行）
docker volume rm mysql-data

# 5. 清除所有未使用的 Docker 资源
docker system prune
```

**Docker volume 位置：**
```bash
# Docker volume 实际存储位置
ls -la /var/lib/docker/volumes/mysql-data/
```

---

## 8.4 数据目录彻底清除

如果要确保数据不可恢复（如机房租期结束退机）：

```bash
# 方法一：覆写后删除（推荐）
sudo dd if=/dev/urandom of=/var/lib/mysql/dead-letter bs=1M count=1000 2>/dev/null
sudo rm -rf /var/lib/mysql

# 方法二：使用 shred
sudo shred -f -n 3 /var/lib/mysql/ibdata1
sudo shred -f -n 3 /var/lib/mysql/ib_logfile0
sudo shred -f -n 3 /var/lib/mysql/ib_logfile1
```

> **注意**：`shred` 对 SSD 的效果不如 HDD（SSD 的磨损均衡和 TRIM 可能导致残余数据），SSD 上建议配合加密和 NVMe 的 Secure Erase。

---

## 8.5 验证清单

- [ ] 卸载前需要备份哪些内容？
- [ ] apt 卸载 MySQL 的完整流程是什么？
- [ ] Docker 部署的 MySQL 怎么清理 volume？
- [ ] 如何确认 MySQL 已被彻底卸载？
- [ ] 如果要确保数据不可恢复，有什么办法？

---

*[上一章：常见故障排查](07-common-faults.md) · [返回索引页](../notes/mysql-guide.md)*
