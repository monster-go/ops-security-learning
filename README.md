# 运维知识库

> 系统整理 Linux、网络、数据库、容器与安全运维的实战笔记。

## 在线阅读

站点基于 [VitePress](https://vitepress.dev/) 构建，部署后可通过 GitHub Pages 访问：

```
https://<username>.github.io/ops-security-learning/
```

## 本地预览

```bash
git clone <your-repo-url> ops-security-learning
cd ops-security-learning
npm install
npm run docs:dev
```

浏览器打开 `http://localhost:5173/ops-security-learning/` 即可预览。

构建静态站点：

```bash
npm run docs:build
npm run docs:preview
```

## 项目结构

```
ops-security-learning/
├── docs/                    # VitePress 内容根目录
│   ├── index.md             # 知识库首页
│   ├── guide/               # 按主题组织的文档（Linux / 网络 / 自动化 / DevOps / 安全）
│   ├── mysql/               # MySQL 分章教程与实验
│   └── php/                 # PHP 语言与工程化
├── docs/.vitepress/         # VitePress 配置
├── package.json
└── .github/workflows/       # GitHub Pages 自动部署
```

## 内容导航

| 分类 | 入口 |
|------|------|
| 入门 | [实验环境准备](docs/guide/environment.md) |
| Linux | [文件系统与用户权限](docs/guide/linux/filesystem-permissions.md) · [SSH](docs/guide/linux/ssh.md) |
| 网络 | [网络基础](docs/guide/network/network-basics.md) · [端口使用情况](docs/guide/network/port-usage.md) |
| 自动化 | [Bash 脚本与巡检](docs/guide/automation/bash-scripts.md) · [Supervisor](docs/guide/automation/supervisor.md) |
| DevOps | [Docker](docs/guide/devops/docker.md) · [Git](docs/guide/devops/git.md) |
| MySQL | [概览](docs/mysql/index.md) |
| PHP | [概览](docs/php/index.md) · [PSR-4](docs/php/01-psr-4.md) · [Trait](docs/php/02-trait.md) |
| 安全 | [合法边界与实验规范](docs/guide/security/legal-boundaries.md) |

## 合法边界

本知识库包含安全攻防内容，**所有实验必须在授权范围内进行**：

| 可以做 | 不可以做 |
|--------|----------|
| 在自己的虚拟机练习 | 未经授权扫描或攻击真实服务器 |
| 使用 TryHackMe、HackTheBox 等靶场 | 对公网 IP 做渗透测试 |
| 学攻击原理以理解防御 | 将技术用于未授权入侵 |

## 贡献

- 发现错误或过时内容 → 提 Issue 或 PR
- 欢迎往 `docs/guide/`、`docs/mysql/` 或 `docs/php/` 补充文档

---

<p align="center">
  <strong>运维不是背命令，是在服务器出问题时不慌。</strong>
</p>
