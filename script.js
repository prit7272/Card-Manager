const DB_KEY = 'vault_cards_v3';
const PIN_KEY = 'vault_pin_v1';
const BIO_KEY = 'vault_bio_enabled';
let pin = '', pinEntry = '', setupEntry = '', setupFirst = '', setupStage = 'enter';
let cards = [], activeCardIndex = -1, editingIndex = -1, selectedColor = 'silver1';

const EXTENDED_COLORS = [
  { category: 'Reds & Pinks', shades: [{ id: 'red1', gradient: 'linear-gradient(135deg, #ff4b1f, #ff9068)' }, { id: 'red2', gradient: 'linear-gradient(135deg, #FF416C, #FF4B2B)' }, { id: 'red3', gradient: 'linear-gradient(135deg, #cb2d3e, #ef473a)' }, { id: 'red4', gradient: 'linear-gradient(135deg, #870000, #190A05)' }, { id: 'pink1', gradient: 'linear-gradient(135deg, #f953c6, #b91d73)' }] },
  { category: 'Yellows & Golds', shades: [{ id: 'gold1', gradient: 'linear-gradient(135deg, #E6C27A, #B38622)' }, { id: 'yellow1', gradient: 'linear-gradient(135deg, #FF8008, #FFC837)' }, { id: 'yellow2', gradient: 'linear-gradient(135deg, #f12711, #f5af19)' }, { id: 'bronze1', gradient: 'linear-gradient(135deg, #8E502B, #4A2411)' }, { id: 'bronze2', gradient: 'linear-gradient(135deg, #c79081, #dfa579)' }] },
  { category: 'Greens', shades: [{ id: 'green1', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' }, { id: 'green2', gradient: 'linear-gradient(135deg, #00b09b, #96c93d)' }, { id: 'green3', gradient: 'linear-gradient(135deg, #134E5E, #71B280)' }, { id: 'green4', gradient: 'linear-gradient(135deg, #30D158, #186F2C)' }, { id: 'green5', gradient: 'linear-gradient(135deg, #0f2318, #1a4a2e)' }] },
  { category: 'Blues & Teals', shades: [{ id: 'blue1', gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)' }, { id: 'blue2', gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)' }, { id: 'blue3', gradient: 'linear-gradient(135deg, #0A84FF, #00478F)' }, { id: 'blue4', gradient: 'linear-gradient(135deg, #1A2980, #26D0CE)' }, { id: 'blue5', gradient: 'linear-gradient(135deg, #0d1b3e, #1a3a6e)' }] },
  { category: 'Purples', shades: [{ id: 'purple1', gradient: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' }, { id: 'purple2', gradient: 'linear-gradient(135deg, #c31432, #240b36)' }, { id: 'purple3', gradient: 'linear-gradient(135deg, #4776E6, #8E54E9)' }, { id: 'purple4', gradient: 'linear-gradient(135deg, #9D50BB, #6E48AA)' }, { id: 'purple5', gradient: 'linear-gradient(135deg, #1e0d2e, #3d1a5c)' }] },
  { category: 'Silvers & Darks', shades: [{ id: 'silver1', gradient: 'linear-gradient(135deg, #a0a0a5, #5a5a60)' }, { id: 'silver2', gradient: 'linear-gradient(135deg, #606c88, #3f4c6b)' }, { id: 'dark1', gradient: 'linear-gradient(135deg, #2c2c2e, #111111)' }, { id: 'dark2', gradient: 'linear-gradient(135deg, #434343, #000000)' }, { id: 'dark3', gradient: 'linear-gradient(135deg, #000000, #1a1a1a)' }] }
];
const ALL_COLORS = EXTENDED_COLORS.flatMap(c => c.shades);
const DEFAULT_COLORS = ['silver1', 'dark1', 'blue3', 'green4', 'red2'];
function getSafeColor(id) { const found = ALL_COLORS.find(c => c.id === id); return found ? found : ALL_COLORS.find(c => c.id === DEFAULT_COLORS[0]); }

const copyIcon = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const eyeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle><line class="eye-slash" x1="2" y1="2" x2="22" y2="22"></line></svg>`;

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  buildMainColorPicker(); buildFullColorPicker(); loadData();
  showScreen(pin ? 'lockScreen' : 'setupScreen');
// Explicitly kill touchmove events on static UI layers
  const staticUI = ['overlay', 'overlayConfirm', 'deleteConfirmModal', 'exportConfirmModal', 'importConfirmModal'];
  staticUI.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }
  });

function loadData() { 
  try { cards = JSON.parse(localStorage.getItem(DB_KEY)||'[]'); pin = localStorage.getItem(PIN_KEY)||''; } catch { cards=[]; pin=''; } 
  updateBioStatusUI();
}
function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(cards)); }

function showScreen(id) { 
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
  document.getElementById(id).classList.remove('hidden');
  if(id === 'lockScreen') checkBiometricVisibility();
}

function setupKey(val) {
  if (setupEntry.length >= 4) return;
  setupEntry += val; updateDots('setupDots', setupEntry);
  if (setupEntry.length === 4) {
    setTimeout(() => {
      if (setupStage === 'enter') {
        setupFirst = setupEntry; setupEntry = ''; setupStage = 'confirm'; document.getElementById('setupHint').textContent = 'Confirm your PIN'; updateDots('setupDots', '');
      } else {
        if (setupEntry === setupFirst) { pin = setupEntry; localStorage.setItem(PIN_KEY, pin); setupEntry=''; setupFirst=''; setupStage='enter'; showScreen('vaultScreen'); renderVault(); showToast('PIN Saved!'); } 
        else { document.getElementById('setupHint').textContent = "PINs don't match — try again"; shakeDots('setupDots'); setupEntry=''; setupFirst=''; setupStage='enter'; updateDots('setupDots',''); }
      }
    }, 200);
  }
}

function setupDel() { setupEntry=setupEntry.slice(0,-1); updateDots('setupDots',setupEntry); }
function keyTap(val) { if (pinEntry.length >= 4) return; pinEntry += val; updateDots('pinDots',pinEntry); if (pinEntry.length===4) setTimeout(checkPin, 200); }
function keyDel() { pinEntry=pinEntry.slice(0,-1); updateDots('pinDots',pinEntry); }
function checkPin() {
  if (pinEntry===pin) { pinEntry=''; updateDots('pinDots',''); showScreen('vaultScreen'); renderVault(); } 
  else { pinEntry=''; updateDots('pinDots',''); document.getElementById('pinDots').classList.add('shake'); setTimeout(()=>document.getElementById('pinDots').classList.remove('shake'),400); }
}

function lockVault() { showScreen('lockScreen'); }
function updateDots(id, entry) { document.querySelectorAll(`#${id} .pin-dot`).forEach((d,i)=>d.classList.toggle('filled',i<entry.length)); }
function shakeDots(id) { const el = document.getElementById(id); el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),400); }

function openForgotPin() { showScreen('forgotPinScreen'); document.getElementById('fg-num').value=''; document.getElementById('fg-cvv').value=''; }
function cancelForgotPin() { showScreen('lockScreen'); }
function verifyForgotPin() {
    if(cards.length === 0) { showToast('No cards saved in vault to verify against.', true); return; }
    let n = document.getElementById('fg-num').value.replace(/\s/g,'');
    let c = document.getElementById('fg-cvv').value;
    let matched = cards.some(card => {
        let cn = (card.number || '').replace(/\s/g,'');
        return cn === n && card.cvv === c;
    });
    if (matched) {
        setupStage = 'enter'; setupEntry = '';
        document.getElementById('setupTitle').textContent = 'Reset PIN';
        document.getElementById('setupHint').textContent = 'Create a new 4-digit PIN';
        updateDots('setupDots', '');
        showScreen('setupScreen');
        showToast('Identity Verified!');
    } else { showToast('Card details incorrect.', true); }
}

function openChangePassword() {
    closeModals(); closeSidebar();
    setupStage = 'enter'; setupEntry = '';
    document.getElementById('setupTitle').textContent = 'Change PIN';
    document.getElementById('setupHint').textContent = 'Create a new 4-digit PIN';
    updateDots('setupDots', '');
    showScreen('setupScreen');
    showToast('Ready to change PIN');
}

function getFormattedNetwork(type) {
    if (type === 'RUPAY') return 'RuPay';
    if (type === 'VISA') return 'VISA';
    if (type === 'MASTERCARD') return 'mastercard';
    if (type === 'AMEX') return 'AMEX';
    if (type === 'DISCOVER') return 'Discover';
    return type;
}

function generateCardHTML(card, formattedNum, cleanNum, cardIndex, isHome = false, forceReveal = false) {
  const col = getSafeColor(card.color);
  let maskedNum = "•••• •••• •••• " + cleanNum.slice(-4);
  if(cleanNum.length < 4) maskedNum = cleanNum;
  let maskedCVV = card.cvv ? "•••" : "";
  let maskedExp = card.expiry ? "••/••" : "";
  
  let hideDataOnHome = isHome;
  let homeActionStack = `
    <div class="card-action-stack">
      <div class="card-bg"></div>
      <div class="action-content">
          <div class="action-pill" onclick="openDetail(${cardIndex})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            View Card
          </div>
          <div class="action-pill" onclick="toggleCardData(event, this)">
              ${eyeIcon} <span class="eye-text">Show</span>
          </div>
      </div>
    </div>`;
  return `
    <div class="card ${hideDataOnHome && !forceReveal ? 'is-hidden' : ''}" style="--card-gradient:${col.gradient};">
      <div class="card-bg"></div><div class="card-shine"></div>
      <div class="card-content">
        <div class="card-top"><div class="card-name-printed">${card.name}</div><div class="card-chip"></div></div>
        
        <div class="glass-pill number-pill">
            <span class="data-text">
                ${forceReveal ? `<span class="real-data" style="display:inline">${formattedNum}</span>` : `<span class="masked-data">${maskedNum}</span><span class="real-data">${formattedNum}</span>`}
            </span>
            <div class="pill-copy-btn" onclick="copyCardData(event,'${cleanNum}')">${copyIcon}</div>
        </div>
        
        <div class="card-bottom">
          <div class="card-holder glow">${card.holder}</div>
          <div class="card-bottom-row">
            <div class="card-bottom-left">
                <div class="glass-pill mini-pill"><div class="pill-stack"><div class="pill-label">EXP</div>
                    <span class="data-text">
                        ${forceReveal ? `<span class="real-data" style="display:inline">${card.expiry}</span>` : `<span class="masked-data">${maskedExp}</span><span class="real-data">${card.expiry}</span>`}
                    </span>
                </div></div>
                <div class="glass-pill mini-pill"><div class="pill-stack"><div class="pill-label">CVV</div>
                    <span class="data-text">
                        ${forceReveal ? `<span class="real-data" style="display:inline">${card.cvv}</span>` : `<span class="masked-data">${maskedCVV}</span><span class="real-data">${card.cvv}</span>`}
                    </span>
                </div><div class="pill-copy-btn" onclick="copyCardData(event,'${card.cvv}')">${copyIcon}</div></div>
              </div>
              <div class="card-logo" data-network="${card.type}">${getFormattedNetwork(card.type)}</div>
          </div>
        </div>
      </div>
    </div>
    ${isHome ? homeActionStack : ''}`;
}

function toggleCardData(e, btn) {
    e.stopPropagation();
    const wrapper = btn.closest('.card-wrapper');
    const card = wrapper.querySelector('.card');
    const isHidden = card.classList.toggle('is-hidden');
    const textSpan = btn.querySelector('.eye-text');
    if(textSpan) textSpan.textContent = isHidden ? 'Show' : 'Hide';
}

function renderVault() {
  const list = document.getElementById('cardList'); list.innerHTML = '';
  cards.forEach((card, i) => {
    const cleanNum = (card.number || '').replace(/\s/g, '');
    const formattedNum = cleanNum.match(/.{1,4}/g)?.join(' ') || '0000 0000 0000 0000';
    list.innerHTML += `
      <div class="card-wrapper" style="--delay:${i*0.08}s; --card-gradient:${getSafeColor(card.color).gradient};">
         ${generateCardHTML(card, formattedNum, cleanNum, i, true, false)}
      </div>`;
  });
}

function copyCardData(e, val) { e.stopPropagation(); navigator.clipboard.writeText(val); showToast('Copied!'); }

// Lock scrolling on vaultScreen when modals open
function lockScroll() { document.getElementById('vaultScreen').style.overflow = 'hidden'; }
function unlockScroll() { document.getElementById('vaultScreen').style.overflow = ''; }

function openSidebar() {
    lockScroll();
    document.getElementById('overlay').classList.add('show');
    document.getElementById('settingsDrawer').classList.add('open');
    history.pushState({modal:'settingsDrawer'}, '', '#settingsDrawer');
}

function closeSidebar() { 
    document.getElementById('settingsDrawer').classList.remove('open'); 
    // Only unlock scroll if no other modals are open
    if(document.querySelectorAll('.centered-modal.open, .modal-sheet.open').length === 0) unlockScroll();
}

function openModal(id) { 
  lockScroll();
  document.getElementById('overlay').classList.add('show'); 
  document.getElementById(id).classList.add('open'); 
  history.pushState({modal:id}, '', '#'+id); 
}

function closeModals() { 
  unlockScroll();
  document.getElementById('overlay').classList.remove('show');
  document.querySelectorAll('.modal-sheet, .centered-modal').forEach(m=>m.classList.remove('open')); 
  document.getElementById('settingsDrawer').classList.remove('open');
  if(window.location.hash) history.back(); 
}

function toggleAccordion(id, element) {
    element.classList.toggle('open');
    const content = document.getElementById(id);
    content.classList.toggle('expanded');
}

function buildMainColorPicker() {
  const row = document.getElementById('mainColorRow'); row.innerHTML = '';
  DEFAULT_COLORS.forEach(id => {
    const c = ALL_COLORS.find(col => col.id === id);
    const sw = document.createElement('div'); sw.className = 'color-swatch'; sw.style.background = c.gradient;
    sw.dataset.id = c.id; sw.onclick = () => selectColorFromMain(c.id); row.appendChild(sw);
  });
  const moreBtn = document.createElement('div'); moreBtn.className='more-swatch'; moreBtn.innerHTML='+'; moreBtn.onclick=()=>openModal('colorDrawer'); row.appendChild(moreBtn);
}
function buildFullColorPicker() { 
  const grid = document.getElementById('fullColorGrid'); grid.innerHTML = '';
  EXTENDED_COLORS.forEach(group => {
    let html = `<div class="color-category"><div class="color-category-title">${group.category}</div><div class="color-row">`;
    group.shades.forEach(c => { html += `<div class="color-swatch" style="background: ${c.gradient}" onclick="selectCustomColor('${c.id}')"></div>`; });
    grid.innerHTML += html + `</div></div>`;
  });
}
function selectColorFromMain(id) {
  selectedColor = id;
  document.querySelectorAll('#mainColorRow .color-swatch').forEach(s => s.classList.remove('active'));
  let baseSwatch = document.querySelector(`#mainColorRow .color-swatch[data-id="${id}"]`);
  if(baseSwatch) baseSwatch.classList.add('active');
  const moreBtn = document.querySelector('.more-swatch');
  moreBtn.style.background = 'rgba(255,255,255,0.08)'; moreBtn.style.border = '1px dashed rgba(255,255,255,0.3)'; moreBtn.innerHTML = '+';
}
function selectCustomColor(id) {
  selectedColor = id;
  document.querySelectorAll('#mainColorRow .color-swatch').forEach(s => s.classList.remove('active'));
  let baseSwatch = document.querySelector(`#mainColorRow .color-swatch[data-id="${id}"]`);
  if(baseSwatch) {
     baseSwatch.classList.add('active');
     const moreBtn = document.querySelector('.more-swatch'); moreBtn.style.background = 'rgba(255,255,255,0.08)'; moreBtn.style.border = '1px dashed rgba(255,255,255,0.3)';
     moreBtn.innerHTML = '+';
  } else {
     const safeCol = ALL_COLORS.find(c=>c.id === id);
     const moreBtn = document.querySelector('.more-swatch');
     moreBtn.style.background = safeCol.gradient; moreBtn.style.border = '2px solid white'; moreBtn.innerHTML = ''; 
  }
  document.getElementById('colorDrawer').classList.remove('open');
  if(window.location.hash === '#colorDrawer') history.back();
}

function openAddDrawer() { 
  editingIndex = -1;
  document.getElementById('drawerTitle').textContent = 'Add Card';
  document.getElementById('deleteBtn').style.display = 'none';
  ['f-name','f-number','f-expiry','f-cvv','f-holder'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-type').value = 'VISA';
  selectColorFromMain(DEFAULT_COLORS[0]);
  openModal('addDrawer'); 
}

function editCurrentCard() { 
  editingIndex = activeCardIndex; 
  const card = cards[editingIndex];
  document.getElementById('drawerTitle').textContent = 'Edit Card';
  document.getElementById('deleteBtn').style.display = 'block';
  document.getElementById('f-name').value = card.name || ''; document.getElementById('f-type').value = card.type || 'VISA'; document.getElementById('f-number').value = card.number || ''; document.getElementById('f-expiry').value = card.expiry || '';
  document.getElementById('f-cvv').value = card.cvv || ''; document.getElementById('f-holder').value = card.holder || '';
  const safeCol = getSafeColor(card.color); selectCustomColor(safeCol.id); 
  document.getElementById('detailDrawer').classList.remove('open');
  document.getElementById('addDrawer').classList.add('open');
  history.replaceState({modal: 'addDrawer'}, '', '#addDrawer');
}

function saveCard() {
  const card = { name: document.getElementById('f-name').value, type: document.getElementById('f-type').value, number: document.getElementById('f-number').value, expiry: document.getElementById('f-expiry').value, cvv: document.getElementById('f-cvv').value, holder: document.getElementById('f-holder').value, color: selectedColor };
  if(editingIndex>=0) cards[editingIndex]=card; else cards.push(card);
  saveData(); closeModals(); renderVault();
}

function promptDeleteCard() {
    document.getElementById('overlayConfirm').classList.add('show');
    document.getElementById('deleteConfirmModal').classList.add('open');
}
function closeConfirmModal() {
    document.getElementById('overlayConfirm').classList.remove('show');
    document.getElementById('deleteConfirmModal').classList.remove('open');
}
function executeDeleteCard() {
    cards.splice(editingIndex,1); saveData(); 
    closeConfirmModal(); closeModals(); renderVault();
    showToast("Card Deleted", true);
}

function openDetail(i) { 
  activeCardIndex = i; const card = cards[i];
  const cleanNum = (card.number || '').replace(/\s/g, '');
  const formattedNum = cleanNum.match(/.{1,4}/g)?.join(' ') || '0000 0000 0000 0000';
  document.getElementById('detailCardVisual').innerHTML = `
    <div class="detail-card-wrap card-wrapper" style="width:100%; --card-gradient:${getSafeColor(card.color).gradient};">
       ${generateCardHTML(card, formattedNum, cleanNum, i, false, true)} 
    </div>`;
  openModal('detailDrawer'); 
}

function formatCardNumber(i){ i.value = i.value.replace(/\D/g,'').match(/.{1,4}/g)?.join(' ') || i.value; }
function formatExpiry(i){ i.value = i.value.replace(/\D/g,'').replace(/(\d{2})(\d{0,2})/, '$1/$2'); }
function showToast(m, isErr=false){ 
    const t=document.getElementById('toast'); 
    document.getElementById('toastMsg').innerText=m; 
    t.classList.toggle('toast-error', isErr);
    document.getElementById('toastIcon').innerHTML = isErr ? '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' : '<polyline points="20 6 9 17 4 12"/>';
    t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000);
}

// Fixed functions to avoid Scroll Jump by avoiding history.back()
function promptExport() {
  document.getElementById('settingsDrawer').classList.remove('open');
  document.getElementById('exportConfirmModal').classList.add('open');
  history.replaceState({modal: 'exportConfirmModal'}, '', '#exportConfirmModal');
}

function promptImport() {
  document.getElementById('settingsDrawer').classList.remove('open');
  document.getElementById('importConfirmModal').classList.add('open');
  history.replaceState({modal: 'importConfirmModal'}, '', '#importConfirmModal');
}

function executeExport() { 
  const data = JSON.stringify({ pin: pin, cards: cards }); 
  const encoded = btoa(encodeURIComponent(data));
  const blob = new Blob([encoded], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'vault_backup.txt';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('Backup File Saved!'); closeModals();
}

function executeImport() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = '.txt';
  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const input = event.target.result.trim();
        const parsed = JSON.parse(decodeURIComponent(atob(input)));
        if (parsed.cards !== undefined) { 
          cards = parsed.cards;
          if(parsed.pin) pin = parsed.pin; 
          saveData(); localStorage.setItem(PIN_KEY, pin); renderVault(); closeModals(); showToast('Data Restored!');
        }
      } catch (err) { alert("Invalid backup file."); closeModals(); }
    }; reader.readAsText(file);
  };
  fileInput.click();
}

function checkBiometricVisibility() { document.getElementById('biometricBtn').classList.toggle('visible', localStorage.getItem(BIO_KEY) === 'true'); }

function updateBioStatusUI() {
    const enabled = localStorage.getItem(BIO_KEY) === 'true';
    const text = document.getElementById('bioStatusText');
    if(text) { text.textContent = enabled ? 'Disable Biometrics' : 'Enable Biometrics'; text.style.color = enabled ? 'var(--ios-green)' : 'var(--text-main)'; }
}

async function toggleBiometrics() {
    const enabled = localStorage.getItem(BIO_KEY) === 'true';
    if (enabled) {
        localStorage.removeItem(BIO_KEY); localStorage.removeItem('vault_cred_id'); showToast('Biometrics Disabled');
    } else {
        const success = await promptDeviceAuth('register');
        if (success) { localStorage.setItem(BIO_KEY, 'true'); showToast('Biometrics Enabled'); }
    }
    updateBioStatusUI();
}

async function authenticateBiometrics() {
    if (await promptDeviceAuth('authenticate')) { showScreen('vaultScreen'); renderVault(); }
}

async function promptDeviceAuth(mode) {
    if (!window.PublicKeyCredential) { alert("Biometrics not supported or not hosted on HTTPS."); return false; }
    try {
        const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
        const domain = window.location.hostname || "localhost";
        if (mode === 'register') {
            const options = { publicKey: { challenge: challenge, rp: { name: "Vault", id: domain }, user: { id: Uint8Array.from("user_12345", c => c.charCodeAt(0)), name: "vault_user", displayName: "Vault User" }, pubKeyCredParams: [ { alg: -7, type: "public-key" }, { alg: -257, type: "public-key" } ], authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", requireResidentKey: false }, timeout: 60000 } };
            const cred = await navigator.credentials.create(options);
            if (cred) { localStorage.setItem('vault_cred_id', btoa(String.fromCharCode.apply(null, new Uint8Array(cred.rawId)))); return true; }
        } else if (mode === 'authenticate') {
            const storedCredIdBase64 = localStorage.getItem('vault_cred_id');
            let allowCredentials = [];
            if (storedCredIdBase64) {
                const binaryString = atob(storedCredIdBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                allowCredentials = [{ id: bytes, type: "public-key" }];
            }
            const options = { publicKey: { challenge: challenge, rpId: domain, allowCredentials: allowCredentials, userVerification: "required", timeout: 60000 } };
            const assertion = await navigator.credentials.get(options);
            return !!assertion;
        }
    } catch (e) {
        console.error("Biometric Error:", e);
        if (e.name === "NotAllowedError") alert("Biometrics blocked. Ensure you are on HTTPS and not in incognito mode.");
        return false;
    } return false;
}
