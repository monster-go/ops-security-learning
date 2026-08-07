# 监控与 CI/CD 概念

> **适用场景**：理解现代运维工具链、监控体系与持续交付

## 监控三要素

- **Metrics**（指标）：CPU、内存、QPS 等时序数据
- **Logs**（日志）：离散事件记录
- **Traces**（链路）：分布式请求追踪

常用工具：Prometheus + Grafana、ELK Stack

## CI/CD 流程

```
代码提交 → 自动测试 → 自动构建 → 自动部署
```

工具了解：GitHub Actions、GitLab CI、Jenkins

## 动手练习（轻量）

```bash
# 用 docker 快速体验 Grafana
docker run -d -p 3000:3000 grafana/grafana
```

## 实践检查清单

- [ ] 能画出 CI/CD 基本流程图
- [ ] 能解释 Metrics 和 Logs 的区别
- [ ] 知道 Prometheus 和 Grafana 各自的角色

## 延伸阅读

- [Git 完全指南](/guide/devops/git) — 版本控制与 CI/CD 衔接
- [MySQL 监控](/mysql/06-monitoring)
