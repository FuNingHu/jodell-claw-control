#!/usr/bin/env bash
# setup-jodell-usb.sh
#
# 给 URSim 内嵌 docker 中运行的 jodell-claw-control-backend 容器
# 添加 USB-serial (major 188) 的 device cgroup 白名单，让它能 open
# /dev/ur-ttylink/ttyTool。
#
# 行为：
#   1. 等 URSim 容器就绪
#   2. 等 jodell backend 容器出现，立即放权
#   3. 在 URSim 内启一个常驻 daemon 监听 docker events，
#      后续 backend 容器被重建会自动重放权
#
# 用法：
#   ./scripts/setup-jodell-usb.sh                # 默认参数即可
#   URSIM_NAME=ursim-polyscopex-runtime-1 ./scripts/setup-jodell-usb.sh
#
# 退出码：
#   0  setup 成功
#   1  URSim 容器未运行
#   2  USB-serial 主设备号探测失败
#
# 注意：这只针对 URSim 仿真环境的开发期使用，真机不需要。

set -euo pipefail

URSIM_NAME="${URSIM_NAME:-ursim-polyscopex-runtime-1}"
BACKEND_FILTER="${BACKEND_FILTER:-jodell-claw-control-backend}"
USB_MAJOR="${USB_MAJOR:-188}"   # ttyUSB driver major number, see /proc/devices

log() { printf '[setup-jodell-usb] %s\n' "$*"; }

# ----------------------------------------------------------------------------
# 1. 等 URSim 容器就绪
# ----------------------------------------------------------------------------
log "waiting for URSim container '$URSIM_NAME' ..."
for i in $(seq 1 60); do
    if docker inspect -f '{{.State.Running}}' "$URSIM_NAME" 2>/dev/null | grep -q true; then
        log "URSim container is up"
        break
    fi
    sleep 1
done
if ! docker inspect -f '{{.State.Running}}' "$URSIM_NAME" 2>/dev/null | grep -q true; then
    log "ERROR: URSim container '$URSIM_NAME' not running"
    exit 1
fi

# ----------------------------------------------------------------------------
# 2. 在 URSim 内安装监听 daemon（幂等）
# ----------------------------------------------------------------------------
# 流程：
#   a. 在 host 写一个 daemon 脚本到本地 tmp
#   b. docker cp 拷进 URSim:/tmp/
#   c. docker exec -d 后台启动（detach 模式比 nohup 嵌套 heredoc 稳）
DAEMON_SRC=$(mktemp)
trap 'rm -f "$DAEMON_SRC"' EXIT
cat >"$DAEMON_SRC" <<EOF
#!/bin/sh
USB_MAJOR="$USB_MAJOR"
FILTER="$BACKEND_FILTER"
LOG=/tmp/jodell-cgroup-grant.log

grant() {
    NAME_OR_ID="\$1"
    CID=\$(docker inspect -f '{{.Id}}' "\$NAME_OR_ID" 2>/dev/null)
    [ -z "\$CID" ] && return
    ALLOW="/sys/fs/cgroup/devices/docker/\$CID/devices.allow"
    if [ -w "\$ALLOW" ]; then
        echo "c \$USB_MAJOR:* rwm" > "\$ALLOW" \
            && echo "[\$(date '+%F %T')] granted \$CID (\$NAME_OR_ID)" >> "\$LOG"
    else
        echo "[\$(date '+%F %T')] no allow file for \$CID (\$NAME_OR_ID)" >> "\$LOG"
    fi
}

echo "[\$(date '+%F %T')] daemon starting (pid=\$\$), watching '\$FILTER'" >> "\$LOG"

# 启动时先扫一遍已存在的 backend 容器
docker ps --filter "name=\$FILTER" --format "{{.Names}}" 2>>"\$LOG" | while read N; do
    grant "\$N"
done

# 持续监听后续 start 事件（用 name 而不是 short id 以便 inspect 拿 full id）
docker events --filter event=start --filter "name=\$FILTER" \
              --format "{{.Actor.Attributes.name}}" 2>>"\$LOG" \
| while read N; do
    [ -n "\$N" ] && grant "\$N"
done
EOF

DAEMON_PATH=/tmp/jodell-cgroup-grant.sh
# 注意：URSim 的 /tmp 是 tmpfs。`docker cp` 会把文件写到 overlay 持久层，
# 被 tmpfs 屏蔽 → 容器内看不到。这里改用 stdin 管道，让容器内 shell 直接写。
docker exec -i "$URSIM_NAME" sh -c "cat > $DAEMON_PATH" < "$DAEMON_SRC"
docker exec "$URSIM_NAME" chmod +x "$DAEMON_PATH"

# 已在跑就不重起；否则 docker exec -d 后台启动
if docker exec "$URSIM_NAME" pgrep -f "$DAEMON_PATH" >/dev/null 2>&1; then
    log "daemon already running"
else
    docker exec -d "$URSIM_NAME" "$DAEMON_PATH"
    sleep 1
    if docker exec "$URSIM_NAME" pgrep -f "$DAEMON_PATH" >/dev/null 2>&1; then
        log "daemon started inside URSim"
    else
        log "WARNING: daemon failed to start; check /tmp/jodell-cgroup-grant.log inside URSim"
    fi
fi

# ----------------------------------------------------------------------------
# 3. 立即对当前 backend 容器（如果已经在跑）做一次放权检查
# ----------------------------------------------------------------------------
log "verifying current backend container ..."
sleep 2
name=$(docker exec "$URSIM_NAME" sh -c "
    docker ps --filter name=$BACKEND_FILTER --format '{{.Names}}' | head -1
")
if [ -n "$name" ]; then
    log "backend container present: $name"
    docker exec "$URSIM_NAME" sh -c '
        CID=$(docker inspect -f "{{.Id}}" '"$name"')
        echo "  cgroup file: /sys/fs/cgroup/devices/docker/$CID/devices.list"
        cat /sys/fs/cgroup/devices/docker/$CID/devices.list | grep " '"$USB_MAJOR"':" \
            && echo "  -> '"$USB_MAJOR"' (USB-serial) is allowed" \
            || echo "  -> '"$USB_MAJOR"' NOT yet allowed (daemon may take a moment)"
    '
else
    log "backend container not yet started; daemon will grant when it appears"
fi

log "done. tail logs with:"
log "    docker exec $URSIM_NAME tail -f /tmp/jodell-cgroup-grant.log"
