// BACKEND CONFIGURATION: Tautan URL Google Apps Script Web App Anda untuk sinkronisasi cloud
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXGQdysRFKrt3BRTWlCrIyeyh1NiFWir0NBcRlcQDTo5GQoSWaJcM2b_BPY36lcX7O/exec";

// STATE VARIABEL & DATABASE LOCAL MEMORY
let currentCashier = "";
let selectedServiceId = null;
let isNewCustomerMode = false;

let services = [
    { id: 'S1', name: 'Cuci Kering + Setrika', price: 8000, type: 'Kiloan', icon: 'fa-soap' },
    { id: 'S2', name: 'Setrika Saja Express', price: 5000, type: 'Kiloan', icon: 'fa-iron' },
    { id: 'S3', name: 'Bed Cover Large', price: 35000, type: 'Satuan', icon: 'fa-mattress-pillow' }
];

let customers = [
    { id: 'C1', name: 'Budi Santoso', phone: '628123456789' },
    { id: 'C2', name: 'Siti Rahma', phone: '628987654321' }
];

let paymentMethods = ['Tunai / Cash', 'QRIS Mandiri', 'Transfer Bank'];

let orders = [
    { id: 'FRS-4821', customer: 'Budi Santoso', phone: '628123456789', service: 'Cuci Kering + Setrika (2 Kg)', total: 16000, cashier: 'Sistem', status: 'Diproses', method: 'Tunai / Cash', date: new Date().toISOString() }
];

// SESSION CONTROL LOGIC
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderParam = urlParams.get('order');
    
    if (orderParam) {
        console.log("Aplikasi dibuka oleh pelanggan, bypass gerbang login admin.");
        return; 
    }

    const savedCashier = localStorage.getItem('active_cashier');
    if (savedCashier) {
        currentCashier = savedCashier;
        showMainApp();
    }
});

// 1. DAFTAR PIN KASIR AKUN RESMI
const CASHIER_ACCOUNTS = {
    "owner": "123",
    "Admin": "1234",
    "Kasir1": "12345"
};

function submitLogin() {
    const nameInput = document.getElementById('input-cashier-name').value.trim();
    const pinInput = document.getElementById('input-cashier-pin') ? document.getElementById('input-cashier-pin').value.trim() : "";
    
    if(!nameInput) return alert('Nama kasir wajib dimasukkan!');
    if(!pinInput) return alert('PIN keamanan wajib dimasukkan!');

    const correctPin = CASHIER_ACCOUNTS[nameInput];

    if (correctPin && pinInput === correctPin) {
        currentCashier = nameInput;
        localStorage.setItem('active_cashier', currentCashier);
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('display-cashier').innerText = currentCashier;
        
        document.getElementById('input-cashier-name').value = '';
        if(document.getElementById('input-cashier-pin')) document.getElementById('input-cashier-pin').value = '';
        
        renderServicesGrid();
        populateDropdowns();
        renderOrders();
        calculateFinance();
        
        setTimeout(function() { loadDataFromCloud(); }, 1000);
        triggerNotification(`Selamat bertugas, ${currentCashier}! 👋`);
    } else {
        alert('❌ Kombinasi Nama Kasir atau PIN Rahasia Salah! Akses ditolak.');
    }
}

function showMainApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('display-cashier').innerText = currentCashier;
    
    renderServicesGrid();
    populateDropdowns();
    renderOrders();
    calculateFinance();

    setTimeout(function() {
        loadDataFromCloud();
    }, 1000);
}

function logoutCashier() {
    localStorage.removeItem('active_cashier');
    location.reload();
}

// AMBIL DATA DARI GOOGLE SPREADSHEET
function loadDataFromCloud() {
    if (SCRIPT_URL === "" || SCRIPT_URL.includes("TEMPEL_URL")) return;
    
    console.log("Sedang menyelaraskan data dengan Google Sheets...");

    fetch(`${SCRIPT_URL}?action=read`)
        .then(response => response.json())
        .then(cloudData => {
            if (!cloudData || cloudData.error) return;

            if (cloudData.customServices && cloudData.customServices.length > 0) {
                const defaultIds = ['S1', 'S2', 'S3'];
                const filteredCustom = cloudData.customServices.filter(s => !defaultIds.includes(s.id));
                services = [
                    { id: 'S1', name: 'Cuci Kering + Setrika', price: 8000, type: 'Kiloan', icon: 'fa-soap' },
                    { id: 'S2', name: 'Setrika Saja Express', price: 5000, type: 'Kiloan', icon: 'fa-iron' },
                    { id: 'S3', name: 'Bed Cover Large', price: 35000, type: 'Satuan', icon: 'fa-mattress-pillow' },
                    ...filteredCustom
                ];
            }

            if (cloudData.transactions && cloudData.transactions.length > 0) {
                orders = cloudData.transactions.map(t => {
                    return {
                        id: t.id,
                        customer: t.customer,
                        phone: t.phone,
                        service: t.service,
                        total: Number(t.total),
                        cashier: t.cashier,
                        method: t.method,
                        status: t.status,
                        date: t.date ? t.date : new Date().toISOString() 
                    };
                });

                // EKSTRAKSI DAFTAR PELANGGAN DARI SPREADSHEET RIWAYAT NOTA
                const uniqueCustomers = [];
                const seenNames = new Set();

                orders.forEach(o => {
                    if (o.customer && !seenNames.has(o.customer.toLowerCase().trim())) {
                        seenNames.add(o.customer.toLowerCase().trim());
                        uniqueCustomers.push({
                            id: `C-${o.id}`,
                            name: o.customer.trim(),
                            phone: o.phone
                        });
                    }
                });

                if (uniqueCustomers.length > 0) {
                    customers = uniqueCustomers;
                }
            }

            renderServicesGrid();
            populateDropdowns();
            renderOrders();
            calculateFinance();
            console.log("Sinkronisasi database sukses!");
        })
        .catch(err => {
            console.error("Gagal sinkron data cloud:", err);
            renderServicesGrid();
            populateDropdowns();
            renderOrders();
            calculateFinance();
        });
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('theme-color'));
    
    const clickedBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick').includes(viewId));
    if(clickedBtn) clickedBtn.classList.add('theme-color');
}

function openNewServiceModal() {
    document.getElementById('serviceModal').classList.remove('hidden');
}

function saveNewService() {
    const name = document.getElementById('new-service-name').value.trim();
    const price = parseFloat(document.getElementById('new-service-price').value);
    const type = document.getElementById('new-service-type').value;

    if(!name || !price) return alert('Data input menu belum lengkap!');

    const newId = `S${services.length + 1}`;
    const newServicePayload = { id: newId, name, price, type, icon: 'fa-box-tissue' };
    
    services.push(newServicePayload);
    renderServicesGrid();
    document.getElementById('serviceModal').classList.add('hidden');
    
    if(SCRIPT_URL !== "" && !SCRIPT_URL.includes("SCRIPT_URL")) {
        const payloadToSend = { action: "addService", id: newServicePayload.id, name: newServicePayload.name, price: newServicePayload.price, type: newServicePayload.type };
        fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payloadToSend) }).catch(err => console.log(err));
    }
    
    document.getElementById('new-service-name').value = '';
    document.getElementById('new-service-price').value = '';
    triggerNotification(`Menu layanan "${name}" sukses ditambahkan!`);
}

function renderServicesGrid() {
    const grid = document.getElementById('services-grid');
    if(!grid) return;
    grid.innerHTML = '';
    services.forEach(item => {
        const isActive = item.id === selectedServiceId;
        const activeClasses = isActive ? 'border-2 border-[#40E0D0] bg-cyan-50/50 scale-[0.99]' : 'border-slate-100 bg-white hover:border-cyan-200';
        const isCustomMenu = !['S1', 'S2', 'S3'].includes(item.id);

        grid.innerHTML += `
            <div onclick="selectServiceToCart('${item.id}')" class="bg-white p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-36 relative ${activeClasses}">
                ${isActive ? '<span class="absolute top-3 right-3 text-xs theme-color"><i class="fa-solid fa-circle-check"></i></span>' : ''}
                ${isCustomMenu && !isActive ? `
                    <div class="absolute top-3 right-3 flex gap-2 z-20">
                        <button onclick="event.stopPropagation(); openEditServiceModal('${item.id}')" class="text-[10px] text-amber-500 bg-amber-50 w-6 h-6 rounded-full hover:bg-amber-100 flex items-center justify-center"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="event.stopPropagation(); deleteServiceFromPOS('${item.id}')" class="text-[10px] text-rose-500 bg-rose-50 w-6 h-6 rounded-full hover:bg-rose-100 flex items-center justify-center"><i class="fa-solid fa-trash"></i></button>
                    </div>
                ` : ''}
                <div class="flex justify-between items-start">
                    <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">${item.type}</span>
                    ${!isActive && !isCustomMenu ? `<i class="fa-solid ${item.icon} text-slate-300 text-base"></i>` : '<div class="w-2"></div>'}
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 text-xs mb-0.5 line-clamp-1">${item.name}</h4>
                    <p class="text-sm font-bold theme-color">Rp ${item.price.toLocaleString('id-ID')}</p>
                </div>
            </div>`;
    });
}

function openEditServiceModal(id) {
    const match = services.find(s => s.id === id);
    if (!match) return;
    document.getElementById('edit-service-id').value = match.id;
    document.getElementById('edit-service-name').value = match.name;
    document.getElementById('edit-service-price').value = match.price;
    document.getElementById('edit-service-type').value = match.type;
    document.getElementById('editServiceModal').classList.remove('hidden');
}

function closeEditServiceModal() {
    document.getElementById('editServiceModal').classList.add('hidden');
}

function submitEditService() {
    const id = document.getElementById('edit-service-id').value;
    const name = document.getElementById('edit-service-name').value.trim();
    const price = parseFloat(document.getElementById('edit-service-price').value);
    const type = document.getElementById('edit-service-type').value;

    if (!name || isNaN(price)) return alert('Data pengubahan belum lengkap!');

    const idx = services.findIndex(s => s.id === id);
    if (idx !== -1) {
        services[idx].name = name;
        services[idx].price = price;
        services[idx].type = type;
        renderServicesGrid();
        closeEditServiceModal();

        if (SCRIPT_URL !== "" && !SCRIPT_URL.includes("TEMPEL_URL")) {
            fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: "editService", id, name, price, type }) });
        }
        triggerNotification(`Layanan "${name}" berhasil diperbarui!`);
    }
}

function deleteServiceFromPOS(id) {
    const match = services.find(s => s.id === id);
    if (!match) return;

    if (confirm(`Hapus layanan "${match.name}" secara permanen?`)) {
        services = services.filter(s => s.id !== id);
        renderServicesGrid();
        if (SCRIPT_URL !== "" && !SCRIPT_URL.includes("TEMPEL_URL")) {
            fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: "deleteService", id }) });
        }
        triggerNotification(`Layanan "${match.name}" telah dihapus.`);
    }
}

function populateDropdowns() {
    const custDropdown = document.getElementById('cart-customer');
    const payDropdown = document.getElementById('cart-payment');
    
    if (custDropdown) {
        if (customers && customers.length > 0) {
            custDropdown.innerHTML = customers.map(c => `<option value="${c.name}">${c.name} (+${c.phone})</option>`).join('');
        } else {
            custDropdown.innerHTML = '<option value="">Tidak ada data pelanggan</option>';
        }
    }
    if (payDropdown && paymentMethods) {
        payDropdown.innerHTML = paymentMethods.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

function selectServiceToCart(id) {
    selectedServiceId = id;
    renderServicesGrid(); 
    const selected = services.find(s => s.id === id);
    
    document.getElementById('cart-items').innerHTML = `
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center w-full">
            <div>
                <p class="font-bold text-slate-700 text-xs">${selected.name}</p>
                <p class="text-[10px] text-slate-400">Harga: Rp ${selected.price.toLocaleString('id-ID')} / ${selected.type === 'Kiloan' ? 'Kg' : 'Pcs'}</p>
            </div>
            <span class="font-bold text-slate-400 text-xs">${selected.type}</span>
        </div>`;

    const isKiloan = selected.type === 'Kiloan';
    document.getElementById('cart-qty-wrapper').innerHTML = `
        <div class="mt-3 bg-cyan-50/40 p-3 rounded-xl border border-cyan-100/50 flex items-center justify-between gap-4">
            <label class="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">${isKiloan ? '⚖️ Berat Timbangan (Kg)' : '🔢 Jumlah Barang (Pcs)'}</label>
            <input type="number" id="cart-input-qty" value="1" min="0.1" step="${isKiloan ? '0.1' : '1'}" oninput="updateCartTotal()" class="w-24 bg-white border border-slate-200 rounded-lg p-2 text-center text-xs font-bold text-slate-800 outline-none focus:border-cyan-400">
        </div>`;
    updateCartTotal();
}

function updateCartTotal() {
    if (!selectedServiceId) return 0;
    const selected = services.find(s => s.id === selectedServiceId);
    const qtyInput = document.getElementById('cart-input-qty');
    const qty = qtyInput ? parseFloat(qtyInput.value) : 1;
    
    if (isNaN(qty) || qty <= 0) {
        document.getElementById('cart-total').innerText = "Rp 0";
        return 0;
    }
    const totalHarga = selected.price * qty;
    document.getElementById('cart-total').innerText = `Rp ${totalHarga.toLocaleString('id-ID')}`;
    return totalHarga;
}

function toggleNewCustomerInput() {
    const wrapperExisting = document.getElementById('wrapper-existing-cust');
    const wrapperNew = document.getElementById('wrapper-new-cust');
    const btnToggle = document.getElementById('btn-toggle-cust');
    isNewCustomerMode = !isNewCustomerMode;

    if (isNewCustomerMode) {
        wrapperExisting.classList.add('hidden');
        wrapperNew.classList.remove('hidden');
        btnToggle.innerHTML = '<i class="fa-solid fa-user-check"></i> Gunakan Member Lama';
        btnToggle.className = "w-full bg-rose-50 border border-rose-100 text-rose-500 text-xs font-bold py-3.5 px-4 rounded-xl shadow-xs hover:bg-rose-100/60 transition-all flex justify-center items-center gap-2";
    } else {
        wrapperExisting.classList.remove('hidden');
        wrapperNew.classList.add('hidden');
        btnToggle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Tambah Pelanggan Baru';
        btnToggle.className = "w-full bg-cyan-50 border border-cyan-100 theme-color text-xs font-bold py-3.5 px-4 rounded-xl shadow-xs hover:bg-cyan-100/60 transition-all flex justify-center items-center gap-2";
    }
}

function processCheckout() {
    if(!selectedServiceId) return triggerNotification('Pilih salah satu kartu layanan terlebih dahulu!');
    const selected = services.find(s => s.id === selectedServiceId);
    const payMethod = document.getElementById('cart-payment').value;
    const qtyInput = document.getElementById('cart-input-qty');
    const qty = qtyInput ? parseFloat(qtyInput.value) : 1;

    if (isNaN(qty) || qty <= 0) return alert('Berat atau Jumlah item tidak valid!');
    
    const totalHargaAkhir = selected.price * qty;
    const generatedOrderId = `FRS-${Math.floor(1000 + Math.random() * 9000)}`;
    
    let customerName = "";
    let customerPhone = "";

    if (isNewCustomerMode) {
        const inputName = document.getElementById('new-cust-name').value.trim();
        const inputPhone = document.getElementById('new-cust-phone').value.trim();
        if (!inputName || !inputPhone) return alert('Nama dan nomor WA wajib diisi!');
        
        customerName = inputName;
        customerPhone = inputPhone.startsWith('0') ? '62' + inputPhone.slice(1) : inputPhone;
        customerPhone = customerPhone.replace(/[^0-9]/g, '');

        customers.push({ id: `C${customers.length + 1}`, name: customerName, phone: customerPhone });
        populateDropdowns();
    } else {
        customerName = document.getElementById('cart-customer').value;
        const targetCust = customers.find(c => c.name === customerName);
        customerPhone = targetCust ? targetCust.phone : "628123456789";
    }

    const serviceDetailLabel = `${selected.name} (${qty} ${selected.type === 'Kiloan' ? 'Kg' : 'Pcs'})`;

    const checkoutPayload = {
        id: generatedOrderId, customer: customerName, phone: customerPhone, service: serviceDetailLabel, 
        total: totalHargaAkhir, cashier: currentCashier || "Kasir", method: payMethod, status: 'Diproses', date: new Date().toISOString()
    };

    orders.unshift(checkoutPayload);
    renderOrders();
    calculateFinance();
    openReceiptModal(checkoutPayload);

    if(SCRIPT_URL !== "" && !SCRIPT_URL.includes("SCRIPT_URL")) {
        fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(checkoutPayload) }).catch(err => console.log(err));
    }

    selectedServiceId = null;
    if (isNewCustomerMode) toggleNewCustomerInput();
    document.getElementById('new-cust-name').value = '';
    document.getElementById('new-cust-phone').value = '';
    renderServicesGrid();
    document.getElementById('cart-items').innerHTML = '<span class="text-center italic text-slate-400 py-2">Silahkan pilih produk di sebelah kiri...</span>';
    document.getElementById('cart-qty-wrapper').innerHTML = ''; 
    document.getElementById('cart-total').innerText = "Rp 0";
}

function openReceiptModal(order) {
    document.getElementById('nota-date').innerText = new Date(order.date).toLocaleString('id-ID');
    document.getElementById('nota-id').innerText = order.id;
    document.getElementById('nota-cashier').innerText = order.cashier;
    document.getElementById('nota-customer').innerText = order.customer;
    document.getElementById('nota-service').innerText = order.service;
    document.getElementById('nota-price').innerText = `Rp ${order.total.toLocaleString('id-ID')}`;
    document.getElementById('nota-paymethod').innerText = order.method;
    document.getElementById('nota-total').innerText = `Rp ${order.total.toLocaleString('id-ID')}`;

    document.getElementById('track-id').innerText = order.id;
    document.getElementById('track-cust').innerText = order.customer;
    document.getElementById('track-service').innerText = order.service;
    document.getElementById('track-total').innerText = `Rp ${order.total.toLocaleString('id-ID')}`;
    document.getElementById('track-badge').innerText = order.status.toUpperCase();

    const generatedTrackingUrl = `https://gampil.github.io/foresa?order=${order.id}`;
    document.getElementById("qrcode").innerHTML = "";
    const qrcodeSvg = new QRCode({ content: generatedTrackingUrl, padding: 0, width: 80, height: 80, color: "#000000", background: "#ffffff", ecl: "L" }).svg();
    document.getElementById("qrcode").innerHTML = qrcodeSvg;
    document.getElementById('receiptModal').classList.remove('hidden');
}

function openReceiptModalById(id) {
    const match = orders.find(o => o.id === id);
    if(match) openReceiptModal(match);
}

function sendWhatsAppReceipt() {
    const id = document.getElementById('nota-id').innerText;
    const customer = document.getElementById('nota-customer').innerText;
    const total = document.getElementById('nota-total').innerText;
    const trackingUrl = `https://gampil.github.io/foresa?order=${id}`;
    
    const messageText = `Halo, Terima kasih telah mencuci di *Forresa Laundry*.\n\nBerikut rincian Nota Transaksi digital Anda:\n🆔 No Nota: *${id}*\n👤 Konsumen: *${customer}*\n💰 Total Bill: *${total}*\n\n🌿 Pantau status proses pengerjaan laundry pakaian Anda secara realtime melalui link tautan resmi di bawah ini:\n🔗 ${trackingUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`, '_blank');
}

function searchByQR(val) {
    let q = val.toUpperCase();
    document.querySelectorAll('#orders-list > div').forEach(c => {
        c.innerText.toUpperCase().includes(q) ? c.classList.remove('hidden') : c.classList.add('hidden');
    });
}

function renderOrders() {
    const ordersList = document.getElementById('orders-list');
    if(!ordersList) return;
    
    ordersList.innerHTML = orders.map(o => {
        let badgeColor = "bg-amber-50 text-amber-600";
        if (o.status === 'Selesai') badgeColor = "bg-cyan-50 text-cyan-600";
        if (o.status === 'Diambil') badgeColor = "bg-green-50 text-green-600";

        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3 relative">
                <button onclick="deleteOrderFromPOS('${o.id}')" class="absolute top-4 right-4 text-xs text-rose-500 bg-rose-50 w-7 h-7 rounded-full hover:bg-rose-100 flex items-center justify-center z-20"><i class="fa-solid fa-trash"></i></button>
                <div class="flex justify-between items-center pr-8">
                    <span class="text-xs font-mono font-bold text-slate-400">${o.id}</span>
                    <span class="text-[10px] px-2.5 py-0.5 font-bold rounded-full ${badgeColor}">${o.status.toUpperCase()}</span>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">${o.customer}</h4>
                    <p class="text-[11px] text-slate-400">${o.service}</p>
                    <p class="text-[10px] text-slate-400 italic">WA: +${o.phone}</p>
                </div>
                <div class="space-y-2 pt-2 border-t border-slate-50">
                    <select onchange="updateOrderStatus('${o.id}', this.value)" class="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold text-slate-700 outline-none focus:border-cyan-400">
                        <option value="Diproses" ${o.status === 'Diproses' ? 'selected' : ''}>⏳ Sedang Diproses</option>
                        <option value="Selesai" ${o.status === 'Selesai' ? 'selected' : ''}>✨ Selesai (Siap Ambil)</option>
                        <option value="Diambil" ${o.status === 'Diambil' ? 'selected' : ''}>✅ Sudah Diambil Pelanggan</option>
                    </select>
                </div>
                <div class="flex justify-between items-center pt-2">
                    <span class="text-xs font-bold theme-color">Rp ${o.total.toLocaleString('id-ID')}</span>
                    <div class="flex gap-1">
                        <button onclick="openLiveTrackingPreview('${o.id}')" class="text-[10px] font-bold bg-cyan-50 text-[#40E0D0] px-2.5 py-1.5 rounded-lg hover:bg-cyan-100/50"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="openReceiptModalById('${o.id}')" class="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200">Struk</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function updateOrderStatus(orderId, newStatus) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;
        renderOrders();
        
        if (SCRIPT_URL !== "" && !SCRIPT_URL.includes("SCRIPT_URL")) {
            fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: "updateStatus", id: orderId, status: newStatus }) });
        }
        triggerNotification(`Status pesanan ${orderId} diubah menjadi: ${newStatus}`);
    }
}

function deleteOrderFromPOS(orderId) {
    if (confirm(`Hapus Nota ${orderId} secara permanen dari Cloud & Kasir?`)) {
        orders = orders.filter(o => o.id !== orderId);
        renderOrders();
        calculateFinance();

        if (SCRIPT_URL !== "" && !SCRIPT_URL.includes("SCRIPT_URL")) {
            fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: "deleteOrder", id: orderId }) });
        }
        triggerNotification(`Nota ${orderId} berhasil dihapus.`);
    }
}

function openLiveTrackingPreview(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('track-id').innerText = order.id;
    document.getElementById('track-cust').innerText = order.customer;
    document.getElementById('track-service').innerText = order.service;
    document.getElementById('track-total').innerText = `Rp ${order.total.toLocaleString('id-ID')}`;
    document.getElementById('track-badge').innerText = order.status.toUpperCase();

    const steps = document.querySelectorAll('#view-tracking .relative.pl-6 > div');
    steps.forEach((step) => setStepActive(step, false, false));

    if (order.status === "Diproses") {
        setStepActive(steps[0], true, false); setStepActive(steps[1], true, true);  
    } else if (order.status === "Selesai") {
        setStepActive(steps[0], true, false); setStepActive(steps[1], true, false); setStepActive(steps[2], true, true);  
    } else if (order.status === "Diambil") {
        setStepActive(steps[0], true, false); setStepActive(steps[1], true, false); setStepActive(steps[2], true, false); setStepActive(steps[3], true, false); 
    }
    switchView('tracking');
}

function setStepActive(stepElement, isActive, isPulse) {
    if(!stepElement) return;
    const dot = stepElement.querySelector('span:not(.animate-ping)');
    const ping = stepElement.querySelector('.animate-ping');
    const title = stepElement.querySelector('p:nth-of-type(1)');

    if(isActive) {
        if(dot) dot.className = "absolute -left-[31px] top-1 w-4 h-4 rounded-full theme-bg border-2 border-white shadow-sm z-10";
        if(title) title.className = "text-xs font-bold text-slate-700";
    } else {
        if(dot) dot.className = "absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-200 border-2 border-white z-10";
        if(title) title.className = "text-xs font-semibold text-slate-400";
    }
    if (ping) { if (isPulse) { ping.classList.remove('hidden'); ping.className = "absolute -left-[31px] top-1 w-4 h-4 rounded-full theme-bg opacity-75 animate-ping"; } else { ping.classList.add('hidden'); } }
}

function toggleFinanceFilterInputs() {
    const mode = document.getElementById('finance-filter-mode').value;
    const wrapDate = document.getElementById('wrapper-filter-date');
    const wrapMonth = document.getElementById('wrapper-filter-month');
    wrapDate.classList.add('hidden'); wrapMonth.classList.add('hidden');

    const now = new Date();
    const jktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));

    if (mode === 'date') {
        wrapDate.classList.remove('hidden');
        if(!document.getElementById('finance-input-date').value) document.getElementById('finance-input-date').value = jktTime.toISOString().split('T')[0];
    } else if (mode === 'month') {
        wrapMonth.classList.remove('hidden');
        if(!document.getElementById('finance-input-month').value) document.getElementById('finance-input-month').value = `${jktTime.getFullYear()}-${String(jktTime.getMonth() + 1).padStart(2, '0')}`;
    }
    calculateFinance();
}

function calculateFinance() {
    const mode = document.getElementById('finance-filter-mode') ? document.getElementById('finance-filter-mode').value : 'all';
    const logList = document.getElementById('finance-log-list');
    let filteredOrders = [...orders];
    let labelInfo = "Semua transaksi terpantau";

    const now = new Date();
    const jktTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const todayStr = jktTime.toISOString().split('T')[0]; 

    if (mode === 'today') {
        filteredOrders = orders.filter(o => o.date && new Date(o.date).toISOString().split('T')[0] === todayStr);
        labelInfo = `Rekapitulasi omzet Hari Ini`;
    } else if (mode === 'date') {
        const pickerDate = document.getElementById('finance-input-date').value; 
        if (pickerDate) {
            filteredOrders = orders.filter(o => o.date && new Date(o.date).toISOString().split('T')[0] === pickerDate);
            labelInfo = `Tanggal: ${new Date(pickerDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        }
    } else if (mode === 'month') {
        const pickerMonth = document.getElementById('finance-input-month').value; 
        if (pickerMonth) {
            filteredOrders = orders.filter(o => {
                if (!o.date) return false;
                const dObj = new Date(o.date);
                return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}` === pickerMonth;
            });
            const [year, month] = pickerMonth.split('-');
            labelInfo = `Bulan: ${new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
        }
    }

    const totalIncome = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    if(document.getElementById('rep-income')) document.getElementById('rep-income').innerText = `Rp ${totalIncome.toLocaleString('id-ID')}`;
    if(document.getElementById('rep-orders-count')) document.getElementById('rep-orders-count').innerText = `${filteredOrders.length} Nota`;
    if(document.getElementById('finance-summary-label')) document.getElementById('finance-summary-label').innerText = labelInfo;

    if (logList) {
        if(filteredOrders.length === 0) {
            logList.innerHTML = `<p class="text-center italic text-slate-400 py-4">Tidak ada riwayat transaksi.</p>`;
            return;
        }
        logList.innerHTML = filteredOrders.map(o => `
            <div class="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                    <p class="font-bold text-slate-700 text-xs">${o.customer} <span class="font-mono text-[10px] text-slate-400 font-normal">(${o.id})</span></p>
                    <p class="text-[10px] text-slate-400 line-clamp-1">${o.service}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-emerald-600 text-xs">+Rp ${o.total.toLocaleString('id-ID')}</p>
                    <p class="text-[9px] text-slate-400 uppercase font-medium">${o.method ? o.method.split(' ')[0] : 'KAS'}</p>
                </div>
            </div>`).join('');
    }
}

function printDirectFromBrowser() {
    console.log("Memproses gambar struk untuk aplikasi Print Label...");
    
    try {
        if (!orders || orders.length === 0) {
            return alert("Tidak ada data transaksi untuk dicetak!");
        }
        
        // 1. Ambil data transaksi teratas
        const activeOrder = orders[0]; 

        // 2. Suntikkan data ke dalam struk tersembunyi thermal-receipt-58mm
        document.getElementById('t-nota-id').innerText = activeOrder.id || "FRS-0000";
        document.getElementById('t-nota-date').innerText = activeOrder.date ? new Date(activeOrder.date).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID');
        document.getElementById('t-nota-cashier').innerText = activeOrder.cashier || "Kasir";
        document.getElementById('t-nota-customer').innerText = activeOrder.customer || "-";
        document.getElementById('t-nota-service').innerText = activeOrder.service || "-";
        document.getElementById('t-nota-total').innerText = activeOrder.total ? `Rp ${activeOrder.total.toLocaleString('id-ID')}` : "Rp 0";
        document.getElementById('t-nota-paymethod').innerText = activeOrder.method || "Tunai";

        triggerNotification("Sedang membuat gambar struk...");

        // 3. Ambil elemen target untuk difoto
        const targetReceipt = document.getElementById('thermal-receipt-58mm');
        targetReceipt.style.left = "0px"; // Munculkan mikro-detik agar html2canvas bisa memotret

        html2canvas(targetReceipt, {
            scale: 3, // Skala dipertinggi menjadi 3 agar teks di aplikasi Print Label sangat tajam
            backgroundColor: '#ffffff',
            logging: false
        }).then(canvas => {
            targetReceipt.style.left = "-9999px"; // Sembunyikan kembali setelah difoto

            // 4. Konversi gambar canvas ke format Blob (File Gambar Nyata di memori)
            canvas.toBlob(function(blob) {
                if (!blob) return alert("Gagal memproses file gambar.");

                // Bungkus blob menjadi objek File beneran dengan nama ekstensi .png
                const imageFile = new File([blob], `Struk_${activeOrder.id}.png`, { type: 'image/png' });

                // 5. JALUR UTAMA: Cek apakah browser HP mendukung fitur Web Share File
                if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                    navigator.share({
                        files: [imageFile],
                        title: `Struk ${activeOrder.id}`,
                        text: `Nota Belanja Forresa Laundry - ${activeOrder.customer}`
                    })
                    .then(() => console.log("Berhasil memicu menu share."))
                    .catch(err => console.log("User membatalkan share atau error:", err));
                } else {
                    // JALUR CADANGAN: Jika browser tidak mendukung share file, gambar otomatis terdownload ke HP
                    const imgDataUrl = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.download = `Struk_${activeOrder.id}.png`;
                    downloadLink.href = imgDataUrl;
                    downloadLink.click();
                    alert("Sistem share langsung tidak didukung di perangkat ini. Gambar struk telah diunduh otomatis ke galeri HP! Silakan buka aplikasi Print Label Anda lalu pilih cetak gambar dari galeri.");
                }

                triggerNotification("Gambar struk siap dicetak!");
            }, 'image/png');

        }).catch(err => {
            targetReceipt.style.left = "-9999px";
            console.error("Gagal convert gambar struk:", err);
            alert("Gagal memproses gambar cetak.");
        });

    } catch (error) {
        alert("Sistem Cetak Alihan Error: " + error.message);
    }
}


function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(orders); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Penjualan"); XLSX.writeFile(wb, "Forresa_Laundry_Report.xlsx");
}

function triggerNotification(msg) {
    const banner = document.getElementById('liveAlert'); if(!banner) return;
    document.getElementById('alertMessage').innerText = msg; banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 5000);
}

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search); const orderParam = urlParams.get('order');
    if (orderParam) {
        document.getElementById('login-screen').classList.add('hidden'); document.getElementById('main-app').classList.remove('hidden');
        const hk = document.querySelector('header'); if(hk) hk.style.display = 'none';
        const nv = document.querySelector('nav'); if(nv) nv.style.display = 'none';
        switchView('tracking');
        function fetchStatusPelanggan() {
            if (SCRIPT_URL === "" || SCRIPT_URL.includes("SCRIPT_URL")) return;
            fetch(`${SCRIPT_URL}?action=read`).then(r => r.json()).then(cloud => {
                if (cloud && cloud.transactions) {
                    orders = cloud.transactions; const m = orders.find(o => o.id.toUpperCase() === orderParam.toUpperCase());
                    if (m) openLiveTrackingPreview(m.id);
                }
            }).catch(e => console.log(e));
        }
        fetchStatusPelanggan(); setInterval(fetchStatusPelanggan, 10000); 
    }
});
