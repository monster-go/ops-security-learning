# 03 — Laravel Facade

> 对应 [PHP 概览](/php/) 第 3 节  
> **适用版本**：Laravel 11 / 12（核心机制在较早版本中也基本一致）

---

## 3.1 Facade 是什么

Laravel Facade 为服务容器中的对象提供一个简洁的“静态”调用入口：

```php
use Illuminate\Support\Facades\Cache;

Cache::put('server:status', 'healthy', 60);
```

这段代码看起来像调用 `Cache` 类的静态方法，但 `put()` 并不是普通静态方法。Laravel 会将调用转发给服务容器中的缓存对象。

核心链路：

```text
Cache::put(...)
    ↓
Facade::__callStatic()
    ↓
getFacadeAccessor() 返回容器绑定键
    ↓
服务容器解析出真实对象
    ↓
调用真实对象的 put(...)
```

因此，Laravel Facade 可以理解为：

> **服务容器中某个对象的静态代理入口。**

它不是把业务逻辑都写进静态类，也不是通过 `new Facade()` 创建实例。

---

## 3.2 涉及哪些前置知识

理解 Laravel Facade，需要先知道以下概念：

1. **类与接口**：业务服务通常由类实现，也可以通过接口约束。
2. **服务容器**：保存“抽象类型或名称应该如何解析为对象”的规则。
3. **服务提供者**：应用启动时集中注册容器绑定。
4. **匿名函数与闭包**：可作为容器创建对象的工厂。
5. **静态方法与 `__callStatic()`**：Facade 用魔术方法拦截静态调用。
6. **依赖注入**：Facade 与构造器注入都能取得容器中的服务，但依赖可见性不同。

其中最重要的主线是：

```text
注册（register）→ 解析（resolve）→ 调用（call）
```

---

## 3.3 Facade 涉及“类的注册”吗

**通常涉及，但不是所有类都必须手动注册。**

Laravel 的服务容器能够通过反射自动解析没有接口依赖的具体类：

```php
final class ExchangeRateService
{
    public function convert(float $amount): float
    {
        return $amount * 7.2;
    }
}

// 即使没有提前 bind，也能解析简单的具体类
$service = app(ExchangeRateService::class);
```

以下情况通常需要显式注册：

- 接口需要指定实现类；
- 构造对象需要读取配置或执行自定义逻辑；
- 希望整个请求或进程复用同一个实例；
- 使用字符串作为 Facade accessor；
- 第三方 SDK 的构造过程需要集中管理。

服务通常在 Service Provider 的 `register()` 方法中注册：

```php
namespace App\Providers;

use App\Services\PaymentService;
use Illuminate\Support\ServiceProvider;

final class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton('payment', function ($app) {
            return new PaymentService(
                apiKey: config('services.payment.key'),
            );
        });
    }
}
```

这里完成了两件事：

1. 将容器键 `payment` 与对象创建规则绑定；
2. 指定该服务以 singleton 生命周期解析。

> `register()` 应主要用于注册容器绑定。依赖其他服务完成的启动工作通常放在 Provider 的 `boot()` 中。

在 Laravel 11 / 12 中，自定义 Provider 位于 `app/Providers/`，并由 `bootstrap/providers.php` 加载。使用 `php artisan make:provider PaymentServiceProvider` 创建时，Laravel 会为应用注册该 Provider；手动创建时需确认它已列入该文件。

---

## 3.4 注册为什么会出现匿名函数和闭包

### 匿名函数

没有函数名的函数称为匿名函数：

```php
$factory = function () {
    return new PaymentService('demo-key');
};
```

在 PHP 中，匿名函数会产生一个 `Closure` 对象：

```php
var_dump($factory instanceof \Closure); // true
```

所以在日常 PHP / Laravel 语境中，“匿名函数”和“闭包”经常指同一段代码。更精确地说：

- **匿名函数**描述“没有名字”；
- **闭包**强调函数可以保存其定义环境，并且在 PHP 中对应 `Closure` 对象。

### 捕获外部变量

普通匿名函数通过 `use` 捕获外部变量：

```php
$apiKey = 'demo-key';

$factory = function () use ($apiKey) {
    return new PaymentService($apiKey);
};
```

箭头函数会自动按值捕获外部变量：

```php
$factory = fn () => new PaymentService($apiKey);
```

### 闭包在容器中的作用

传给容器的闭包是一个**对象工厂**：

```php
$this->app->singleton('payment', function ($app) {
    return new PaymentService(
        apiKey: $app['config']['services.payment.key'],
    );
});
```

注册时，容器先保存闭包；真正解析 `payment` 时，再调用闭包创建对象。

```text
注册阶段：保存 Closure
解析阶段：执行 Closure → 创建 PaymentService
后续调用：Facade 将方法转发给 PaymentService
```

### Facade 必须使用闭包吗

**不必须。闭包只是服务注册的一种常见方式。**

接口可以直接绑定到实现类：

```php
use App\Contracts\PaymentGateway;
use App\Services\StripePaymentService;

$this->app->bind(
    PaymentGateway::class,
    StripePaymentService::class,
);
```

也可以直接放入一个已经创建好的实例：

```php
$service = new PaymentService('demo-key');

$this->app->instance(PaymentService::class, $service);
```

简单具体类还可能依靠自动解析，完全不写绑定：

```php
$service = app(ExchangeRateService::class);
```

结论：

> Facade 依赖的是“容器能够解析出对象”，而不是“必须用闭包注册对象”。

---

## 3.5 bind、singleton、scoped 与 instance

### bind：每次解析创建新对象

```php
$this->app->bind(PaymentGateway::class, function ($app) {
    return new PaymentService(config('services.payment.key'));
});
```

连续解析通常得到不同对象：

```php
$a = app(PaymentGateway::class);
$b = app(PaymentGateway::class);

var_dump($a === $b); // false
```

适合无状态、创建成本低，且不需要共享实例的服务。

### singleton：首次解析后复用

```php
$this->app->singleton(PaymentGateway::class, function ($app) {
    return new PaymentService(config('services.payment.key'));
});
```

同一应用生命周期内重复解析返回同一个对象：

```php
$a = app(PaymentGateway::class);
$b = app(PaymentGateway::class);

var_dump($a === $b); // true
```

适合 SDK 客户端、连接管理器或创建成本较高的无请求状态服务。

### scoped：每个生命周期复用

```php
$this->app->scoped(RequestTrace::class, function ($app) {
    return new RequestTrace();
});
```

`scoped` 在一次请求或一次 Laravel Octane / Queue Worker 作业生命周期内复用，进入新生命周期后会清空。这能避免长驻进程把上一次请求的状态泄漏给下一次请求。

### instance：注册已有对象

```php
$client = new PaymentService('demo-key');

$this->app->instance(PaymentGateway::class, $client);
```

容器直接返回传入的对象，不再负责调用工厂创建它。

### 如何选择

| 方式 | 创建时机 | 是否复用 | 常见用途 |
|------|----------|----------|----------|
| `bind` | 每次解析 | 否 | 普通无状态服务 |
| `singleton` | 第一次解析 | 整个应用生命周期 | SDK、共享服务 |
| `scoped` | 每个作用域第一次解析 | 当前请求/作业 | 带请求状态的服务 |
| `instance` | 注册前已创建 | 始终返回该对象 | 外部创建的实例、测试替身 |

---

## 3.6 从零创建一个 Laravel Facade

下面创建一个支付服务 Facade。

### 第一步：定义接口

`app/Contracts/PaymentGateway.php`：

```php
<?php

namespace App\Contracts;

interface PaymentGateway
{
    public function charge(int $amountInCents): string;
}
```

### 第二步：实现服务

`app/Services/PaymentService.php`：

```php
<?php

namespace App\Services;

use App\Contracts\PaymentGateway;

final class PaymentService implements PaymentGateway
{
    public function __construct(
        private readonly string $apiKey,
    ) {
    }

    public function charge(int $amountInCents): string
    {
        // 实际项目在这里调用支付 SDK。
        return "charged:{$amountInCents}";
    }
}
```

### 第三步：在 Service Provider 中注册

`app/Providers/PaymentServiceProvider.php`：

```php
<?php

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Services\PaymentService;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;

final class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            PaymentGateway::class,
            function (Application $app): PaymentGateway {
                return new PaymentService(
                    apiKey: (string) $app['config']['services.payment.key'],
                );
            },
        );
    }
}
```

如果 Provider 不是通过 Artisan 创建，确认 `bootstrap/providers.php` 包含：

```php
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\PaymentServiceProvider::class,
];
```

### 第四步：创建 Facade 类

`app/Facades/Payment.php`：

```php
<?php

namespace App\Facades;

use App\Contracts\PaymentGateway;
use Illuminate\Support\Facades\Facade;

/**
 * @method static string charge(int $amountInCents)
 *
 * @see PaymentGateway
 */
final class Payment extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return PaymentGateway::class;
    }
}
```

`getFacadeAccessor()` 返回的值必须与容器注册时使用的键一致：

```text
注册键：PaymentGateway::class
                ↑ 必须一致
accessor：PaymentGateway::class
```

### 第五步：调用

```php
use App\Facades\Payment;

$transactionId = Payment::charge(1999);
```

执行时 Laravel 从容器解析 `PaymentGateway::class`，得到 `PaymentService`，再调用其实例方法 `charge()`。

不需要在 Facade 类中重复实现：

```php
// 不需要这样写
public static function charge(int $amount): string
{
    // ...
}
```

Facade 基类的 `__callStatic()` 会完成转发。

---

## 3.7 `__callStatic()` 如何完成转发

当代码调用不存在或不可访问的静态方法时，PHP 会触发：

```php
public static function __callStatic(string $name, array $arguments): mixed
```

Laravel Facade 的核心逻辑可以简化为：

```php
abstract class Facade
{
    protected static function getFacadeAccessor(): string
    {
        throw new RuntimeException('Facade accessor not defined.');
    }

    public static function __callStatic(
        string $method,
        array $arguments,
    ): mixed {
        $accessor = static::getFacadeAccessor();
        $instance = app($accessor);

        return $instance->{$method}(...$arguments);
    }
}
```

真实 Laravel 实现还会：

- 检查 Facade 根对象是否存在；
- 缓存已解析的 Facade 实例；
- 支持替换、清除和测试 Mock；
- 通过 Facade Application 解析容器绑定。

因此：

```php
Payment::charge(1999);
```

概念上近似：

```php
$payment = app(PaymentGateway::class);
$payment->charge(1999);
```

---

## 3.8 字符串 accessor 与类名 accessor

Laravel 内置 Facade 常使用字符串键。例如 `Cache` Facade 的 accessor 对应容器中的缓存绑定。

自定义 Facade 也可以使用字符串：

```php
// Provider
$this->app->singleton('payment', function ($app) {
    return new PaymentService(
        config('services.payment.key'),
    );
});

// Facade
protected static function getFacadeAccessor(): string
{
    return 'payment';
}
```

也可以使用接口类名：

```php
protected static function getFacadeAccessor(): string
{
    return PaymentGateway::class;
}
```

自定义代码通常优先使用接口或类的 FQCN（完全限定类名），因为：

- IDE 更容易跳转；
- 重构类名时更安全；
- 不易与其他字符串绑定键冲突；
- 能直接用于构造器类型提示。

---

## 3.9 Facade 缓存与长驻进程

Facade 默认会缓存已经解析出的根实例。多数传统 PHP-FPM 请求中，每个请求结束后进程状态会按框架生命周期处理，不容易感知差异。

在测试、Laravel Octane 或其他长驻进程场景中，需要注意：

- 不要把当前用户、Request 等请求状态放进普通 singleton；
- 请求级状态优先使用 `scoped`；
- 测试替换绑定后，必要时清除 Facade 已解析实例；
- 修改容器绑定后若仍调用到旧对象，检查 Facade 缓存。

清除某个 Facade 缓存：

```php
Payment::clearResolvedInstance(PaymentGateway::class);
```

清除所有 Facade 已解析实例：

```php
\Illuminate\Support\Facades\Facade::clearResolvedInstances();
```

---

## 3.10 测试 Facade

Laravel Facade 比普通静态工具类更容易测试，因为实际对象仍来自服务容器。

```php
use App\Facades\Payment;

test('creates an order after charging payment', function () {
    Payment::shouldReceive('charge')
        ->once()
        ->with(1999)
        ->andReturn('tx-demo');

    $response = $this->post('/orders', [
        'amount' => 1999,
    ]);

    $response->assertSuccessful();
});
```

`shouldReceive()` 会为底层服务创建测试替身，而不是实际调用支付接口。

也可以直接向容器注册 Mock / Fake：

```php
$fake = Mockery::mock(PaymentGateway::class);
$fake->shouldReceive('charge')->andReturn('tx-fake');

$this->app->instance(PaymentGateway::class, $fake);
Payment::clearResolvedInstance(PaymentGateway::class);
```

若项目不方便依赖 Facade，构造器注入依然是清晰的测试方式：

```php
final class CreateOrder
{
    public function __construct(
        private readonly PaymentGateway $payment,
    ) {
    }
}
```

---

## 3.11 Real-Time Facade

Real-Time Facade 可以为普通类临时提供 Facade 风格调用，不需要手写 Facade 类：

```php
use Facades\App\Services\Publisher;

Publisher::publish($article);
```

关键是导入类时在原命名空间前加 `Facades\`。Laravel 会根据后面的类名从容器解析对象并代理调用。

测试方式与普通 Facade 类似：

```php
use Facades\App\Services\Publisher;

Publisher::shouldReceive('publish')
    ->once();
```

Real-Time Facade 能减少样板代码，但会进一步隐藏依赖。团队项目中应统一规范，避免代码里到处出现无法从构造器看出的依赖。

---

## 3.12 Facade 与构造器注入怎么选

### 适合 Facade

- Laravel 框架基础能力，如 Cache、Log、DB、Queue；
- 调用简短且依赖关系容易理解；
- Laravel 风格的应用层代码；
- 需要使用 Laravel 提供的 Facade Fake / Mock。

### 优先构造器注入

- 核心领域服务；
- 类依赖较多，需要一眼看清依赖；
- 希望代码脱离 Laravel 运行；
- 希望静态分析工具准确检查类型；
- 服务有明确生命周期或需要多个不同实例。

以下代码很方便：

```php
Payment::charge(1999);
```

但类签名看不出它依赖支付服务。构造器注入则将依赖明确写出来：

```php
public function __construct(
    private readonly PaymentGateway $payment,
) {
}
```

建议：

> 框架外围能力可以使用 Facade；核心业务依赖优先考虑接口 + 构造器注入。

---

## 3.13 常见问题排查

### `A facade root has not been set`

常见原因：

- 在 Laravel 应用启动前调用 Facade；
- 在纯 PHP 脚本中只加载了类，却没有启动 Laravel 容器；
- 单元测试没有正确引导 Laravel Application。

### `Target class [xxx] does not exist`

检查：

1. Provider 是否注册；
2. `bootstrap/providers.php` 是否加载该 Provider；
3. accessor 与绑定键是否完全一致；
4. 类命名空间和 Composer PSR-4 路径是否正确；
5. 必要时执行 `composer dump-autoload`。

### `Call to undefined method ...`

Facade 已解析到对象，但底层对象没有该方法。检查：

- 方法拼写；
- 容器是否绑定了错误实现；
- 接口和实现是否同步；
- Facade DocBlock 只用于 IDE 提示，不会真正创建方法。

### 修改绑定后仍得到旧对象

可能是 singleton 或 Facade 已缓存旧实例：

```php
Payment::clearResolvedInstance(PaymentGateway::class);
```

测试中还可以重新 `instance()` 一个 Fake，并清理 Facade 缓存。

---

## 3.14 完整调用关系回顾

```text
PaymentServiceProvider::register()
    │
    └─ singleton(PaymentGateway::class, Closure)
                    │
                    ▼
              Service Container
                    ▲
                    │ getFacadeAccessor()
             App\Facades\Payment
                    ▲
                    │ Payment::charge(1999)
                 调用方

解析后：

Payment::__callStatic('charge', [1999])
    → app(PaymentGateway::class)
    → 执行 Closure（首次解析）
    → 得到 PaymentService
    → PaymentService->charge(1999)
```

最关键的三个对应关系：

1. Provider 的**绑定键**；
2. Facade 的 **accessor**；
3. 绑定最终返回的**真实服务对象**。

三者对上，Facade 才能正确工作。

---

## 3.15 小结

1. Laravel Facade 是服务容器对象的**静态代理**，不是传统静态工具类。
2. Facade 通常涉及服务注册，但简单具体类也可以由容器自动解析。
3. 匿名函数在 PHP 中是 `Closure` 对象，可作为容器的对象工厂。
4. 闭包不是 Facade 的必要条件；接口到实现类绑定、`instance()` 和自动解析都可以不使用闭包。
5. `getFacadeAccessor()` 必须返回正确的容器绑定键。
6. `__callStatic()` 负责把静态调用转发到底层实例方法。
7. 核心业务应权衡 Facade 的便利性与构造器注入的依赖透明度。

---

## 参考资源

- [Laravel 12.x — Facades](https://laravel.com/docs/12.x/facades)
- [Laravel 12.x — Service Container](https://laravel.com/docs/12.x/container)
- [Laravel 12.x — Service Providers](https://laravel.com/docs/12.x/providers)
- [PHP 手册 — 魔术方法](https://www.php.net/manual/zh/language.oop5.magic.php)
- [PHP 手册 — 匿名函数](https://www.php.net/manual/zh/functions.anonymous.php)

---

[← 上一篇：Trait](/php/02-trait) · [返回 PHP 概览](/php/)
