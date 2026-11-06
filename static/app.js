/* SIGNAL — synthetic-only front-end. No external dependencies. */
const state = {
  view: 'overview', consultation: null, risks: null,
  token: sessionStorage.getItem('signal_demo_token') || '',
  role: sessionStorage.getItem('signal_demo_role') || '',
  me: null, dashboard: null, feedback: null,
};
const $ = (id) => document.getElementById(id);
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const pct = (x) => Number.isFinite(Number(x)) ? `${Number(x)}%` : '—';
const good = (v) => v ? 'Yes' : 'No';
let toastTimeout;
function notify(message, bad = false) {
  const el = $('toast'); el.textContent = message; el.style.background = bad ? '#8e3e29' : '#0b3021'; el.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('show'), 4800);
}
async function request(url, method='GET', body=null) {
  const headers = {'Accept': 'application/json'};
  if (body != null) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try {response = await fetch(url, {method, headers, body: body != null ? JSON.stringify(body) : undefined});}
  catch { throw Error('Could not reach the local API. Is the Python server running?'); }
  let data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.detail || `Request failed (${response.status})`);
  return data;
}
function active(page) {
  state.view = page;
  document.querySelectorAll('.page').forEach(el => el.hidden = el.id !== `page-${page}`);
  document.querySelectorAll('.nav-button').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
  window.scrollTo({top: 0, behavior: 'smooth'});
  if (page === 'expert') renderExpert();
  if (page === 'moderator') renderModerator();
  if (page === 'library') renderLibrary();
  if (page === 'public') renderPublic();
}
function formatRisk(c) {
  const r = c?.risk || {};
  const source = c?.source || '';
  return `<div class="risk-tags"><span class="tag tag-green">${escapeHtml(r.country || 'Chad')}</span><span class="tag">${escapeHtml(r.id || 'R1043')}</span><span class="tag tag-amber">${escapeHtml(r.risk_level || 'High')} risk</span></div>
  <h3>${escapeHtml(r.title)}</h3><p class="muted">Organiser-provided ACAPS Risk Radar assessment</p>
  <div class="data-rows"><div><div class="data-label">Probability category</div><div class="data-value">${escapeHtml(r.probability_category)}</div></div><div><div class="data-label">Humanitarian impact</div><div class="data-value">${escapeHtml(r.impact)} / 5</div></div><div><div class="data-label">Risk trend</div><div class="data-value">${escapeHtml(r.trend)}</div></div><div><div class="data-label">Expected exposure</div><div class="data-value">${escapeHtml(r.exposure)}</div></div><div><div class="data-label">Status</div><div class="data-value">${escapeHtml(r.status)}</div></div><div><div class="data-label">Priority needs</div><div class="data-value">${escapeHtml(r.priority_needs)}</div></div></div>
  <div class="risk-brief"><b>Context:</b> ACAPS reports potential escalation around the Chad–Sudan border and related humanitarian needs. The event forecast below is a <b>proposed SIGNAL demonstration question</b>, not an ACAPS-approved question.</div>
  <p class="micro" style="margin-top:14px">Data source: ${escapeHtml(source)}. Do not treat demo expert observations as verified field evidence.</p>`;
}
function renderOverview() {
  const c = state.consultation;
  if (!c) return;
  $('overview-risk').innerHTML = formatRisk(c);
  const cards = [
    [c.responded + ' / ' + c.panel_size, 'Synthetic expert responses'],
    [state.risks?.count || '1', 'ACAPS risks accessible'],
    ['2', 'Consultation rounds'],
    ['100%', 'Human review required'],
  ];
  $('overview-metrics').innerHTML = cards.map(c => `<div class="metric"><div class="value">${escapeHtml(c[0])}</div><div class="label">${escapeHtml(c[1])}</div></div>`).join('');
}
async function refreshBase() {
  [state.consultation,state.risks] = await Promise.all([request('/api/consultation'),request('/api/risks')]);
  renderOverview();
}
async function login(code) {
  const res = await request('/api/login','POST',{code});
  state.token=res.token; state.role=res.role;
  sessionStorage.setItem('signal_demo_token',state.token);
  sessionStorage.setItem('signal_demo_role',state.role);
  await loadMe();
  notify(`Signed in to ${res.role} demo space`);
  return res;
}
async function loadMe() {
  if (!state.token) return;
  try { state.me = await request('/api/me'); state.role=state.me.role; }
  catch {state.token='';state.role='';state.me=null;sessionStorage.removeItem('signal_demo_token');sessionStorage.removeItem('signal_demo_role');}
}
function signOut() {
  state.token='';state.role='';state.me=null;state.dashboard=null;state.feedback=null;
  sessionStorage.removeItem('signal_demo_token');sessionStorage.removeItem('signal_demo_role');
  renderExpert(); renderModerator(); notify('Demo account switched.');
}
function authPanel(role) {
  const expert = role === 'expert';
  return `<div class="card auth-card"><span class="tag tag-green">${expert ? 'Trusted expert' : 'ACAPS moderator'} / DEMO</span><h2>${expert ? 'Join the consultation' : 'Moderator sign-in'}</h2>
   <p>${expert ? 'Choose a synthetic invitation code to experience the field contributor workflow.' : 'Use the synthetic moderator access code to view aggregated insights and control feedback release.'}</p>
   <form id="login-form" data-role="${role}"><div class="field"><label for="login-code">Demo invitation code</label><input id="login-code" value="${expert ? 'FIELD-05' : 'ACAPS-DEMO'}" required spellcheck="false"></div><button class="btn btn-dark btn-block" type="submit">Continue <span>↗</span></button></form>
   <div class="login-hint" style="margin-top:16px">${expert ? 'For the live demo use <code>FIELD-05</code> (four others are preloaded). You can also explore <code>FIELD-01</code> to <code>FIELD-04</code>.' : 'Demo code: <code>ACAPS-DEMO</code>. These access codes are public for demonstration only.'}</div>
   <p class="micro">⚠️ Synthetic users only. This demonstration has no production authentication or guaranteed anonymity.</p></div>`;
}
function bindLogin(role) {
  const f=$('login-form');
  f?.addEventListener('submit',async e=>{e.preventDefault();try{let res=await login($('login-code').value);active(res.role === 'expert' ? 'expert' : 'moderator');}catch(err){notify(err.message,true)}});
}
function expertCard() {
  const c=state.consultation, f=c.forecast;
  return `<div class="card"><div class="card-eyebrow">ANALYSIS UNDER REVIEW</div>
  <div style="margin-top:12px">${formatRisk(c)}</div><div class="divider"></div>
  <div class="card-eyebrow">PROPOSED FORECAST QUESTION</div>
  <h3 style="margin-top:11px">${escapeHtml(f.question)}</h3>
  <p class="micro" style="margin:12px 0 8px">Resolution date: ${escapeHtml(f.deadline)}</p>
  <div class="callout-small"><b>Resolution criteria:</b> ${escapeHtml(f.resolution)}<br><b>Note:</b> this question is illustrative and must be validated by an ACAPS moderator before real use.</div></div>`;
}
function formExpert() {
  return `<div class="card"><span class="tag tag-green">ROUND 1 · PRIVATE RESPONSE</span><h2 style="margin:13px 0 8px">Share your assessment</h2><p class="muted">Your first-round contribution is independent. You will not see others' estimates before submitting.</p>
   <form id="contribution-form">
    <div class="form-section"><h3>1. ACAPS' risk level is…</h3><p class="hint">Do you think the original assessment is too high, too low, or about right?</p><div class="radio-cards">
      <label class="radio-card"><input type="radio" name="agreement" value="underestimated"> Underestimated</label>
      <label class="radio-card"><input type="radio" name="agreement" value="about_right" checked> About right</label>
      <label class="radio-card"><input type="radio" name="agreement" value="overestimated"> Overestimated</label>
    </div></div>
    <div class="divider"></div>
    <div class="form-section"><h3>2. What is your event probability?</h3><p class="hint">Give a numeric 0–100% estimate for the defined event above, not for the overall humanitarian risk level.</p>
       <div class="slider-wrap"><div class="slider-head"><span class="data-label">MY INDEPENDENT FORECAST</span><span class="slider-number" id="prob-readout">65%</span></div><input id="prob-input" type="range" min="0" max="100" step="5" value="65" aria-label="Event probability"><div class="slider-extremes"><span>0% / Impossible</span><span>100% / Certain</span></div></div>
    </div><div class="divider"></div>
    <div class="form-section"><h3>3. What's missing from the assessment?</h3><p class="hint">One short observation or uncertainty. Avoid names, precise sensitive locations, and identifying information. Demo only.</p><div class="field"><textarea id="note-input" maxlength="300" placeholder="Example: Movement restrictions may affect aid delivery routes..."></textarea></div></div>
    <div class="form-section"><h3>4. Confidence in your own estimate</h3><div class="radio-cards"><label class="radio-card"><input type="radio" name="confidence" value="low"> Low</label><label class="radio-card"><input type="radio" name="confidence" value="medium" checked> Medium</label><label class="radio-card"><input type="radio" name="confidence" value="high"> High</label></div></div>
    <div class="divider"></div>
    <div class="form-section"><h3>5. Privacy preference</h3><p class="hint">The prototype stores your selected option. Production privacy would require more extensive safeguards.</p><div class="privacy-options">
      <label class="radio-card"><input type="radio" name="anonymity" value="acaps_only" checked> Known to ACAPS moderator, not publicly attributed</label>
      <label class="radio-card"><input type="radio" name="anonymity" value="pseudonymous"> Pseudonymous to peers, not publicly attributed</label>
      <label class="radio-card"><input type="radio" name="anonymity" value="anonymous"> Anonymous within consultation where permitted</label>
    </div></div>
    <button class="btn btn-dark btn-block" type="submit" id="submit-expert">Submit independent assessment <span>↗</span></button><p class="micro" style="margin-top:10px">No real names, organizations, or sensitive observations. This is a synthetic hackathon demo.</p>
   </form></div>`;
}
function groupPanel(g) {
  const agreementLabels={underestimated:'Underestimated',about_right:'About right',overestimated:'Overestimated'};
  return `<div class="card"><div class="card-eyebrow">AGGREGATE EXPERT OPINIONS</div><h3 style="margin:10px 0">Where does the panel stand?</h3>
   <div class="summary-stats"><div class="summary-stat"><strong>${pct(g.median)}</strong><span>Round 1 median</span></div><div class="summary-stat"><strong>${g.range.length ? `${g.range[0]}–${g.range[1]}%` : '—'}</strong><span>Range of estimates</span></div><div class="summary-stat"><strong>${g.count}/${g.expected}</strong><span>Contributed</span></div></div>
   <div class="divider"></div><div class="card-eyebrow">RISK ASSESSMENT AGREEMENT</div><div class="bars">${Object.entries(g.agreement).map(([k,n])=>`<div><div class="bar-head"><span>${agreementLabels[k]}</span><span>${n} / ${g.count}</span></div><div class="bar-bg"><div class="bar-fill ${k==='overestimated'?'warn':k==='about_right'?'alt':''}" style="width:${100*n/Math.max(g.count,1)}%"></div></div></div>`).join('')}</div>
   <div class="divider"></div><div class="card-eyebrow">EXTRACTED THEMES — SYNTHETIC NOTES</div><div class="theme-cloud">${Object.entries(g.theme_counts).map(([k,n])=>`<span class="tag">${escapeHtml(k)} · ${n}</span>`).join('') || '<span class="muted">No patterns detected</span>'}</div>
   <p class="micro" style="margin-top:14px">${escapeHtml(g.public_note)} Thematic tags are deterministic keyword matches, not verified findings.</p>
   ${g.round_two_count?`<div class="divider"></div><p class="data-label">ROUND TWO</p><p style="margin-top:8px"><b>${g.round_two_count}</b> revisions received · Full-panel current median <b>${pct(g.round_two_median)}</b> (unchanged forecasts retained; median shift ${g.median_change_pp ?? '—'} percentage points)</p>`:''}
   </div>`;
}
async function renderExpert() {
  const shell=$('expert-shell');
  if (!state.consultation) return;
  if (state.role !== 'expert' || !state.me || !state.token) {shell.innerHTML=authPanel('expert');bindLogin('expert');return;}
  let result = '';
  if (!state.me.submission) {
    result = `<div class="primary-grid"><div>${formExpert()}</div><aside>${expertCard()}<p style="margin-top:12px"><button class="btn btn-secondary btn-tiny" id="switch-persona">Switch demo account</button></p></aside></div>`;
    shell.innerHTML=result;
    $('prob-input').addEventListener('input',e=>$('prob-readout').textContent=`${e.target.value}%`);
    $('contribution-form').addEventListener('submit',async e=>{
      e.preventDefault();const f=e.currentTarget;
      const data={agreement:f.elements.agreement.value,probability:Number($('prob-input').value),confidence:f.elements.confidence.value,note:$('note-input').value,anonymity:f.elements.anonymity.value};
      try{await request('/api/expert/submit','POST',data);await loadMe();await refreshBase();renderExpert();notify('Independent contribution saved! Panel now includes your synthetic response.');}
      catch(err){notify(err.message,true)}
    });
  } else {
    shell.innerHTML=`<div class="two-cols"><div class="card"><span class="tag tag-green">✓ RESPONSE RECORDED</span><h2 style="margin:14px 0">Thank you for contributing.</h2><p>Your independent estimate was <b>${pct(state.me.submission.probability)}</b>. Your selected privacy mode is <b>${escapeHtml(state.me.submission.anonymity.replace('_',' '))}</b>.</p><div class="callout-small" style="margin-top:18px">You are one of five synthetic experts contributing to this risk consultation. Once the moderator has reviewed the full panel and released feedback, you can compare group-level opinions and optionally revise once.</div><div class="inline-actions"><button class="btn btn-secondary" id="refresh-feedback">Check anonymous feedback</button><button class="btn btn-secondary" id="switch-persona">Switch demo account</button></div><div id="expert-feedback" style="margin-top:20px"></div></div>${expertCard()}</div>`;
    await loadFeedback();
    $('refresh-feedback')?.addEventListener('click',()=>loadFeedback().catch(e=>notify(e.message,true)));
  }
  $('switch-persona')?.addEventListener('click',signOut);
}
async function loadFeedback() {
  const el=$('expert-feedback');if(!el)return;
  try{const res=await request('/api/expert/feedback');state.feedback=res;
  if(!res.available){el.innerHTML=`<div class="alert alert-warn"><b>Feedback not yet available.</b><br>${escapeHtml(res.reason)}</div>`;return;}
  const g=res.group;
  el.innerHTML=`<div class="alert"><b>Anonymous group feedback released.</b> No individual contributions or identifying notes are shown.</div>${groupPanel(g)}${state.me.revision?`<div class="alert">✓ You revised your probability to <b>${pct(state.me.revision.probability)}</b>. Your original forecast remains recorded.</div>`:
  `<div class="card" style="margin-top:12px"><h3>Optional second round</h3><p class="hint" style="margin-top:8px">You may maintain your original view or revise it once after seeing the group aggregate.</p><form id="revision-form"><div class="slider-wrap"><div class="slider-head"><span class="data-label">REVISED PROBABILITY</span><span class="slider-number" id="revision-readout">${pct(state.me.submission.probability)}</span></div><input id="revision-input" type="range" min="0" max="100" step="5" value="${state.me.submission.probability}" aria-label="Revised event probability"></div><button class="btn btn-dark" type="submit" style="margin-top:14px">Submit one revision</button></form></div>`}`;
  $('revision-input')?.addEventListener('input',e=>$('revision-readout').textContent=`${e.target.value}%`);
  $('revision-form')?.addEventListener('submit',async e=>{e.preventDefault();try{await request('/api/expert/revise','POST',{probability:Number($('revision-input').value)});await loadMe();await loadFeedback();notify('Second-round estimate saved.');}catch(err){notify(err.message,true)}});
  }catch(err){el.textContent=err.message;notify(err.message,true)}
}
async function renderModerator() {
  const shell=$('moderator-shell');if(!state.consultation)return;
  if(state.role!=='moderator'||!state.token){shell.innerHTML=authPanel('moderator');bindLogin('moderator');return;}
  try{const m=await request('/api/moderator/dashboard');state.dashboard=m;const g=m.group;
   shell.innerHTML=`<div class="metrics"><div class="metric"><div class="value">${g.count}/${g.expected}</div><div class="label">Initial submissions</div></div><div class="metric"><div class="value">${g.ready?'Ready':'Collecting'}</div><div class="label">Aggregate eligibility</div></div><div class="metric"><div class="value">${good(m.feedback_released)}</div><div class="label">Group feedback released</div></div><div class="metric"><div class="value">${good(m.public_approved)}</div><div class="label">Public output approved</div></div></div>
   <div class="primary-grid"><div class="stack"><div class="card"><div class="card-eyebrow">PANEL PROGRESS</div><h3 style="margin-top:10px">Eastern Chad / R1043</h3><p class="muted" style="margin-top:10px">Five synthetic panel members; initial submissions remain independent until the moderator releases feedback.</p><div class="progress-track"><div class="progress-fill" style="width:${g.count/g.expected*100}%"></div></div><div class="progress-label"><span>${g.count} submitted</span><span>${g.expected-g.count} remaining</span></div></div>
    ${g.ready?groupPanel(g):`<div class="card"><div class="alert alert-warn"><b>Waiting for one final expert.</b> Open the Expert space using <code>FIELD-05</code> to complete this panel. Full feedback remains gated.</div><p class="micro">In this demo, four synthetic responses are preloaded. The fifth is designed for your live presentation.</p></div>`}</div>
    <aside class="stack"><div class="card"><div class="card-eyebrow">MODERATOR DECISIONS</div><h3 style="margin:10px 0 13px">Release and approve</h3><p class="hint">Release anonymous feedback only after the full five-member panel is complete. Experts may then revise once.</p><button id="release-btn" class="btn btn-dark btn-block" ${m.can_release?'':'disabled'}>${m.feedback_released?'✓ Feedback released':'Release anonymous feedback'}</button><div class="divider"></div><p class="hint">This approves a <b>minimal synthetic group summary</b>, not an ACAPS risk rating or an official publication.</p><button id="publish-btn" class="btn btn-secondary btn-block" ${m.can_publish?'':'disabled'}>${m.public_approved?'✓ Approved safe aggregate':'Approve safe aggregate'}</button></div>
    <div class="card"><div class="card-eyebrow">DEMO CONTROLS</div><h3 style="margin:10px 0">Run it again</h3><p class="hint">Restore 4 of 5 synthetic responses, remove revisions and approval, and invalidate demo sessions.</p><button id="reset-btn" class="btn btn-secondary btn-block">Reset synthetic demo</button><button id="logout-mod" class="btn btn-secondary btn-block" style="margin-top:9px">Switch demo account</button></div>
    <div class="callout-small">${escapeHtml(m.warning)} This is a hackathon demonstration, not production anonymity or a real expert moderation workflow.</div></aside></div>`;
   $('release-btn')?.addEventListener('click',async()=>{try{await request('/api/moderator/release','POST',{});await refreshBase();await renderModerator();notify('Aggregate feedback released to contributing demo experts.')}catch(err){notify(err.message,true)}});
   $('publish-btn')?.addEventListener('click',async()=>{try{await request('/api/moderator/publish','POST',{});await refreshBase();await renderModerator();notify('Minimal synthetic public aggregate approved.')}catch(err){notify(err.message,true)}});
   $('reset-btn')?.addEventListener('click',async()=>{if(!confirm('Restore demo to 4/5 synthetic responses and clear all demo sessions?'))return;try{await request('/api/demo/reset','POST',{});signOut();await refreshBase();active('overview');notify('Synthetic demo reset to 4/5.')}catch(err){notify(err.message,true)}});
   $('logout-mod')?.addEventListener('click',signOut);
  }catch(err){shell.innerHTML=`<div class="alert alert-error">${escapeHtml(err.message)}</div>`;notify(err.message,true)}
}
function renderLibrary() {
  const risks=state.risks;
  if(!risks) return;
  $('library-count').textContent=`${risks.count} ${risks.count===1?'risk':'risks'} available`;
  const input=$('risk-search');
  function filter() {
    const term=input.value.trim().toLowerCase();
    const subset=risks.risks.filter(r=>[r.id,r.title,r.country].some(v=>String(v||'').toLowerCase().includes(term))).slice(0,80);
    $('risk-list').innerHTML=subset.map(r=>`<div class="risk-row"><span class="risk-id">${escapeHtml(r.id)}</span><div><strong>${escapeHtml(r.title)}</strong><div class="sub">${escapeHtml(r.country)} · ${escapeHtml(r.level || 'Unrated')}</div></div><span class="tag ${r.id==='R1043'?'tag-green':''}">${r.id==='R1043'?'Demo consultation':'Dataset record'}</span></div>`).join('') || '<div class="loading">No matching risk records</div>';
  }
  input.oninput=filter;filter();
}
async function renderPublic() {
  const el=$('public-shell');
  try{let p=await request('/api/public-summary');
  if(!p.available){el.innerHTML=`<div class="card"><span class="tag tag-amber">NOT YET APPROVED</span><h2 style="margin:15px 0">No public group summary available.</h2><p class="muted">A group-level summary can appear here only after all five synthetic participants contribute, an ACAPS-style moderator releases anonymous feedback, and the moderator approves a safe public aggregate.</p><div class="callout-small" style="margin-top:17px">This is an intentional privacy gate. Raw expert notes and identities are never exposed by this endpoint.</div></div>`;return;}
  el.innerHTML=`<div class="card"><span class="tag tag-green">✓ MODERATOR-APPROVED DEMO OUTPUT</span><h2 style="margin:15px 0">Eastern Chad risk consultation</h2><div class="summary-stats"><div class="summary-stat"><strong>${escapeHtml(p.risk_id)}</strong><span>Consulted risk</span></div><div class="summary-stat"><strong>${p.panel_size}</strong><span>Synthetic experts</span></div><div class="summary-stat"><strong>${pct(p.median_probability)}</strong><span>Group median probability</span></div></div><div class="divider"></div><div class="callout-small">${escapeHtml(p.notice)} No individual estimates, identities, or free-text comments are publicly revealed.</div></div>`;
  }catch(err){el.innerHTML=`<div class="alert alert-error">${escapeHtml(err.message)}</div>`;}
}
async function start() {
  document.querySelectorAll('.nav-button').forEach(btn=>btn.addEventListener('click',()=>active(btn.dataset.page)));
  $('start-expert').addEventListener('click',()=>active('expert'));
  $('start-mod').addEventListener('click',()=>active('moderator'));
  try{await refreshBase();await loadMe();active('overview');}catch(err){notify(err.message,true);$('overview-risk').innerHTML=`<div class="alert alert-error">${escapeHtml(err.message)}<br>Run <code>python -m uvicorn app:app --reload</code> from the project folder.</div>`;}
}
document.addEventListener('DOMContentLoaded',start);
