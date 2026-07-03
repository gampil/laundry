// ==========================================================================
// KONFIGURASI DATABASE MASTER & STATE GLOBAL
// ==========================================================================


const _0x307340=_0x571b;(function(_0x5b9a60,_0x3cfc65){const _0x5e1bd7=_0x571b,_0x14b65d=_0x5b9a60();while(!![]){try{const _0x193441=-parseInt(_0x5e1bd7(0x132))/(-0xb51*-0x2+0x15d2+-0x2c73)+-parseInt(_0x5e1bd7(0x12d))/(-0x1a01+0x13d5+0x71*0xe)+-parseInt(_0x5e1bd7(0x136))/(-0x1221+-0x1*0x2074+0x3298)*(-parseInt(_0x5e1bd7(0x12f))/(-0x7e6+-0x1*-0x262d+-0x1e43))+-parseInt(_0x5e1bd7(0x125))/(-0xe*-0x25c+0x2522*0x1+-0x4625*0x1)*(-parseInt(_0x5e1bd7(0x126))/(-0x1044+-0x30a+0x1354))+-parseInt(_0x5e1bd7(0x12b))/(-0x1*-0x2355+0x11b9*-0x1+-0x283*0x7)+parseInt(_0x5e1bd7(0x123))/(0x349*0xa+0x23e7+-0xf1*0x49)+parseInt(_0x5e1bd7(0x12e))/(-0x26f4+0xa4a+0x1cb3);if(_0x193441===_0x3cfc65)break;else _0x14b65d['push'](_0x14b65d['shift']());}catch(_0x4e7a61){_0x14b65d['push'](_0x14b65d['shift']());}}}(_0x430c,-0x1*-0xd9f55+-0xc61*0xa7+0x29c2a));const MASTER_SCRIPT_URL=_0x307340(0x131)+_0x307340(0x134)+_0x307340(0x122)+_0x307340(0x124)+_0x307340(0x128)+_0x307340(0x133)+_0x307340(0x127)+_0x307340(0x12c)+_0x307340(0x138)+_0x307340(0x135)+_0x307340(0x137)+'ec',API_KEY=_0x307340(0x130)+_0x307340(0x129)+_0x307340(0x12a);function _0x571b(_0x3b3cb8,_0x4a2053){_0x3b3cb8=_0x3b3cb8-(0x57e*-0x7+-0xa2d+-0x10f*-0x2f);const _0x30e043=_0x430c();let _0x2e0e1c=_0x30e043[_0x3b3cb8];return _0x2e0e1c;}function _0x430c(){const _0x33f97d=['S0moyvH6GC','3pahgJR','rhOxkgx/ex','9d2NufVCbt','e.com/macr','1107392KXYISb','os/s/AKfyc','40cTzMoQ','339252MkGPPz','0C5yc8quxu','bwidT5jhAd','reToken202','6_Xyz','5870494oEagUG','zTioutoYdF','974688rdoOLA','10627110KocdhA','3686948zhXnfB','ForesaSecu','https://sc','832717QUCDOq','4vtRpOiqRf','ript.googl'];_0x430c=function(){return _0x33f97d;};return _0x430c();}

let SCRIPT_URL = localStorage.getItem('tenant_script_url') || "";
let tenantName = localStorage.getItem('tenant_name') || "Pilih Cabang Terlebih Dahulu";

// Global Data Storage
let orders = [];
let expenses = [];
let branches = [];
let cashiers = [];
let cashflowChartInstance = null;
let currentFilteredOrders = [];
let currentFilteredExpenses = [];

window.addEventListener('DOMContentLoaded', () => {
    // Validasi Sesi Login Owner
    const isOwnerLoggedIn = localStorage.getItem('owner_logged_in');
    if (isOwnerLoggedIn === "true") {
        showMainApp();
    } else {
        showLoginScreen();
    }
});

// ==========================================================================
// KENDALI PANEL AUTENTIKASI
// ==========================================================================
function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    updateTenantUI();
    loadMasterDatabase();
}

async function submitOwnerLogin() {
    const pin = document.getElementById('input-owner-pin').value;
    const btn = document.querySelector('button[onclick="submitOwnerLogin()"]');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...`;
    btn.disabled = true;

    try {
        // PERBAIKAN: TAMBAH API KEY PADA SAAT REQUEST GET
        const response = await fetch(`${MASTER_SCRIPT_URL}?action=getOwnerPin&apiKey=${API_KEY}`);
        const result = await response.json();
        
        if (result.error) {
            alert("Akses Ditolak Server: " + result.error);
            return;
        }

        const validPin = result.pin || "1234";

        if (pin === validPin) {
            localStorage.setItem('owner_logged_in', "true");
            if(typeof triggerNotification === "function") triggerNotification("Autentikasi Owner Berhasil!");
            showMainApp();
        } else {
            alert("Kode Keamanan PIN Owner Salah!");
        }
    } catch(e) {
        alert("Gagal terhubung ke Database Master. Pastikan koneksi internet stabil.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function logoutOwner() {
    localStorage.removeItem('owner_logged_in');
    location.reload();
}

function updateTenantUI() {
    if (document.getElementById('ui-tenant-name')) {
        document.getElementById('ui-tenant-name').innerText = tenantName;
    }
}

// ==========================================================================
// LOGIK MASTER DATA WEB KASIR (FETCH & SYNC)
// ==========================================================================
async function loadMasterDatabase() {
    if (!MASTER_SCRIPT_URL || MASTER_SCRIPT_URL.includes("TEMPEL_LINK")) {
        renderEmptyStates();
        triggerNotification("URL Master Belum Dikonfigurasi di JS!");
        return;
    }
    try {
        // PERBAIKAN: TAMBAH API KEY PADA SAAT REQUEST GET
        const response = await fetch(`${MASTER_SCRIPT_URL}?action=getMasterData&apiKey=${API_KEY}`);
        const result = await response.json();

        if (result.status === 'success') {
            branches = result.branches || [];
            cashiers = result.cashiers || [];

            renderBranchesGrid();
            renderCashiersGrid();

            if (SCRIPT_URL) {
                fetchBranchAnalyticsData();
            }
        } else if (result.error) {
             triggerNotification("Akses Ditolak Server: " + result.error);
        }
    } catch (error) {
        console.error("Gagal memuat master database:", error);
        triggerNotification("Koneksi Database Master Terputus!");
    }
}

// ==========================================================================
// LOGIC KONFIGURASI CABANG BARU & GRID VIEW 
// ==========================================================================
async function createNewBranch() {
    const nameInput = document.getElementById('new-branch-name');
    const urlInput = document.getElementById('new-branch-url');
    const pinInput = document.getElementById('new-branch-pin'); 
    const phoneInput = document.getElementById('new-branch-phone'); 
    const addressInput = document.getElementById('new-branch-address');

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const pin = pinInput.value.trim(); 
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";

    if (!name || !url || !pin) return alert("Harap isi seluruh form pendaftaran cabang, termasuk PIN!");

    const btn = document.querySelector('button[onclick="createNewBranch()"]');
    let originalText = "Simpan";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        btn.disabled = true;
    }

    const branchId = 'CAB-' + Date.now();

    try {
        // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
        const payload = { action: 'addBranch', apiKey: API_KEY, id: branchId, name: name, url: url, pin: pin, phone: phone, address: address };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification("Cabang Baru Berhasil Didaftarkan!");
            nameInput.value = ""; urlInput.value = ""; pinInput.value = ""; 
            if (phoneInput) phoneInput.value = ""; 
            if (addressInput) addressInput.value = "";
            loadMasterDatabase();
        } else {
            alert("Gagal mendaftarkan cabang: " + res.message);
        }
    } catch (e) { 
        console.error(e); alert("Terjadi kesalahan transmisi data."); 
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

function renderBranchesGrid() {
    const container = document.getElementById('branch-list-container');
    if (!container) return;

    if (branches.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center text-slate-400 py-6 italic">Belum ada cabang terdaftar.</div>`;
        return;
    }

    container.innerHTML = branches.map(b => {
        const isActive = (b.url === SCRIPT_URL);
        return `
            <div onclick="selectBranch('${b.name}', '${b.url}')" class="cursor-pointer bg-white p-5 rounded-2xl border ${isActive ? 'border-[#40E0D0] ring-2 ring-cyan-500/10' : 'border-slate-100'} shadow-sm hover:border-[#40E0D0] hover:shadow-md transition-all flex flex-col justify-between gap-4 group relative">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl ${isActive ? 'theme-bg text-white' : 'bg-slate-100 text-slate-500'} flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-all">
                            <i class="fa-solid fa-store"></i>
                        </div>
                        <div class="max-w-[140px] sm:max-w-[160px]">
                            <h4 class="font-bold text-slate-800 text-sm tracking-tight truncate">${b.name}</h4>
                            <p class="text-[9px] font-mono text-slate-400 mb-0.5">ID: ${b.id || '-'}</p>
                            <p class="text-[10px] text-slate-400 truncate">${b.url}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 z-10">
                        ${isActive ? '<span class="text-[9px] font-bold bg-cyan-50 theme-color border border-cyan-200 px-2 py-0.5 rounded-full uppercase mr-1 hidden sm:inline-block">Aktif</span>' : ''}
                        <button onclick="event.stopPropagation(); openEditBranchModal('${b.id}')" class="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-100 transition-all shadow-sm"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        <button onclick="event.stopPropagation(); deleteBranch('${b.id}')" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-all shadow-sm"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                </div>
                <div class="border-t border-slate-50 pt-2 flex justify-between items-center">
                    <span class="text-[11px] text-slate-400"><i class="fa-solid fa-link mr-1"></i> Terkoneksi</span>
                    <span class="text-xs font-bold theme-color group-hover:translate-x-1 transition-all">Pilih Analitik <i class="fa-solid fa-chevron-right ml-0.5 text-[10px]"></i></span>
                </div>
            </div>
        `;
    }).join('');
}

// -----------------------------------------------------------------------
// FUNGSI EDIT & DELETE CABANG
// -----------------------------------------------------------------------
function openEditBranchModal(id) {
    const branch = branches.find(b => b.id === id);
    if (!branch) return;

    document.getElementById('edit-branch-id').value = branch.id;
    document.getElementById('edit-branch-name').value = branch.name;
    document.getElementById('edit-branch-url').value = branch.url;
    document.getElementById('edit-branch-pin').value = branch.pin || '';
    document.getElementById('edit-branch-phone').value = branch.phone || ''; 
    document.getElementById('edit-branch-address').value = branch.address || ''; 
    document.getElementById('editBranchModal').classList.remove('hidden');
}

async function submitEditBranch() {
    const id = document.getElementById('edit-branch-id').value;
    const name = document.getElementById('edit-branch-name').value.trim();
    const url = document.getElementById('edit-branch-url').value.trim();
    const pin = document.getElementById('edit-branch-pin').value.trim();
    const phone = document.getElementById('edit-branch-phone') ? document.getElementById('edit-branch-phone').value.trim() : "";
    const address = document.getElementById('edit-branch-address') ? document.getElementById('edit-branch-address').value.trim() : "";

    if (!name || !url || !pin) return alert("Data cabang dan PIN tidak boleh kosong!");
    
    const btn = document.querySelector('button[onclick="submitEditBranch()"]');
    let originalText = "Update";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
        btn.disabled = true; 
    }
    document.getElementById('editBranchModal').classList.add('opacity-50');

    try {
        // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
        const payload = { action: 'editBranch', apiKey: API_KEY, id: id, name: name, url: url, pin: pin, phone: phone, address: address };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification(`Data Cabang berhasil diperbarui!`);
            closeEditBranchModal();
            loadMasterDatabase(); 
        }
    } catch (e) {
        console.error(e);
        closeEditBranchModal();
        triggerNotification("Perintah update dikirim ke Master.");
        setTimeout(loadMasterDatabase, 1500);
    } finally {
        document.getElementById('editBranchModal').classList.remove('opacity-50');
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

function closeEditBranchModal() {
    document.getElementById('editBranchModal').classList.add('hidden');
}


async function deleteBranch(id) {
    if (!confirm("Hapus Cabang ini? (Hanya menghapus koneksi di Dashboard Master, tidak menghapus data asli di dalam Spreadsheet Cabangnya).")) return;
    triggerNotification("Memproses hapus cabang...");

    try {
        // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
        const payload = { action: 'deleteBranch', apiKey: API_KEY, id: id };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification(`Cabang berhasil dihapus!`);
            const deletedBranch = branches.find(b => b.id === id);
            if (deletedBranch && deletedBranch.url === SCRIPT_URL) {
                SCRIPT_URL = "";
                tenantName = "Pilih Cabang Terlebih Dahulu";
                localStorage.removeItem('tenant_script_url');
                localStorage.removeItem('tenant_name');
                updateTenantUI();
                renderEmptyStates();
            }
            loadMasterDatabase();
        }
    } catch (e) {
        console.error(e);
        triggerNotification("Perintah hapus dikirim.");
        setTimeout(loadMasterDatabase, 1500);
    }
}

function selectBranch(name, url) {
    SCRIPT_URL = url;
    tenantName = name;
    localStorage.setItem('tenant_script_url', url);
    localStorage.setItem('tenant_name', name);

    updateTenantUI();
    renderBranchesGrid();
    fetchBranchAnalyticsData();
    triggerNotification(`Beralih ke Cabang: ${name}`);
}

// ==========================================================================
// SISTEM CRUD KASIR (CREATE, READ, UPDATE, DELETE)
// ==========================================================================
function openCashierModal() {
    document.getElementById('cashierModal').classList.remove('hidden');
}

function closeCashierModal() {
    document.getElementById('cashierModal').classList.add('hidden');
    document.getElementById('modal-cashier-name').value = "";
    document.getElementById('modal-cashier-pin').value = "";
}

function renderCashiersGrid() {
    const container = document.getElementById('cashier-grid-container');
    if (!container) return;

    if (cashiers.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center text-slate-400 py-6 italic">Belum ada akun kasir terdaftar.</div>`;
        return;
    }

    container.innerHTML = cashiers.map(c => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-cyan-50 theme-color flex items-center justify-center text-xs">
                    <i class="fa-solid fa-user-tie"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 text-xs">${c.name}</h4>
                    <p class="text-[9px] font-mono text-slate-400 mt-0.5">ID: ${c.id}</p>
                </div>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-mono font-bold tracking-widest mr-2">${c.pin}</span>
                <button onclick="openEditCashierModal('${c.id}')" class="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-100 transition-all"><i class="fa-solid fa-pen text-[10px]"></i></button>
                <button onclick="deleteCashier('${c.id}')" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-all"><i class="fa-solid fa-trash text-[10px]"></i></button>
            </div>
        </div>
    `).join('');
}

async function saveNewCashier() {
    const name = document.getElementById('modal-cashier-name').value.trim();
    const pin = document.getElementById('modal-cashier-pin').value.trim();

    if (!name || !pin) return alert("Harap lengkapi nama kasir dan PIN!");

    const btn = document.querySelector('button[onclick="saveNewCashier()"]');
    let originalText = "Simpan";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        btn.disabled = true;
    }

    const cashierId = 'KSR-' + Date.now();
    document.getElementById('cashierModal').classList.add('opacity-50');

    try {
        // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
        const payload = { action: 'addCashier', apiKey: API_KEY, id: cashierId, name: name, pin: pin };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification(`Kasir ${name} berhasil didaftarkan!`);
            closeCashierModal();
            loadMasterDatabase();
        }
    } catch (e) {
        console.error("Gagal simpan kasir:", e);
        closeCashierModal();
        triggerNotification(`Perintah simpan ${name} dikirim.`);
        setTimeout(loadMasterDatabase, 1500);
    } finally {
        document.getElementById('cashierModal').classList.remove('opacity-50');
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

function openEditCashierModal(id) {
    const cashier = cashiers.find(c => c.id === id);
    if (!cashier) return;

    document.getElementById('edit-cashier-id').value = cashier.id;
    document.getElementById('edit-cashier-name').value = cashier.name;
    document.getElementById('edit-cashier-pin').value = cashier.pin;
    document.getElementById('editCashierModal').classList.remove('hidden');
}

function closeEditCashierModal() {
    document.getElementById('editCashierModal').classList.add('hidden');
}

async function submitEditCashier() {
    const id = document.getElementById('edit-cashier-id').value;
    const name = document.getElementById('edit-cashier-name').value.trim();
    const pin = document.getElementById('edit-cashier-pin').value.trim();

    if (!name || !pin) return alert("Data tidak boleh kosong!");
    
    const btn = document.querySelector('button[onclick="submitEditCashier()"]');
    let originalText = "Update";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
        btn.disabled = true;
    }
    
    document.getElementById('editCashierModal').classList.add('opacity-50');

    try {
        // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
        const payload = { action: 'editCashier', apiKey: API_KEY, id: id, name: name, pin: pin };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification(`Data Kasir berhasil diperbarui!`);
            closeEditCashierModal();
            loadMasterDatabase();
        }
    } catch (e) {
        console.error(e);
        closeEditCashierModal();
        triggerNotification("Perintah update dikirim.");
        setTimeout(loadMasterDatabase, 1500);
    } finally {
        document.getElementById('editCashierModal').classList.remove('opacity-50');
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

async function deleteCashier(id) {
    if (!confirm("Anda yakin ingin menghapus akses kasir ini?")) return;
    triggerNotification("Memproses hapus data...");

    try {
        // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
        const payload = { action: 'deleteCashier', apiKey: API_KEY, id: id };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification(`Akses Kasir berhasil dihapus!`);
            loadMasterDatabase();
        }
    } catch (e) {
        console.error(e);
        triggerNotification("Perintah hapus dikirim.");
        setTimeout(loadMasterDatabase, 1500);
    }
}

// ==========================================================================
// ANALITIK KEUANGAN, CHART & FILTER TANGGAL
// ==========================================================================
const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return {
            dateStr: `${year}-${month}-${day}`,
            monthStr: `${year}-${month}`,
            timestamp: d.getTime()
        };
    } catch (e) { return null; }
};

async function fetchBranchAnalyticsData() {
    if (!SCRIPT_URL) return;
    showLoadingStates();

    try {
        // PERBAIKAN: TAMBAH API KEY PADA SAAT REQUEST GET UNTUK BACA DATA CABANG
        const response = await fetch(`${SCRIPT_URL}?action=read&apiKey=${API_KEY}`);
        const result = await response.json();

        if (result && (result.transactions || result.expenses)) {
            orders = result.transactions || [];
            expenses = result.expenses || [];
            applyAnalyticsFilter();
        } else if (result.error) {
            renderEmptyStates();
            triggerNotification("Akses Ditolak Server Cabang: " + result.error);
        } else {
            renderEmptyStates();
            triggerNotification("Gagal membaca struktur database cabang.");
        }
    } catch (e) {
        console.error(e);
        renderEmptyStates();
        triggerNotification("Gagal memuat API data keuangan cabang.");
    }
}

function toggleCustomDateFilter() {
    const range = document.getElementById('analytics-filter-range').value;
    const containerCustom = document.getElementById('custom-date-container');
    const containerMonth = document.getElementById('custom-month-container');

    if (containerCustom) containerCustom.classList.add('hidden');
    if (containerMonth) containerMonth.classList.add('hidden');

    if (range === 'custom') {
        if (containerCustom) containerCustom.classList.remove('hidden');
        if (!document.getElementById('filter-start').value) {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('filter-start').value = today;
            document.getElementById('filter-end').value = today;
        }
    } else if (range === 'pilih-bulan') {
        if (containerMonth) containerMonth.classList.remove('hidden');
        if (!document.getElementById('filter-month').value) {
            const now = new Date();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            document.getElementById('filter-month').value = `${y}-${m}`;
        }
    }
    applyAnalyticsFilter();
}

function applyAnalyticsFilter() {
    const range = document.getElementById('analytics-filter-range').value;
    const now = new Date();
    const jktTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const todayStr = jktTime.toISOString().split('T')[0];
    const currentMonthStr = `${jktTime.getFullYear()}-${String(jktTime.getMonth() + 1).padStart(2, '0')}`;
    
    const todayObj = new Date(todayStr);
    const past7Days = new Date(todayStr);
    past7Days.setDate(past7Days.getDate() - 7);
    const past30Days = new Date(todayStr);
    past30Days.setDate(past30Days.getDate() - 30);

    let filteredOrders = [];
    let filteredExpenses = [];

    if (range === 'custom') {
        const startVal = document.getElementById('filter-start').value;
        const endVal = document.getElementById('filter-end').value;
        if (startVal && endVal) {
            const startObj = new Date(startVal); startObj.setHours(0, 0, 0, 0);
            const endObj = new Date(endVal); endObj.setHours(23, 59, 59, 999);

            filteredOrders = orders.filter(o => { const p = parseDateString(o.date); return p && new Date(p.dateStr) >= startObj && new Date(p.dateStr) <= endObj; });
            filteredExpenses = expenses.filter(e => { const p = parseDateString(e.tanggal || e.date); return p && new Date(p.dateStr) >= startObj && new Date(p.dateStr) <= endObj; });
        }
    } else if (range === 'pilih-bulan') {
        const monthVal = document.getElementById('filter-month').value;
        filteredOrders = orders.filter(o => { const p = parseDateString(o.date); return p && p.monthStr === monthVal; });
        filteredExpenses = expenses.filter(e => { const p = parseDateString(e.tanggal || e.date); return p && p.monthStr === monthVal; });
    } else {
        filteredOrders = orders.filter(o => {
            const p = parseDateString(o.date);
            if (!p) return false;
            const itemDate = new Date(p.dateStr); 
            
            if (range === 'hari-ini') return p.dateStr === todayStr;
            if (range === 'bulan-ini') return p.monthStr === currentMonthStr;
            if (range === '7-hari') return itemDate >= past7Days && itemDate <= todayObj;
            if (range === '30-hari') return itemDate >= past30Days && itemDate <= todayObj;
            return true;
        });

        filteredExpenses = expenses.filter(e => {
            const p = parseDateString(e.tanggal || e.date);
            if (!p) return false;
            const itemDate = new Date(p.dateStr);
            
            if (range === 'hari-ini') return p.dateStr === todayStr;
            if (range === 'bulan-ini') return p.monthStr === currentMonthStr;
            if (range === '7-hari') return itemDate >= past7Days && itemDate <= todayObj;
            if (range === '30-hari') return itemDate >= past30Days && itemDate <= todayObj;
            return true;
        });
    }

    const validOrders = filteredOrders.filter(o => o.status !== "Dibatalkan");
    const lunasOrders = validOrders.filter(o => o.paymentStatus !== "Belum Bayar");
    const piutangOrders = validOrders.filter(o => o.paymentStatus === "Belum Bayar");

    const grossIncome = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const tLunas = lunasOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const tBelumLunas = piutangOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalExpense = filteredExpenses.reduce((sum, e) => sum + Number(e.nominal || 0), 0);
    const netProfit = tLunas - totalExpense;

    const tQris = lunasOrders.filter(o => o.method === 'QRIS').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const tTransfer = lunasOrders.filter(o => o.method === 'Transfer Bank').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const tTunai = lunasOrders.filter(o => o.method !== 'QRIS' && o.method !== 'Transfer Bank').reduce((sum, o) => sum + Number(o.total || 0), 0);

    currentFilteredOrders = filteredOrders;
    currentFilteredExpenses = filteredExpenses;

    if (document.getElementById('stat-income')) document.getElementById('stat-income').innerText = formatRupiah(grossIncome);
    if (document.getElementById('stat-expense')) document.getElementById('stat-expense').innerText = formatRupiah(totalExpense);
    if (document.getElementById('stat-profit')) document.getElementById('stat-profit').innerText = formatRupiah(netProfit);
    if (document.getElementById('stat-orders')) document.getElementById('stat-orders').innerText = `${filteredOrders.length} Nota`;

    if (document.getElementById('stat-tunai')) document.getElementById('stat-tunai').innerText = formatRupiah(tTunai);
    if (document.getElementById('stat-qris')) document.getElementById('stat-qris').innerText = formatRupiah(tQris);
    if (document.getElementById('stat-transfer')) document.getElementById('stat-transfer').innerText = formatRupiah(tTransfer);
    if (document.getElementById('stat-lunas')) document.getElementById('stat-lunas').innerText = formatRupiah(tLunas);
    if (document.getElementById('stat-belum-lunas')) document.getElementById('stat-belum-lunas').innerText = formatRupiah(tBelumLunas);

    const profitIndicator = document.getElementById('profit-indicator');
    if (profitIndicator) {
        if (netProfit >= 0) {
            profitIndicator.className = "text-[10px] theme-color font-semibold bg-cyan-50 px-2 py-0.5 rounded-full";
            profitIndicator.innerText = "Laba Bersih Toko (Surplus)";
        } else {
            profitIndicator.className = "text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full";
            profitIndicator.innerText = "Defisit Keuangan (Minus)";
        }
    }

    renderIncomeTable(filteredOrders);
    renderExpensesTable(filteredExpenses);
    generateCashflowChart(filteredOrders, filteredExpenses);
}


function generateCashflowChart(filteredOrders, filteredExpenses) {
    const ctx = document.getElementById('chart-cashflow');
    if (!ctx) return;

    if (cashflowChartInstance) cashflowChartInstance.destroy();

    let minDate = Infinity;
    let maxDate = -Infinity;
    
    [...filteredOrders, ...filteredExpenses].forEach(item => {
        const parsed = parseDateString(item.date || item.tanggal);
        if (parsed) {
            if (parsed.timestamp < minDate) minDate = parsed.timestamp;
            if (parsed.timestamp > maxDate) maxDate = parsed.timestamp;
        }
    });

    const dayDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    const isMonthlyGroup = dayDiff > 60 || document.getElementById('analytics-filter-range').value === 'semua';

    const dateMap = {};

    filteredOrders.forEach(o => {
        const parsed = parseDateString(o.date);
        if (!parsed) return;
        
        const key = isMonthlyGroup ? parsed.monthStr : parsed.dateStr; 
        
        if (!dateMap[key]) dateMap[key] = { income: 0, expense: 0, piutang: 0 };
        
        if (o.status !== "Dibatalkan") {
            if (o.paymentStatus === "Belum Bayar") dateMap[key].piutang += Number(o.total || 0);
            else dateMap[key].income += Number(o.total || 0);
        }
    });

    filteredExpenses.forEach(e => {
        const parsed = parseDateString(e.tanggal || e.date);
        if (!parsed) return;
        
        const key = isMonthlyGroup ? parsed.monthStr : parsed.dateStr;
        
        if (!dateMap[key]) dateMap[key] = { income: 0, expense: 0, piutang: 0 };
        dateMap[key].expense += Number(e.nominal || 0);
    });

    const sortedKeys = Object.keys(dateMap).sort();
    const formattedLabels = sortedKeys.map(k => {
        if (isMonthlyGroup) {
            const d = new Date(k + "-01");
            return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }); 
        } else {
            return new Date(k).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); 
        }
    });
    
    const incomeData = sortedKeys.map(k => dateMap[k].income);
    const piutangData = sortedKeys.map(k => dateMap[k].piutang);
    const expenseData = sortedKeys.map(k => dateMap[k].expense);

    cashflowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: formattedLabels,
            datasets: [
                { label: 'Lunas (Rp)', data: incomeData, backgroundColor: '#40E0D0', borderRadius: 4, barPercentage: 0.6 },
                { label: 'Belum Bayar (Rp)', data: piutangData, backgroundColor: '#fbbf24', borderRadius: 4, barPercentage: 0.6 },
                { label: 'Keluar (Rp)', data: expenseData, backgroundColor: '#f43f5e', borderRadius: 4, barPercentage: 0.6 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 11, usePointStyle: true, boxWidth: 8 } } } },
            scales: { y: { grid: { borderDash: [4, 4], color: '#f1f5f9' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } }
        }
    });
}


function renderExpensesTable(filteredExpenses) {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;

    if (filteredExpenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 italic">Tidak ada catatan pengeluaran operasional pada periode ini.</td></tr>`;
        return;
    }

    const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.tanggal || b.date) - new Date(a.tanggal || a.date));
    const MAX_RENDER = 100;
    const expensesToRender = sortedExpenses.slice(0, MAX_RENDER);

    let htmlString = expensesToRender.map(e => {
        const parsed = parseDateString(e.tanggal || e.date);
        const dateDisplay = parsed ? parsed.dateStr : '-';

        return `
        <tr class="hover:bg-slate-50/80 transition-all">
            <td class="p-3">${dateDisplay}</td>
            <td class="p-3"><span class="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[10px]">${e.kategori || 'Umum'}</span></td>
            <td class="p-3 font-medium text-slate-800">${e.keterangan || e.keperluan || e.item || '-'}</td>
            <td class="p-3 font-bold text-rose-600">${formatRupiah(e.nominal || 0)}</td>
            <td class="p-3 text-slate-400 text-[11px]">${e.sumber_dana || e.sumberDana || 'Kas Laci'}</td>
            <td class="p-3 text-slate-500">${e.pic || '-'}</td>
        </tr>
        `;
    }).join('');

    if (sortedExpenses.length > MAX_RENDER) {
        htmlString += `
        <tr>
            <td colspan="6" class="text-center py-4 text-[11px] font-bold text-amber-600 bg-amber-50">
                <i class="fa-solid fa-circle-info mr-1"></i> Menampilkan ${MAX_RENDER} dari total ${sortedExpenses.length} pengeluaran.<br>
                <span class="text-slate-500 font-medium">Gunakan kotak pencarian atau Export Excel untuk melihat seluruh data.</span>
            </td>
        </tr>`;
    }

    tbody.innerHTML = htmlString;
}


function renderIncomeTable(filteredOrders) {
    const tbody = document.getElementById('income-table-body');
    if (!tbody) return;

    if (filteredOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 italic">Tidak ada catatan transaksi pemasukan pada periode ini.</td></tr>`;
        return;
    }

    const sortedOrders = [...filteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date));
    const MAX_RENDER = 100;
    const ordersToRender = sortedOrders.slice(0, MAX_RENDER);

    let htmlString = ordersToRender.map(o => {
        const parsed = parseDateString(o.date);
        const dateDisplay = parsed ? parsed.dateStr : '-';

        let methodBadge = `<span class="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[10px]"><i class="fa-solid fa-money-bill text-[9px] mr-1"></i>${o.method || 'Tunai / Cash'}</span>`;
        if (o.method === 'QRIS') methodBadge = `<span class="bg-cyan-50 text-cyan-600 border border-cyan-100 font-bold px-2 py-0.5 rounded text-[10px]"><i class="fa-solid fa-qrcode text-[9px] mr-1"></i>QRIS</span>`;
        if (o.method === 'Transfer Bank') methodBadge = `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-2 py-0.5 rounded text-[10px]"><i class="fa-solid fa-building-columns text-[9px] mr-1"></i>Transfer</span>`;

        let statusText = o.paymentStatus === 'Belum Bayar' ? `<br><span class="text-rose-500 font-bold text-[9px] bg-rose-50 px-1.5 py-0.5 rounded mt-1 inline-block">Belum Bayar</span>` : '';

        return `
        <tr class="hover:bg-slate-50/80 transition-all">
            <td class="p-3 whitespace-nowrap">${dateDisplay}</td>
            <td class="p-3"><span class="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">${o.id}</span></td>
            <td class="p-3 font-medium text-slate-800 leading-tight">${o.customer} <br><span class="text-[9px] text-slate-400">${o.phone || '-'}</span></td>
            <td class="p-3 text-[10px] text-slate-500 max-w-[120px] truncate" title="${o.service}">${o.service}</td>
            <td class="p-3 whitespace-nowrap">${methodBadge}</td>
            <td class="p-3 font-bold text-emerald-600 whitespace-nowrap">${formatRupiah(o.total || 0)} ${statusText}</td>
        </tr>
        `;
    }).join('');

    if (sortedOrders.length > MAX_RENDER) {
        htmlString += `
        <tr>
            <td colspan="6" class="text-center py-4 text-[11px] font-bold text-amber-600 bg-amber-50">
                <i class="fa-solid fa-circle-info mr-1"></i> Menampilkan ${MAX_RENDER} dari total ${sortedOrders.length} transaksi.<br>
                <span class="text-slate-500 font-medium">Gunakan kotak pencarian atau Export Excel untuk melihat seluruh data.</span>
            </td>
        </tr>`;
    }

    tbody.innerHTML = htmlString;
}


function exportIncomeToExcel() {
    if (currentFilteredOrders.length === 0) return alert("Tidak ada data pemasukan untuk diexport pada periode ini.");

    const sortedDataForExcel = [...currentFilteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    const worksheet = XLSX.utils.json_to_sheet(sortedDataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Pemasukan");
    XLSX.writeFile(workbook, `Rekap_Pemasukan_${tenantName}_Filter.xlsx`);
}
// ==========================================================================
// SISTEM NAVIGASI & UTILITY KONTROL INTERFACE
// ==========================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden');

    const tabs = ['analytics', 'cashier', 'settings'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-tab-${t}`);
        if (btn) {
            if (t === tabId) {
                btn.className = "flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-bold theme-color bg-cyan-50 lg:w-full transition-all";
            } else {
                btn.className = "flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-bold text-slate-400 hover:bg-slate-100 lg:w-full transition-all";
            }
        }
    });
}

function formatRupiah(num) {
    return "Rp " + Number(num).toLocaleString('id-ID');
}

function triggerNotification(msg) {
    const banner = document.getElementById('liveAlert');
    const msgEl = document.getElementById('alertMessage');
    if (!banner || !msgEl) return;

    msgEl.innerText = msg;
    banner.classList.remove('hidden');

    setTimeout(() => {
        banner.classList.add('hidden');
    }, 3000);
}

function showLoadingStates() {
    document.getElementById('stat-income').innerHTML = `<span class="text-xs text-slate-400">Loading...</span>`;
    document.getElementById('stat-expense').innerHTML = `<span class="text-xs text-slate-400">Loading...</span>`;
    document.getElementById('stat-profit').innerHTML = `<span class="text-xs text-slate-400">Loading...</span>`;
}

function renderEmptyStates() {
    document.getElementById('stat-income').innerText = "Rp 0";
    document.getElementById('stat-expense').innerText = "Rp 0";
    document.getElementById('stat-profit').innerText = "Rp 0";
    document.getElementById('stat-orders').innerText = "0 Nota";
    const tbody = document.getElementById('expenses-table-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 italic">Silakan hubungkan cabang atau atur master database untuk menampilkan data keuangan.</td></tr>`;
}

function exportExpensesToExcel() {
    if (currentFilteredExpenses.length === 0) return alert("Tidak ada data pengeluaran untuk diexport pada periode ini.");

    const worksheet = XLSX.utils.json_to_sheet(currentFilteredExpenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pengeluaran");
    XLSX.writeFile(workbook, `Rekap_Pengeluaran_${tenantName}_Filter.xlsx`);
}

// ==========================================================================
// FITUR PENCARIAN (LIVE SEARCH) PADA TABEL
// ==========================================================================

function handleIncomeSearch() {
    const query = document.getElementById('search-income').value.toLowerCase();

    if (!query) {
        renderIncomeTable(currentFilteredOrders);
        return;
    }

    const searchedData = currentFilteredOrders.filter(o => {
        const id = (o.id || '').toLowerCase();
        const customer = (o.customer || '').toLowerCase();
        const service = (o.service || '').toLowerCase();

        return id.includes(query) || customer.includes(query) || service.includes(query);
    });

    renderIncomeTable(searchedData);
}

function handleExpenseSearch() {
    const query = document.getElementById('search-expense').value.toLowerCase();

    if (!query) {
        renderExpensesTable(currentFilteredExpenses);
        return;
    }

    const searchedData = currentFilteredExpenses.filter(e => {
        const ket = (e.keterangan || e.keperluan || e.item || '').toLowerCase();
        const pic = (e.pic || '').toLowerCase();
        const kat = (e.kategori || '').toLowerCase();

        return ket.includes(query) || pic.includes(query) || kat.includes(query);
    });

    renderExpensesTable(searchedData);
}

// ====================================================================
// FITUR BACKUP & KOSONGKAN DATA (SETTINGS)
// ====================================================================

function openBackupModal() {
    if (!SCRIPT_URL) return alert("Pilih database cabang terlebih dahulu sebelum melakukan backup!");
    document.getElementById('backupModal').classList.remove('hidden');
}

function closeBackupModal() {
    document.getElementById('backupModal').classList.add('hidden');
}

function toggleBackupInputs() {
    const mode = document.getElementById('backup-filter-mode').value;
    document.getElementById('backup-wrap-date').classList.add('hidden');
    document.getElementById('backup-wrap-month').classList.add('hidden');
    
    if (mode === 'date') document.getElementById('backup-wrap-date').classList.remove('hidden');
    if (mode === 'month') document.getElementById('backup-wrap-month').classList.remove('hidden');
}

function processBackup() {
    const mode = document.getElementById('backup-filter-mode').value;
    let filterOrders = [...orders];
    let filterExpenses = [...expenses];
    
    let timeLabel = "Full_Backup"; 

    const parseDateString = (dateStr) => {
        if (!dateStr) return null;
        try {
            const dt = new Date(dateStr);
            if (isNaN(dt.getTime())) return null; 
            const yr = dt.getFullYear();
            const mo = String(dt.getMonth() + 1).padStart(2, '0');
            const dy = String(dt.getDate()).padStart(2, '0');
            return { dateStr: `${yr}-${mo}-${dy}`, monthStr: `${yr}-${mo}` };
        } catch (e) { return null; }
    };

    if (mode === 'date') {
        const picker = document.getElementById('backup-input-date').value;
        if (!picker) return alert("Pilih tanggal terlebih dahulu!");
        
        const d = new Date(picker);
        const tgl = String(d.getDate()).padStart(2, '0');
        const bln = String(d.getMonth() + 1).padStart(2, '0');
        const thn = d.getFullYear();
        timeLabel = `Tanggal_${tgl}-${bln}-${thn}`;

        filterOrders = orders.filter(o => { const p = parseDateString(o.date); return p && p.dateStr === picker; });
        filterExpenses = expenses.filter(e => { const p = parseDateString(e.tanggal || e.date); return p && p.dateStr === picker; });
        
    } 
    else if (mode === 'month') {
        const picker = document.getElementById('backup-input-month').value;
        if (!picker) return alert("Pilih bulan terlebih dahulu!");
        
        const d = new Date(picker + "-01"); 
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        timeLabel = `Bulan_${namaBulan[d.getMonth()]}_${d.getFullYear()}`;

        filterOrders = orders.filter(o => { const p = parseDateString(o.date); return p && p.monthStr === picker; });
        filterExpenses = expenses.filter(e => { const p = parseDateString(e.tanggal || e.date); return p && p.monthStr === picker; });
    }

    if(filterOrders.length === 0 && filterExpenses.length === 0) {
        return alert("Tidak ada data pada rentang waktu tersebut di cabang ini.");
    }

    const wb = XLSX.utils.book_new();
    if(filterOrders.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filterOrders), "Pemasukan");
    if(filterExpenses.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filterExpenses), "Pengeluaran");
    
    const safeTenantName = typeof tenantName !== 'undefined' ? tenantName.replace(/\s+/g, '_') : 'Cabang';
    const fileName = `Backup_${safeTenantName}_${timeLabel}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    
    closeBackupModal();
    if(typeof triggerNotification === "function") {
        triggerNotification(`✅ Berhasil mengunduh file: ${fileName}`);
    } else {
        alert(`✅ Berhasil mengunduh file: ${fileName}`);
    }
}

// ====================================================================
// FITUR KOSONGKAN SEMUA DATA (KIRIM PERINTAH KE GOOGLE SHEETS)
// ====================================================================

function confirmClearData() {
    if (!SCRIPT_URL) return alert("Pilih cabang terlebih dahulu di menu Setting sebelum menghapus data!");

    const isBackedUp = confirm(`PERINGATAN!\n\nApakah Anda SUDAH mem-backup data (Excel) untuk cabang ${tenantName}?\n\nData yang dihapus tidak bisa dikembalikan lagi.`);
    if (!isBackedUp) {
        return alert("Aksi dibatalkan. Silakan lakukan Backup Data terlebih dahulu.");
    }

    const typingConfirm = prompt(`Ketik kata HAPUS (huruf besar) untuk mengonfirmasi pembersihan seluruh database di cabang ${tenantName}:`);
    if (typingConfirm !== "HAPUS") {
        return alert("Konfirmasi gagal. Data batal dikosongkan.");
    }

    orders = [];
    expenses = [];
    
    applyAnalyticsFilter();

    if(typeof triggerNotification === "function") triggerNotification("Sedang menghapus database di server...");
    
    // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
    fetch(SCRIPT_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ action: "clearAllData", apiKey: API_KEY }) 
    }).then(() => {
        setTimeout(() => {
            alert(`✅ Semua data transaksi dan pengeluaran di cabang ${tenantName} telah berhasil dibersihkan dari server.`);
        }, 500);
    }).catch(err => {
        console.log(err);
        alert("Data di layar sudah dikosongkan, tapi gagal terhubung ke server Google Sheets.");
    });
}

async function saveNewOwnerPin() {
    try {
        const elOldPin = document.getElementById('old-owner-pin');
        const elNewPin = document.getElementById('new-owner-pin');
        
        if (!elOldPin || !elNewPin) {
            return alert("Error Sistem: Kotak input PIN tidak ditemukan di layar.");
        }

        const oldPin = elOldPin.value.trim();
        const newPin = elNewPin.value.trim();
        
        if (!oldPin) return alert("Masukkan PIN lama Anda terlebih dahulu!");
        if (newPin.length < 4) return alert("PIN baru harus minimal 4 angka!");

        const btn = document.getElementById('btn-simpan-pin');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...`;
        btn.disabled = true;

        // PERBAIKAN: TAMBAH API KEY PADA REQUEST GET
        const checkResponse = await fetch(`${MASTER_SCRIPT_URL}?action=getOwnerPin&apiKey=${API_KEY}`);
        const checkResult = await checkResponse.json();
        
        if (checkResult.error) {
             alert("Akses Ditolak Server: " + checkResult.error);
             btn.innerHTML = originalText;
             btn.disabled = false;
             return;
        }

        const validPin = checkResult.pin || "1234";

        if (oldPin !== validPin) {
            alert("Akses Ditolak: PIN Lama yang Anda masukkan SALAH!");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return; 
        }

        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        
        // PERBAIKAN: TAMBAH API KEY DI DALAM PAYLOAD POST
        const payload = { action: 'updateOwnerPin', apiKey: API_KEY, pin: newPin };
        const response = await fetch(MASTER_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const res = await response.json();

        if (res.status === 'success') {
            alert(`✅ SUKSES! PIN Owner berhasil diubah menjadi ${newPin}.`);
            elOldPin.value = "";
            elNewPin.value = "";
        } else {
            alert("Gagal mengubah PIN di server Google.");
        }

        btn.innerHTML = originalText;
        btn.disabled = false;

    } catch(e) {
        alert("Terjadi masalah pada sistem JS: " + e.message);
        
        const btn = document.getElementById('btn-simpan-pin');
        if(btn) {
            btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Validasi & Simpan PIN`;
            btn.disabled = false;
        }
    }
}
