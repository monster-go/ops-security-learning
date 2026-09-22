# 🐘 PHP 语言指南

> **面向对象**：有 Linux 基础、接触过 PHP 或 Web 开发的运维/开发人员。  
> **定位**：PHP 语言与工程化实践的速查与深入讲解——从规范到可落地的项目结构。  
> **适用场景**：阅读/维护 PHP 项目、Composer 依赖管理、排查类加载问题

---

## 阅读方式

本文档是 PHP 教程的**目录页**。每节给出核心概要 + 指向下方 `php/` 目录对应文件的完整讲解链接。

### 概览

```
┌─────────────────────────────────────────────────────────────┐
│                    PHP 工程化学习路径                        │
├─────────────────────────────────────────────────────────────┤
│  PSR-4 自动加载 ──→ Trait 代码复用 ──→ Laravel Facade     │
│        │                    │                  │              │
│        └── 命名空间映射 ────┴── 类组合 ──→ 服务容器与代理   │
└─────────────────────────────────────────────────────────────┘
```

---

## 章节索引

### 1️⃣ [PSR-4 自动加载](/php/01-psr-4)

PSR-4 是 PHP 社区最广泛采用的类自动加载标准。它定义了**命名空间前缀**与**文件系统目录**之间的映射规则，是 Composer、`autoload` 以及现代 PHP 框架的基石。

**核心概念速记：**
```
命名空间 App\Controller
     ↓  映射前缀 App\ → src/
文件路径 src/Controller/UserController.php
```

**更多内容 →** [`php/01-psr-4.md`](/php/01-psr-4)

---

### 2️⃣ [Trait](/php/02-trait)

Trait 是 PHP 在单继承模型下的**水平代码复用**机制。通过 `use` 将一组方法「混入」类中，解决多类共享逻辑又无法共用父类的问题；Laravel 的 `SoftDeletes`、`HasFactory` 等均为典型应用。

**核心概念速记：**
```php
trait Loggable { public function log($msg) { /* ... */ } }

class UserService {
    use Loggable;  // 混入 log() 方法
}
```

**更多内容 →** [`php/02-trait.md`](/php/02-trait)

---

### 3️⃣ [Laravel Facade](/php/03-facade)

Laravel Facade 为服务容器中的对象提供简洁的“静态”调用入口。教程沿着**服务注册 → 容器解析 → 静态代理**的主线，讲清 Facade 与匿名函数、闭包、Service Provider 和 `__callStatic()` 的关系。

**核心调用链：**

```text
Payment::charge()
  → Facade::__callStatic()
  → getFacadeAccessor()
  → 服务容器解析对象
  → PaymentService->charge()
```

**更多内容 →** [`php/03-facade.md`](/php/03-facade)

---

## 参考资源

| 资源 | 说明 |
|------|------|
| [PSR-4 官方规范](https://www.php-fig.org/psr/psr-4/) | PHP-FIG 标准原文 |
| [Composer 文档](https://getcomposer.org/doc/) | 依赖管理与 autoload 配置 |
| [PHP 官方手册 — Trait](https://www.php.net/manual/zh/language.oop5.traits.php) | Trait 语言参考 |
| [Laravel 12.x — Facades](https://laravel.com/docs/12.x/facades) | Facade 原理、使用与测试 |
| [Laravel 12.x — Service Container](https://laravel.com/docs/12.x/container) | 服务注册、解析与生命周期 |
| [PHP 官方手册](https://www.php.net/manual/zh/) | 语言参考 |

---

*发现错误或希望补充？欢迎提 Issue / PR。*
