// --- 1. KONFIGURASI & INISIALISASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyATIQKEoacfqd_P5mBn915gzwbsLQE-va8",
    authDomain: "spp-unisri-taekwondo.firebaseapp.com",
    projectId: "spp-unisri-taekwondo",
    storageBucket: "spp-unisri-taekwondo.firebasestorage.app",
    messagingSenderId: "888126318699",
    appId: "1:888126318699:web:6e1ef3d5a49908c2b5692e"
};

if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.firestore();

// --- 2. IDENTIFIKASI PEMAIN DARI LOCALSTORAGE ---
let currentUser = null;
const savedLogin = localStorage.getItem("bmi_member_login");
if(savedLogin) {
    currentUser = JSON.parse(savedLogin).username;
}

// --- 3. EVENT LISTENER UNTUK TOMBOL MENU ---
document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll('.menu button');
    
    // Tombol 1: Leaderboard
    buttons[0].addEventListener('click', tampilkanLeaderboardGlobal); 
    
    // Tombol 2: Cara Bermain
    buttons[1].addEventListener('click', tampilkanCaraBermain);  
    
    // Tombol 3: Pengaturan (Menghapus Data Sesi / Reset Nyawa untuk Uji Coba)
    buttons[2].addEventListener('click', bukaPengaturan);
});

// --- 4. SINKRONISASI LEADERBOARD SAMA DENGAN GAME (POPUP ARSIP) ---
async function tampilkanLeaderboardGlobal() {
    try {
        // Mengambil data klasemen dari collection 'puzzle_leaderboard' sesuai logika game
        const snapshot = await db.collection('puzzle_leaderboard')
            .orderBy('best_score', 'asc')
            .limit(5) // Kita ambil Top 5 untuk versi rangkuman popup
            .get();

        let listJuara = "";
        let rank = 1;

        if (snapshot.empty) {
            listJuara = "Belum ada rekor yang tercatat di sistem.";
        } else {
            snapshot.forEach(doc => {
                const data = doc.data();
                const trophy = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
                const isMe = data.username === currentUser ? " (Anda)" : "";
                
                listJuara += `${trophy} ${data.nama}${isMe} - ${data.best_score} Langkah\n`;
                rank++;
            });
        }

        alert(`🏆 KLASEMEN GLOBAL PUZZLE MASTER 🏆\n\n${listJuara}`);

    } catch (error) {
        console.error("Gagal mengambil leaderboard:", error);
        alert("Gagal memuat leaderboard. Periksa koneksi internet Anda.");
    }
}

// --- 5. CARA BERMAIN ---
function tampilkanCaraBermain() {
    alert(
        `📖 CARA BERMAIN PUZZLE MASTER:\n\n` +
        `1. Tekan 'MULAI BERMAIN' untuk masuk ke arena game.\n` +
        `2. Klik kotak angka yang berada di dekat ruang kosong (0) untuk menggesernya.\n` +
        `3. Susun angka secara berurutan mulai dari 1 sampai 8.\n` +
        `4. Batas maksimal adalah 50 langkah.\n` +
        `5. Anda memiliki 3 kesempatan bermain setiap harinya.\n\n` +
        `Pecahkan rekor dengan langkah sesedikit mungkin!`
    );
}

// --- 6. FUNGSI PENGATURAN (SETTINGS) ---
function bukaPengaturan() {
    // Mengambil status nyawa/lives saat ini dari localStorage
    let sisaLives = localStorage.getItem('lives') || 3;
    
    let konfirmasi = confirm(
        `⚙ PENGATURAN GAME\n\n` +
        `• Akun Login: ${currentUser ? currentUser : "Belum Login (Guest)"}\n` +
        `• Sisa Kesempatan Hari Ini: ${sisaLives} Nyawa\n\n` +
        `Apakah Anda ingin merestart sisa kesempatan (nyawa) bermain Anda untuk hari ini kembali menjadi 3?`
    );

    if (konfirmasi) {
        // Reset data localstorage agar pemain bisa bermain kembali (berguna untuk testing)
        localStorage.setItem('lives', 3);
        localStorage.removeItem('lockoutTime');
        alert("🔄 Pengaturan Berhasil! Kesempatan bermain Anda telah di-reset menjadi 3.");
    }
}
