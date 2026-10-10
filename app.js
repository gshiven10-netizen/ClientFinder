const $ = s => document.querySelector(s), view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//.test(u || '') ? esc(u) : '#';
const money = n => n ? '₹' + Number(n).toLocaleString('en-IN') : 'Free';
const date = t => new Date(t * 1000).toLocaleDateString();
const CATS = ['Web app', 'Mobile app', 'AI / ML', 'Game', 'Tool / CLI', 'Template', 'Other'];
let me = null, signup = false;

async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }
const need = () => { if (!me) { openAuth(false); return false; } return true; };

function renderAuth() {
  $('#auth').innerHTML = me
    ? `<a class="btn sm" href="#/dash">${me.role === 'seller' ? 'Seller dashboard' : 'My orders'}</a><span class="meta">${esc(me.name)}</span><button class="btn sm" data-act="logout">Sign out</button>`
    : `<button class="btn sm" data-act="login">Sign in</button><button class="btn primary sm" data-act="signup">Join free</button>`;
}
function openAuth(isSignup) {
  signup = isSignup; $('#authTitle').textContent = isSignup ? 'Create your account' : 'Sign in';
  $('#nameRow').hidden = $('#roleRow').hidden = !isSignup;
  $('#authSwitch').textContent = isSignup ? 'I already have an account' : 'Create an account';
  $('#authErr').textContent = ''; $('#authDlg').showModal();
}

const projCard = p => `<a class="card" href="#/p/${p.id}"><span class="tag">${esc(p.category)}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><span class="meta">${esc(p.tech)} · by ${esc(p.seller_name)}</span><span class="price">${money(p.price)}</span></a>`;
const feedCard = f => `<a class="card" href="${safeUrl(f.url)}" target="_blank" rel="noopener noreferrer"><div class="row">${f.img ? `<img src="${safeUrl(f.img)}" alt="" loading="lazy">` : ''}<h3>${esc(f.title)}</h3></div><p>${esc(f.text)}</p><span class="meta">${esc(f.meta)}</span></a>`;
const empty = m => `<div class="empty">${m}</div>`;

const routes = {
  async home() {
    view.innerHTML = `<section class="hero"><h1>Finished a project? Find the person who needs it.</h1><p>Sellers list apps, tools and templates. Buyers browse, message the maker and buy.</p><a class="btn primary" href="#/dash">${me?.role === 'seller' ? 'List a project' : 'Start selling'}</a></section>
    <div class="bar"><input id="q" type="search" placeholder="Search by title or tech" aria-label="Search"><select id="cat" aria-label="Category"><option value="">All categories</option>${CATS.map(c => `<option>${c}</option>`).join('')}</select></div><div id="list" class="grid"></div>`;
    const load = async () => {
      const list = await api(`/projects?q=${encodeURIComponent($('#q').value)}&category=${encodeURIComponent($('#cat').value)}`);
      $('#list').innerHTML = list.length ? list.map(projCard).join('') : empty('No projects match. Try a different search, or be the first to list one.');
    };
    let t; $('#q').oninput = () => { clearTimeout(t); t = setTimeout(load, 250); }; $('#cat').onchange = load; load();
  },
  async discover() {
    view.innerHTML = `<h1>Live discover</h1><p class="meta">Real-time results from public APIs. Use them to spot trends and find makers to invite.</p>
    <div class="tabs" role="group" aria-label="Source">${[['github', 'GitHub repos'], ['devto', 'DEV articles'], ['hn', 'Show HN']].map(([k, l], i) => `<button class="btn" data-src="${k}" aria-pressed="${!i}">${l}</button>`).join('')}</div>
    <div class="bar"><input id="q" type="search" placeholder="Topic, e.g. react, inventory, ai" aria-label="Topic"></div><div id="list" class="grid"></div>`;
    let src = 'github';
    const load = async () => {
      $('#list').innerHTML = empty('Loading…');
      try { const d = await api(`/discover?source=${src}&q=${encodeURIComponent($('#q').value)}`); $('#list').innerHTML = d.length ? d.map(feedCard).join('') : empty('Nothing found for that topic.'); }
      catch (e) { $('#list').innerHTML = empty(esc(e.message)); }
    };
    view.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { src = b.dataset.src; view.querySelectorAll('[data-src]').forEach(x => x.setAttribute('aria-pressed', x === b)); load(); });
    let t; $('#q').oninput = () => { clearTimeout(t); t = setTimeout(load, 500); }; load();
  },
  async project(id) {
    let p; try { p = await api('/projects/' + id); } catch (e) { return view.innerHTML = empty(esc(e.message)); }
    const own = me && me.id === p.seller_id;
    view.innerHTML = `<div class="detail"><article><span class="tag">${esc(p.category)}</span><h1>${esc(p.title)}</h1><p class="meta">${esc(p.tech)} · by ${esc(p.seller_name)} · listed ${date(p.created)}</p><p><strong>${esc(p.summary)}</strong></p><div class="desc">${esc(p.description)}</div>
      <p>${p.demo_url ? `<a class="btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(p.demo_url)}">Live demo</a> ` : ''}${p.repo_url ? `<a class="btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(p.repo_url)}">Source</a>` : ''}</p></article>
      <aside class="panel"><div class="price">${money(p.price)}</div>${own ? '<p class="meta">This is your listing.</p>' : me?.role === 'seller' ? '<p class="meta">Sign in as a buyer to purchase.</p>' : `<button class="btn primary" data-act="buy" data-id="${p.id}">Buy now</button>
      <form id="inq" class="stack"><label>Message the seller<textarea name="message" rows="4" required minlength="5" maxlength="1000" placeholder="Ask about features, licence or support"></textarea></label><button class="btn">Send message</button></form>`}</aside></div>`;
    const f = $('#inq'); if (f) f.onsubmit = async e => { e.preventDefault(); if (!need()) return; try { await api(`/projects/${id}/inquiries`, 'POST', { message: f.message.value }); f.reset(); toast('Message sent'); } catch (x) { toast(x.message); } };
  },
  async dash() {
    if (!me) { view.innerHTML = empty('Sign in to see your dashboard.'); return openAuth(false); }
    const [inq, ord] = await Promise.all([api('/my/inquiries'), api('/my/orders')]);
    const seller = me.role === 'seller', mine = seller ? await api('/my/projects') : [];
    view.innerHTML = `<h1>${seller ? 'Seller dashboard' : 'My account'}</h1>
    ${seller ? `<h2 id="form">${'List a project'}</h2><form id="pf" class="stack">
      <label>Title<input name="title" required minlength="4" maxlength="100"></label>
      <label>One-line summary<input name="summary" required minlength="10" maxlength="200"></label>
      <label>Full description<textarea name="description" rows="6" required minlength="30" maxlength="5000"></textarea></label>
      <div class="two"><label>Category<select name="category">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label><label>Price in ₹ (0 = free)<input name="price" type="number" min="0" value="0" required></label></div>
      <label>Tech stack<input name="tech" required placeholder="React, Node, PostgreSQL"></label>
      <div class="two"><label>Demo URL<input name="demo_url" type="url" placeholder="https://"></label><label>Repository URL<input name="repo_url" type="url" placeholder="https://"></label></div>
      <button class="btn primary">Publish listing</button></form>
      <h2>Your listings</h2>${mine.length ? `<div class="grid">${mine.map(p => projCard(p).replace('</a>', '</a>') ).join('')}</div>` : empty('You have no listings yet.')}
      ${mine.length ? `<div class="scroll"><table><tr><th>Title</th><th></th></tr>${mine.map(p => `<tr><td>${esc(p.title)}</td><td><button class="btn danger sm" data-act="del" data-id="${p.id}">Delete</button></td></tr>`).join('')}</table></div>` : ''}` : ''}
    <h2>${seller ? 'Buyer messages' : 'My messages'}</h2>${inq.length ? `<div class="scroll"><table><tr><th>Project</th>${seller ? '<th>From</th>' : ''}<th>Message</th><th>Date</th></tr>${inq.map(i => `<tr><td>${esc(i.title)}</td>${seller ? `<td>${esc(i.buyer_name)}<br><span class="meta">${esc(i.buyer_email)}</span></td>` : ''}<td>${esc(i.message)}</td><td>${date(i.created)}</td></tr>`).join('')}</table></div>` : empty('No messages yet.')}
    <h2>${seller ? 'Sales' : 'Purchases'}</h2>${ord.length ? `<div class="scroll"><table><tr><th>Project</th><th>Amount</th><th>Date</th>${seller ? '' : '<th>Access</th>'}</tr>${ord.map(o => `<tr><td>${esc(o.title)}</td><td>${money(o.amount)}</td><td>${date(o.created)}</td>${seller ? '' : `<td>${o.repo_url ? `<a target="_blank" rel="noopener noreferrer" href="${safeUrl(o.repo_url)}">Source</a>` : 'Seller will contact you'}</td>`}</tr>`).join('')}</table></div>` : empty('Nothing here yet.')}`;
    const f = $('#pf'); if (f) f.onsubmit = async e => { e.preventDefault(); try { await api('/projects', 'POST', Object.fromEntries(new FormData(f))); toast('Published'); route(); } catch (x) { toast(x.message); } };
  },
};

async function route() {
  const h = location.hash.slice(2).split('/');
  try { await (h[0] === 'discover' ? routes.discover() : h[0] === 'p' ? routes.project(+h[1]) : h[0] === 'dash' ? routes.dash() : routes.home()); }
  catch (e) { view.innerHTML = empty(esc(e.message)); }
  scrollTo(0, 0);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'login') openAuth(false); else if (a === 'signup') openAuth(true);
  else if (a === 'toggleAuth') openAuth(!signup); else if (a === 'closeAuth') $('#authDlg').close();
  else if (a === 'logout') { await api('/auth/logout', 'POST'); me = null; renderAuth(); location.hash = '#/'; route(); }
  else if (a === 'buy') { if (!need()) return; try { await api(`/projects/${b.dataset.id}/buy`, 'POST'); toast('Purchase recorded'); location.hash = '#/dash'; } catch (x) { toast(x.message); } }
  else if (a === 'del' && confirm('Delete this listing?')) { try { await api('/projects/' + b.dataset.id, 'DELETE'); route(); } catch (x) { toast(x.message); } }
});
$('#authForm').onsubmit = async e => {
  e.preventDefault(); const f = e.target, body = Object.fromEntries(new FormData(f));
  try { me = await api(signup ? '/auth/register' : '/auth/login', 'POST', body); $('#authDlg').close(); f.reset(); renderAuth(); toast('Welcome, ' + me.name); route(); }
  catch (x) { $('#authErr').textContent = x.message; }
};
window.addEventListener('hashchange', route);
api('/me').then(u => me = u).catch(() => {}).finally(() => { renderAuth(); route(); });
