# 信息收集与安全概论

> **适用场景**：建立安全思维，了解合法渗透测试流程（仅在授权靶场实践）

::: warning 合法提醒
以下工具与技巧**仅在 vm-lab 或授权靶场**使用，禁止对未授权目标扫描。
:::

## 核心概念

- 白帽 / 灰帽 / 黑帽的区别
- 渗透测试标准流程：信息收集 → 漏洞扫描 → 漏洞利用 → 提权 → 报告
- OWASP、PTES、MITRE ATT&CK 框架简介
- 信息收集：被动收集 vs 主动扫描

## 工具了解（靶场用）

- **Nmap**：端口扫描、服务识别
- 基本用法：`nmap -sV -sC <target>`

## 推荐练习（TryHackMe）

- Intro to Cyber Security
- Nmap

## 实践检查清单

- [ ] 能描述完整渗透测试流程
- [ ] 能用 Nmap 扫描靶机开放端口
- [ ] 能解释主动扫描的法律风险

## 延伸阅读

- [Linux 系统加固](/guide/security/system-hardening)
- [参考资源](/guide/resources)
