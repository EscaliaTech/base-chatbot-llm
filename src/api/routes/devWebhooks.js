// Dev webhook inspector — UI similar to ngrok:4040
// Available at GET /dev/webhooks
import { Router } from 'express'
import { getEntries, subscribe } from '../../infrastructure/webhookInspector.js'

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Webhook Inspector</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0f1117;color:#e2e8f0;font-family:'Menlo','Consolas',monospace;font-size:13px;display:flex;height:100vh;overflow:hidden}
  #sidebar{width:340px;min-width:340px;border-right:1px solid #1e2533;display:flex;flex-direction:column;overflow:hidden}
  #sidebar-header{padding:14px 16px;border-bottom:1px solid #1e2533;display:flex;align-items:center;gap:10px}
  #sidebar-header h1{font-size:14px;font-weight:600;color:#fff;flex:1}
  #live-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  #list{flex:1;overflow-y:auto}
  .entry{padding:10px 16px;border-bottom:1px solid #1a1f2e;cursor:pointer;transition:background .1s}
  .entry:hover{background:#151a27}
  .entry.active{background:#1a2035;border-left:3px solid #6366f1}
  .entry .top{display:flex;align-items:center;gap:8px;margin-bottom:4px}
  .method{font-size:11px;font-weight:700;padding:2px 6px;border-radius:3px;background:#1e2533;color:#94a3b8}
  .status{font-size:11px;font-weight:700;padding:2px 6px;border-radius:3px}
  .s200{background:#14532d;color:#4ade80}
  .s403{background:#450a0a;color:#f87171}
  .s4xx,.s5xx{background:#450a0a;color:#f87171}
  .path{color:#e2e8f0;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ts{font-size:11px;color:#4b5563;white-space:nowrap}
  .duration{font-size:11px;color:#6b7280;margin-left:auto}
  #detail{flex:1;display:flex;flex-direction:column;overflow:hidden}
  #detail-header{padding:14px 20px;border-bottom:1px solid #1e2533}
  #detail-header .url{color:#a5b4fc;font-size:13px;word-break:break-all}
  #detail-header .meta{display:flex;gap:16px;margin-top:6px;font-size:12px;color:#6b7280}
  #tabs{display:flex;gap:0;border-bottom:1px solid #1e2533;padding:0 20px}
  .tab{padding:8px 14px;cursor:pointer;color:#6b7280;font-size:12px;border-bottom:2px solid transparent;transition:all .15s}
  .tab.active{color:#a5b4fc;border-bottom-color:#6366f1}
  #tab-content{flex:1;overflow:auto;padding:16px 20px}
  pre{background:#0a0d14;border:1px solid #1e2533;border-radius:6px;padding:14px;overflow:auto;white-space:pre-wrap;word-break:break-all;line-height:1.6;color:#94a3b8;font-size:12px}
  .key{color:#7dd3fc}.str{color:#86efac}.num{color:#fb923c}.bool{color:#c084fc}.null{color:#f87171}
  #empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:#374151}
  #empty svg{opacity:.3}
  #empty p{font-size:13px}
  #clear-btn{padding:4px 10px;background:#1e2533;border:1px solid #2d3748;border-radius:4px;color:#94a3b8;cursor:pointer;font-size:11px;font-family:inherit}
  #clear-btn:hover{background:#2d3748}
</style>
</head>
<body>
<div id="sidebar">
  <div id="sidebar-header">
    <h1>Webhook Inspector</h1>
    <div id="live-dot"></div>
    <button id="clear-btn" onclick="clearAll()">Clear</button>
  </div>
  <div id="list"></div>
</div>
<div id="detail">
  <div id="empty">
    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
    <p>Waiting for webhook requests…</p>
  </div>
</div>

<script>
let selected = null
let activeTab = 'body'
let entries = []

function statusClass(s){ return s===200?'s200':s===403?'s403':s>=400?'s4xx':'s5xx' }

function renderList(){
  const el = document.getElementById('list')
  el.innerHTML = entries.map(e=>\`
    <div class="entry\${selected===e.id?' active':''}" onclick="select('\${e.id}')">
      <div class="top">
        <span class="method">\${e.method}</span>
        <span class="status \${statusClass(e.status)}">\${e.status}</span>
        <span class="path">\${e.path}</span>
      </div>
      <div class="top">
        <span class="ts">\${new Date(e.ts).toLocaleTimeString()}</span>
        <span class="duration">\${e.durationMs}ms</span>
      </div>
    </div>
  \`).join('')
}

function syntaxHL(obj){
  if(!obj) return '<span class="null">null</span>'
  let json = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, m => {
      let cls = 'num'
      if(/^"/.test(m)){ cls = /:$/.test(m)?'key':'str' }
      else if(/true|false/.test(m)){ cls = 'bool' }
      else if(/null/.test(m)){ cls = 'null' }
      return \`<span class="\${cls}">\${m}</span>\`
    })
}

function renderDetail(entry){
  const d = document.getElementById('detail')
  const tabs = { body: 'Body', headers: 'Headers', raw: 'Raw' }
  d.innerHTML = \`
    <div id="detail-header">
      <div class="url">\${entry.method} \${entry.path}</div>
      <div class="meta">
        <span>Status: <strong style="color:\${entry.status===200?'#4ade80':'#f87171'}">\${entry.status}</strong></span>
        <span>Duration: \${entry.durationMs}ms</span>
        <span>IP: \${entry.ip}</span>
        <span>\${new Date(entry.ts).toLocaleString()}</span>
      </div>
    </div>
    <div id="tabs">
      \${Object.entries(tabs).map(([k,v])=>\`<div class="tab\${activeTab===k?' active':''}" onclick="setTab('\${k}','\${entry.id}')">\${v}</div>\`).join('')}
    </div>
    <div id="tab-content">
      \${renderTab(entry, activeTab)}
    </div>
  \`
}

function renderTab(entry, tab){
  if(tab==='body') return \`<pre>\${syntaxHL(entry.body)}</pre>\`
  if(tab==='headers') return \`<pre>\${syntaxHL(entry.headers)}</pre>\`
  if(tab==='raw') return \`<pre>\${entry.rawBody || JSON.stringify(entry.body)}</pre>\`
}

function setTab(tab, id){
  activeTab = tab
  const entry = entries.find(e=>e.id===id)
  if(entry) renderDetail(entry)
}

function select(id){
  selected = id
  const entry = entries.find(e=>e.id===id)
  renderList()
  if(entry) renderDetail(entry)
}

function clearAll(){
  fetch('/dev/webhooks/clear', {method:'POST'})
  entries = []
  selected = null
  renderList()
  document.getElementById('detail').innerHTML = document.getElementById('detail').innerHTML
  location.reload()
}

// Load existing entries
fetch('/dev/webhooks/entries')
  .then(r=>r.json())
  .then(data=>{
    entries = data
    renderList()
    if(entries.length) select(entries[0].id)
  })

// SSE live updates
const es = new EventSource('/dev/webhooks/stream')
es.onmessage = e => {
  const entry = JSON.parse(e.data)
  entries.unshift(entry)
  if(entries.length > 50) entries.pop()
  renderList()
  if(!selected) select(entry.id)
}
</script>
</body>
</html>`

export function createDevWebhooksRouter() {
  const router = Router()

  router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html')
    res.send(HTML)
  })

  router.get('/entries', (req, res) => {
    res.json(getEntries())
  })

  router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const unsubscribe = subscribe((entry) => {
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    })

    req.on('close', unsubscribe)
  })

  router.post('/clear', (req, res) => {
    getEntries().splice(0)
    res.json({ ok: true })
  })

  return router
}
