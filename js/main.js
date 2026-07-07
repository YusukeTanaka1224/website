/* データ(data/*.json)を読み込んで表示します。内容の編集は管理画面(/admin)から。 */
const $ = id => document.getElementById(id);
const esc = s => { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; };
async function load(path){ const r = await fetch(path + "?v=" + Date.now()); return r.json(); }
function fmtDate(s){ const d = new Date(s); return isNaN(d) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }

/* ---- Profile ---- */
load("data/profile.json").then(p => {
  $("hero-name-ja").textContent = p.name_ja;
  $("hero-name-en").textContent = p.name_en;
  $("hero-tagline").textContent = p.tagline || "";
  document.title = `${p.name_ja} | ${p.name_en}`;
  if (p.photo){ $("profile-photo-wrap").innerHTML = `<img class="profile-photo" src="${esc(p.photo)}" alt="${esc(p.name_ja)}">`; document.querySelector(".profile-grid").classList.add("has-photo"); }
  else $("profile-photo-wrap").remove();
  $("profile-affil").innerHTML = (p.affiliations || []).map(a => esc(a)).join("<br>");
  $("profile-bio").innerHTML = (p.bio || "").split(/\n\s*\n/).map(par => `<p>${esc(par.trim())}</p>`).join("");
  /* 外部リンク（researchmap・X など）を小さなアイコン付きで表示 */
  const icons = {
    "researchmap": `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 15c1.5-4 3-6 5-6s3.5 2 5 6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    "X": `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM17.083 19.77h1.833L7.084 4.126H5.117z" fill="currentColor"/></svg>`
  };
  $("profile-links").innerHTML = (p.links || []).map(l => {
    const logoOnly = l.label === "X";
    return `<a href="${esc(l.url)}" target="_blank" rel="noopener" aria-label="${esc(l.label)}">${icons[l.label] || ""}${logoOnly ? "" : `<span>${esc(l.label)}</span>`}</a>`;
  }).join("");
}).catch(()=>{});

/* ---- Story（原点） ---- */
load("data/story.json").then(s => {
  $("story-lede").textContent = s.lede || "";
  if (!s.lede) $("story-lede").remove();
  if (s.image) $("story-image").innerHTML = `<img src="${esc(s.image)}" alt="">`;
  else $("story-image").remove();
  $("story-body").innerHTML = (s.body || "").split(/\n\s*\n/).map(par => `<p>${esc(par.trim())}</p>`).join("");
}).catch(()=>{});

/* ---- Talks & Media（講演・メディア） ---- */
load("data/talks.json").then(t => {
  $("talks-lede").textContent = t.lede || "";
  if (!t.lede) $("talks-lede").remove();
  $("talks-list").innerHTML = (t.items || []).map(it => `<div class="talk-row">
    <span class="talk-date">${esc(it.date)}</span>
    <span class="talk-venue">${esc(it.venue)}</span>
    <span class="talk-title">${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>` : esc(it.title)}</span>
  </div>`).join("");
}).catch(()=>{});

/* ---- Publications ---- */
load("data/publications.json").then(d => {
  $("pub-lede").textContent = d.lede || "";
  $("pub-list").innerHTML = (d.items || []).map(it => {
    const links = [];
    if (it.cinii) links.push(`<a href="${esc(it.cinii)}" target="_blank" rel="noopener">CiNii →</a>`);
    if (it.pdf)   links.push(`<a href="${esc(it.pdf)}" target="_blank" rel="noopener">PDF ↓</a>`);
    return `<li><div>
      <p class="pub-title">${esc(it.title)}</p>
      <p class="pub-meta">${esc(it.venue)}${it.venue && it.year ? "　·　" : ""}${esc(it.year)}</p>
      ${links.length ? `<p class="pub-links">${links.join("")}</p>` : ""}
    </div></li>`;
  }).join("");
}).catch(()=>{});

/* ---- noteの記事取得：note本来のRSSを直接読み、media:thumbnail を取り出す ---- */
async function fetchNote(noteUrl, count){
  const rss = noteUrl.replace(/\/$/, "") + "/rss";
  /* 1) サイト内中継(/note-rss、_redirectsで設定) → 2) 外部中継 の順に試す */
  const sources = [
    "/note-rss",
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(rss),
    "https://corsproxy.io/?url=" + encodeURIComponent(rss)
  ];
  for (const src of sources){
    try{
      const res = await fetch(src);
      if (!res.ok) continue;
      const xml = new DOMParser().parseFromString(await res.text(), "application/xml");
      if (xml.querySelector("parsererror")) continue;
      const pick = (it, tag) => (it.getElementsByTagName(tag)[0]?.textContent || "").trim();
      const items = [...xml.querySelectorAll("item")].slice(0, count).map(it => {
        let image = "";
        const mt = it.getElementsByTagName("media:thumbnail")[0] || it.getElementsByTagNameNS("*","thumbnail")[0];
        if (mt) image = (mt.getAttribute("url") || mt.textContent || "").trim();
        if (!image){
          const html = pick(it,"content:encoded") || pick(it,"description");
          const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (m) image = m[1];
        }
        return { title: pick(it,"title"), url: pick(it,"link"), image, date: fmtDate(pick(it,"pubDate")) };
      });
      if (items.length) return items;
    }catch(e){}
  }
  return null;
}

load("data/settings.json").then(async s => {
  $("note-link").href = s.note_url;
  const box = $("news-body");
  const rowMode = s.news_style === "row";

  const cardHTML = it => `<a class="news-card" href="${esc(it.url)}" target="_blank" rel="noopener">
    ${it.image ? `<img class="news-thumb" src="${esc(it.image)}" alt="" loading="lazy">` : `<div class="news-thumb"></div>`}
    <h3>${esc(it.title)}</h3>${it.date ? `<time>${esc(it.date)}</time>` : ""}</a>`;
  const rowHTML = it => `<a class="news-row" href="${esc(it.url)}" target="_blank" rel="noopener">
    <span class="news-row-title">${esc(it.title)}</span>${it.date ? `<time>${esc(it.date)}</time>` : ""}</a>`;

  let items = await fetchNote(s.note_url, s.news_count || 6);
  if (!items && s.news_manual && s.news_manual.length){
    items = s.news_manual.map(m => ({ ...m, date: m.date ? fmtDate(m.date) || m.date : "" }));
  }

  if (items && items.length){
    box.className = rowMode ? "news-rows" : "news-grid";
    box.innerHTML = items.map(rowMode ? rowHTML : cardHTML).join("");
  } else {
    box.className = "";
    box.innerHTML = `<p class="muted">最新の記事は <a href="${esc(s.note_url)}" target="_blank" rel="noopener">note</a> でご覧ください。</p>`;
  }

  /* ---- Contact ---- */
  const c = $("contact-body");
  const note = s.contact_text ? `<p class="contact-note">${esc(s.contact_text)}</p>` : "";
  if (!s.gform_url){
    c.innerHTML = note + `<p class="muted">連絡フォームは準備中です。</p>`;
  } else if (s.contact_mode === "embed"){
    let u = s.gform_url;
    if (u.includes("docs.google.com/forms") && !u.includes("embedded=true"))
      u += (u.includes("?") ? "&" : "?") + "embedded=true";
    c.innerHTML = note + `<div class="contact-embed"><iframe src="${esc(u)}" title="連絡フォーム" loading="lazy"></iframe></div>`;
  } else {
    c.innerHTML = note + `<p style="text-align:center;margin:3rem 0"><a class="contact-btn" href="${esc(s.gform_url)}" target="_blank" rel="noopener">連絡フォームを開く</a></p>`;
  }

  $("footer-text").textContent = s.footer_text || "";
}).catch(()=>{});
