# 管道与文本过滤

> **适用场景**：从文件或命令输出中筛出关心的行/字段  
> **一句话**：`命令或文件内容` → `|`（管道）→ `过滤工具` → 只留下想要的信息

---

## 核心概念

### 管道 `|`

管道把**左侧命令的标准输出（stdout）**接到**右侧命令的标准输入（stdin）**，形成流水线，不必把中间结果先存成临时文件。

```
左侧命令 stdout  ──|──>  右侧命令 stdin
```

典型形态：

```bash
# 读文件内容，再过滤
cat /var/log/auth.log | grep "Failed password"

# 任意命令的标准输出，再过滤
ss -tlnp | grep 80
ps aux | grep nginx
df -h | grep -E '^/dev'
```

### 过滤常用工具

| 工具 | 作用 |
|------|------|
| `grep` | 按关键字/正则匹配行（最常用） |
| `grep -v` | 排除匹配行 |
| `grep -i` | 忽略大小写 |
| `grep -E` | 扩展正则（或用 `egrep`） |
| `tail` / `head` | 取末尾 / 开头若干行 |
| `awk` / `cut` | 按列/字段切分 |
| `sort` / `uniq` | 排序、去重 |
| `wc -l` | 统计行数 |

---

## 1. 最常见写法：`cat` + `|` + `grep`

```bash
# 从文件里筛出含 "error" 的行
cat /var/log/nginx/error.log | grep error

# 忽略大小写
cat app.log | grep -i timeout

# 排除空行或注释（示例）
cat /etc/ssh/sshd_config | grep -v '^#' | grep -v '^$'
```

**运维场景举例：**

```bash
# 失败登录
cat /var/log/auth.log | grep "Failed password"

# 配置里找某项
cat /etc/mysql/mysql.conf.d/mysqld.cnf | grep port
```

---

## 2. 更好的习惯：能不 `cat` 就不 `cat`

`grep` 本身就能读文件，多一层 `cat` 没有必要：

```bash
# 推荐（少一个进程，意图更清晰）
grep "Failed password" /var/log/auth.log

# 等价但多余
cat /var/log/auth.log | grep "Failed password"
```

**什么时候仍用管道？**

- 左侧是**命令输出**，不是现成文件：`ss -tlnp | grep 443`
- 需要多步处理：`ps aux | grep java | grep -v grep`
- 左侧已是一串管道的结果，继续往下滤

```bash
# 命令输出 → 管道 → 过滤（这里离不开 |）
journalctl -u nginx --since today | grep -i error | tail -20
```

---

## 3. 组合过滤（多级管道）

管道可以串联多个过滤器：

```bash
# 监听端口里找 80，再看进程相关列
ss -tlnp | grep ':80' 

# 磁盘：只看块设备挂载，再取前几行
df -h | grep -E '^/dev' | head -5

# 日志：匹配 → 取最近 10 条 → 统计是否还有
grep "Failed password" /var/log/auth.log | tail -10 | wc -l
```

**从标准输出里抽字段（进阶）：**

```bash
# 取第二列
ps aux | grep nginx | awk '{print $2}'

# 用 cut（适合固定分隔符）
echo "a:b:c" | cut -d: -f2
```

---

## 4. 动手练习

```bash
# 1. 文件内容经管道过滤
cat /etc/passwd | grep bash
# 对比推荐写法：
grep bash /etc/passwd

# 2. 命令输出经管道过滤
ss -tlnp | grep -E ':(22|80|443)\s'
ps aux | grep -E 'sshd|nginx' | grep -v grep

# 3. 多级管道
dmesg 2>/dev/null | grep -i error | tail -5
# 或（无 dmesg 权限时）：
journalctl -k -n 200 | grep -i error | tail -5

# 4. 统计匹配行数
grep -c "Failed password" /var/log/auth.log 2>/dev/null
# 或：
grep "Failed password" /var/log/auth.log 2>/dev/null | wc -l
```

---

## 实践检查清单

- [ ] 能解释 `|`：左侧 stdout → 右侧 stdin
- [ ] 能写出 `命令 | grep 关键字` 与 `cat 文件 | grep 关键字`
- [ ] 知道对文件优先用 `grep 模式 文件`，不必强行 `cat | grep`
- [ ] 能把 `grep` / `tail` / `wc` 串成两到三级管道

---

## 延伸阅读

- [文件系统与用户权限](/guide/linux/filesystem-permissions) — `find` / `grep` 日志检索入门
- [进程管理](/guide/linux/process) — `ps aux | grep` 定位进程
- [端口使用情况](/guide/network/port-usage) — `ss ... | grep` 查端口
- [Bash 脚本与巡检](/guide/automation/bash-scripts) — 巡检脚本里的管道用法
- [日志与故障排查](/guide/network/logging-troubleshooting) — 结合日志做排障
