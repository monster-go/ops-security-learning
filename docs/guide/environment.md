# 实验环境准备

> **适用场景**：在本地虚拟机中复现文档中的命令与实验  
> **推荐系统**：Ubuntu Server 22.04 LTS

动手实践前，建议准备以下环境：

## 环境清单

- [ ] 安装 VirtualBox 或 VMware
- [ ] 下载 [Ubuntu Server 22.04 LTS ISO](https://ubuntu.com/download/server)
- [ ] 创建 2 台虚拟机：
  - **vm-ops**：运维练习机（2 核 CPU / 4GB 内存 / 40GB 磁盘）
  - **vm-lab**：安全实验靶机（1 核 CPU / 2GB 内存 / 20GB 磁盘）
- [ ] 本机安装：VS Code、终端、Wireshark（可选）
- [ ] 注册账号：TryHackMe、PortSwigger Web Security Academy（均免费）

## vm-ops 基础配置

1. 安装 Ubuntu Server 22.04，创建普通用户并加入 `sudo` 组
2. 配置静态 IP 或通过 NAT/桥接保证本机可 SSH 登录
3. 验证：`ssh user@<vm-ops-ip>`

## vm-lab 用途

安全相关实验（渗透、Web 漏洞、应急响应模拟）**仅在 vm-lab 或授权靶场**进行，不要在生产环境或未经授权的目标上操作。

## 知识库结构

| 路径 | 内容 |
|------|------|
| [Linux 系统](/guide/linux/filesystem-permissions) | 文件权限、服务、磁盘、进程、定时任务、SSH |
| [网络与服务](/guide/network/network-basics) | 网络排障、Web 部署、日志分析 |
| [自动化](/guide/automation/bash-scripts) | Bash 巡检、Supervisor |
| [容器与 DevOps](/guide/devops/docker) | Docker、Git、Compose |
| [MySQL](/mysql/) | 数据库部署、备份、调优与排障 |
| [安全运维](/guide/security/legal-boundaries) | 加固、Web 安全、应急响应 |
