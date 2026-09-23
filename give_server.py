# -*- coding: utf-8 -*-
import http.server, json, urllib.request, urllib.error, ssl, threading, os

PANEL = "https://mgr.hosting-minecraft.pro"
SERVER_ID = "57a7571b"  # XZNN
HOST = "0.0.0.0"
PORT = 9898

def load_key():
    here = os.path.dirname(os.path.abspath(__file__))
    p = os.path.join(here, "panel_key.txt")
    with open(p, "r", encoding="utf-8") as f:
        return f.read().strip()

KEY = load_key()

GROUPS = ["premium", "creative", "straj", "lord", "delux", "tsar",
          "imperator", "legenda", "povelitel", "vlastelin", "vladika"]

TYPES = [
    ("group",       "Привилегия (setgroup)"),
    ("case",        "Обычный кейс (givecase)"),
    ("seasoncase",  "Сезонный кейс (giveseasoncase)"),
    ("weeklycase",  "Еженедельный кейс (giveweeklycase)"),
    ("titlecase",   "Титульный кейс (givetitlecase)"),
    ("tag",         "Тег (tag allow)"),
]

def build_command(kind, nick, amount, group):
    n = nick.strip()
    if kind == "group":
        return "setgroup %s %s" % (n, group)
    if kind == "case":
        return "givecase %s %d" % (n, int(amount))
    if kind == "seasoncase":
        return "giveseasoncase %s %d" % (n, int(amount))
    if kind == "weeklycase":
        return "giveweeklycase %s %d" % (n, int(amount))
    if kind == "titlecase":
        return "givetitlecase %s %d" % (n, int(amount))
    if kind == "tag":
        return "tag allow %s" % n
    raise ValueError("unknown kind")

def panel_command(cmd):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    data = json.dumps({"command": cmd}).encode("utf-8")
    req = urllib.request.Request(
        "%s/api/client/servers/%s/command" % (PANEL, SERVER_ID),
        data=data,
        headers={
            "Authorization": "Bearer " + KEY,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
            return r.status, "Command sent"
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", "replace")
        except Exception:
            body = ""
        return e.code, body or e.reason
    except urllib.error.URLError as e:
        return 0, str(e.reason)

def handle_give(body):
    data = body.get("data", {})
    kind = data.get("kind", "")
    nick = data.get("nick", "")
    amount = data.get("amount", 1)
    group = data.get("group", "")
    cmd = build_command(kind, nick, amount, group)
    code, res = panel_command(cmd)
    return code, res, cmd

HTML = u"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Выдача — NenlyMine</title>
<style>
:root{--bg:#0e1220;--card:#171d33;--card2:#1d2540;--line:#2a3460;--txt:#e8ecff;--mut:#8b93b8;--acc:#55ccff;--ok:#4ade80;--bad:#ff6b6b}
*{box-sizing:border-box;margin:0;padding:0}
body{font:16px/1.5 system-ui,Arial,sans-serif;background:var(--bg);color:var(--txt);padding:24px 16px}
.wrap{max-width:460px;margin:0 auto}
h1{font-size:22px;margin-bottom:4px}
p.sub{color:var(--mut);font-size:13px;margin-bottom:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
label{display:block;font-size:13px;color:var(--mut);margin:12px 0 6px}
select,input{width:100%;background:var(--card2);color:var(--txt);border:1px solid var(--line);border-radius:9px;padding:10px 12px;font-size:15px}
button{width:100%;margin-top:18px;background:linear-gradient(90deg,#33a9ff,#55ccff);border:0;color:#06121f;font-weight:700;font-size:16px;padding:12px;border-radius:10px;cursor:pointer}
button:disabled{opacity:.5;cursor:wait}
#res{margin-top:14px;padding:12px;border-radius:9px;font-size:13px;display:none}
#res.ok{display:block;background:rgba(74,222,128,.12);color:var(--ok)}
#res.bad{display:block;background:rgba(255,107,107,.12);color:var(--bad)}
.row{font-size:12px;color:var(--mut);margin-top:10px}
#cmd{white-space:pre-wrap;word-break:break-all;color:var(--acc)}
</style>
</head>
<body>
<div class="wrap">
  <h1>Выдача NenlyMine</h1>
  <p class="sub">Локальный сервис. Ключ панели хранится на этом устройстве.</p>
  <div class="card">
    <label for="kind">Что выдаём</label>
    <select id="kind">
      <option value="group">Привилегия (setgroup)</option>
      <option value="case">Обычный кейс (givecase)</option>
      <option value="seasoncase">Сезонный кейс (giveseasoncase)</option>
      <option value="weeklycase">Еженедельный кейс (giveweeklycase)</option>
      <option value="titlecase">Титульный кейс (givetitlecase)</option>
      <option value="tag">Тег (tag allow)</option>
    </select>

    <div id="groupWrap">
      <label for="group">Группа</label>
      <select id="group">
        <option value="premium">premium</option>
        <option value="creative">creative</option>
        <option value="straj">straj</option>
        <option value="lord">lord</option>
        <option value="delux">delux</option>
        <option value="tsar">tsar</option>
        <option value="imperator">imperator</option>
        <option value="legenda">legenda</option>
        <option value="povelitel">povelitel</option>
        <option value="vlastelin">vlastelin</option>
        <option value="vladika">vladika</option>
      </select>
    </div>

    <label for="nick">Ник игрока</label>
    <input id="nick" placeholder="Пример: Steve" autocomplete="off">

    <div id="amountWrap">
      <label for="amount">Количество</label>
      <input id="amount" type="number" min="1" value="1">
    </div>

    <button id="go">Выдать</button>
    <div class="row">Команда: <span id="cmd"></span></div>
    <div id="res"></div>
  </div>
</div>
<script>
var GROUPS=["premium","creative","straj","lord","delux","tsar","imperator","legenda","povelitel","vlastelin","vladika"];
function refresh(){
  var k=sel("kind").value;
  document.getElementById("groupWrap").style.display = k==="group"?"":"none";
  document.getElementById("amountWrap").style.display = (k==="group"||k==="tag")?"none":"";
  var g=sel("group").value;
  if(k==="group") cmd("setgroup "+g+" <ник>");
  else if(k==="tag") cmd("tag allow <ник>");
  else cmd(CMD_S[k]+" <ник> "+amt);
}
</script>
</body>
</html>
"""
