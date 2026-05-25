// ==========================================
// CONFIGURATION & GLOBAL VARIABLES
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbxLV5J5yK9fRbhq7Xk4LD4UFXwKW-84LTXp55L1_VbpEMOxApkaZvLwHcPVQvKJl9k/exec"; // GANTI DENGAN URL WEB APP SPREADSHEET ANDA

let CURRENT_USER = null;
let CACHE_DATA = { pelanggan: [], transaksi: [], layanan: [] };

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  initAppEvents();
  checkSession();
});

function checkSession() {
  const savedUser = localStorage.getItem("laundry_user");
  if (savedUser) {
    CURRENT_USER = JSON.parse(savedUser);
    showMainApp();
  }
}

// PERBAIKAN UTAMA: Menggunakan Optional Chaining (?.) agar form login tidak macet/crash
function initAppEvents() {
  // Login Handler
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      btn.innerText = "Memproses...";
      try {
        const res = await fetch(`${API_URL}?action=login`, {
          method: "POST",
          body: JSON.stringify({
            username: document.getElementById("username").value,
            password: document.getElementById("password").value
          })
        });
        const result = await res.json();
        if(result.status === "success") {
          CURRENT_USER = result.user;
          localStorage.setItem("laundry_user", JSON.stringify(CURRENT_USER));
          showMainApp();
        } else {
          alert(result.message);
        }
      } catch (err) {
        alert("Gagal terhubung ke server backend");
      } finally {
        btn.innerText = "Masuk";
      }
    });
  }

  // Logout Handler (Aman dari null)
  const logoutAction = () => {
    localStorage.removeItem("laundry_user");
    window.location.reload();
  };
  document.getElementById("btn-logout-desktop")?.addEventListener("click", logoutAction);
  document.getElementById("btn-logout-mobile")?.addEventListener("click", logoutAction);

  // Router Event Binding
  document.querySelectorAll(".nav-item, .bottom-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.getAttribute("data-page");
      if(page) switchPage(page);
    });
  });

  // Event listener komponen modal & aksi tambah data
  document.getElementById("btn-close-modal")?.addEventListener("click", () => {
    document.getElementById("global-modal").classList.add("hidden");
  });

  document.getElementById("btn-add-pelanggan")?.addEventListener("click", () => openPelangganModal());
  document.getElementById("btn-add-layanan")?.addEventListener("click", () => openLayananModal());
  document.getElementById("btn-add-trx")?.addEventListener("click", () => openTrxModal());
  
  // Menghubungkan fungsi ekspor Excel secara aman
  document.getElementById("btn-export-excel")?.addEventListener("click", exportToExcel);
  
  // Realtime search inputs & tracking
  document.getElementById("search-pelanggan")?.addEventListener("input", (e) => renderPelanggan(e.target.value));
  document.getElementById("search-trx")?.addEventListener("input", (e) => renderTransaksi(e.target.value));
  document.getElementById("btn-track-submit")?.addEventListener("click", executeTracking);
}

async function showMainApp() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  
  document.getElementById("user-display-name").innerText = CURRENT_USER.nama;
  document.getElementById("user-display-role").innerText = CURRENT_USER.role;

  if (CURRENT_USER.role === "Kasir") {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  }

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("current-date").innerText = new Date().toLocaleDateString('id-ID', options);

  await reloadAllData();
  switchPage("dashboard");
}

async function reloadAllData() {
  try {
    const [p, t, l] = await Promise.all([
      fetch(`${API_URL}?action=get&sheet=pelanggan`).then(r => r.json()),
      fetch(`${API_URL}?action=get&sheet=transaksi`).then(r => r.json()),
      fetch(`${API_URL}?action=get&sheet=layanan`).then(r => r.json())
    ]);
    CACHE_DATA.pelanggan = p.data || [];
    CACHE_DATA.transaksi = t.data || [];
    CACHE_DATA.layanan = l.data || [];
  } catch (e) {
    console.log("Sinkronisasi database lokal tertunda.");
  }
}

function switchPage(pageId) {
  document.querySelectorAll(".page-view").forEach(p => p.classList.add("hidden"));
  document.querySelectorAll(".nav-item, .bottom-item").forEach(i => i.classList.remove("active"));
  
  document.getElementById(`page-${pageId}`).classList.remove("hidden");
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(el => el.classList.add("active"));
  
  document.getElementById("page-title").innerText = pageId.charAt(0).toUpperCase() + pageId.slice(1);

  if(pageId === "dashboard") renderDashboard();
  if(pageId === "pelanggan") renderPelanggan();
  if(pageId === "layanan") renderLayanan();
  if(pageId === "transaksi") renderTransaksi();
}

// ==========================================
// RENDER VIEW LOGIC
// ==========================================
function renderDashboard() {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrx = CACHE_DATA.transaksi.filter(x => x.tanggal_masuk && x.tanggal_masuk.includes(todayStr));
  
  const totalIncome = todayTrx.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const processCount = CACHE_DATA.transaksi.filter(x => ["Diterima","Dicuci","Dikeringkan","Disetrika"].includes(x.status_laundry)).length;
  const unpickedCount = CACHE_DATA.transaksi.filter(x => x.status_laundry === "Selesai").length;

  document.getElementById("stat-trx-count").innerText = todayTrx.length;
  document.getElementById("stat-income").innerText = "Rp " + totalIncome.toLocaleString('id-ID');
  document.getElementById("stat-process").innerText = processCount;
  document.getElementById("stat-unpaid").innerText = unpickedCount;

  const tbody = document.getElementById("dashboard-latest-trx");
  tbody.innerHTML = CACHE_DATA.transaksi.slice(-5).reverse().map(t => `
    <tr>
      <td><b>${t.id_transaksi}</b></td>
      <td>${t.nama_pelanggan}</td>
      <td>Rp ${Number(t.total).toLocaleString('id-ID')}</td>
      <td><mark>${t.status_laundry}</mark></td>
    </tr>
  `).join('');
}

function renderPelanggan(filter = "") {
  const tbody = document.getElementById("table-pelanggan-body");
  const filtered = CACHE_DATA.pelanggan.filter(p => p.nama_pelanggan.toLowerCase().includes(filter.toLowerCase()));
  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>${p.id_pelanggan}</td>
      <td><b>${p.nama_pelanggan}</b></td>
      <td>${p.no_hp}</td>
      <td>${p.alamat}</td>
      <td><button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="deleteRecord('pelanggan', '${p.id_pelanggan}')">Hapus</button></td>
    </tr>
  `).join('');
}

function renderLayanan() {
  const tbody = document.getElementById("table-layanan-body");
  tbody.innerHTML = CACHE_DATA.layanan.map(l => `
    <tr>
      <td>${l.id_layanan}</td>
      <td><b>${l.nama_layanan}</b></td>
      <td>Rp ${Number(l.harga).toLocaleString('id-ID')} / ${l.satuan}</td>
      <td><button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="deleteRecord('layanan', '${l.id_layanan}')">Hapus</button></td>
    </tr>
  `).join('');
}

function renderTransaksi(filter = "") {
  const tbody = document.getElementById("table-transaksi-body");
  const filtered = CACHE_DATA.transaksi.filter(t => t.nama_pelanggan.toLowerCase().includes(filter.toLowerCase()) || t.id_transaksi.includes(filter));
  const totalOmsetKeseluruhan = filtered.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Data nota tidak ditemukan</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td><b>${t.id_transaksi}</b></td>
      <td>${t.nama_pelanggan}<br><small style="color:var(--text-muted);">${t.layanan}</small></td>
      <td><b>Rp ${Number(t.total).toLocaleString('id-ID')}</b></td>
      <td>
        <select class="select-clean text-warning" onchange="updateStatusTrx('${t.id_transaksi}', 'status_laundry', this.value)">
          ${["Diterima","Dicuci","Dikeringkan","Disetrika","Selesai","Sudah Diambil"].map(opt => `<option ${t.status_laundry === opt ? 'selected':''}>${opt}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="select-clean text-primary" onchange="updateStatusTrx('${t.id_transaksi}', 'status_pembayaran', this.value)">
          ${["Belum Bayar","DP","Lunas"].map(opt => `<option ${t.status_pembayaran === opt ? 'selected':''}>${opt}</option>`).join('')}
        </select>
      </td>
      <td><button class="btn btn-success" style="padding:6px 10px;" onclick="printInvoice('${t.id_transaksi}')"><i data-lucide="printer" style="width:14px;height:14px;"></i></button></td>
    </tr>
  `).join('');
  
  tbody.insertAdjacentHTML('beforeend', `
    <tr style="background: #f1f5f9; font-weight: 700;">
      <td colspan="2" style="text-align: right; padding: 12px;">TOTAL KESELURUHAN OMSET:</td>
      <td colspan="4" class="text-primary" style="padding: 12px; font-size: 1rem;">Rp ${totalOmsetKeseluruhan.toLocaleString('id-ID')}</td>
    </tr>
  `);
  lucide.createIcons();
}

// ==========================================
// MODAL FORMS OPERATIONS
// ==========================================
function openPelangganModal() {
  const modal = document.getElementById("global-modal");
  document.getElementById("modal-title").innerText = "Pelanggan Baru";
  document.getElementById("modal-body-content").innerHTML = `
    <form id="f-add-pel">
      <div class="form-group"><label>Nama</label><input type="text" id="p-nama" required></div>
      <div class="form-group"><label>No HP</label><input type="text" id="p-hp" required></div>
      <div class="form-group"><label>Alamat</label><textarea id="p-alamat" required></textarea></div>
      <button type="submit" class="btn btn-primary w-full">Simpan</button>
    </form>
  `;
  modal.classList.remove("hidden");
  document.getElementById("f-add-pel").addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendCreateRequest("pelanggan", {
      nama_pelanggan: document.getElementById("p-nama").value,
      no_hp: document.getElementById("p-hp").value,
      alamat: document.getElementById("p-alamat").value,
      tanggal_daftar: new Date().toISOString()
    });
  });
}

function openLayananModal() {
  const modal = document.getElementById("global-modal");
  document.getElementById("modal-title").innerText = "Tambah Layanan";
  document.getElementById("modal-body-content").innerHTML = `
    <form id="f-add-lyn">
      <div class="form-group"><label>Nama Layanan</label><input type="text" id="l-nama" required></div>
      <div class="form-group"><label>Harga</label><input type="number" id="l-harga" required></div>
      <div class="form-group"><label>Satuan</label><select id="l-satuan"><option>Kg</option><option>Item</option></select></div>
      <button type="submit" class="btn btn-primary w-full">Simpan</button>
    </form>
  `;
  modal.classList.remove("hidden");
  document.getElementById("f-add-lyn").addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendCreateRequest("layanan", {
      nama_layanan: document.getElementById("l-nama").value,
      harga: document.getElementById("l-harga").value,
      satuan: document.getElementById("l-satuan").value,
      status: "Aktif"
    });
  });
}

function openTrxModal() {
  const modal = document.getElementById("global-modal");
  document.getElementById("modal-title").innerText = "Transaksi Baru";
  
  const opsiPelanggan = CACHE_DATA.pelanggan.length ? CACHE_DATA.pelanggan.map(p => `<option value="${p.id_pelanggan}" data-nama="${p.nama_pelanggan}" data-hp="${p.no_hp}">${p.nama_pelanggan} (${p.no_hp})</option>`).join('') : `<option value="PEL-UMUM" data-nama="Pelanggan Umum" data-hp="-">Pelanggan Umum</option>`;
  const opsiLayanan = CACHE_DATA.layanan.length ? CACHE_DATA.layanan.map(l => `<option value="${l.id_layanan}" data-harga="${l.harga}">${l.nama_layanan} — Rp ${Number(l.harga).toLocaleString('id-ID')}/${l.satuan}</option>`).join('') : `<option value="LYN-MANUAL" data-harga="7000">Cuci Standar (Rp7.000)</option>`;

  document.getElementById("modal-body-content").innerHTML = `
    <form id="f-add-trx">
      <div class="form-group"><label>Pelanggan</label><select id="t-pelanggan">${opsiPelanggan}</select></div>
      <div class="form-group"><label>Layanan</label><select id="t-layanan">${opsiLayanan}</select></div>
      <div class="form-row" style="display:flex; gap:12px;">
        <div class="form-group" style="flex:1;"><label>Berat / Qty</label><input type="number" step="0.1" id="t-berat" value="1" style="text-align:center;"></div>
        <div class="form-group" style="flex:1;"><label>Total Biaya</label><input type="text" id="t-total" readonly style="background:#f1f5f9; font-weight:700; color:var(--primary); text-align:center;"></div>
      </div>
      <div class="form-group">
        <label>Pilihan Parfum</label>
        <select id="t-parfum"><option>Original Soft (Default)</option><option>Lavender Fresh</option><option>Sakura Blossom</option><option>Tanpa Parfum</option></select>
      </div>
      <div class="form-row" style="display:flex; gap:12px;">
        <div class="form-group" style="flex:1;"><label>Metode</label><select id="t-metode"><option>Cash</option><option>Transfer</option><option>QRIS</option></select></div>
        <div class="form-group" style="flex:1;"><label>Status Nota</label><select id="t-bayar"><option>Lunas</option><option>Belum Bayar</option><option>DP</option></select></div>
      </div>
      <button type="submit" class="btn btn-primary w-full" style="padding:12px; margin-top:8px;">Selesai & Cetak Nota</button>
    </form>
  `;
  modal.classList.remove("hidden");

  const hitung = () => {
    const sel = document.getElementById("t-layanan");
    const harga = sel.options[sel.selectedIndex]?.getAttribute("data-harga") || 7000;
    document.getElementById("t-total").value = "Rp " + Number(harga * document.getElementById("t-berat").value).toLocaleString('id-ID');
  };
  document.getElementById("t-layanan").addEventListener("change", hitung);
  document.getElementById("t-berat").addEventListener("input", hitung);
  hitung();

  document.getElementById("f-add-trx").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pSel = document.getElementById("t-pelanggan");
    const optP = pSel.options[pSel.selectedIndex];
    const lSel = document.getElementById("t-layanan");
    const hBersih = lSel.options[lSel.selectedIndex].getAttribute("data-harga");
    const bBersih = document.getElementById("t-berat").value;

    await sendCreateRequest("transaksi", {
      id_pelanggan: pSel.value,
      nama_pelanggan: optP.getAttribute("data-nama"),
      no_hp: optP.getAttribute("data-hp"),
      layanan: lSel.options[lSel.selectedIndex].text.split(' — ')[0],
      berat: bBersih, harga: hBersih, total: Number(hBersih * bBersih),
      parfum: document.getElementById("t-parfum").value, catatan: "-",
      tanggal_masuk: new Date().toISOString(),
      estimasi_selesai: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
      status_laundry: "Diterima", status_pembayaran: document.getElementById("t-bayar").value, metode_pembayaran: document.getElementById("t-metode").value
    });
  });
}

// ==========================================
// CONNECTOR & UTILITIES
// ==========================================
async function sendCreateRequest(sheet, payload) {
  try {
    const res = await fetch(`${API_URL}?action=create&sheet=${sheet}`, { method: "POST", body: JSON.stringify(payload) });
    const r = await res.json();
    if(r.status === "success") {
      document.getElementById("global-modal").classList.add("hidden");
      await reloadAllData();
      switchPage(sheet);
    }
  } catch(err) { alert("Koneksi sibuk, data antre di server."); }
}

async function updateStatusTrx(id, key, val) {
  const trx = CACHE_DATA.transaksi.find(t => t.id_transaksi === id);
  if(!trx) return;
  trx[key] = val;
  await fetch(`${API_URL}?action=update&sheet=transaksi`, { method: "POST", body: JSON.stringify(trx) });
  await reloadAllData();
  renderDashboard();
}

async function deleteRecord(sheet, id) {
  if(!confirm("Hapus data ini secara permanen?")) return;
  await fetch(`${API_URL}?action=delete&sheet=${sheet}&id=${id}`, { method: "GET" });
  await reloadAllData();
  switchPage(sheet);
}

function executeTracking() {
  const idInput = document.getElementById("track-id-input").value.trim().toUpperCase();
  const resBox = document.getElementById("track-result");
  const m = CACHE_DATA.transaksi.find(t => t.id_transaksi.toUpperCase() === idInput);
  resBox.classList.remove("hidden");
  resBox.innerHTML = m ? `<div class="card" style="text-align:left; line-height:1.6;"><b>Nota:</b> ${m.id_transaksi}<br><b>Nama:</b> ${m.nama_pelanggan}<br><b>Progres:</b> <mark>${m.status_laundry}</mark><br><b>Keuangan:</b> ${m.status_pembayaran}</div>` : `<p class="text-danger">ID Nota tidak ditemukan</p>`;
}

function printInvoice(id) {
  const t = CACHE_DATA.transaksi.find(x => x.id_transaksi === id);
  if (!t) return;
  const printArea = document.getElementById("thermal-invoice");
  printArea.innerHTML = `
    <div class="thermal-ticket">
      <div class="ticket-header"><h2 class="shop-name">LAUNDRYKASIR PWA</h2><p class="shop-sub">Struk Thermal Kasir</p></div>
      <div class="divider">================================</div>
      <div class="ticket-meta">
        <div class="flex-row"><span>Nota</span><span>: ${t.id_transaksi}</span></div>
        <div class="flex-row"><span>Nama</span><span>: ${t.nama_pelanggan}</span></div>
        <div class="flex-row"><span>Tanggal</span><span>: ${t.tanggal_masuk ? t.tanggal_masuk.split('T')[0] : '-'}</span></div>
      </div>
      <div class="divider">--------------------------------</div>
      <div class="ticket-items">
        <p class="item-name"><b>${t.layanan}</b></p>
        <div class="flex-row item-details"><span>${t.berat} Kg x Rp${Number(t.harga).toLocaleString('id-ID')}</span><span>Rp${Number(t.total).toLocaleString('id-ID')}</span></div>
        <p class="item-sub">Parfum: ${t.parfum}</p>
      </div>
      <div class="divider">--------------------------------</div>
      <div class="ticket-totals">
        <div class="flex-row total-row"><span>TOTAL NET</span><span><b>Rp${Number(t.total).toLocaleString('id-ID')}</b></span></div>
        <div class="flex-row status-row"><span>Status</span><span><mark class="invoice-mark">${t.status_pembayaran}</mark></span></div>
      </div>
      <div class="divider">================================</div>
      <div class="ticket-footer"><p class="thanks">-- Terima Kasih --</p></div>
    </div>`;
  window.print();
}

function exportToExcel() {
  if (!CACHE_DATA.transaksi.length) { 
    alert("Data transaksi masih kosong, tidak ada yang bisa diekspor."); 
    return; 
  }

  try {
    // 1. Pemetaan data rapi untuk baris Excel
    const cleanObj = CACHE_DATA.transaksi.map((t, i) => ({
      "No": i + 1,
      "ID Nota": t.id_transaksi,
      "Pelanggan": t.nama_pelanggan,
      "Kontak WA": t.no_hp,
      "Paket Layanan": t.layanan,
      "Berat / Qty": Number(t.berat),
      "Total Omset (Rp)": Number(t.total),
      "Varian Parfum": t.parfum,
      "Tanggal Masuk": t.tanggal_masuk ? t.tanggal_masuk.split('T')[0] : '-',
      "Status Laundry": t.status_laundry,
      "Status Bayar": t.status_pembayaran
    }));

    // 2. Membuat dokumen spreadsheet di memori browser
    const ws = XLSX.utils.json_to_sheet(cleanObj);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kasir");

    // 3. PERBAIKAN HP: Menulis data ke bentuk Binary Array
    const wbout = XLSX.write(workbookOut => XLSX.write(wb, { bookType: 'xlsx', type: 'binary' }));
    
    function s2ab(s) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    }

    // 4. Konversi ke bentuk Blob File agar diizinkan unduh oleh sistem Android/iOS
    const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
    const namaFile = `Laporan_Laundry_${new Date().toISOString().split('T')[0]}.xlsx`;

    // 5. Trigger download menggunakan elemen jangkar (anchor) buatan
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = namaFile;
    a.click();
    
    // Bersihkan sisa memori browser
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error(error);
    alert("Gagal memproses file Excel di perangkat ini. Pastikan Anda menggunakan Google Chrome.");
  }
}
