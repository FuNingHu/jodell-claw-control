<!--
Tested on : URSim 10.13
SDK       : 0.20.37
Date      : 2026-05-05
Author    : FuNing Hu <funh@universal-robots.com>
-->

# How to Manually Pass a Host USB Serial Device into a URCap Backend Container on URSim

> **Tested on:** URSim 10.13 &nbsp;·&nbsp; **SDK:** 0.20.37 &nbsp;·&nbsp; **Date:** 2026-05-05 &nbsp;·&nbsp; **Author:** FuNing Hu &lt;funh@universal-robots.com&gt;

This document is intended for **any URCap-X project** running on the URSim
simulator: you have a backend container that needs to access a USB-RS485 /
USB-CDC device plugged into the host, but calls like `serial.Serial(...)`
fail with:

```text
[Errno 1] Operation not permitted: '/dev/ur-ttylink/ttyTool'
```

(or the localized "operation not permitted" equivalent).

Follow this guide step by step. **It does not depend on any project-specific
script** — every command can be copied and pasted directly. You only need to
replace a few **`<placeholders>`** with the actual values for your project.

> This document **only applies to the URSim simulator environment**. On a real
> UR robot you don't need any of this; the URCap framework configures the
> backend container's cgroup correctly on the physical hardware.

---

## 1. Collect the placeholder values you'll need

| Placeholder | Meaning | How to obtain |
|---|---|---|
| `<USB_DEV>` | USB serial device path on the host (WSL2 / Linux) | `ls -l /dev/tty*`; commonly `/dev/ttyUSB0` or `/dev/ttyACM0` |
| `<USB_MAJOR>` | Character-device major number for that device | 5th column of `ls -l <USB_DEV>` (e.g. `188` in `188, 0`); or `cat /proc/devices \| grep ttyUSB` |
| `<TARGET_PATH>` | Path inside the backend container the program tries to open (declared in URCap manifest) | Typically `/dev/ur-ttylink/ttyTool`; with multiple devices the framework numbers them `ttyTool1`, `ttyTool2`, ... |
| `<URSIM_NAME>` | Name of the URSim container on the host | `docker ps --filter ancestor=universalrobots/ursim_polyscopex` |
| `<BACKEND_NAME>` | Name of your backend container inside URSim's nested docker | See §3 — run `docker ps` from inside URSim |

The examples below use:

```text
<USB_DEV>      = /dev/ttyUSB0
<USB_MAJOR>    = 188              # USB-serial driver
<TARGET_PATH>  = /dev/ur-ttylink/ttyTool
<URSIM_NAME>   = ursim-polyscopex-runtime-1
<BACKEND_NAME> = mycompany_my-urcap_my-backend         # replace with yours
```

If your USB-CDC ACM device has major number 166 (verify with
`cat /proc/devices`), substitute `<USB_MAJOR>` with 166. The rest of the
procedure is identical.

---

## 2. Layer 1 — Forward the USB device into WSL2

> Linux hosts can skip this section and go to §3.

On the Windows side (run PowerShell as administrator):

```powershell
usbipd list
# Locate your USB-485 / USB-CDC device and note its BUSID (e.g. 2-4)

usbipd bind --busid <BUSID> --force        # one-time only
usbipd attach --wsl --busid <BUSID>        # repeat every reboot / re-plug
```

Verify inside WSL2:

```bash
ls -l /dev/ttyUSB*
# Expected: crw-rw---- 1 root dialout 188, 0 ...
#                              ↑   ↑
#                         <USB_MAJOR>  minor
```

The first character of the first column **must** be `c` (character device);
if it is `-` (regular file) the kernel driver wasn't loaded. Run
`dmesg | tail` and check for `ch341` / `ftdi_sio` / `cp210x` module messages.

---

## 3. Layer 2 — Forward the WSL device into the URSim container

Edit the URSim docker-compose file (path depends on where URSim was installed):

```bash
# Typical path:
sudo nano /ursim-polyscopex-<version>/artifacts/runtime/docker-compose.yml
```

Inside the `services.runtime` block, add a top-level **`devices:`** key
(it must be a sibling of `volumes:`, **not nested inside it**):

```yaml
services:
  runtime:
    image: universalrobots/ursim_polyscopex:<version>
    privileged: true
    devices:                                          # ← add this section
      - "<USB_DEV>:<TARGET_PATH>"
    volumes:
      ...                                             # leave existing volumes intact
```

**Why it must be `devices:` and not `volumes:`**

- `volumes: /a:/b` — bind-mounts the node only; docker does **not** add a
  cgroup whitelist entry
- `devices: /a:/b` — bind-mounts the node **and** automatically adds
  `c <major>:* rwm` to the container's device cgroup whitelist

When URSim is `privileged: true` the visible difference is small, but
`devices:` is the proper, semantic way to express device passthrough.

Restart URSim so the new mount takes effect:

```bash
cd /ursim-polyscopex-<version>/artifacts/runtime
docker compose down
docker compose up -d
```

Verify inside the URSim container:

```bash
docker exec <URSIM_NAME> ls -l <TARGET_PATH>
# Expected: crw-rw---- 1 root dialout 188, 0 ...
#       ↑ 'c' = character device, 188 = your <USB_MAJOR>
```

If you see `-rw-...` (regular file), it means `<USB_DEV>` did not exist on
the host when `docker compose up` ran, and docker auto-created an empty file
as the bind-mount target. Confirm `ls -l <USB_DEV>` shows `crw-...` in WSL,
then `compose down && up` again.

---

## 4. Layer 3 — The URCap backend container (where the symptom shows up)

At this point `<TARGET_PATH>` inside URSim is a real character device.
But **when the URCap framework starts the backend child container, it only
bind-mounts the device node — it does not add a device cgroup rule**. That
is the root cause of the EPERM you're seeing.

### 4.1 Identify your backend container name

URSim runs a nested docker daemon (docker-in-docker), so your backend
container is invisible from the outside `docker ps`. You must enter URSim
first:

```bash
docker exec <URSIM_NAME> docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

Find your URCap backend in the output. The naming convention is generally
`<vendorID>_<urcapID>_<container-id-from-manifest>`. Record this name as
`<BACKEND_NAME>`.

### 4.2 Confirm the cgroup is the gatekeeper

```bash
docker exec <URSIM_NAME> sh -c "
docker exec <BACKEND_NAME> ls -l <TARGET_PATH>
"
# Sees character device 'c 188:0' → the node is fine, it's not the problem
```

```bash
docker exec <URSIM_NAME> sh -c "
docker exec <BACKEND_NAME> python -c \"
import os
try:
    fd = os.open('<TARGET_PATH>', os.O_RDWR | os.O_NOCTTY)
    print('open ok fd=', fd); os.close(fd)
except OSError as e:
    print('errno=', e.errno, e.strerror)
\"
"
# Expected output: errno= 1 Operation not permitted
```

If your backend image doesn't include python, you can use plain shell:

```bash
docker exec <URSIM_NAME> sh -c "
docker exec <BACKEND_NAME> sh -c '< <TARGET_PATH>' 2>&1
"
# Expected: cannot open ... Permission denied / Operation not permitted
```

Either result confirms it's a cgroup problem.

### 4.3 Inspect the cgroup whitelist (notice the missing `c 188:*`)

```bash
docker exec <URSIM_NAME> sh -c '
CID=$(docker inspect -f "{{.Id}}" <BACKEND_NAME>)
echo "backend full container id: $CID"
echo "--- current device whitelist ---"
cat /sys/fs/cgroup/devices/docker/$CID/devices.list
'
```

You should see entries roughly like:

```text
b *:* m
c *:* m
c 1:3 rwm
c 1:5 rwm
...
c 136:* rwm
```

The **absence** of a line beginning `c <USB_MAJOR>:* ...` confirms the
cgroup is blocking access.

---

## 5. Temporary grant (effective immediately, lost on container restart)

Add a whitelist entry directly to the backend's device cgroup:

```bash
docker exec <URSIM_NAME> sh -c '
CID=$(docker inspect -f "{{.Id}}" <BACKEND_NAME>)
echo "c <USB_MAJOR>:* rwm" > /sys/fs/cgroup/devices/docker/$CID/devices.allow
echo "granted, current list:"
cat /sys/fs/cgroup/devices/docker/$CID/devices.list | grep " <USB_MAJOR>:"
'
```

Expected output:

```text
granted, current list:
c <USB_MAJOR>:* rwm
```

Re-run the probe in §4.2 — you should now see `open ok fd= 3`.

> This is the **minimum fix**. Nothing else has been changed: the backend
> container has not been restarted, URSim has not been restarted, the URCap
> has not been reinstalled.

---

## 6. Auto-grant daemon (works for the entire URSim lifetime)

Whenever the backend container is **recreated** (crash auto-restart, URCap
reinstall, manual `docker restart`, etc.), it gets a fresh cgroup and the
rule from §5 is gone. The daemon below listens for `start` events on
URSim's nested docker and re-applies the rule the moment a backend container
appears.

### 6.1 Write the daemon script into URSim's `/tmp`

> URSim's `/tmp` is tmpfs. **Do not use `docker cp`** — it writes to the
> overlay layer which is shadowed by the tmpfs, so the file becomes
> invisible from within the container. Use a stdin pipe instead.

```bash
docker exec -i <URSIM_NAME> sh -c 'cat > /tmp/cgroup-grant.sh' <<'DAEMON_EOF'
#!/bin/sh
# Listens to nested docker start events and adds USB-serial cgroup whitelist.
USB_MAJOR=<USB_MAJOR>
FILTER=<BACKEND_NAME>
LOG=/tmp/cgroup-grant.log

grant() {
    NAME="$1"
    CID=$(docker inspect -f '{{.Id}}' "$NAME" 2>/dev/null)
    [ -z "$CID" ] && return
    ALLOW="/sys/fs/cgroup/devices/docker/$CID/devices.allow"
    if [ -w "$ALLOW" ]; then
        echo "c $USB_MAJOR:* rwm" > "$ALLOW" \
            && echo "[$(date '+%F %T')] granted $CID ($NAME)" >> "$LOG"
    fi
}

echo "[$(date '+%F %T')] daemon starting (pid=$$), watching '$FILTER'" >> "$LOG"

# Sweep existing matching containers on startup
docker ps --filter "name=$FILTER" --format "{{.Names}}" | while read N; do
    grant "$N"
done

# Then watch for future start events
docker events --filter event=start --filter "name=$FILTER" \
              --format "{{.Actor.Attributes.name}}" \
| while read N; do
    [ -n "$N" ] && grant "$N"
done
DAEMON_EOF
```

> ⚠ The heredoc above uses `<<'DAEMON_EOF'` (with single quotes), so the
> outer shell does **not** expand `$USB_MAJOR`, `$FILTER`, etc. **You must
> first replace `<USB_MAJOR>` and `<BACKEND_NAME>` in the script with
> literal values before pasting**. Alternatively, use unquoted
> `<<DAEMON_EOF` to let the outer shell expand them — but then every inner
> `$` must be escaped as `\$`. Pick whichever is more convenient.

Make it executable:

```bash
docker exec <URSIM_NAME> chmod +x /tmp/cgroup-grant.sh
```

### 6.2 Start the daemon in the background

```bash
docker exec -d <URSIM_NAME> /tmp/cgroup-grant.sh
```

The `-d` (detach) flag makes the command run independently of the current
`docker exec` session; it stays alive for as long as the URSim container
lives.

### 6.3 Verify

```bash
# daemon process is running
docker exec <URSIM_NAME> ps -ef | grep cgroup-grant | grep -v grep

# daemon log
docker exec <URSIM_NAME> cat /tmp/cgroup-grant.log

# Simulate a backend restart and watch auto-grant
docker exec <URSIM_NAME> docker restart <BACKEND_NAME>
sleep 3
docker exec <URSIM_NAME> tail /tmp/cgroup-grant.log
# A new "granted ..." line should appear
```

### 6.4 Tail the log (optional)

```bash
docker exec <URSIM_NAME> tail -f /tmp/cgroup-grant.log
```

---

## 7. Restart-scenario reference table

| Restart type | What is lost | What you must do |
|---|---|---|
| Backend container auto-restart | Backend cgroup rule | Nothing — the §6 daemon re-grants automatically |
| URSim container (`compose down/up`) | Everything inside URSim, including the daemon | Re-run §6 (just a couple of commands) |
| WSL restart | usbipd attach + everything inside URSim | Re-attach with usbipd on Windows (§2) + re-run §6 |
| Windows restart | Everything | usbipd attach + start URSim + re-run §6 |

If repeating §6 every time becomes tedious, wrap it in a small shell
script — that's exactly what `setup-jodell-usb.sh` in this repo does.

---

## 8. Common pitfalls

### 8.1 `c 188:*` isn't always the right major

Different USB-to-serial chips use different drivers:

| Chip | Driver | major |
|---|---|---|
| FT232 / FT4232 | ftdi_sio | 188 |
| CH340 / CH341 | ch341 | 188 |
| CP210x | cp210x | 188 |
| Prolific PL2303 | pl2303 | 188 |
| Generic USB-CDC ACM (many custom boards) | cdc_acm | 166 |

If `ls -l /dev/ttyACM0` shows `166, 0`, replace `<USB_MAJOR>` with 166
everywhere in the commands.

### 8.2 What about cgroup v2?

This guide assumes cgroup v1 (URSim's default). If you see:

```bash
docker exec <URSIM_NAME> ls /sys/fs/cgroup/devices/ 2>&1
# ls: cannot access ... No such file or directory
```

then you're on cgroup v2, which has **no `devices.allow` file**. Authorization
is enforced by BPF programs and is significantly harder to override at runtime.
The simplest workaround on v2 is to recreate the backend container with
`--device-cgroup-rule="c 188:* rwm"` or `--privileged` — but that requires
modifying the URCap framework's container launch parameters, which isn't
generally portable.

The other option on v2: use `socat` to expose the serial port as TCP and
have the backend connect via a socket instead of opening the character
device, completely bypassing cgroup (see §5.3 of the companion doc
`serial-passthrough-troubleshooting.md` in this repo).

### 8.3 Multiple USB devices / multiple backend containers

The `FILTER` in §6.1 is a substring match against the docker name. If you
have two backends that need granting:

- Run two daemon scripts with different `FILTER` values and different log files
- Or change the daemon to `FILTER=""` (watch all containers) and add per-project filtering inside `grant()`

If the two USB devices share a major (both 188), one rule `c 188:* rwm`
covers both. If they differ, write multiple lines: `echo "c 188:* rwm; c 166:* rwm" > ...`,
or one rule per `echo`.

### 8.4 Backend hasn't been started yet because the URCap isn't installed

The §6 daemon is event-driven — it doesn't matter if the target container
**doesn't exist yet**. The daemon stays subscribed; the moment the URCap is
installed and its backend container starts, the rule is applied. So
"install the daemon first, install the URCap second" is a perfectly valid
ordering.

---

## 9. The picture in one diagram

```text
host (WSL2)
  /dev/ttyUSB0 (c 188:0)  ← inode A
       │
       │ docker compose up: devices: /dev/ttyUSB0:/dev/ur-ttylink/ttyTool
       │   ┌── bind-mount inode A into URSim's /dev/ur-ttylink/ttyTool
       │   └── add c 188:* rwm to URSim's device cgroup
       ▼
URSim container (privileged: true)
  /dev/ur-ttylink/ttyTool (c 188:0, still inode A)
       │
       │ URSim's nested docker daemon launches the backend child:
       │   ┌── bind-mounts inode A into the backend
       │   └── ❌ MISSING: doesn't add c 188:* rwm to backend's cgroup
       ▼
backend container
  /dev/ur-ttylink/ttyTool (c 188:0, still inode A)
  cgroup: no c 188:*  ← source of EPERM
       │
       │ ★ What we do:
       │   echo "c 188:* rwm" > /sys/fs/cgroup/devices/docker/<CID>/devices.allow
       │   (manually or via the daemon)
       ▼
inside the backend: serial.Serial('/dev/ur-ttylink/ttyTool', 115200) → OK
```

inode A is the same throughout — nothing is copied. The only change is a
single whitelist line inside the kernel's device cgroup controller.

---

## 10. Quick-reference command sheet (substitute placeholders, then paste)

End-to-end in one go:

```bash
# 1. Forward USB into URSim (one-time configuration)
sudo sed -i '/^    privileged: true/a \    devices:\n      - "<USB_DEV>:<TARGET_PATH>"' \
    /ursim-polyscopex-<version>/artifacts/runtime/docker-compose.yml
cd /ursim-polyscopex-<version>/artifacts/runtime && docker compose down && docker compose up -d

# 2. Wait for URSim and the URCap backend to come up
until docker exec <URSIM_NAME> docker inspect <BACKEND_NAME> >/dev/null 2>&1; do sleep 1; done

# 3. Install the daemon (USB_MAJOR / BACKEND_NAME baked in as literals via shell expansion)
docker exec -i <URSIM_NAME> sh -c 'cat > /tmp/cgroup-grant.sh' <<DAEMON_EOF
#!/bin/sh
USB_MAJOR=<USB_MAJOR>
FILTER=<BACKEND_NAME>
LOG=/tmp/cgroup-grant.log
grant() {
    NAME="\$1"
    CID=\$(docker inspect -f '{{.Id}}' "\$NAME" 2>/dev/null)
    [ -z "\$CID" ] && return
    ALLOW="/sys/fs/cgroup/devices/docker/\$CID/devices.allow"
    [ -w "\$ALLOW" ] && echo "c \$USB_MAJOR:* rwm" > "\$ALLOW" \
        && echo "[\$(date '+%F %T')] granted \$CID" >> "\$LOG"
}
echo "[\$(date '+%F %T')] daemon starting" >> "\$LOG"
docker ps --filter "name=\$FILTER" --format "{{.Names}}" | while read N; do grant "\$N"; done
docker events --filter event=start --filter "name=\$FILTER" \
              --format "{{.Actor.Attributes.name}}" \
| while read N; do [ -n "\$N" ] && grant "\$N"; done
DAEMON_EOF
docker exec <URSIM_NAME> chmod +x /tmp/cgroup-grant.sh
docker exec -d <URSIM_NAME> /tmp/cgroup-grant.sh

# 4. Verify
docker exec <URSIM_NAME> sh -c "
docker exec <BACKEND_NAME> python -c 'import os,errno;
try:
    fd = os.open(\"<TARGET_PATH>\", os.O_RDWR|os.O_NOCTTY); print(\"open ok\"); os.close(fd)
except OSError as e: print(\"errno=\", e.errno, errno.errorcode.get(e.errno))
'"
# Expected output: open ok
```

---

## 11. Troubleshooting checklist

Walk through these in order — the first answer that's "no" tells you where
the problem lives:

1. In WSL: `ls -l <USB_DEV>` shows a character device (first char `c`)?
2. `docker exec <URSIM_NAME> ls -l <TARGET_PATH>` shows the same character device?
3. `docker exec <URSIM_NAME> docker exec <BACKEND_NAME> ls -l <TARGET_PATH>` shows the same character device?
4. `docker exec <URSIM_NAME> sh -c 'cat /sys/fs/cgroup/devices/docker/$(docker inspect -f "{{.Id}}" <BACKEND_NAME>)/devices.list'` contains a line `c <USB_MAJOR>:* rwm`?

All four "yes" → `open()` inside the backend will succeed.

Any "no" → revisit the corresponding section above.
