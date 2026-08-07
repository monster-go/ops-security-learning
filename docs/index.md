---
layout: home

hero:
  name: 运维知识库
  text: Linux · 网络 · 数据库 · 容器 · 安全
  tagline: 系统整理运维与安全相关的实战笔记，按主题查阅、动手验证
  actions:
    - theme: brand
      text: 开始阅读
      link: /guide/environment
    - theme: alt
      text: MySQL
      link: /mysql/
    - theme: alt
      text: SSH
      link: /guide/linux/ssh

features:
  - icon: 🐧
    title: Linux 系统
    details: 文件权限、软件包与服务、磁盘进程、SSH、crontab
    link: /guide/linux/filesystem-permissions
  - icon: 🌐
    title: 网络与服务
    details: TCP/IP 排障、Nginx 部署、日志分析与故障排查流程
    link: /guide/network/network-basics
  - icon: 🐬
    title: MySQL 运维
    details: 部署加固、备份恢复、性能调优、主从高可用与常见故障
    link: /mysql/
  - icon: 📦
    title: 容器与 DevOps
    details: Docker、Compose、Git、磁盘清理与 CI/CD 概念
    link: /guide/devops/docker
  - icon: 🔒
    title: 安全运维
    details: 系统加固、Web 安全、HTTPS 原理与应急响应
    link: /guide/security/legal-boundaries
  - icon: ⚙️
    title: 自动化
    details: Bash 巡检脚本与 Supervisor 进程守护
    link: /guide/automation/bash-scripts
---

## 合法边界（安全内容必读）

| 可以做 | 不可以做 |
|--------|----------|
| 在自己的虚拟机练习 | 未经授权扫描或攻击真实服务器 |
| 使用 TryHackMe、HackTheBox 等靶场 | 对公网 IP 做渗透测试 |
| 学攻击原理以理解防御 | 将技术用于未授权入侵 |

详细说明见 [合法边界与实验规范](/guide/security/legal-boundaries)。

## 如何使用本知识库

1. **按主题查阅** — 左侧导航按 Linux / 网络 / 数据库 / 安全等分组，可多级展开
2. **动手验证** — 建议在 [本地虚拟机环境](/guide/environment) 中复现文档命令
3. **搜索** — 顶部搜索可直达段落

*发现错误或希望补充？欢迎提 Issue / PR。*
