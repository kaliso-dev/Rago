"""Parse the legacy Rago Optimizer .bat into runnable, non-interactive script blocks.

The legacy file is a 14k-line menu-driven batch script. Every menu option jumps (goto) to a
label; the code under that label runs until it jumps back to a menu. This module simulates
that control flow per label and returns a cleaned script for each one, with:

- UI noise removed (ASCII art, cls, pause, timeout, chcp, balloon notifications, message boxes);
- interactive confirmations (set /p) removed, reported through `confirm` instead;
- jumps back to menus turned into `exit /b 0`;
- jumps to other code labels followed and inlined (cmd semantics: search forward, wrap around);
- bugs of the legacy file fixed (see FIXES at the bottom and `fix_line`).
"""
import re

ART = re.compile(r'[█╔╗╚╝═║░▓▒▀▄▌▐]')
COLOR = re.compile(r'%(?:[wpbvojumh])%', re.I)
LABEL_RE = re.compile(r'^\s*:([A-Za-z0-9_\-]+)\s*$')
GOTO_RE = re.compile(r'goto\s+:?([A-Za-z0-9_\-]+)', re.I)
MENU_NAMES = {'menu', 'm', 'main', 'mouse', 'god', 'misspellredirect', 'redirectmenu', 'redirect', 'redirectmouse'}

NPI_CALL = (r'if exist "%RAGO_RES%\nvidiaProfileInspector.exe" ( '
            r'"%RAGO_RES%\nvidiaProfileInspector.exe" "%RAGO_RES%\extremelatencylow.nip" -silentImport '
            r') else ( echo [skip] NVIDIA Profile Inspector introuvable )')


class LegacyBat:
    def __init__(self, path):
        raw = open(path, 'rb').read()
        if raw[:2] == b'\xff\xfe':  # fake UTF-16 BOM used to hide the file from editors
            raw = raw[2:]
        text = raw.decode('utf-8', errors='replace')
        self.L = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        self.N = len(self.L)
        self.labels = []
        for i, l in enumerate(self.L):
            m = LABEL_RE.match(l)
            if m:
                self.labels.append((i, m.group(1).lower()))
        self.label_lines = {i for i, _ in self.labels}
        self.fixes = []  # (line, before, after)

    # ---- label helpers -------------------------------------------------------------------
    def resolve(self, name, frm):
        name = name.lower().lstrip(':')
        after = [i for i, n in self.labels if n == name and i > frm]
        if after:
            return after[0]
        before = [i for i, n in self.labels if n == name]
        return before[0] if before else None

    def find(self, name, line):
        """Label line index for `name` declared at 1-based `line`."""
        i = line - 1
        m = LABEL_RE.match(self.L[i])
        assert m and m.group(1).lower() == name.lower(), (name, line, self.L[i])
        return i

    def block_end(self, i):
        nxt = [j for j, _ in self.labels if j > i]
        return nxt[0] if nxt else self.N

    def menu_block(self, i):
        j = i
        while True:
            e = self.block_end(j)
            if any(self.L[k].strip() for k in range(j + 1, e)) or e >= self.N:
                return j
            j = e

    def is_menu(self, i):
        j = self.menu_block(i)
        return any(re.search(r'set /p input', self.L[k], re.I) for k in range(j, self.block_end(j)))

    def is_menu_target(self, name, frm):
        if name.lower() in MENU_NAMES or name.lower() == 'eof':
            return True
        t = self.resolve(name, frm)
        return t is None or self.is_menu(t)

    # ---- line cleaning -------------------------------------------------------------------
    def fix_line(self, s, i):
        """Repair commands broken in the legacy file. Returns the fixed line."""
        orig = s
        # 1. a global "Disable"->"Disabling" / "Enable"->"Enabling" find & replace broke ~270
        #    commands: registry value names, schtasks /Disable, auditpol, Disable-MMAgent...
        s = s.replace('Disabling', 'Disable').replace('Enabling', 'Enable')
        # 2. "reg add <key> /v DevicePriority /f" with no data writes an empty string; the
        #    script's own messages say these values are meant to be deleted.
        m = re.match(r'^(\s*)reg(?:\.exe)?\s+add\s+("[^"]+")\s+/v\s+"?(DevicePriority|MessageNumberLimit)"?\s+/f\s*$', s, re.I)
        if m:
            s = f'{m.group(1)}reg delete {m.group(2)} /v "{m.group(3)}" /f >nul 2>&1'
        # 3. REG_BINARY data cannot contain spaces
        s = s.replace('/t REG_BINARY /d 90 00 00 00', '/t REG_BINARY /d 9012038010000000')
        # 4. curly quotes pasted from a web page and a hard-coded adapter name
        s = s.replace('“Ethernet”', '"%adapter_name%"')
        # 5. hard-coded paths from the author's PC
        s = re.sub(r'start\s+""\s+/wait\s+"C:\\Users\\Full\s+PC\s+Gamer\\Desktop\\Premium Program V3\\extremelatencylow\.nip"\s*',
                   lambda _m: NPI_CALL, s, flags=re.I)
        s = s.replace('C:\\Rago Optimizer\\PowerPlan\\LowLatency.pow', '%RAGO_RES%\\LowLatency.pow')
        s = re.sub(r'"?resources\\smartctl\.exe"?', lambda _m: '"%RAGO_RES%\\smartctl.exe"', s, flags=re.I)
        # 6. for-loops whose body was never attached: `do set "str=%%i" (` runs the block once
        #    outside the loop with a literal %i. Attach the block to the loop.
        s = re.sub(r'(do set "str=%%i")\s*\($', r'\1 & (', s)
        if s != orig:
            self.fixes.append((i + 1, orig.strip()[:200], s.strip()[:200]))
        return s

    def clean_line(self, l, i):
        s = l.rstrip()
        st = s.strip()
        low = st.lower()
        if not st or ART.search(st):
            return None
        if re.match(r'^(cls|pause|timeout|chcp|title|color|mode)\b', low):
            return None
        if re.match(r'^echo\.?\s*("")?\s*$', low):
            return None
        if low.startswith('echo') and re.search(r'press any key|operation completed', low):
            return None
        if 'notifyicon' in low or 'messagebox' in low or re.match(r'^set\s+"\$', low):
            return None
        if 'contentreference' in low or 'oaicite' in low:  # pasted chat-assistant residue
            return None
        if re.match(r'^reg(\.exe)?\s+add', low) and st.count('"') % 2 == 1:  # truncated line
            return None
        s = re.sub(r'\s*&\s*pause\s*(>\s*nul)?', '', s, flags=re.I)
        s = COLOR.sub('', s)
        if not re.match(r'^\s*(echo|::|rem\b)', s, re.I):
            s = self.fix_line(s, i)
        return s

    # ---- control-flow simulation ---------------------------------------------------------
    def collect(self, start, max_hops=12, stop_at_menu=True):
        out, hops, depth = [], 0, 0
        confirm_vars = set()
        i = start + 1
        visited = {start}
        while i < self.N:
            l = self.L[i]
            low = l.strip().lower()
            if i in self.label_lines:
                out.append(self.L[i].strip())
                i += 1
                continue
            if re.search(r'set /p input', low):
                break
            mconf = re.match(r'set /p\s+(\w+)=', low)
            if mconf:
                confirm_vars.add(mconf.group(1))
                i += 1
                continue
            if any(('%' + v + '%') in low for v in confirm_vars):
                i += 1
                continue
            is_echo = low.startswith('echo')
            depth_before = depth
            if not is_echo:
                depth += l.count('(') - l.count(')')
            g = GOTO_RE.search(l)
            if g and not is_echo and not low.startswith(('::', 'rem')):
                target = g.group(1)
                top_level = ((depth_before <= 0 or depth <= 0) and not re.match(r'^(if|for)\b', low)
                             and '&' not in low and not low.startswith(')'))
                if self.is_menu_target(target, i):
                    if top_level:
                        break
                    out.append(GOTO_RE.sub('exit /b 0', l.rstrip()))
                    i += 1
                    continue
                t = self.resolve(target, i)
                if top_level and t is not None:
                    if t in visited or hops >= max_hops:
                        break
                    visited.add(t)
                    hops += 1
                    out.append(':' + self.L[t].strip().lstrip(':'))
                    i = t + 1
                    continue
                out.append(l.rstrip())
                i += 1
                continue
            if re.match(r'^exit\b', low) and depth_before <= 0:
                break
            c = self.clean_line(l, i)
            if c is not None:
                out.append(c)
            i += 1
        script = '\n'.join(out)
        script = re.sub(r'\(\s*\n\s*\)', '(\n  rem\n)', script)
        script = self._fix_blocks(script)
        return script, sorted(confirm_vars)

    def collect_until_menu(self, start):
        """Commands of a menu label that run before its `set /p` prompt."""
        out = []
        for k in range(start + 1, self.block_end(start)):
            if re.search(r'set /p input', self.L[k], re.I):
                break
            c = self.clean_line(self.L[k], k)
            if c is not None:
                out.append(c)
        return '\n'.join(out)

    @staticmethod
    def _fix_blocks(script):
        """After attaching `do set "str=%%i" & (` bodies, close bodies the legacy file never closed."""
        lines = script.split('\n')
        out, k = [], 0
        while k < len(lines):
            line = lines[k]
            if re.search(r'do set "str=%%i" & \($', line):
                body = [line]
                k += 1
                while k < len(lines) and ('%%i' in lines[k] or lines[k].strip().lower().startswith('echo')) \
                        and not lines[k].lstrip().lower().startswith('for '):
                    body.append(lines[k])
                    k += 1
                out.extend(body)
                if k < len(lines) and lines[k].strip() == ')':
                    out.append(')')
                    k += 1
                else:
                    out.append(')')
                continue
            out.append(line)
            k += 1
        return '\n'.join(out)

    def leaf(self, name, line):
        i = self.find(name, line)
        script, conf = self.collect(i)
        return script, conf
