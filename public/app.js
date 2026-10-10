const $ = s => document.querySelector(s), view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//.test(u || '') ? esc(u) : '#';
const money = n => n ? '₹' + Number(n).toLocaleString('en-IN') : 'Free';
const date = t => new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const CATS = ['Web app', 'Mobile app', 'AI / ML', 'Game', 'Tool / CLI', 'Template', 'Other'];
let me = null, signup = false, activeContactId = null, activeProjectId = null, ws = null;

async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, {
    credentials: 'same-origin',
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'fetch',
      ...(localStorage.getItem('cf_token') ? { 'Authorization': 'Bearer ' + localStorage.getItem('cf_token') } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

const need = () => { if (!me) { openAuth(false); return false; } return true; };

// WebSocket connection for real-time live events & chat
function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/ws`);
  ws.onmessage = e => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'chat_message') {
        if (activeContactId === data.message.sender_id) {
          appendChatMessage(data.message);
        } else {
          toast(`💬 New message from ${data.message.sender_name}`);
        }
      } else if (data.type === 'order_notification') {
        toast(`💰 New Order: ${data.buyer_name} purchased ${data.project_title}!`);
      }
    } catch (err) {}
  };
  ws.onclose = () => { setTimeout(connectWebSocket, 4000); };
}

function renderAuth() {
  $('#auth').innerHTML = me
    ? `
      <button class="btn sm" data-act="openChatList">💬 Messages</button>
      <a class="btn sm" href="#/dash">${me.role === 'seller' ? 'Seller Hub' : 'My Acquisitions'}</a>
      <span class="badge-pill" style="margin:0">${esc(me.name)} (${me.role})</span>
      <button class="btn sm danger" data-act="logout">Sign out</button>
    `
    : `
      <button class="btn sm" data-act="login">Sign in</button>
      <button class="btn primary sm" data-act="signup">Join Marketplace</button>
    `;
}

function openAuth(isSignup) {
  signup = isSignup;
  $('#authTitle').textContent = isSignup ? 'Create Maker/Buyer Account' : 'Welcome Back';
  $('#nameRow').hidden = $('#roleRow').hidden = !isSignup;
  $('#authSwitch').textContent = isSignup ? 'I already have an account' : "Don't have an account? Sign up";
  $('#authErr').textContent = '';
  $('#authDlg').showModal();
}

const projCard = p => `
  <a class="card" href="#/p/${p.id}">
    <div class="card-top">
      <span class="tag">${esc(p.category)}</span>
      <span class="rating-pill">★ ${p.avg_rating > 0 ? p.avg_rating : 'New'} ${p.review_count ? `(${p.review_count})` : ''}</span>
    </div>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.summary)}</p>
    <div class="meta" style="margin-top:auto">
      <span>${esc(p.tech)}</span>
      <div>by <strong>${esc(p.seller_name)}</strong></div>
    </div>
    <div class="card-footer">
      <span class="price">${money(p.price)}</span>
      <span class="btn sm primary">Inspect & Buy →</span>
    </div>
  </a>
`;

const feedCard = f => `
  <a class="card" href="${safeUrl(f.url)}" target="_blank" rel="noopener noreferrer">
    <div class="row" style="display:flex;align-items:center;gap:0.75rem">
      ${f.img ? `<img src="${safeUrl(f.img)}" alt="" style="width:32px;height:32px;border-radius:50%">` : ''}
      <h3 style="font-size:1.05rem">${esc(f.title)}</h3>
    </div>
    <p>${esc(f.text || 'No description provided.')}</p>
    <div class="card-footer">
      <span class="meta">${esc(f.meta)}</span>
      <span class="link" style="font-size:0.85rem">View Source ↗</span>
    </div>
  </a>
`;

const empty = m => `<div class="empty" style="padding:4rem 1.5rem;text-align:center;color:var(--muted);border:1px dashed var(--surface-border);border-radius:16px;">${m}</div>`;

const routes = {
  async home() {
    view.innerHTML = `
      <section class="hero">
        <span class="badge-pill">✨ The Verified Micro-Acquisition Exchange</span>
        <h1>Buy & Sell Production-Ready Codebases with Confidence.</h1>
        <p>A trusted marketplace where developers monetize completed SaaS apps, developer tools, and turnkey templates with built-in Escrow security and automated AI repo audits.</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          <a class="btn primary" href="#/dash">${me?.role === 'seller' ? 'List Your Project' : 'Become a Seller'}</a>
          <a class="btn" href="#/discover">Explore Live Tech Radar</a>
        </div>
      </section>

      <div class="bar">
        <input id="q" type="search" placeholder="Search by framework, stack (React, Python, Go) or keyword..." aria-label="Search">
        <select id="cat" aria-label="Category">
          <option value="">All Categories</option>
          ${CATS.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div id="list" class="grid"></div>
    `;

    const load = async () => {
      const q = encodeURIComponent($('#q').value);
      const cat = encodeURIComponent($('#cat').value);
      const list = await api(`/projects?q=${q}&category=${cat}`);
      $('#list').innerHTML = list.length ? list.map(projCard).join('') : empty('No matching projects found. Be the first maker to publish in this category!');
    };

    let t;
    $('#q').oninput = () => { clearTimeout(t); t = setTimeout(load, 250); };
    $('#cat').onchange = load;
    load();
  },

  async discover() {
    view.innerHTML = `
      <div style="margin-bottom:2rem">
        <span class="badge-pill">📡 Live Global Telemetry</span>
        <h1>Real-Time Developer Radar</h1>
        <p class="meta" style="font-size:1rem;margin-top:0.4rem">Direct live streams from GitHub, DEV.to and Hacker News Show HN. Discover trending open projects and maker opportunities.</p>
      </div>

      <div class="bar">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn sm" data-src="github" style="background:var(--primary);color:#fff">GitHub Repos</button>
          <button class="btn sm" data-src="hn">Show HN</button>
          <button class="btn sm" data-src="devto">DEV Articles</button>
        </div>
        <input id="q" type="search" placeholder="Filter topic (e.g. ai, saas, nextjs, postgres)..." aria-label="Topic" style="flex:1">
      </div>
      <div id="list" class="grid"></div>
    `;

    let src = 'github';
    const load = async () => {
      $('#list').innerHTML = empty('Fetching real-time API feeds...');
      try {
        const d = await api(`/discover?source=${src}&q=${encodeURIComponent($('#q').value)}`);
        $('#list').innerHTML = d.length ? d.map(feedCard).join('') : empty('No feeds discovered for this query.');
      } catch (e) {
        $('#list').innerHTML = empty(esc(e.message));
      }
    };

    view.querySelectorAll('[data-src]').forEach(b => {
      b.onclick = () => {
        src = b.dataset.src;
        view.querySelectorAll('[data-src]').forEach(x => {
          x.style.background = x === b ? 'var(--primary)' : 'var(--surface)';
          x.style.color = x === b ? '#fff' : 'var(--ink)';
        });
        load();
      };
    });

    let t;
    $('#q').oninput = () => { clearTimeout(t); t = setTimeout(load, 400); };
    load();
  },

  async project(id) {
    let p;
    try { p = await api('/projects/' + id); }
    catch (e) { return view.innerHTML = empty(esc(e.message)); }

    const isOwner = me && me.id === p.seller_id;
    view.innerHTML = `
      <div class="detail">
        <article>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="tag">${esc(p.category)}</span>
            <span class="rating-pill" style="font-size:1rem">★ ${p.avg_rating > 0 ? p.avg_rating : 'No reviews yet'} (${p.review_count || 0})</span>
          </div>

          <h1>${esc(p.title)}</h1>
          <div class="meta" style="font-size:0.95rem">
            Stack: <strong>${esc(p.tech)}</strong> · Listed by <strong>${esc(p.seller_name)}</strong> (${esc(p.seller_email)}) · ${date(p.created)}
          </div>

          <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
            ${p.demo_url ? `<a class="btn sm" href="${safeUrl(p.demo_url)}" target="_blank" rel="noopener noreferrer">🌐 Live Demo</a>` : ''}
            ${p.repo_url ? `<a class="btn sm" href="${safeUrl(p.repo_url)}" target="_blank" rel="noopener noreferrer">📦 Repository Link</a>` : ''}
            <button class="btn sm accent" id="runAiAuditBtn">🤖 Run AI Codebase & Valuation Audit</button>
          </div>

          <div id="aiAuditContainer"></div>

          <div>
            <h3 style="margin-bottom:0.6rem">Executive Summary</h3>
            <p style="color:var(--ink-secondary);font-size:1.05rem">${esc(p.summary)}</p>
          </div>

          <div>
            <h3 style="margin-bottom:0.6rem">Full Architecture & Deliverables</h3>
            <div class="desc">${esc(p.description)}</div>
          </div>

          <!-- Reviews section -->
          <div style="margin-top:1.5rem">
            <h3>Verified Buyer Reviews (${p.reviews?.length || 0})</h3>
            ${me && me.role === 'buyer' && !isOwner ? `
              <form id="reviewForm" style="background:#0B0F19;padding:1.2rem;border-radius:12px;border:1px solid var(--surface-border);margin:1rem 0;display:grid;gap:0.75rem">
                <h4 style="font-size:1rem">Leave a Review</h4>
                <div style="display:flex;gap:1rem;align-items:center">
                  <label style="font-size:0.85rem">Rating:
                    <select name="rating" style="width:auto;margin-left:0.5rem">
                      <option value="5">★★★★★ (5 - Outstanding)</option>
                      <option value="4">★★★★☆ (4 - Great)</option>
                      <option value="3">★★★☆☆ (3 - Average)</option>
                      <option value="2">★★☆☆☆ (2 - Subpar)</option>
                      <option value="1">★☆☆☆☆ (1 - Poor)</option>
                    </select>
                  </label>
                </div>
                <textarea name="comment" rows="2" placeholder="Describe code quality, documentation, and handover experience..." required></textarea>
                <button class="btn primary sm" style="width:fit-content" type="submit">Submit Review</button>
              </form>
            ` : ''}

            <div style="display:grid;gap:1rem;margin-top:1rem">
              ${p.reviews && p.reviews.length ? p.reviews.map(r => `
                <div style="background:#0B0F19;padding:1rem;border-radius:10px;border:1px solid var(--surface-border)">
                  <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem">
                    <strong>${esc(r.buyer_name)}</strong>
                    <span class="rating-pill">★ ${r.rating}/5</span>
                  </div>
                  <p style="color:var(--ink-secondary);font-size:0.92rem">${esc(r.comment)}</p>
                  <span class="meta" style="font-size:0.75rem">${date(r.created)}</span>
                </div>
              `).join('') : '<p class="meta">No reviews submitted yet for this project.</p>'}
            </div>
          </div>
        </article>

        <aside class="panel">
          <div>
            <span class="meta">Acquisition Price</span>
            <div class="price" style="font-size:2.2rem;margin-top:0.2rem">${money(p.price)}</div>
          </div>

          <div style="background:#0B0F19;padding:1rem;border-radius:12px;border:1px solid var(--surface-border);font-size:0.88rem;color:var(--ink-secondary)">
            🛡️ <strong>ClientFinder Escrow Protection</strong><br>
            Funds remain held in escrow until complete codebase handover is confirmed by you.
          </div>

          ${isOwner ? `
            <div style="padding:1rem;background:rgba(99,102,241,0.1);border-radius:10px;border:1px solid rgba(99,102,241,0.3)">
              <strong>You are the author of this listing.</strong>
            </div>
          ` : `
            <button class="btn primary" style="width:100%;padding:0.9rem" data-act="openEscrowCheckout" data-id="${p.id}" data-title="${esc(p.title)}" data-price="${p.price}">
              🔒 Secure Escrow Checkout
            </button>
            <button class="btn" style="width:100%" data-act="startChat" data-seller-id="${p.seller_id}" data-seller-name="${esc(p.seller_name)}" data-project-id="${p.id}">
              💬 Live Chat with Seller
            </button>
          `}
        </aside>
      </div>
    `;

    // AI audit button trigger
    const aiBtn = $('#runAiAuditBtn');
    if (aiBtn) {
      aiBtn.onclick = async () => {
        if (!need()) return;
        aiBtn.disabled = true;
        aiBtn.textContent = '⚡ Running Gemini Codebase Health & Valuation Analysis...';
        const container = $('#aiAuditContainer');
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--primary)">Auditing repository AST, dependencies, and calculating commercial market valuation...</div>';
        try {
          const res = await api(`/projects/${id}/ai-inspect`);
          container.innerHTML = `
            <div class="ai-card">
              <div class="ai-header">
                <span class="ai-badge">🤖 Gemini Verified AI Audit</span>
                <span style="font-weight:700;color:#34D399;font-size:1.1rem">${res.grade}</span>
              </div>
              <p style="color:var(--ink-secondary);font-size:0.95rem">${esc(res.ai_summary)}</p>

              <div class="ai-grid">
                <div class="ai-stat">
                  <div class="ai-stat-label">Calculated Health Score</div>
                  <div class="ai-stat-val" style="color:#A5B4FC">${res.overall_health}</div>
                </div>
                <div class="ai-stat">
                  <div class="ai-stat-label">AI Estimated Market Value</div>
                  <div class="ai-stat-val" style="color:#34D399">${money(res.commercial_valuation.ai_estimated_market_value)}</div>
                </div>
              </div>

              <div style="background:#0B0F19;border-radius:10px;padding:0.8rem;border:1px solid var(--surface-border)">
                <div style="font-size:0.82rem;font-weight:700;margin-bottom:0.5rem;color:#fff">Audit Breakdown Factors:</div>
                <div style="display:grid;gap:0.4rem;font-size:0.82rem">
                  ${res.code_quality_factors.map(f => `
                    <div style="display:flex;justify-content:space-between">
                      <span style="color:var(--muted)">${f.metric}</span>
                      <strong style="color:#F8FAFC">${f.score} (${f.status})</strong>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
          aiBtn.textContent = '✓ AI Audit Completed';
        } catch (err) {
          container.innerHTML = `<div class="err">${esc(err.message)}</div>`;
          aiBtn.disabled = false;
          aiBtn.textContent = 'Retry AI Audit';
        }
      };
    }

    // Review form handler
    const rf = $('#reviewForm');
    if (rf) {
      rf.onsubmit = async e => {
        e.preventDefault();
        try {
          await api(`/projects/${id}/reviews`, 'POST', Object.fromEntries(new FormData(rf)));
          toast('Review submitted successfully!');
          routes.project(id);
        } catch (x) { toast(x.message); }
      };
    }
  },

  async dash() {
    if (!need()) return;
    const isSeller = me.role === 'seller';
    let mine = [], orders = [];
    try {
      if (isSeller) mine = await api('/my/projects');
      orders = await api('/my/orders');
    } catch (e) { return view.innerHTML = empty(esc(e.message)); }

    view.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem">
        <div>
          <span class="badge-pill">${isSeller ? '👨‍💻 Seller Control Center' : '💼 Buyer Acquisition Hub'}</span>
          <h1>Welcome, ${esc(me.name)}</h1>
        </div>
        <button class="btn sm" data-act="openChatList">💬 Live Chat Drawer</button>
      </div>

      ${isSeller ? `
        <div style="background:var(--surface);border:1px solid var(--surface-border);border-radius:18px;padding:2rem;margin-bottom:2.5rem">
          <h2>Create New Marketplace Listing</h2>
          <form id="newProjForm" style="display:grid;gap:1rem;max-width:760px">
            <div>
              <label>Project Title *</label>
              <input name="title" required placeholder="e.g. SkuMaster – Multi-Warehouse Inventory Platform">
            </div>
            <div>
              <label>Elevator Pitch / Summary (1-2 sentences) *</label>
              <input name="summary" required placeholder="Brief value proposition for prospective buyers">
            </div>
            <div>
              <label>Full Architecture, Included Deliverables & Features *</label>
              <textarea name="description" rows="5" required placeholder="Describe technical architecture, deployment process, what credentials/licenses are transferred..."></textarea>
            </div>
            <div class="form-row-2">
              <div>
                <label>Category *</label>
                <select name="category">${CATS.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
              </div>
              <div>
                <label>Asking Price (₹) *</label>
                <input name="price" type="number" min="0" value="15000" required>
              </div>
            </div>
            <div>
              <label>Tech Stack Tags *</label>
              <input name="tech" required placeholder="e.g. Next.js 14, Tailwind, Prisma, PostgreSQL">
            </div>
            <div class="form-row-2">
              <div>
                <label>Demo URL (Optional)</label>
                <input name="demo_url" type="url" placeholder="https://demo.myapp.com">
              </div>
              <div>
                <label>Repository URL (Enables AI Audits)</label>
                <input name="repo_url" type="url" placeholder="https://github.com/org/repo">
              </div>
            </div>
            <button class="btn primary" style="width:fit-content;margin-top:0.5rem" type="submit">Publish to Exchange</button>
          </form>
        </div>

        <h2>Your Published Listings (${mine.length})</h2>
        ${mine.length ? `
          <div class="scroll">
            <table>
              <tr><th>Title</th><th>Category</th><th>Price</th><th>Rating</th><th>Actions</th></tr>
              ${mine.map(p => `
                <tr>
                  <td><strong>${esc(p.title)}</strong></td>
                  <td><span class="tag">${esc(p.category)}</span></td>
                  <td><strong style="color:#34D399">${money(p.price)}</strong></td>
                  <td>★ ${p.avg_rating > 0 ? p.avg_rating : 'New'}</td>
                  <td>
                    <a class="btn sm" href="#/p/${p.id}">View</a>
                    <button class="btn sm danger" data-act="del" data-id="${p.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : empty('You have not published any projects yet.')}
      ` : ''}

      <h2>${isSeller ? 'Escrow Inflows & Sales' : 'Your Acquired Codebases'} (${orders.length})</h2>
      ${orders.length ? `
        <div class="scroll">
          <table>
            <tr>
              <th>Project Title</th>
              <th>Amount</th>
              <th>Escrow Status</th>
              <th>Date</th>
              <th>${isSeller ? 'Purchased By' : 'Repository Access'}</th>
            </tr>
            ${orders.map(o => `
              <tr>
                <td><strong>${esc(o.title)}</strong></td>
                <td><strong style="color:#34D399">${money(o.amount)}</strong></td>
                <td><span class="badge-pill" style="margin:0;color:#34D399;border-color:rgba(16,185,129,0.3)">✓ ${esc(o.status || 'Secured in Escrow')}</span></td>
                <td>${date(o.created)}</td>
                <td>
                  ${isSeller 
                    ? `${esc(o.buyer_name)} (${esc(o.buyer_email)})` 
                    : (o.repo_url ? `<a class="btn sm primary" href="${safeUrl(o.repo_url)}" target="_blank" rel="noopener noreferrer">Clone Codebase ↗</a>` : 'Contact seller via chat')}
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : empty('No transaction records found.')}
    `;

    const pf = $('#newProjForm');
    if (pf) {
      pf.onsubmit = async e => {
        e.preventDefault();
        try {
          await api('/projects', 'POST', Object.fromEntries(new FormData(pf)));
          toast('Project listing published live!');
          routes.dash();
        } catch (x) { toast(x.message); }
      };
    }
  }
};

async function route() {
  const h = location.hash.slice(2).split('/');
  try {
    if (h[0] === 'discover') await routes.discover();
    else if (h[0] === 'p') await routes.project(+h[1]);
    else if (h[0] === 'dash') await routes.dash();
    else await routes.home();
  } catch (e) {
    view.innerHTML = empty(esc(e.message));
  }
  scrollTo(0, 0);
}

// Global Event Listeners
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;

  if (a === 'login') openAuth(false);
  else if (a === 'signup') openAuth(true);
  else if (a === 'toggleAuth') openAuth(!signup);
  else if (a === 'closeAuth') $('#authDlg').close();
  else if (a === 'logout') {
    await api('/auth/logout', 'POST');
    localStorage.removeItem('cf_token');
    me = null;
    renderAuth();
    location.hash = '#/';
    route();
    toast('Logged out successfully.');
  }
  else if (a === 'del' && confirm('Are you sure you want to delete this listing?')) {
    try {
      await api('/projects/' + b.dataset.id, 'DELETE');
      toast('Listing deleted');
      route();
    } catch (x) { toast(x.message); }
  }
  else if (a === 'openEscrowCheckout') {
    if (!need()) return;
    $('#escrowTitle').textContent = b.dataset.title;
    $('#escrowPrice').textContent = money(b.dataset.price);
    $('#confirmEscrowBuyBtn').dataset.id = b.dataset.id;
    $('#escrowDlg').showModal();
  }
  else if (a === 'confirmEscrowPayment') {
    const projId = b.dataset.id;
    b.disabled = true;
    b.textContent = 'Processing Escrow Vault...';
    try {
      await api(`/projects/${projId}/buy`, 'POST', { payment_method: $('#paymentSelect').value });
      $('#escrowDlg').close();
      toast('🔒 Escrow Payment Confirmed & Vaulted!');
      location.hash = '#/dash';
    } catch (x) {
      toast(x.message);
    } finally {
      b.disabled = false;
      b.textContent = 'Confirm Escrow Deposit';
    }
  }
  else if (a === 'startChat') {
    if (!need()) return;
    openChatDrawer(+b.dataset.sellerId, b.dataset.sellerName, +b.dataset.projectId);
  }
  else if (a === 'openChatList') {
    if (!need()) return;
    openConversationsList();
  }
  else if (a === 'closeChat') {
    $('#chatDrawer').classList.add('hidden');
  }
});

// Real-Time Chat Drawer Helpers
async function openChatDrawer(contactId, contactName, projectId) {
  activeContactId = contactId;
  activeProjectId = projectId || null;
  $('#chatTargetName').textContent = contactName;
  $('#chatDrawer').classList.remove('hidden');
  $('#chatMsgList').innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">Loading live conversation...</div>';
  
  try {
    const msgs = await api(`/messages/${contactId}`);
    $('#chatMsgList').innerHTML = msgs.length ? msgs.map(m => `
      <div class="chat-bubble ${m.sender_id === me.id ? 'mine' : 'theirs'}">
        ${esc(m.text)}
      </div>
    `).join('') : '<div style="color:var(--muted);text-align:center;padding:1rem">Say hi to negotiate terms or ask about the codebase!</div>';
    $('#chatMsgList').scrollTop = $('#chatMsgList').scrollHeight;
  } catch (err) {
    $('#chatMsgList').innerHTML = `<div class="err">${esc(err.message)}</div>`;
  }
}

async function openConversationsList() {
  try {
    const chats = await api('/chats');
    if (!chats.length) return toast('You have no active message conversations yet.');
    const first = chats[0];
    openChatDrawer(first.contact_id, `${first.contact_name} (${first.contact_role})`, first.project_id);
  } catch (err) {
    toast('Error loading conversations');
  }
}

function appendChatMessage(m) {
  const container = $('#chatMsgList');
  if (!container) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${m.sender_id === me.id ? 'mine' : 'theirs'}`;
  bubble.textContent = m.text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

$('#chatForm').onsubmit = async e => {
  e.preventDefault();
  const input = $('#chatInput');
  const txt = input.value.trim();
  if (!txt || !activeContactId) return;
  input.value = '';
  try {
    const sent = await api(`/messages/${activeContactId}`, 'POST', { text: txt, project_id: activeProjectId });
    appendChatMessage(sent);
  } catch (err) {
    toast(err.message);
  }
};

$('#authForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, body = Object.fromEntries(new FormData(f));
  try {
    const res = await api(signup ? '/auth/register' : '/auth/login', 'POST', body);
    if (res.token) localStorage.setItem('cf_token', res.token);
    me = res;
    $('#authDlg').close();
    f.reset();
    renderAuth();
    toast(`Welcome, ${me.name}!`);
    connectWebSocket();
    route();
  } catch (x) {
    $('#authErr').textContent = x.message;
  }
};

window.addEventListener('hashchange', route);

// Initialize app & restore auth session
api('/me')
  .then(u => { me = u; connectWebSocket(); })
  .catch(() => {})
  .finally(() => { renderAuth(); route(); });
