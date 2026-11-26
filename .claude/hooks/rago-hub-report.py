#!/usr/bin/env python3
"""Hook « Stop » de Claude Code pour Rago Hub.

À la fin de chaque réponse d'une session cloud lancée par Rago Hub, envoie
le texte de la réponse au Hub, qui l'affiche dans le bon fil.

- Ne fait rien si RAGO_HUB_URL / RAGO_HUB_TOKEN ne sont pas définis
  (donc aucun effet sur vos sessions locales normales).
- Ne fait rien si la session n'a pas été lancée par Rago Hub
  (on cherche « [Rago Hub fil HUB-xxxxxx] » dans le premier message).
- Ne bloque jamais Claude : toute erreur est ignorée.
"""
import json
import os
import re
import sys
import urllib.request

KEY_RE = re.compile(r"\[Rago Hub fil (HUB-[0-9a-f]+)\]")


def texts_of(entry):
    msg = entry.get("message") or {}
    content = msg.get("content")
    if isinstance(content, str):
        return [content], False
    out, has_tool_result = [], False
    if isinstance(content, list):
        for c in content:
            if not isinstance(c, dict):
                continue
            if c.get("type") == "text" and c.get("text"):
                out.append(c["text"])
            elif c.get("type") == "tool_result":
                has_tool_result = True
    return out, has_tool_result


def main():
    url = os.environ.get("RAGO_HUB_URL", "").rstrip("/")
    token = os.environ.get("RAGO_HUB_TOKEN", "")
    if not url or not token:
        return
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    path = data.get("transcript_path")
    if not path or not os.path.exists(path):
        return

    key = None
    current = []  # textes de Claude depuis le dernier vrai message humain
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            try:
                entry = json.loads(line)
            except Exception:
                continue
            kind = entry.get("type")
            texts, is_tool_result = texts_of(entry)
            if kind == "user":
                joined = "\n".join(texts)
                if key is None:
                    m = KEY_RE.search(joined)
                    if m:
                        key = m.group(1)
                if texts and not is_tool_result and not entry.get("isMeta"):
                    current = []  # nouveau tour
            elif kind == "assistant" and texts:
                current.extend(texts)

    if not key:
        return
    text = "\n\n".join(t.strip() for t in current if t.strip())
    if not text:
        text = "(Le fil a terminé son tour sans message texte.)"

    body = json.dumps({"key": key, "text": text[-60000:], "sessionId": data.get("session_id")}).encode()
    req = urllib.request.Request(
        url + "/api/hook/report",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10).read()
    except Exception:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
