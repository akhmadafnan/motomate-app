const STORAGE_KEY_PLAN = 'MOTO_PLAN';
const STORAGE_KEY_HISTORY = 'MOTO_HISTORY';
const STORAGE_KEY_ODO = 'MOTO_ODO';

// Format Rupiah
const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// --- 1. LOAD DATA AWAL ---
document.addEventListener('DOMContentLoaded', () => {
    loadMotorData();
    loadPartsData();
    loadHistory();
    loadOdometer();
});

// Load Profil Motor
async function loadMotorData() {
    try {
        const response = await fetch('data/motor.json');
        const data = await response.json();
        document.getElementById('motor-model').innerText = data.info.model;
        document.getElementById('motor-plat').innerText = data.info.plat;
    } catch (e) { console.error(e); }
}

// --- FITUR ODOMETER BARU (TOTAL & TAMBAH TRIP) ---

function loadOdometer() {
    // 1. Ambil Total KM dari memori
    let currentOdo = parseInt(localStorage.getItem(STORAGE_KEY_ODO) || 0);

    // 2. Tampilkan Angka Total ke elemen teks (bukan input)
    // Menggunakan toLocaleString agar ada titik ribuan (contoh: 15.000)
    const displayElem = document.getElementById('display-total-odo');
    if(displayElem) {
        displayElem.innerText = currentOdo.toLocaleString('id-ID');
    }
    
    // 3. Update Bar Oli berdasarkan Total KM tersebut
    checkHealth(currentOdo);
}

// Fungsi Baru: Menambah KM (Trip)
function addOdometer() {
    const inputTrip = document.getElementById('input-trip');
    const tripValue = parseInt(inputTrip.value);

    // Validasi: Kalau kosong atau 0 atau negatif, jangan diproses
    if (!tripValue || tripValue <= 0) {
        alert("Masukkan jumlah KM perjalanan Anda!");
        return;
    }

    // 1. Ambil Total Lama
    let currentOdo = parseInt(localStorage.getItem(STORAGE_KEY_ODO) || 0);

    // 2. Tambahkan (Total Lama + Input Baru)
    let newTotal = currentOdo + tripValue;

    // 3. Simpan Total Baru ke Memori
    localStorage.setItem(STORAGE_KEY_ODO, newTotal);

    // 4. Update Tampilan
    loadOdometer(); // Refresh angka total & progress bar

    // 5. Reset kotak input jadi kosong lagi
    inputTrip.value = ''; 
}

// --- FITUR EDIT ODOMETER (Untuk Reset / Koreksi Salah Input) ---
function editOdometer() {
    let current = localStorage.getItem(STORAGE_KEY_ODO) || 0;
    // Munculkan popup untuk input angka baru
    let newVal = prompt("Masukkan angka Odometer yang benar (Isi 0 jika ingin reset):", current);

    if (newVal !== null && newVal.trim() !== "") {
        // Simpan angka baru
        localStorage.setItem(STORAGE_KEY_ODO, newVal);
        // Refresh tampilan
        loadOdometer();
    }
}

// --- LOGIKA INDIKATOR OLI (2000 - 3000 KM) ---
function checkHealth(currentKm) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || [];
    
    // Cari riwayat servis terakhir yang ada kata "Oli" nya
    const lastOilChange = history.find(h => h.items.some(i => i.toLowerCase().includes('oli')));

    const statusText = document.getElementById('oil-status-text');
    const progressBar = document.getElementById('oil-progress');

    // Default values (Jika belum pernah ganti oli atau baru direset)
    let diff = 0;
    
    if (lastOilChange) {
        // Hitung jarak tempuh sejak ganti oli terakhir
        // Rumus: KM Sekarang - KM saat Servis Terakhir
        diff = currentKm - lastOilChange.km;
    } else {
        // Kalau belum ada history, anggap diff sesuai total KM (motor baru)
        diff = currentKm;
    }

    // PENTING: Jika User mereset odometer jadi 0, atau angka history lebih besar (error logic),
    // maka kita anggap jarak tempuhnya 0 (Baru ganti).
    if (diff < 0) diff = 0;

    // --- VISUALISASI ---
    
    // Logika Persentase Bar (Target max 3000km = 100% lebar bar)
    let percent = (diff / 3000) * 100;
    if (percent > 100) percent = 100; // Mentok di 100%
    
    progressBar.style.width = percent + "%";

    // Logika Warna & Status
    if (diff < 2000) {
        // FASE AMAN (Hijau)
        statusText.innerText = `Aman (Pakai ${diff} km)`;
        statusText.style.color = "#27ae60"; 
        progressBar.style.background = "#27ae60";
    } else if (diff >= 2000 && diff < 3000) {
        // FASE PERSIAPAN (Kuning/Oranye)
        statusText.innerText = `Waspada (${3000 - diff} km lagi)`;
        statusText.style.color = "#f39c12"; 
        progressBar.style.background = "#f39c12";
    } else {
        // FASE BAHAYA (Merah)
        statusText.innerText = "GANTI SEKARANG!";
        statusText.style.color = "#c0392b"; 
        progressBar.style.background = "#c0392b";
    }
}

// --- 3. FITUR PLANNER (HARGA MANUAL) ---
async function loadPartsData() {
    const response = await fetch('data/parts.json');
    const parts = await response.json();
    const listContainer = document.getElementById('parts-list');
    
    listContainer.innerHTML = '';
    
    parts.forEach(part => {
        const card = document.createElement('div');
        card.className = 'part-item';
        
        card.innerHTML = `
            <div class="part-info">
                <h4>${part.nama}</h4>
                <span>${part.kategori}</span>
            </div>
            
            <div class="price-wrapper" onclick="event.stopPropagation()">
                <span class="price-label">Rp</span>
                <input type="number" class="part-price-input" value="${part.harga}" oninput="hitungTotal()">
            </div>

            <input type="checkbox" class="part-checkbox" data-name="${part.nama}">
        `;
        
        card.addEventListener('click', function(e) {
            if(e.target.tagName !== 'INPUT') {
                const cb = this.querySelector('.part-checkbox');
                cb.checked = !cb.checked;
                this.classList.toggle('selected', cb.checked);
                hitungTotal();
            }
        });

        const cb = card.querySelector('.part-checkbox');
        cb.addEventListener('change', function(){
            card.classList.toggle('selected', this.checked);
            hitungTotal();
        });
        
        listContainer.appendChild(card);
    });
}

function hitungTotal() {
    let total = 0;
    document.querySelectorAll('.part-item').forEach(item => {
        const checkbox = item.querySelector('.part-checkbox');
        if (checkbox.checked) {
            const inputHarga = item.querySelector('.part-price-input').value;
            total += parseInt(inputHarga) || 0; 
        }
    });
    document.getElementById('total-price').innerText = formatRupiah(total);
}

// --- 4. FITUR EKSEKUSI (SELESAI SERVIS) ---
function finishService() {
    const selectedItems = [];
    let totalBiaya = 0;

    document.querySelectorAll('.part-item').forEach(item => {
        const checkbox = item.querySelector('.part-checkbox');
        if (checkbox.checked) {
            const namaPart = checkbox.getAttribute('data-name');
            const hargaReal = item.querySelector('.part-price-input').value; 
            
            totalBiaya += parseInt(hargaReal) || 0;
            
            selectedItems.push(`${namaPart} (${formatRupiah(hargaReal)})`);

            checkbox.checked = false; 
            item.classList.remove('selected');
        }
    });

    if (selectedItems.length === 0) return alert("Pilih minimal satu part yang diservis!");

    // PERBAIKAN: Ambil KM dari localStorage karena input 'current-odo' sudah dihapus
    const currentKm = parseInt(localStorage.getItem(STORAGE_KEY_ODO) || 0);
    const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    const newLog = {
        date: dateNow,
        km: currentKm,
        total: totalBiaya,
        items: selectedItems
    };

    const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || [];
    history.unshift(newLog);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));

    hitungTotal();
    loadHistory();
    checkHealth(currentKm);
    
    alert("Servis selesai! Biaya Rp " + formatRupiah(totalBiaya) + " disimpan.");
}

// --- 5. FITUR RIWAYAT (DENGAN DELETE) ---
function loadHistory() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || [];
    const container = document.getElementById('history-list');
    
    if(history.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#ccc; margin-top:20px">Belum ada riwayat servis.</p>';
        return;
    }

    container.innerHTML = ''; 

    history.forEach((log, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${log.date}</span>
                <span>KM ${log.km}</span>
            </div>
            <div style="margin: 5px 0; color:#555;">
                ${log.items.join('<br>')}
            </div>
            <div style="text-align:right; color:#0052D4; font-weight:bold; margin-top:5px;">
                Total: ${formatRupiah(log.total)}
            </div>

            <button class="btn-delete-history" onclick="deleteHistoryItem(${index})">
                Hapus
            </button>
        `;
        container.appendChild(item);
    });
}

function deleteHistoryItem(index) {
    if(!confirm("Yakin ingin menghapus catatan riwayat ini?")) return;

    const history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || [];
    history.splice(index, 1);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));

    loadHistory();
    
    // PERBAIKAN: Ambil KM dari localStorage
    const currentOdo = parseInt(localStorage.getItem(STORAGE_KEY_ODO) || 0);
    checkHealth(currentOdo);
}

// --- UTILS: GANTI TAB ---
function switchTab(tabName) {
    document.querySelectorAll('.section-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    document.getElementById('tab-' + tabName).classList.add('active');

    const links = document.querySelectorAll('.nav-link');
    if (tabName === 'planner') links[0].classList.add('active');
    else links[1].classList.add('active');
}