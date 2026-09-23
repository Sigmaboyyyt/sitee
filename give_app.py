# -*- coding: utf-8 -*-
"""NenlyMine give — локальный сервис выдачи (порт 9898).
Читает ключ из panel_key.txt (НЕ в git). Принимает POST {nick,kind,amount,group}.
Шлёт команду в консоль XZNN через панель mgr.hosting-minecraft.pro.
"""
import http.server, json, ssl, urllib.request, urllib.error, os

PANEL = "https://mgr.hosting-minecraft.pro"
SERVER = "57a7571b"   # XZNN

def load_key():
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "panel_key.txt"),
              "r", encoding="utf-8") as f:
        return f.read().strip()

KEY = load_key()

GROUPS = ["premium","creative","straj","lord","delux","tsar",
          "imperator","legenda","povelitel","vlastelin","vladika"]
TAGS = ["tag"]

KINDS = {
    "group":      ("setgroup",       True,  False),
    "case":       ("givecase",       False, True),
    "seasoncase": ("giveseasoncase", False, True),
    "weeklycase": ("giveweeklycase", False, True),
    "titlecase":  ("givetitlecase",  False, True),
    "tag":        ("tag allow",      False, False),
}

def build_cmd(kind, nick, amount, group):
    cmdname, need_grp, need_amt = KINDS[kind]
    nick = nick.strip()
    if kind == "group":
        return "%s %s %s" % (cmdname, nick, group)
    if kind == "tag":
        return "%s %s" % (cmdname, nick)
    return "%s %s %d" % (cmdname, nick, int(amount))

def panel_send(command):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    payload = json.dumps({"command": command}).encode("utf-8")
    req = urllib.request.Request(
        "%s/api/client/servers/%s/command" % (PANEL, SERVER),
        data=payload, method="POST",
        headers={"Authorization": "Bearer " + KEY, "Accept": "application/json",
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
            return r.status, ""
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode("utf-8", "replace")
        except Exception:
            return e.code, ""
    except urllib.error.URLError as e:
        return 0, str(e.reason)

FORM = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NenlyMine — выдача</title>
<style>
:root{--bg:#0e1220;--card:#171d33;--card2:#1d2540;--line:#2a3460;--txt:#e8ecff;--mut:#8b93b8;--acc:#55ccff;--ok:#4ade80;--bad:#ff6b6b}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,Arial,sans-serif;background:var(--bg);color:var(--txt);padding:28px 16px}
.wrap{max-width:440px;margin:0 auto}
h1{font-size:23px;margin-bottom:6px}
p.sub{color:var(--mut);font-size:13px;margin-bottom:24px;line-height:1.5}
label{display:block;font-size:13px;color:var(--mut);margin:14px 0 6px}
select,input{width:100%;background:var(--card2);color:var(--txt);border:1px solid var(--line);border-radius:10px;padding:12px;font-size:15px}
button{width:100%;margin-top:22px;background:linear-gradient(90deg,#33a9ff,#55ccff);border:0;color:#06121f;font-weight:700;font-size:16px;padding:13px;border-radius:10px;cursor:pointer}
button:disabled{opacity:.5;cursor:wait}
.res{margin-top:14px;padding:12px;border-radius:9px;font-size:13px;display:none;white-space:pre-wrap;word-break:break-word;line-height:1.5}
.res.show{display:block}
.res.ok{background:rgba(74,222,128,.12)}
.res.bad{background:rgba(255,107,107,.12)}
#cmdPreview{margin-top:16px;font-size:12px;color:var(--mut)}
#cmdPreview b{color:var(--acc);font-weight:600}
</style>
</head>
<body>
<div class="wrap">
<h1>Выдача привилегий</h1>
<p class="sub">Сервис работает на ноутбуке владельца. Ключ панели хранится только на ноутбуке — в GitHub и в сайт он не попадает.</p>

<label for="kind">Что выдаём</label>
<select id="kind">
  <option value="group">Группа (setgroup)</option>
  <option value="case">Кейс (givecase)</option>
  <option value="seasoncase">Сезонный кейс (giveseasoncase)</option>
  <option value="weeklycase">Недельный кейс (giveweeklycase)</option>
  <option value="titlecase">Титульный кейс (givetitlecase)</option>
  <option value="tag">Тег (tag allow)</option>
</select>

<div id="groupWrap">
  <label for="group">Название группы</label>
  <select id="group">
    <option>premium</option><option>creative</option><option>straj</option>
    <option>lord</option><option>delux</option><option>tsar</option>
    <option>imperator</option><option>legenda</option><option>povelitel</option>
    <option>vlastelin</option><option>vladika</option>
  </select>
</div>

<label for="nick">Ник игрока</label>
<input id="nick" placeholder="Например: Steve" autocomplete="off">

<div id="amountWrap">
  <label for="amount">Количество</label>
  <input id="amount" type="number" min="1" value="1">
</div>

<button id="go">Выдать</button>
<p id="cmdPreview">Команда: <b id="cmd">&nbsp;</b></p>
<div id="res"></div>
</div>

<script>
var KINDS = {
 group:["setgroup",true,false], case:["givecase",false,true],
 seasoncase:["giveseasoncase",false,true], weeklycase:["giveweeklycase",false,true],
 titlecase:["givetitlecase",false,true], tag:["tag allow",false,false]};
var $=function(id){return document.getElementById(id)};
function refresh(){
 var k=$("kind").value;
 $("groupWrap").style.display = k==="group" ? "" : "none";
 $("amountWrap").style.display = KINDS[k][2] ? "" : "none";
 var nick=$("nick").value.trim();
 var cmd;
 if(!nick){cmd="— nick";}
 else if(k==="group"){cmd="setgroup "+nick+" "+$("group").value;}
 else if(k==="tag"){cmd="tag allow "+nick;}
 else{cmd=KINDS[k][0]+" "+nick+" "+$("amount").value;}
 $("cmd").textContent=cmd;
}
["kind","group","nick","amount"].forEach(function(id){$(id).addEventListener("input",refresh);});
refresh();
$("go").addEventListener("click",function(){
 var btn=$("go"); btn.disabled=true;
 fetch("/give",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({kind:$("kind").value,nick:$("nick").value.trim(),
                       amount:$("amount").value,group:$("group").value})})
 .then(function(r){return r.json();})
 .then(function(j){
   var el=$("res"); el.className="res show "+(j.ok?"ok":"bad");
   el.textContent=j.message||j.error||"";
   btn.disabled=false; refresh();
 })
 .catch(function(e){var el=$("res"); el.className="res show bad"; el.textContent="Ошибка: "+e; btn.disabled=false;});
});
</script>
</body>
</html>"""

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._send(code, body, "application/json; charset=utf-8")

    def do_GET(self):
        body = FORM.encode("utf-8")
        self._send(200, body, "text/html; charset=utf-8")

    def do_POST(self):
        if not self.path.startswith("/give"):
            return self.send_json(404, {"ok": False, "message": "Не найдено"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            d = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            d = {}
        kind = (d.get("kind") or "group").lower()
        nick = (d.get("nick") or "").strip()
        try:
            amount = int(d.get("amount") or 1)
        except Exception:
            amount = 1
        group = (d.get("group") or "premium").strip()

        if kind not in KINDS:
            return self.send_json(400, {"ok": False, "message": "Неизвестный тип: " + kind})
        if not nick:
            return self.send_json(400, {"ok": False, "message": "Укажите ник игрока"})
        if kind == "group" and group not in GROUPS:
            return self.send_json(400, {"ok": False, "message": "Неизвестная группа: " + group})

        cmd = build_cmd(kind, nick, amount, group)
        code, msg = panel_send(cmd)
        ok = code in (200, 204)
        return self.send_json(200, {
            "ok": ok,
            "message": msg or ("Команда отправлена" if ok else "Команда не принята"),
            "command": cmd,
            "http": code})

if __name__ == "__main__":
    ports = http.server.HTTPServer(("0.0.0.0", 9898), Handler)
    print("NenlyMine give: http://127.0.0.1:9898")
    ports.serve_forever()