
// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyATIQKEoacfqd_P5mBn915gzwbsLQE-va8",
    authDomain: "spp-unisri-taekwondo.firebaseapp.com",
    projectId: "spp-unisri-taekwondo",
    storageBucket: "spp-unisri-taekwondo.firebasestorage.app",
    messagingSenderId: "888126318699",
    appId: "1:888126318699:web:6e1ef3d5a49908c2b5692e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- STATE GLOBAL (dipakai lintas fitur: kalender kehadiran, mini header, dll) ---
let currentMemberData = null;
let jadwalGlobalData = null;
const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function getMingguKe() {
    const now = new Date();
    const tanggal = now.getDate();
    if (tanggal < 3) return 4;
    if (tanggal >= 31) return 1;
    return Math.floor((tanggal - 3) / 7) + 1;
}

function getMingguKey() {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const tahun = now.getFullYear();
    const bulan = now.getMonth() + 1;
    const mingguKe = getMingguKe();
    return `${tahun}-${bulan}-Minggu-${mingguKe}`;
}

// --- FUNGSI LOGIN ---
function login() {
    const u = document.getElementById("userInp").value.trim();
    const p = document.getElementById("passInp").value.trim();

    if(!u || !p) return alert("Isi username & password!");

    db.collection("siswa")
      .where("username", "==", u)
      .where("password", "==", p)
      .get()
      .then(snapshot => {
          if(snapshot.empty) {
              alert("Username atau Password salah!");
          } else {
              const dataSiswa = snapshot.docs[0].data();
              localStorage.setItem("bmi_member_login", JSON.stringify({username: dataSiswa.username}));
              
              document.getElementById("loginSection").classList.remove("active");
              document.getElementById("profileSection").classList.add("active");
              tampilkanProfil(dataSiswa);
              
              aktifkanRealtimeUpdate(dataSiswa.username);
          }
      })
      .catch(err => alert("Terjadi kesalahan koneksi: " + err));
}

// --- FUNGSI OTOMATIS KIRIM PENDAFTARAN KE WHATSAPP (MENGGANTIKAN FIREBASE) ---
function kirimPendaftaranWA() {
    const nama = document.getElementById("regNama").value.trim();
    const berat = document.getElementById("regBerat").value.trim();
    const tinggi = document.getElementById("regTinggi").value.trim();
    const tglLahir = document.getElementById("regTglLahir").value;
    const sabuk = document.getElementById("regSabuk").value;

    if(!nama || !berat || !tinggi || !tglLahir) {
        return alert("Harap isi semua kolom formulir pendaftaran!");
    }

    // Format tanggal lahir ke format Indonesia yang rapi (DD-MM-YYYY)
    const p = tglLahir.split("-");
    const tglFormat = `${p[2]}-${p[1]}-${p[0]}`;

    // Membuat template pesan text WhatsApp yang rapi
    const pesanText = `Halo Shabeum, saya ingin mendaftarkan anggota baru untuk BMI Taekwondo Academy. Berikut adalah datanya:\n\n` +
                      `• Nama Lengkap Anak : ${nama}\n` +
                      `• Berat Badan : ${berat} kg\n` +
                      `• Tinggi Badan : ${tinggi} cm\n` +
                      `• Tanggal Lahir : ${tglFormat}\n` +
                      `• Sabuk Awal : ${sabuk}\n\n` +
                      `Mohon untuk segera diproses nggih, Shabeum. Terima kasih! 🙏`;

    // Nomor WhatsApp tujuan
    const noTujuan = "+62882003007515";
    
    // URL API WhatsApp
    const waUrl = `https://wa.me/${noTujuan.replace('+', '')}?text=${encodeURIComponent(pesanText)}`;

    // Mengalihkan halaman atau membuka tab baru ke WhatsApp
    window.open(waUrl, '_blank');

    // Menutup modal pendaftaran
    toggleRegister(false);
    document.getElementById("regNama").value = "";
    document.getElementById("regBerat").value = "";
    document.getElementById("regTinggi").value = "";
    document.getElementById("regTglLahir").value = "";
}

// --- REAL-TIME LISTENER ---
function aktifkanRealtimeUpdate(username) {
    db.collection("siswa").where("username", "==", username)
      .onSnapshot(snapshot => {
          if(!snapshot.empty){
              tampilkanProfil(snapshot.docs[0].data());
          }
      });
}

// --- FUNGSI TAMPILKAN PROFIL ---
function tampilkanProfil(data) {
    currentMemberData = data; // simpan untuk dipakai fitur Kalender Kehadiran

    const now = new Date();
    const mingguSekarangKey = getMingguKey();
    const alertBox = document.getElementById("alertBox");

    const kuotaKas = parseInt(data.kuota_kas || 0);
    const isLunasSistem = (data.minggu_bayar === mingguSekarangKey) || (kuotaKas > 0);

    document.getElementById("welcomeName").innerText = "Halo, " + (data.nama || "Member") + "!";
    document.getElementById("memberUser").innerText = "@" + (data.username || "user");
    document.getElementById("valSabuk").innerText = data.warna_sabuk || "-";
    document.getElementById("valFisik").innerText = (data.berat_badan || 0) + "kg / " + (data.tinggi_badan || 0) + "cm";

    // Isi mini header sticky & matikan skeleton loading (data sudah siap ditampilkan)
    const miniName = document.getElementById("miniName");
    if (miniName) miniName.innerText = data.nama || "Member";
    const profSection = document.getElementById("profileSection");
    if (profSection) profSection.classList.remove("loading");
    
    if(data.tanggal_lahir) {
        const p = data.tanggal_lahir.split("-");
        const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
        document.getElementById("valTgl").innerText = `${p[2]} ${bulan[parseInt(p[1])-1]} ${p[0]}`;
    }

    if (data.nomor_hp) {
        const safeHP = encodeURIComponent(data.nomor_hp);
        document.getElementById("valWA").innerHTML = `<a href="https://wa.me/${safeHP}" target="_blank" class="wa-link">${htmlEntities(data.nomor_hp)}</a>`;
    }

    const tag = document.getElementById("statusTag");
    if(isLunasSistem) {
        let labelKuota = kuotaKas > 0 ? `LUNAS (Sisa Kuota: ${kuotaKas} Mgg)` : 'LUNAS MINGGU INI';
        tag.innerHTML = `<span class="badge lunas">${labelKuota}</span>`;
    } else {
        tag.innerHTML = '<span class="badge belum">BELUM BAYAR KAS</span>';
    }

    if (data.peringatan === true) {
        alertBox.style.display = "block";
        if (!isLunasSistem) {
            alertBox.classList.add("alert-danger-active");
            alertBox.innerHTML = `⚠️ <strong>PERINGATAN KERAS:</strong> Segera lunasi kewajiban Anda untuk minggu ini!`;
        } else {
            alertBox.classList.remove("alert-danger-active");
            alertBox.innerHTML = `⚠️ <strong>Perhatian:</strong> Harap cek kembali data administrasi Anda.`;
        }
    } else {
        alertBox.style.display = "none";
    }

    const paymentBox = document.getElementById("paymentStatus");
    
    const mingguSekarangFormat = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    let paymentHTML = `
    <div class="payment-card">
        <div class="payment-top">
            <div>
                <div class="payment-week">Minggu ${getMingguKe()} (${mingguSekarangFormat})</div>
                <div class="payment-nominal">Kas Mingguan Wajib</div>
            </div>
            <div class="payment-status ${isLunasSistem ? 'status-lunas' : 'status-belum'}">
                ${isLunasSistem ? "LUNAS" : "BELUM"}
            </div>
        </div>
    </div>`;
    paymentBox.innerHTML = paymentHTML;

    const historyContainer = document.getElementById("historyContainer");
    let riwayatTeksAdmin = data.riwayat_kas || [];

    if (riwayatTeksAdmin.length > 0) {
        let mainWrapper = document.createElement("div");
        
        for (let i = riwayatTeksAdmin.length - 1; i >= 0; i--) {
            let itemText = riwayatTeksAdmin[i];
            let isBorongan = itemText.includes("BORONGAN") || itemText.includes("Bayar");
            let isKoreksi = itemText.includes("Koreksi") || itemText.includes("mengoreksi");
            
            let bgStyle = "rgba(255,255,255,0.04)";
            let badgeColor = "var(--soft)";
            let badgeText = "INFO";

            if(isBorongan) {
                bgStyle = "rgba(63,98,18,0.2)";
                badgeColor = "#3f6212";
                badgeText = "KAS";
            } else if(isKoreksi) {
                bgStyle = "rgba(133,77,14,0.2)";
                badgeColor = "#854d0e";
                badgeText = "EDIT";
            }

            let itemEl = document.createElement("div");
            itemEl.className = "hist-item";
            itemEl.style.background = bgStyle;

            let textWrapper = document.createElement("div");
            textWrapper.style.cssText = "flex: 1; padding-right: 10px;";
            
            let innerTextEl = document.createElement("div");
            innerTextEl.style.cssText = "font-weight:700; font-size:14px; line-height:1.4;";
            innerTextEl.innerText = itemText;

            let badgeEl = document.createElement("div");
            badgeEl.className = "badge";
            badgeEl.style.cssText = `background: ${badgeColor}; color: white;`;
            badgeEl.innerText = badgeText;

            textWrapper.appendChild(innerTextEl);
            itemEl.appendChild(textWrapper);
            itemEl.appendChild(badgeEl);
            mainWrapper.appendChild(itemEl);
        }
        historyContainer.innerHTML = "";
        historyContainer.appendChild(mainWrapper);
    } else {
        historyContainer.innerHTML = "<p style='color:#bcaaa4;font-size:14px; text-align:center; padding:10px;'>Belum ada riwayat pembayaran resmi.</p>";
    }
}

function htmlEntities(str) {
    let d = document.createElement('div');
    d.innerText = str;
    return d.innerHTML;
}

// --- JADWAL SYSTEM ---
db.collection("jadwal").doc("global").onSnapshot(doc => {
    if(!doc.exists) return;
    const j = doc.data();
    jadwalGlobalData = j; // simpan untuk dipakai fitur Kalender Kehadiran
    const hariList = ["senin","selasa","rabu","kamis","jumat","sabtu","minggu"];
    let html = "";

    hariList.forEach(hari => {
        const sessions = j[hari] || [];
        if (sessions.length > 0) {
            let items = "";
            sessions.forEach(s => {
                items += `
                <div class="session-card">
                    <div class="session-info">
                        <div class="session-type">${htmlEntities(s.type)}</div>
                        <div class="session-jam">${htmlEntities(s.jam)} WIB</div>
                    </div>
                    <div class="session-badge">AKTIF</div>
                </div>`;
            });
            html += `<div class="day-card"><div class="day-title">${hari}</div>${items}</div>`;
        }
    });
    document.getElementById("jadwal").innerHTML = html || "<p>Belum ada jadwal.</p>";
});

// --- SESSION CONTROL ---
window.onload = function(){
    const savedLogin = localStorage.getItem("bmi_member_login");
    if(savedLogin){
        const localData = JSON.parse(savedLogin);
        document.getElementById("loginSection").classList.remove("active");
        document.getElementById("profileSection").classList.add("active");
        aktifkanRealtimeUpdate(localData.username);
    } else {
        document.getElementById("loginSection").classList.add("active");
    }
}

function logout(){
    localStorage.removeItem("bmi_member_login");
    location.reload();
}

function toggleJadwal(show) {
    document.getElementById("modalJadwal").style.display = show ? "block" : "none";
}

function toggleRegister(show) {
    document.getElementById("modalRegister").style.display = show ? "block" : "none";
}

// --- KONTROL PILIH GAME (menu 2 pilihan) ---
function togglePilihGame(show) {
    const modal = document.getElementById("modalPilihGame");
    modal.style.display = show ? "flex" : "none";
}

// --- MEMBUKA GAME YANG DIPILIH DI DALAM PLAYER MODAL ---
function bukaGame(jenis) {
    togglePilihGame(false);
    const frame = document.getElementById("gameFrame");
    if (jenis === "tkd") {
        frame.src = "https://tempayanpapaya-coder.github.io/BMI/depan.html";
    } else {
        frame.src = "https://tempayanpapaya-coder.github.io/BMI/Puzle.html";
    }
    toggleGamePlayer(true);
}

// --- KONTROL MODAL GAME PLAYER (iframe) ---
function toggleGamePlayer(show) {
    const modal = document.getElementById("modalGame");
    modal.style.display = show ? "flex" : "none";
    if (!show) {
        document.getElementById("gameFrame").src = ""; // hentikan game saat modal ditutup
    }
}

// --- UPDATE WINDOW ONCLICK (Gantikan yang lama dengan ini) ---
window.onclick = function(event) {
    if (event.target == document.getElementById("modalJadwal")) toggleJadwal(false);
    if (event.target == document.getElementById("modalRegister")) toggleRegister(false);
    if (event.target == document.getElementById("modalGame")) toggleGamePlayer(false);
    if (event.target == document.getElementById("modalPilihGame")) togglePilihGame(false);
    if (event.target == document.getElementById("modalKalender")) toggleKalender(false);
}

function toggleCoachMessage(show){
    const modal = document.getElementById("coachModal");
    const audio = document.getElementById("coachAudio");
    
    if (show) {
        modal.style.display = "flex";
        // Memutar lagu dari awal saat modal dibuka
        audio.currentTime = 0; 
        audio.play().catch(error => {
            console.log("Pemutaran audio diblokir oleh browser:", error);
        });
    } else {
        modal.style.display = "none";
        // Menghentikan lagu saat modal ditutup
        audio.pause(); 
    }
}

// ==========================================================
// STICKY MINI HEADER — muncul begitu user scroll ke bawah
// ==========================================================
window.addEventListener("scroll", function () {
    const mh = document.getElementById("miniHeader");
    if (!mh) return;
    if (window.scrollY > 260) {
        mh.classList.add("show");
    } else {
        mh.classList.remove("show");
    }
});

// ==========================================================
// FITUR: KALENDER KEHADIRAN
// Menggabungkan hari latihan terjadwal (dari koleksi "jadwal")
// dengan status kas mingguan member (lunas / belum) sebagai
// indikator kehadiran & keaktifan, karena sistem saat ini
// mencatat kewajiban per minggu, bukan absen harian per sesi.
// ==========================================================
function toggleKalender(show) {
    const modal = document.getElementById("modalKalender");
    if (!modal) return;
    modal.style.display = show ? "block" : "none";
    if (show) {
        if (currentMemberData) {
            bangunKalenderKehadiran(currentMemberData);
        } else {
            document.getElementById("calMonthLabel").innerText = "Memuat data...";
        }
    }
}

function bangunKalenderKehadiran(data) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    document.getElementById("calMonthLabel").innerText = `${NAMA_BULAN[month]} ${year}`;

    // --- Tentukan hari-hari (Senin..Minggu) yang punya sesi latihan terjadwal ---
    const hariMap = { 0: "minggu", 1: "senin", 2: "selasa", 3: "rabu", 4: "kamis", 5: "jumat", 6: "sabtu" };
    const trainingDow = new Set();
    if (jadwalGlobalData) {
        Object.keys(hariMap).forEach((k) => {
            const hari = hariMap[k];
            if ((jadwalGlobalData[hari] || []).length > 0) trainingDow.add(parseInt(k));
        });
    }

    // --- Status kas minggu ini (persis sama dengan logika di tampilkanProfil) ---
    const mingguIniKey = getMingguKey();
    const kuotaKas = parseInt(data.kuota_kas || 0);
    const isLunasSekarang = (data.minggu_bayar === mingguIniKey) || (kuotaKas > 0);

    // --- Bangun grid kalender bulan berjalan (Senin s/d Minggu) ---
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // ubah Minggu=0 jadi index Senin-first

    let gridHtml = "";
    ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].forEach((d) => {
        gridHtml += `<div class="cal-daylabel">${d}</div>`;
    });
    for (let i = 0; i < startOffset; i++) {
        gridHtml += `<div class="cal-cell empty"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const thisDate = new Date(year, month, d);
        const dow = thisDate.getDay();
        const isToday = d === now.getDate();
        let cls = "cal-cell";
        if (trainingDow.has(dow)) cls += " training";
        if (isToday) cls += " today " + (isLunasSekarang ? "lunas" : "belum");
        gridHtml += `<div class="${cls}">${d}</div>`;
    }
    document.getElementById("calGrid").innerHTML = gridHtml;

    // --- Strip riwayat kas terakhir (maks 12 entri terakhir, urut kronologis) ---
    const riwayat = data.riwayat_kas || [];
    const recent = riwayat.slice(-12);
    let stripHtml = "";
    recent.forEach((txt) => {
        const isBorongan = txt.includes("BORONGAN") || txt.includes("Bayar");
        const isKoreksi = txt.includes("Koreksi") || txt.includes("mengoreksi");
        let cls = "streak-chip info";
        let label = "Info";
        if (isBorongan) { cls = "streak-chip kas"; label = "✅ Kas"; }
        else if (isKoreksi) { cls = "streak-chip koreksi"; label = "✏️ Edit"; }
        stripHtml += `<div class="${cls}" title="${htmlEntities(txt)}">${label}</div>`;
    });
    document.getElementById("streakStrip").innerHTML =
        stripHtml || "<p style='font-size:12px;color:var(--soft);padding:10px;'>Belum ada riwayat kas tercatat.</p>";

    // --- Kartu statistik ringkas ---
    const totalKasTercatat = riwayat.filter((t) => t.includes("BORONGAN") || t.includes("Bayar")).length;
    document.getElementById("kalStats").innerHTML = `
        <div class="kal-stat-card">
            <div class="kal-stat-num">${totalKasTercatat}</div>
            <div class="kal-stat-label">Total Kas Tercatat</div>
        </div>
        <div class="kal-stat-card">
            <div class="kal-stat-num">${kuotaKas}</div>
            <div class="kal-stat-label">Minggu Prabayar</div>
        </div>
        <div class="kal-stat-card">
            <div class="kal-stat-num" style="color:${isLunasSekarang ? '#4d7c0f' : '#ef4444'}">
                ${isLunasSekarang ? "LUNAS" : "BELUM"}
            </div>
            <div class="kal-stat-label">Status Minggu Ini</div>
        </div>
    `;
}

// ==========================================================
// PWA: REGISTRASI SERVICE WORKER
// Wajib ada agar situs ini dianggap "installable" oleh
// PWABuilder/Chrome saat dikonversi menjadi APK.
// ==========================================================
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => console.log("Service worker member portal aktif ✅"))
            .catch((err) => console.warn("Gagal register service worker:", err));
    });
}
