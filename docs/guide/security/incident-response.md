# 应急响应

> **适用场景**：服务器疑似被入侵时的隔离、分析、清除与恢复

## 应急响应流程

```
1. 隔离：断网或限制访问（保留证据）
2. 保全：备份日志和内存快照
3. 分析：
   - 检查 auth.log 异常登录
   - 检查 authorized_keys
   - 检查 cron / systemd 异常服务
   - 检查异常进程和网络连接
4. 清除：删除后门、修复漏洞
5. 恢复：从干净备份恢复服务
6. 总结：写 incident report，修补防御
```

## 综合演练任务（vm-lab 模拟）

假设 vm-lab 被「入侵」，请完成：

1. 找出攻击者添加的后门用户
2. 找出异常 cron 任务
3. 找出异常 SSH 密钥
4. 修复所有问题并写一份 1 页的事件报告

## 推荐练习

- HackTheBox：完成 1 台 Easy 难度的 retired 机器

## 实践检查清单

- [ ] 能独立完成一次完整的应急响应流程
- [ ] 能撰写简单安全事件报告
- [ ] 能在 HackTheBox 完成 1 台 Easy 机器

## 延伸阅读

- [SSH 完全指南 — 安全场景案例](/guide/linux/ssh)
- [Linux 系统加固](/guide/security/system-hardening)
