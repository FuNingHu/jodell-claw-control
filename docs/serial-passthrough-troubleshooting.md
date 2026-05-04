# URSim 上把 host USB-RS485 透传到 URCap backend 容器

记录 jodell-claw-control 在 URSim 模拟器上调试时打开 `/dev/ur-ttylink/ttyTool`
报 `[Errno 1] Operation not permitted` 的根因与解决步骤。结论先行：

> **节点挂进去 ≠ 能用**。容器要访问字符设备，必须同时满足
> （1）`/dev/...` 节点出现在容器挂载命名空间，
> （2）该 `major:minor` 在容器的 **device cgroup** 白名单里。
> URCap 框架启动 backend 子容器时 **只做了 (1)，没做 (2)**，被内核 EPERM 拦下。

---

## 1. 错误现象

前端调用 `openMaster('/dev/ur-ttylink/ttyTool', 115200)` 时返回：

```text
[Errno 1] could not open port /dev/ur-ttylink/ttyTool: \
[Errno 1] Operation not permitted: '/dev/ur-ttylink/ttyTool'
```

发生位置在 `jodellControl.py → openMaster()`：

```python
master = modbus_rtu.RtuMaster(
    serial.Serial(port=com, baudrate=int(bau), bytesize=8,
                  parity=serial.PARITY_NONE, stopbits=serial.STOPBITS_ONE))
```

pyserial 调用 `open()` 进内核 → 被 device cgroup 拦截 → 返回 `EPERM (errno 1)`。

---

## 2. 系统拓扑

URSim 在 devcontainer 里以 docker-in-docker 跑，URCap backend 又是 URSim 内嵌
docker daemon 启动的子容器。USB 设备要从 Windows host 走到 backend 容器要穿
**四层**：

```text
Windows host
    │  usbipd-win attach --wsl
    ▼
WSL2 (/dev/ttyUSB0)
    │  docker daemon（运行在 WSL）
    ▼
URSim 容器  (privileged=true)
    │  URSim 内嵌 docker daemon (docker-in-docker)
    ▼
URCap backend 容器  ← 这里被 device cgroup 拦截
```

每一层都需要正确"放行"才能链路打通。

---

## 3. 三种常见误区

| 误区 | 真实情况 |
|---|---|
| `ls -l` 看到 `c 188:0` 字符设备节点就一定能用 | 必须 cgroup 白名单同时放行 |
| docker-compose `volumes:` 透传字符设备等价于 `--device` | **不等价**。`volumes:` 只 bind-mount 节点，不写 cgroup |
| URCap manifest 写了 `devices: type: ttyTool` 就万事大吉 | 真机 OK；URSim（嵌套 docker）里框架不会把 cgroup 规则带到子容器 |

`docker run` 三种透传方式的"待遇"对比：

| 写法 | 创建节点 | 加 cgroup 白名单 |
|---|---|---|
| `volumes: /a:/b`（bind-mount） | ✓ | ✗ |
| `devices: /a:/b`            | ✓ | ✓ |
| `--privileged`              | —（已 mount 即可） | 全部放行 `*:*` |

---

## 4. 排错过程（可复现命令）

### 4.1 第一层：WSL 是否拿到 USB

```bash
# Windows 侧（PowerShell 管理员）
usbipd list
usbipd bind --busid <BUSID> --force        # 仅首次
usbipd attach --wsl --busid <BUSID>

# WSL 侧
ls -l /dev/ttyUSB*
# 期待：crw-rw---- 1 root dialout 188, 0 ...
```

### 4.2 第二层：URSim 容器内 ttyTool 透传

修改 `/ursim-polyscopex-0.18.81/artifacts/runtime/docker-compose.yml`：

```yaml
services:
  runtime:
    image: universalrobots/ursim_polyscopex:0.18.81
    privileged: true
    devices:                                          # 用 devices 而非 volumes
      - "/dev/ttyUSB0:/dev/ur-ttylink/ttyTool"
    volumes:
      - installed-urcaps:/var/urcaps
      ...
```

重启：

```bash
cd /ursim-polyscopex-0.18.81/artifacts/runtime
docker compose down
docker compose up -d
```

进 URSim 容器验证：

```bash
docker exec ursim-polyscopex-runtime-1 \
    ls -l /dev/ur-ttylink/ttyTool
# 期待：crw-rw---- 1 root dialout 188, 0 ...   ← 'c' = character device
```

### 4.3 第三层：URCap backend 子容器（症状显形点）

URCap 框架在 URSim 内启动 backend 子容器，inspect 它：

```bash
docker exec ursim-polyscopex-runtime-1 sh -c "
docker inspect jodell_jodell-claw-control_jodell-claw-control-backend \
       --format '{{json .HostConfig.Devices}} | \
                  {{json .HostConfig.DeviceCgroupRules}} | \
                  {{json .HostConfig.Privileged}}'"
# 输出：null | null | false      ← 没有 cgroup 白名单！
```

ls 仍能看到节点（因为目录被 bind-mount 进来），但 `open()` 直接 EPERM：

```bash
docker exec ursim-polyscopex-runtime-1 sh -c "
docker exec jodell_jodell-claw-control_jodell-claw-control-backend \
       python -c 'import os; os.open(\"/dev/ur-ttylink/ttyTool\", os.O_RDWR)'"
# PermissionError: [Errno 1] Operation not permitted
```

至此根因明确。

---

## 5. 解决方案

### 5.1 临时放权（推荐用于开发期）

cgroup v1 在 URSim 内嵌 docker 中可用。直接往 `devices.allow` 写规则：

```bash
docker exec ursim-polyscopex-runtime-1 sh -c '
CID=$(docker inspect -f "{{.Id}}" jodell_jodell-claw-control_jodell-claw-control-backend)
echo "c 188:* rwm" > /sys/fs/cgroup/devices/docker/$CID/devices.allow
'
```

- `c` = character device
- `188:*` = major 188（USB-serial），所有 minor
- `rwm` = read / write / mknod

写完后立即生效，**不需要重启容器**。前端再次调用 `openMaster` 即可成功。

包成 alias 方便随手用：

```bash
alias unblock-jodell='docker exec ursim-polyscopex-runtime-1 sh -c "
CID=\$(docker inspect -f {{.Id}} jodell_jodell-claw-control_jodell-claw-control-backend)
echo \"c 188:* rwm\" > /sys/fs/cgroup/devices/docker/\$CID/devices.allow && echo backend granted"
'
```

**缺点**：URSim 重启 / URCap 重装 / 容器被重建 → 规则随容器销毁而丢失，需重做。

### 5.2 自动化：仓库自带 setup 脚本（推荐）

仓库已内置 `scripts/setup-jodell-usb.sh`：

```bash
./scripts/setup-jodell-usb.sh
```

它做两件事：

1. **立即放权**：把当前 backend 容器加到 cgroup 白名单
2. **常驻 daemon**：在 URSim 容器内启一个监听进程
   （`/tmp/jodell-cgroup-grant.sh`），订阅 nested docker 的 `start` 事件，
   每次 backend 容器被重建（崩溃重启 / URCap 重装 / 手动 `docker restart`）
   立刻自动重放权。

实现要点（已踩过的坑都规避了）：

- URSim 的 `/tmp` 是 tmpfs，`docker cp` 会写到 overlay 持久层被 tmpfs 屏蔽 →
  改用 `docker exec -i ... sh -c "cat > /tmp/..."` 通过 stdin 管道写入
- `docker exec -d` 启 daemon（detach 模式）比 `nohup ... &` 在嵌套 heredoc
  里稳定
- `docker ps --format '{{.ID}}'` 给短 ID，但 cgroup 路径需要全 ID →
  daemon 内部用 `docker inspect -f '{{.Id}}'` 转换
- 脚本幂等，重复跑不会启第二个 daemon

日志：

```bash
docker exec ursim-polyscopex-runtime-1 tail -f /tmp/jodell-cgroup-grant.log
```

#### 三层重启如何应对

| 场景 | 应对 |
|---|---|
| backend 容器自重建 | daemon 自动放权，无需操作 |
| URSim `compose down/up` | URSim 重启清空 daemon → 重跑 `./scripts/setup-jodell-usb.sh` |
| WSL 重启 | usbipd attach 失效 → Windows 侧 `usbipd attach --wsl --busid <ID>`，再跑 setup 脚本 |
| Windows 重启 | 用 `usbipd attach --wsl --busid <ID> --auto-attach` 持久化；URSim 自启后跑一次 setup |

#### 集成方式

最便利的写法是包到 URSim 启动命令后：

```bash
./run-simulator ... up && \
  /workspaces/polyscopex-0.20.37/jodell-claw-control/scripts/setup-jodell-usb.sh
```

### 5.3 绕开 device cgroup：socat 把串口暴露成 TCP

backend 容器只 open socket 不碰字符设备，cgroup 完全无关。开发期非常省心。

URSim 容器里跑 socat（一次性）：

```bash
docker exec -d ursim-polyscopex-runtime-1 sh -c '
which socat || apk add socat
nohup socat -d TCP-LISTEN:5400,reuseaddr,fork \
              FILE:/dev/ur-ttylink/ttyTool,raw,echo=0,b115200 \
       >/tmp/socat.log 2>&1 &
'
```

后端代码改 `openMaster` 兼容 socket URL：

```python
# jodellControl.py
def openMaster(com, bau):
    try:
        global master, connectState
        port = serial.serial_for_url(
            com, baudrate=int(bau),
            bytesize=8, parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
        )
        master = modbus_rtu.RtuMaster(port)
        master.set_timeout(1.0)
        master.set_verbose(True)
        connectState = "true"
        return "OK"
    except Exception as exc:
        return str(exc)
```

前端调用：

- 开发期 → `openMaster('socket://host.docker.internal:5400', 115200)`
- 真机部署 → `openMaster('/dev/ur-ttylink/ttyTool', 115200)`

代码完全兼容两种部署。

### 5.4 真机部署：什么也不用做

真 UR 机器人 host 系统的 cgroup 没有限制 `ttyTool`，URCap 框架启动 backend
容器时拿到的就是可读写的字符设备。本文档涉及的所有操作仅针对 URSim 仿真环境。

---

## 6. 调试三件套（备查）

### 6.1 检查节点是不是字符设备

```bash
ls -l /dev/ur-ttylink/ttyTool
# 第一列首字符 'c' = character device，'-' = 普通文件（bind-mount 失败常见）
```

### 6.2 检查 device cgroup 白名单

```bash
docker exec <ursim-name> sh -c '
CID=$(docker inspect -f "{{.Id}}" <backend-name>)
cat /sys/fs/cgroup/devices/docker/$CID/devices.list
'
```

**没有 `c 188:* ...` 那行就是被拦了。**

### 6.3 直接 open 探测（绕开 pyserial 错误信息包装）

```bash
docker exec <backend-name> python -c "
import os, errno
try:
    fd = os.open('/dev/ur-ttylink/ttyTool', os.O_RDWR | os.O_NOCTTY)
    print('open ok fd=', fd); os.close(fd)
except OSError as e:
    print('errno=%d %s' % (e.errno, errno.errorcode[e.errno]))
"
# 期待 errno=1 EPERM 或 'open ok'
```

---

## 7. 关键参考

- Linux device cgroup v1：`Documentation/admin-guide/cgroup-v1/devices.rst`
- Docker 文档「Runtime privilege and Linux capabilities」 `--device-cgroup-rule`
- usbipd-win：<https://github.com/dorssel/usbipd-win>
- PolyScope X URCap manifest spec：本仓库 `manifest-spec-19.10.31.json`

---

## 8. 修订记录

- **2026-05-04** 初版。
  根因定位为 URCap 框架在 URSim 嵌套 docker 中未给 backend 容器添加
  `c 188:* rwm` device cgroup 规则。临时方案 / 自动化方案 / socat-TCP 方案
  各列出，开发期推荐临时放权或 socat-TCP，真机部署不受影响。
