# 02 — Trait

> 对应 [PHP 概览](/php/) 第 2 节

---

## 2.1 为什么需要 Trait

PHP 类**只支持单继承**——一个类只能 `extends` 一个父类。但实际开发中常遇到「多个类需要共享同一组方法」的场景：

| 方案 | 局限 |
|------|------|
| 复制粘贴方法 | 重复代码，难以维护 |
| 抽父类 | 单继承链只能选一个父类，且「is-a」关系可能不成立 |
| 接口（interface） | 只定义契约，不能带实现 |

**Trait**（PHP 5.4+）是一种代码复用机制：像「可插拔的能力模块」，可被多个类 `use`，弥补单继承的不足。

> Trait 不是类，也不能单独实例化；它是**编译时复制**到使用它的类中的方法集合。

---

## 2.2 基本语法

### 定义与使用

```php
<?php

trait Loggable
{
    public function log(string $message): void
    {
        echo '[' . date('Y-m-d H:i:s') . "] {$message}\n";
    }
}

class UserService
{
    use Loggable;

    public function createUser(string $name): void
    {
        // ...
        $this->log("User created: {$name}");
    }
}

class OrderService
{
    use Loggable;

    public function placeOrder(int $orderId): void
    {
        // ...
        $this->log("Order placed: {$orderId}");
    }
}
```

`use Loggable` 会把 `Loggable` 中的方法和属性「混入」当前类，调用时与普通方法无异：`$this->log(...)`。

### 一个类使用多个 Trait

```php
trait Timestampable
{
    public function touch(): void
    {
        $this->updatedAt = time();
    }
}

class Article
{
    use Loggable, Timestampable;
}
```

---

## 2.3 冲突解决：insteadof 与 as

当两个 Trait 定义了**同名方法**时，会产生冲突，必须显式指定：

```php
trait A
{
    public function greet(): string
    {
        return 'Hello from A';
    }
}

trait B
{
    public function greet(): string
    {
        return 'Hello from B';
    }
}

class Person
{
    use A, B {
        B::greet insteadof A;   // 使用 B 的实现，覆盖 A
        A::greet as greetFromA; // 将 A 的实现另起别名保留
    }
}

$p = new Person();
echo $p->greet();       // Hello from B
echo $p->greetFromA();  // Hello from A
```

| 关键字 | 作用 |
|--------|------|
| `insteadof` | 指定同名方法以哪个 Trait 为准 |
| `as` | 给某个实现起别名，可同时保留多个版本 |

### 修改可见性

`as` 还可用于调整方法的访问级别：

```php
class ApiController
{
    use Loggable {
        Loggable::log as private writeLog;
    }
}
```

外部只能调用 `log` 的公开接口（若仍存在），或将原方法私有化后仅内部使用 `writeLog`。

---

## 2.4 Trait 中的属性与方法

Trait 可以包含属性、普通方法、静态方法、抽象方法，以及（PHP 8.2+）常量。

```php
trait HasUuid
{
    protected string $uuid;

    public function getUuid(): string
    {
        return $this->uuid;
    }

    protected function initUuid(): void
    {
        $this->uuid = bin2hex(random_bytes(16));
    }
}
```

**注意：** 若多个 Trait 或类与 Trait 定义了**同名属性**，且默认值/可见性不兼容，会触发 fatal error。设计 Trait 时尽量用「方法封装属性」，或约定唯一的属性名前缀。

### 抽象方法

Trait 可以声明抽象方法，**使用该 Trait 的类必须实现**：

```php
trait Notifiable
{
    abstract protected function getRecipient(): string;

    public function notify(string $body): void
    {
        $to = $this->getRecipient();
        // 发送逻辑...
    }
}

class User
{
    use Notifiable;

    protected function getRecipient(): string
    {
        return $this->email;
    }
}
```

---

## 2.5 Trait 嵌套

Trait 可以 `use` 其他 Trait，形成组合：

```php
trait SoftDeletes
{
    use Loggable;

    protected ?int $deletedAt = null;

    public function delete(): void
    {
        $this->deletedAt = time();
        $this->log('Soft deleted');
    }
}

class Post
{
    use SoftDeletes; // 间接拥有 Loggable::log
}
```

---

## 2.6 Trait vs 继承 vs 接口

| 机制 | 关系 | 能否带实现 | 数量限制 |
|------|------|-----------|---------|
| **extends（继承）** | is-a，父子类 | 可以 | 单继承 |
| **implements（接口）** | can-do，契约 | 不可以（PHP 8+ 可有默认实现需 interface） | 多实现 |
| **use（Trait）** | 水平复用能力 | 可以 | 多个 Trait |

**选用原则：**

- 表达「是什么」→ 继承 + 接口
- 表达「能做什么、复用一段实现」→ Trait
- Laravel 中常见：`SoftDeletes`、`HasFactory`、`Authorizable` 等都是 Trait 模式

---

## 2.7 框架中的典型用法

### Laravel Eloquent

```php
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Model
{
    use SoftDeletes;
}
```

`SoftDeletes` 为模型注入 `deleted_at` 字段处理、`restore()`、`forceDelete()` 等方法，无需每个模型重复实现。

### 自定义 Trait 示例（运维/API 场景）

```php
trait RespondsJson
{
    protected function success(mixed $data, int $code = 200): array
    {
        return ['ok' => true, 'data' => $data, 'code' => $code];
    }

    protected function error(string $message, int $code = 400): array
    {
        return ['ok' => false, 'message' => $message, 'code' => $code];
    }
}

class HealthCheckController
{
    use RespondsJson;

    public function ping(): array
    {
        return $this->success(['status' => 'up']);
    }
}
```

多个 Controller 复用统一 JSON 结构，又不强制它们继承同一基类。

---

## 2.8 水平优先顺序（冲突时的查找规则）

当 Trait 方法与父类方法同名时：

```php
class Base
{
    public function run(): string
    {
        return 'base';
    }
}

trait Runner
{
    public function run(): string
    {
        return 'trait';
    }
}

class Worker extends Base
{
    use Runner;
}

$w = new Worker();
echo $w->run(); // trait — Trait 方法覆盖父类同名方法
```

**优先级（从高到低）：** 类自身定义 > Trait > 父类。

阅读他人代码时，若行为与预期不符，先查类内是否 `use` 了 Trait 并覆盖了父类方法。

---

## 2.9 常见陷阱与最佳实践

| 陷阱 | 说明 | 建议 |
|------|------|------|
| Trait 滥用 | 一个类 `use` 七八个 Trait，职责不清 | 按能力拆分，保持每个 Trait 单一职责 |
| 隐式依赖 | Trait 方法里用了 `$this->foo`，但类未定义该属性 | Trait 文档注明依赖；或用抽象方法/接口约束 |
| 同名冲突 | 多 Trait 同名方法未写 `insteadof` | 编译期即报错，按提示解决 |
| 测试困难 | Trait 逻辑与类强耦合 | 复杂逻辑抽到独立类，Trait 只做薄封装 |
| 伪装继承 | 用 Trait 堆出深层「伪继承树」 | Trait 用于组合能力，类层次仍用 extends 表达 |

**命名建议：** Trait 名用形容词或能力名，如 `Loggable`、`Cacheable`、`HasTimestamps`，避免与类名混淆。

---

## 2.10 小结

1. **Trait = 可复用的方法/属性模块**，通过 `use` 混入类，不能实例化
2. **单继承 + 多 Trait** 是 PHP 组合能力的主流写法
3. 同名方法冲突用 **`insteadof`** 选择实现，用 **`as`** 起别名或改可见性
4. Trait 可含抽象方法，**使用它的类负责实现**
5. 与继承、接口配合使用，而非替代——Trait 解决「代码复用」，继承表达「类型关系」，接口表达「契约」

---

[← 上一篇：PSR-4 自动加载](/php/01-psr-4) · [返回 PHP 概览](/php/)
