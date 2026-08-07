import { defineConfig } from 'vitepress'

const sidebar = [
  {
    text: '入门',
    items: [
      { text: '实验环境准备', link: '/guide/environment' },
    ],
  },
  {
    text: 'Linux 系统',
    collapsed: false,
    items: [
      { text: '文件系统与用户权限', link: '/guide/linux/filesystem-permissions' },
      { text: '软件包与服务管理', link: '/guide/linux/package-services' },
      { text: '磁盘与存储', link: '/guide/linux/disk' },
      { text: '进程管理', link: '/guide/linux/process' },
      {
        text: '定时任务',
        collapsed: false,
        items: [
          { text: '概览', link: '/guide/linux/cron' },
          { text: 'crontab', link: '/guide/linux/crontab' },
        ],
      },
      { text: 'SSH', link: '/guide/linux/ssh' },
    ],
  },
  {
    text: '网络与服务',
    collapsed: false,
    items: [
      { text: '网络基础与排障', link: '/guide/network/network-basics' },
      { text: 'Web 服务部署', link: '/guide/network/web-deployment' },
      { text: '日志与故障排查', link: '/guide/network/logging-troubleshooting' },
    ],
  },
  {
    text: '自动化与进程管理',
    collapsed: false,
    items: [
      { text: 'Bash 脚本与巡检', link: '/guide/automation/bash-scripts' },
      { text: 'Supervisor', link: '/guide/automation/supervisor' },
    ],
  },
  {
    text: '容器与 DevOps',
    collapsed: false,
    items: [
      { text: 'Docker 容器入门', link: '/guide/devops/docker' },
      { text: '监控与 CI/CD 概念', link: '/guide/devops/monitoring-cicd' },
      { text: 'Git', link: '/guide/devops/git' },
      { text: 'Docker 磁盘清理', link: '/guide/devops/docker-disk-cleanup' },
      { text: 'Colima / Compose', link: '/guide/devops/colima-compose' },
    ],
  },
  {
    text: '数据库',
    collapsed: false,
    items: [
      {
        text: 'MySQL',
        collapsed: false,
        items: [
          { text: '概览', link: '/mysql/' },
          { text: '跨平台安装与安全配置', link: '/mysql/cross-platform-install' },
          { text: '01 安装与基础', link: '/mysql/01-install-and-basics' },
          { text: '02 用户与安全', link: '/mysql/02-user-and-security' },
          { text: '03 备份与恢复', link: '/mysql/03-backup-and-recovery' },
          { text: '04 性能调优', link: '/mysql/04-performance-tuning' },
          { text: '05 主从与高可用', link: '/mysql/05-replication-and-ha' },
          { text: '06 监控', link: '/mysql/06-monitoring' },
          { text: '07 常见故障', link: '/mysql/07-common-faults' },
          { text: '08 卸载与清理', link: '/mysql/08-uninstall-and-cleanup' },
          {
            text: '动手实验',
            collapsed: true,
            items: [
              { text: 'Lab 01 部署与加固', link: '/mysql/labs/lab-01-deploy-and-harden' },
              { text: 'Lab 02 PITR 恢复', link: '/mysql/labs/lab-02-pitr-recovery' },
              { text: 'Lab 03 主从与切换', link: '/mysql/labs/lab-03-replication-failover' },
            ],
          },
        ],
      },
    ],
  },
  {
    text: '安全运维',
    collapsed: false,
    items: [
      { text: '合法边界与实验规范', link: '/guide/security/legal-boundaries' },
      { text: '信息收集与安全概论', link: '/guide/security/recon-fundamentals' },
      { text: 'Linux 系统加固', link: '/guide/security/system-hardening' },
      { text: 'Web 安全基础', link: '/guide/security/web-security' },
      { text: '密码学与 HTTPS', link: '/guide/security/cryptography-https' },
      { text: '权限提升与防御', link: '/guide/security/privilege-escalation' },
      { text: '应急响应', link: '/guide/security/incident-response' },
    ],
  },
  {
    text: '其他',
    items: [
      { text: '参考资源', link: '/guide/resources' },
    ],
  },
]

export default defineConfig({
  title: '运维知识库',
  description: 'Linux、网络、数据库、容器与安全运维实战笔记',
  lang: 'zh-CN',
  base: '/ops-security-learning/',
  cleanUrls: true,
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '入门', link: '/guide/environment' },
      { text: 'Linux', link: '/guide/linux/filesystem-permissions' },
      { text: 'MySQL', link: '/mysql/' },
      { text: '安全', link: '/guide/security/legal-boundaries' },
      { text: '参考资源', link: '/guide/resources' },
    ],
    search: {
      provider: 'local',
    },
    sidebar,
    socialLinks: [],
    footer: {
      message: '运维知识库 — 系统整理 Linux、网络、数据库、容器与安全运维的实战笔记',
      copyright: 'MIT License',
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    outline: {
      label: '本页目录',
    },
  },
})
