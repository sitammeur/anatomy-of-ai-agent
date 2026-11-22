// Tiny Python highlighter + slide chrome + light/dark toggle. Runs once before print.
(function () {
  // theme: ?theme=light|dark overrides the saved choice (used by build.sh)
  const root = document.documentElement;
  const param = new URLSearchParams(location.search).get("theme");
  let saved = null;
  try { saved = localStorage.getItem("deck-theme"); } catch (e) {}
  const setTheme = t => {
    if (t === "light") root.dataset.theme = "light"; else delete root.dataset.theme;
    try { localStorage.setItem("deck-theme", t); } catch (e) {}
    if (btn) btn.textContent = t === "light" ? "☾ Dark" : "☀ Light";
  };
  let btn = null;
  if (param) root.dataset.theme = param === "light" ? "light" : "";
  else if (saved === "light") root.dataset.theme = "light";
  if (!param) {
    btn = document.createElement("button");
    btn.className = "theme-toggle";
    btn.title = "Toggle light/dark (T)";
    const toggle = () => setTheme(root.dataset.theme === "light" ? "dark" : "light");
    btn.addEventListener("click", toggle);
    document.addEventListener("keydown", e => {
      if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey && !e.altKey) toggle();
    });
    document.body.appendChild(btn);
    btn.textContent = root.dataset.theme === "light" ? "☾ Dark" : "☀ Light";
  }

  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const KW = new Set("from import def return for in if not else elif class try except as with and or is async await lambda while raise pass".split(" "));
  const CONST = new Set(["None", "True", "False"]);
  const BI = new Set("print range len str int float dict list json".split(" "));
  const re = /(#[^\n]*)|([rfbRFB]?"""[\s\S]*?"""|[rfbRFB]?"(?:\\.|[^"\\\n])*"|[rfbRFB]?'(?:\\.|[^'\\\n])*')|\b(\d+(?:\.\d+)?)\b|([A-Za-z_]\w*)(\s*\()?/g;
  document.querySelectorAll("pre[data-py]").forEach(pre => {
    const src = pre.textContent;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      last = re.lastIndex;
      if (m[1]) out += `<span class="tok-com">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tok-str">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tok-num">${m[3]}</span>`;
      else if (m[4]) {
        const w = m[4], call = m[5] || "";
        if (KW.has(w)) out += `<span class="tok-kw">${w}</span>` + esc(call);
        else if (CONST.has(w)) out += `<span class="tok-num">${w}</span>` + esc(call);
        else if (call) out += `<span class="tok-fn">${w}</span>` + esc(call);
        else out += w;
      }
    }
    out += esc(src.slice(last));
    pre.innerHTML = out;
  });
  const slides = [...document.querySelectorAll(".slide")];
  slides.forEach((s, i) => {
    if (s.classList.contains("bare")) return;
    const c = document.createElement("div");
    c.className = "chrome";
    c.innerHTML = `<span>The Anatomy of an AI Agent</span><span>${String(i + 1).padStart(2, "0")} / ${slides.length}</span>`;
    s.appendChild(c);
  });
})();
