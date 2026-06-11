// ==========================================================================
// KONFIGURASI DATABASE MASTER & STATE GLOBAL
// ==========================================================================

// ✅ MASUKKAN LINK GOOGLE SCRIPT MASTER ANDA DI SINI
const MASTER_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXyzTBYU0kq_UH-CV4iJZNSeZkIOHgk0lLJB8bid003X0ghnZ_nrVIoAFe0JQClp0/exec";

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

function submitOwnerLogin() {
    const pin = document.getElementById('input-owner-pin').value;
    if (pin === "1234") {
        localStorage.setItem('owner_logged_in', "true");
        triggerNotification("Autentikasi Owner Berhasil!");
        showMainApp();
    } else {
        alert("Kode Keamanan PIN Owner Salah!");
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
        const response = await fetch(`${MASTER_SCRIPT_URL}?action=getMasterData`);
        const result = await response.json();

        if (result.status === 'success') {
            branches = result.branches || [];
            cashiers = result.cashiers || [];

            renderBranchesGrid();
            renderCashiersGrid();

            if (SCRIPT_URL) {
                fetchBranchAnalyticsData();
            }
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

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) return alert("Harap isi seluruh input form pendaftaran cabang!");

    const branchId = 'CAB-' + Date.now();

    try {
        const payload = {
            action: 'addBranch',
            id: branchId,
            name: name,
            url: url
        };

        const response = await fetch(MASTER_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification("Cabang Baru Berhasil Didaftarkan!");
            nameInput.value = "";
            urlInput.value = "";
            loadMasterDatabase();
        } else {
            alert("Gagal mendaftarkan cabang: " + res.message);
        }
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan transmisi data.");
    }
}

// Mengganti renderBranchesGrid lama agar memunculkan tombol Edit & Hapus
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
    document.getElementById('editBranchModal').classList.remove('hidden');
}

function closeEditBranchModal() {
    document.getElementById('editBranchModal').classList.add('hidden');
}

async function submitEditBranch() {
    const id = document.getElementById('edit-branch-id').value;
    const name = document.getElementById('edit-branch-name').value.trim();
    const url = document.getElementById('edit-branch-url').value.trim();

    if (!name || !url) return alert("Data cabang tidak boleh kosong!");
    document.getElementById('editBranchModal').classList.add('opacity-50');

    try {
        const payload = { action: 'editBranch', id: id, name: name, url: url };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification(`Data Cabang berhasil diperbarui!`);
            closeEditBranchModal();
            loadMasterDatabase(); // Refresh data grid
        }
    } catch (e) {
        console.error(e);
        closeEditBranchModal();
        triggerNotification("Perintah update dikirim ke Master.");
        setTimeout(loadMasterDatabase, 1500);
    } finally {
        document.getElementById('editBranchModal').classList.remove('opacity-50');
    }
}

async function deleteBranch(id) {
    if (!confirm("Hapus Cabang ini? (Hanya menghapus koneksi di Dashboard Master, tidak menghapus data asli di dalam Spreadsheet Cabangnya).")) return;
    triggerNotification("Memproses hapus cabang...");

    try {
        const payload = { action: 'deleteBranch', id: id };
        const response = await fetch(MASTER_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await response.json();

        if (res.status === 'success') {
            triggerNotification(`Cabang berhasil dihapus!`);
            // Jika cabang yang dihapus sedang aktif, kosongkan sesi
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

    const cashierId = 'KSR-' + Date.now();
    document.getElementById('cashierModal').classList.add('opacity-50');

    try {
        const payload = { action: 'addCashier', id: cashierId, name: name, pin: pin };

        const response = await fetch(MASTER_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
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
    document.getElementById('editCashierModal').classList.add('opacity-50');

    try {
        const payload = { action: 'editCashier', id: id, name: name, pin: pin };
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
    }
}

async function deleteCashier(id) {
    if (!confirm("Anda yakin ingin menghapus akses kasir ini?")) return;
    triggerNotification("Memproses hapus data...");

    try {
        const payload = { action: 'deleteCashier', id: id };
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
        const response = await fetch(`${SCRIPT_URL}?action=read`);
        const result = await response.json();

        if (result && (result.transactions || result.expenses)) {
            orders = result.transactions || [];
            expenses = result.expenses || [];
            applyAnalyticsFilter();
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
    const container = document.getElementById('custom-date-container');

    if (range === 'custom') {
        container.classList.remove('hidden');
        if (!document.getElementById('filter-start').value) {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('filter-start').value = today;
            document.getElementById('filter-end').value = today;
        }
    } else {
        container.classList.add('hidden');
    }
    applyAnalyticsFilter();
}

function applyAnalyticsFilter() {
    const range = document.getElementById('analytics-filter-range').value;
    const now = new Date();
    const jktTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const todayStr = jktTime.toISOString().split('T')[0];
    const currentTimestamp = jktTime.getTime();

    let filteredOrders = [];
    let filteredExpenses = [];

    if (range === 'custom') {
        const startVal = document.getElementById('filter-start').value;
        const endVal = document.getElementById('filter-end').value;

        if (startVal && endVal) {
            const startObj = new Date(startVal); startObj.setHours(0, 0, 0, 0);
            const endObj = new Date(endVal); endObj.setHours(23, 59, 59, 999);

            filteredOrders = orders.filter(o => {
                const parsed = parseDateString(o.date);
                if (!parsed) return false;
                const d = new Date(parsed.dateStr);
                return d >= startObj && d <= endObj;
            });
            filteredExpenses = expenses.filter(e => {
                const parsed = parseDateString(e.tanggal || e.date);
                if (!parsed) return false;
                const d = new Date(parsed.dateStr);
                return d >= startObj && d <= endObj;
            });
        }
    } else {
        filteredOrders = orders.filter(o => {
            const parsed = parseDateString(o.date);
            if (!parsed) return false;
            if (range === 'hari-ini') return parsed.dateStr === todayStr;
            if (range === '7-hari') return (currentTimestamp - parsed.timestamp) <= 7 * 24 * 60 * 60 * 1000;
            if (range === '30-hari') return (currentTimestamp - parsed.timestamp) <= 30 * 24 * 60 * 60 * 1000;
            return true;
        });

        filteredExpenses = expenses.filter(e => {
            const parsed = parseDateString(e.tanggal || e.date);
            if (!parsed) return false;
            if (range === 'hari-ini') return parsed.dateStr === todayStr;
            if (range === '7-hari') return (currentTimestamp - parsed.timestamp) <= 7 * 24 * 60 * 60 * 1000;
            if (range === '30-hari') return (currentTimestamp - parsed.timestamp) <= 30 * 24 * 60 * 60 * 1000;
            return true;
        });
    }

    // HITUNG TOTAL
    const validOrders = filteredOrders.filter(o => o.paymentStatus !== "Belum Bayar" && o.status !== "Dibatalkan");
    const grossIncome = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalExpense = filteredExpenses.reduce((sum, e) => sum + Number(e.nominal || 0), 0);
    const netProfit = grossIncome - totalExpense;

    // HITUNG METODE PEMBAYARAN
    const tTunai = validOrders.filter(o => o.method === 'Tunai / Cash').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const tQris = validOrders.filter(o => o.method === 'QRIS').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const tTransfer = validOrders.filter(o => o.method === 'Transfer Bank').reduce((sum, o) => sum + Number(o.total || 0), 0);
    currentFilteredOrders = filteredOrders;
    currentFilteredExpenses = filteredExpenses;
    // UPDATE UI KOTAK
    document.getElementById('stat-income').innerText = formatRupiah(grossIncome);
    document.getElementById('stat-expense').innerText = formatRupiah(totalExpense);
    document.getElementById('stat-profit').innerText = formatRupiah(netProfit);
    document.getElementById('stat-orders').innerText = `${filteredOrders.length} Nota`;

    if (document.getElementById('stat-tunai')) document.getElementById('stat-tunai').innerText = formatRupiah(tTunai);
    if (document.getElementById('stat-qris')) document.getElementById('stat-qris').innerText = formatRupiah(tQris);
    if (document.getElementById('stat-transfer')) document.getElementById('stat-transfer').innerText = formatRupiah(tTransfer);

    const profitIndicator = document.getElementById('profit-indicator');
    if (netProfit >= 0) {
        profitIndicator.className = "text-[10px] theme-color font-semibold bg-cyan-50 px-2 py-0.5 rounded-full";
        profitIndicator.innerText = "Laba Bersih Toko (Surplus)";
    } else {
        profitIndicator.className = "text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full";
        profitIndicator.innerText = "Defisit Keuangan (Minus)";
    }

    // RENDER TABEL
    renderIncomeTable(filteredOrders);
    renderExpensesTable(filteredExpenses);
    generateCashflowChart(filteredOrders, filteredExpenses);
}

function generateCashflowChart(filteredOrders, filteredExpenses) {
    const ctx = document.getElementById('chart-cashflow');
    if (!ctx) return;

    if (cashflowChartInstance) cashflowChartInstance.destroy();

    const dateMap = {};

    filteredOrders.forEach(o => {
        const parsed = parseDateString(o.date);
        if (!parsed) return;
        if (!dateMap[parsed.dateStr]) dateMap[parsed.dateStr] = { income: 0, expense: 0 };
        if (o.paymentStatus !== "Belum Bayar" && o.status !== "Dibatalkan") {
            dateMap[parsed.dateStr].income += Number(o.total || 0);
        }
    });

    filteredExpenses.forEach(e => {
        const parsed = parseDateString(e.tanggal || e.date);
        if (!parsed) return;
        if (!dateMap[parsed.dateStr]) dateMap[parsed.dateStr] = { income: 0, expense: 0 };
        dateMap[parsed.dateStr].expense += Number(e.nominal || 0);
    });

    const sortedDates = Object.keys(dateMap).sort();
    const formattedLabels = sortedDates.map(d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    const incomeData = sortedDates.map(d => dateMap[d].income);
    const expenseData = sortedDates.map(d => dateMap[d].expense);

    cashflowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: formattedLabels,
            datasets: [
                { label: 'Pemasukan (Rp)', data: incomeData, backgroundColor: '#40E0D0', borderRadius: 4, barPercentage: 0.7 },
                { label: 'Pengeluaran (Rp)', data: expenseData, backgroundColor: '#f43f5e', borderRadius: 4, barPercentage: 0.7 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 11 } } } },
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

    tbody.innerHTML = filteredExpenses.map(e => {
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
}

function renderIncomeTable(filteredOrders) {
    const tbody = document.getElementById('income-table-body');
    if (!tbody) return;

    if (filteredOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 italic">Tidak ada catatan transaksi pemasukan pada periode ini.</td></tr>`;
        return;
    }

    // Urutkan nota dari yang terbaru
    const sortedOrders = [...filteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sortedOrders.map(o => {
        const parsed = parseDateString(o.date);
        const dateDisplay = parsed ? parsed.dateStr : '-';

        // Desain Badge Metode Pembayaran
        let methodBadge = `<span class="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[10px]"><i class="fa-solid fa-money-bill text-[9px] mr-1"></i>${o.method || 'Tunai / Cash'}</span>`;
        if (o.method === 'QRIS') methodBadge = `<span class="bg-cyan-50 text-cyan-600 border border-cyan-100 font-bold px-2 py-0.5 rounded text-[10px]"><i class="fa-solid fa-qrcode text-[9px] mr-1"></i>QRIS</span>`;
        if (o.method === 'Transfer Bank') methodBadge = `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-2 py-0.5 rounded text-[10px]"><i class="fa-solid fa-building-columns text-[9px] mr-1"></i>Transfer</span>`;

        // Peringatan jika belum lunas
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
}

function exportIncomeToExcel() {
    if (currentFilteredOrders.length === 0) return alert("Tidak ada data pemasukan untuk diexport pada periode ini.");

    // Urutkan data Excel dari yang terbaru juga agar rapi
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
    // Ambil kata kunci yang diketik, ubah ke huruf kecil semua
    const query = document.getElementById('search-income').value.toLowerCase();

    // Jika kolom pencarian kosong, kembalikan ke data asli (hasil filter rentang waktu)
    if (!query) {
        renderIncomeTable(currentFilteredOrders);
        return;
    }

    // Lakukan penyaringan data
    const searchedData = currentFilteredOrders.filter(o => {
        const id = (o.id || '').toLowerCase();
        const customer = (o.customer || '').toLowerCase();
        const service = (o.service || '').toLowerCase();

        // Cari apakah ada kecocokan di ID Nota, Nama Pelanggan, atau Nama Paket
        return id.includes(query) || customer.includes(query) || service.includes(query);
    });

    // Tampilkan data hasil pencarian
    renderIncomeTable(searchedData);
}

function handleExpenseSearch() {
    // Ambil kata kunci yang diketik, ubah ke huruf kecil semua
    const query = document.getElementById('search-expense').value.toLowerCase();

    // Jika kolom pencarian kosong, kembalikan ke data asli
    if (!query) {
        renderExpensesTable(currentFilteredExpenses);
        return;
    }

    // Lakukan penyaringan data
    const searchedData = currentFilteredExpenses.filter(e => {
        const ket = (e.keterangan || e.keperluan || e.item || '').toLowerCase();
        const pic = (e.pic || '').toLowerCase();
        const kat = (e.kategori || '').toLowerCase();

        // Cari apakah ada kecocokan di Keterangan, Nama PIC, atau Kategori
        return ket.includes(query) || pic.includes(query) || kat.includes(query);
    });

    // Tampilkan data hasil pencarian
    renderExpensesTable(searchedData);
}
