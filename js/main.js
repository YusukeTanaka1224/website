/* データ(data/*.json)を読み込んで表示します。内容の編集は管理画面(/admin)から。 */
const $ = id => document.getElementById(id);
const esc = s => { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; };

async function load(path){ const r = await fetch(path + "?v=" + Date.now()); return r.json(); }

/* ---- Profile ---- */
load("data/profile.json").then(p => {
  $("hero-name-ja").textContent = p.name_ja;
  $("hero-name-en").textContent = p.name_en;
  $("hero-tagline").textContent = p.tagline || "";
  document.title = `${p.name_ja} | ${p.name_en}`;
  $("profile-affil").innerHTML = (p.affiliations || []).map(a => esc(a)).join("<br>");
  $("profile-bio").innerHTML = (p.bio || "").split(/\n\s*\n/).map(par => `<p>${esc(par.trim())}</p>`).join("");
}).catch(()=>{});

/* ---- Publications ---- */
load("data/publications.json").then(d => {
  $("pub-lede").textContent = d.lede || "";
  $("pub-list").innerHTML = (d.items || []).map(it => {
    const links = [];
    if (it.pdf)  links.push(`<a href="${esc(it.pdf)}" target="_blank" rel="noopener">PDF ↓</a>`);
    if (it.link) links.push(`<a href="${esc(it.link)}" target="_blank" rel="noopener">Link →</a>`);
    return `<li><div>
      <p class="pub-title">${esc(it.title)}</p>
      <p class="pub-meta">${esc(it.venue)}${it.venue && it.year ? "　·　" : ""}${esc(it.year)}</p>
      ${links.length ? `<p class="pub-links">${links.join("")}</p>` : ""}
    </div></li>`;
  }).join("");
}).catch(()=>{});

/* ---- News（noteのRSSを自動取得。失敗時は手動リスト→リンクのみ、の順に切替） ---- */
load("data/settings.json").then(async s => {
  $("note-link").href = s.note_url;
  const grid = $("news-grid");
  const card = it => `<a class="news-card" href="${esc(it.url)}" target="_blank" rel="noopener">
    ${it.image ? `<img class="news-thumb" src="${esc(it.image)}" alt="" loading="lazy">` : `<div class="news-thumb"></div>`}
    <h3>${esc(it.title)}</h3>${it.date ? `<time>${esc(it.date)}</time>` : ""}</a>`;

  let items = [];
  try {
    const rss = encodeURIComponent(s.note_url.replace(/\/$/, "") + "/rss");
    const r = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + rss);
    const j = await r.json();
    if (j.status === "ok") {
      items = j.items.slice(0, s.news_count || 6).map(i => ({
        title: i.title, url: i.link,
        image: i.thumbnail || (i.enclosure && i.enclosure.link) || "",
        date: (i.pubDate || "").slice(0, 10)
      }));
    }
  } catch (e) {}
  if (!items.length && s.news_manual && s.news_manual.length) items = s.news_manual;
  grid.innerHTML = items.length ? items.map(card).join("")
    : `<p class="muted">最新の記事は <a href="${esc(s.note_url)}" target="_blank" rel="noopener">note</a> でご覧ください。</p>`;

  /* ---- Contact ---- */
  const c = $("contact-body");
  const note = s.contact_text ? `<p class="contact-note">${esc(s.contact_text)}</p>` : "";
  if (!s.gform_url) {
    c.innerHTML = note + `<p class="muted">連絡フォームは準備中です。</p>`;
  } else if (s.contact_mode === "embed") {
    let u = s.gform_url;
    if (u.includes("docs.google.com/forms") && !u.includes("embedded=true"))
      u += (u.includes("?") ? "&" : "?") + "embedded=true";
    c.innerHTML = note + `<div class="contact-embed"><iframe src="${esc(u)}" title="連絡フォーム" loading="lazy"></iframe></div>`;
  } else {
    c.innerHTML = note + `<p style="text-align:center;margin:3rem 0"><a class="contact-btn" href="${esc(s.gform_url)}" target="_blank" rel="noopener">連絡フォームを開く</a></p>`;
  }

  $("footer-text").textContent = s.footer_text || "";
}).catch(()=>{});
