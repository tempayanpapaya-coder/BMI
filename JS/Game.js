
// --- 1. KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyATIQKEoacfqd_P5mBn915gzwbsLQE-va8",
    authDomain: "spp-unisri-taekwondo.firebaseapp.com",
    projectId: "spp-unisri-taekwondo",
    storageBucket: "spp-unisri-taekwondo.firebasestorage.app",
    messagingSenderId: "888126318699",
    appId: "1:888126318699:web:6e1ef3d5a49908c2b5692e"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// --- 2. IDENTIFIKASI PEMAIN DARI LOCALSTORAGE ---
let currentUser = null;
const savedLogin = localStorage.getItem("bmi_member_login");
if(savedLogin) {
    currentUser = JSON.parse(savedLogin).username;
} else {
    alert("Perhatian: Anda belum login di Member Area. Skor Anda tidak akan tersimpan di klasemen.");
}

// --- 3. LOGIKA GAME ---
let gameOver = true;
const MAX_LIVES = 3;
let lives = MAX_LIVES;
const puzzle = document.getElementById("puzzle");
const movesText = document.getElementById("moves");
const message = document.getElementById("message");

let moves = 0;
let tiles = [1,2,3, 4,5,6, 7,8,0];

function renderPuzzle() {
    puzzle.innerHTML = "";
    tiles.forEach((tile, index) => {
        const tileDiv = document.createElement("div");
        tileDiv.classList.add("tile");
        
        if (tile === 0) {
            tileDiv.classList.add("empty");
        } else {
            tileDiv.textContent = tile;
            tileDiv.addEventListener("click", () => moveTile(index));
            
            // --- LOGIKA KALKULASI REKAHAN GAMBAR AKURAT ---
            // Tentukan posisi kolom dan baris asli angka (berdasarkan rentang 1-8)
            const targetCol = (tile - 1) % 3;
            const targetRow = Math.floor((tile - 1) / 3);
            
            // Konversi posisi kolom & baris menjadi persentase koordinat CSS (Kiri=0%, Tengah=50%, Kanan=100%)
            const posX = targetCol * 50;
            const posY = targetRow * 50;
            
            // Terapkan pergeseran background ke elemen kotak puzzle
            tileDiv.style.backgroundPosition = `${posX}% ${posY}%`;
        }
        puzzle.appendChild(tileDiv);
    });
}



function moveTile(index){
    if(gameOver) return;
    const empty = tiles.indexOf(0);
    const rowTile = Math.floor(index/3); const colTile = index%3;
    const rowEmpty = Math.floor(empty/3); const colEmpty = empty%3;
    
    if(Math.abs(rowTile-rowEmpty) + Math.abs(colTile-colEmpty) === 1){
        [tiles[index],tiles[empty]] = [tiles[empty],tiles[index]];
        moves++;
        movesText.textContent = moves;
        if(moves >= 51){ loseGame(); return; }
        renderPuzzle();
        checkWin();
    }
}

function checkWin(){
    const win = [1,2,3,4,5,6,7,8,0];
    if(JSON.stringify(tiles) === JSON.stringify(win)){
        gameOver = true;
        document.querySelector(".puzzle").classList.add("won");

        if(moves >= 51){
            kurangiNyawa();
            if(lives <= 0) {
                tampilkanPesanHabis();
                setTimeout(() => alert(ambilFormatPesanHabis()), 300);
            } else {
                message.innerHTML = "Selesai, tapi terlalu banyak langkah!";
                setTimeout(() => alert('Anda menang, tapi menggunakan ' + moves + ' langkah (Maks 50). Kesempatan harian Anda berkurang 1.'), 300);
            }
        } else {
            message.innerHTML = "🏆 LUAR BIASA! Selesai dalam " + moves + " langkah!";
            simpanSkorKeDatabase(moves); 
            setTimeout(() => alert('🎉 SELAMAT! Anda memecahkan puzzle dengan ' + moves + ' langkah! Cek klasemen di bawah! 🏆'), 300);
        }
    }
}

function kurangiNyawa(){
    lives--;
    localStorage.setItem('lives', lives);
    document.getElementById('lives').textContent = lives;
    
    // Simpan jam ketika nyawa habis agar tetap konsisten saat direfresh
    if(lives <= 0 && !localStorage.getItem('lockoutTime')) {
        const sekarang = new Date();
        const jam = String(sekarang.getHours()).padStart(2, '0');
        const menit = String(sekarang.getMinutes()).padStart(2, '0');
        localStorage.setItem('lockoutTime', `${jam}:${menit}`);
    }
}

// Fungsi pembantu untuk membuat format teks waktu
function ambilFormatPesanHabis() {
    let waktuBermain = localStorage.getItem('lockoutTime');
    if(!waktuBermain) {
        const sekarang = new Date();
        const jam = String(sekarang.getHours()).padStart(2, '0');
        const menit = String(sekarang.getMinutes()).padStart(2, '0');
        waktuBermain = `${jam}:${menit}`;
    }
    return `🚫 Kesempatan anda telah habis hari ini, silahkan kembali besuk pukul ${waktuBermain} WIB.`;
}

function tampilkanPesanHabis() {
    message.innerHTML = ambilFormatPesanHabis();
}

function loseGame(){
    document.querySelector(".puzzle").classList.add("failed");
    gameOver = true;
    kurangiNyawa();
    
    if(lives <= 0) {
        tampilkanPesanHabis();
    } else {
        message.innerHTML = "💀 Kesempatan gagal! Maksimal 50 langkah.";
    }
}

function shufflePuzzle(){
    moves = 0; movesText.textContent = 0;
    for(let i=0; i<300; i++){
        const empty = tiles.indexOf(0);
        const row = Math.floor(empty/3); const col = empty%3;
        let p = [];
        if(row>0) p.push(empty-3); if(row<2) p.push(empty+3);
        if(col>0) p.push(empty-1); if(col<2) p.push(empty+1);
        const rand = p[Math.floor(Math.random()*p.length)];
        [tiles[rand],tiles[empty]] = [tiles[empty],tiles[rand]];
    }
    renderPuzzle();
}

function startGame(){
    document.querySelector(".puzzle").classList.remove("failed", "won"); 
    if(lives <= 0){ 
        alert(ambilFormatPesanHabis()); 
        tampilkanPesanHabis();
        return; 
    }
    gameOver = false;
    message.innerHTML = "🔥 Ayo pecahkan rekor!";
    shufflePuzzle();
}

function checkDailyReset(){
    const today = new Date().toISOString().split('T')[0];
    if(localStorage.getItem('lastDate') !== today){
        localStorage.setItem('lastDate', today);
        localStorage.setItem('lives', MAX_LIVES);
        localStorage.removeItem('lockoutTime'); // Hapus jam kunci jika hari sudah berganti
    }
    lives = parseInt(localStorage.getItem('lives')) || MAX_LIVES;
    document.getElementById('lives').textContent = lives;
    
    // Jika waktu dicek dan nyawa masih kosong, tampilkan langsung di layar teks pengunciannya
    if (lives <= 0) {
        tampilkanPesanHabis();
    }
}

// Inisialisasi awal
renderPuzzle();
checkDailyReset();

// =====================================================
// LEADERBOARD GLOBAL TOP 3
// =====================================================
async function simpanSkorKeDatabase(langkah){
    if(!currentUser) return;
    try{
        let namaPemain = currentUser;
        const siswaSnapshot = await db.collection("siswa").where("username","==",currentUser).get();
        if(!siswaSnapshot.empty){
            namaPemain = siswaSnapshot.docs[0].data().nama || currentUser;
        }

        const docRef = db.collection("puzzle_leaderboard").doc(currentUser);
        const doc = await docRef.get();

        if(!doc.exists){
            await docRef.set({
                username: currentUser,
                nama: namaPemain,
                best_score: langkah,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return;
        }

        const oldScore = doc.data().best_score;
        if(langkah < oldScore){
            await docRef.update({
                best_score: langkah,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }catch(error){
        console.error("Gagal menyimpan skor:", error);
    }
}

// =====================================================
// REALTIME LEADERBOARD TOP 3
// =====================================================
db.collection("puzzle_leaderboard")
.orderBy("best_score","asc")
.limit(3)
.onSnapshot((querySnapshot)=>{
    const listContainer = document.getElementById("leaderboardList");
    if(querySnapshot.empty){
        listContainer.innerHTML = `<div style="text-align:center; color:#888; font-size:14px;">Belum ada juara.</div>`;
        return;
    }

    let html = "";
    let rank = 1;

    querySnapshot.forEach((doc)=>{
        const data = doc.data();
        const trophy = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
        const isMe = data.username === currentUser ? " (Anda)" : "";

        html += `
            <div class="rank-item rank-${rank}">
                <div class="rank-player">
                    <span class="rank-num">${trophy}</span>
                    <span style="color:${isMe ? '#ffd36b' : '#ffffff'};">${data.nama}${isMe}</span>
                </div>
                <div class="rank-score">
                    ${data.best_score} <span style="font-size:11px; color:#888;">Langkah</span>
                </div>
            </div>
        `;
        rank++;
    });
    listContainer.innerHTML = html;
}, (error)=>{
    console.error("Error leaderboard:", error);
});

// --- EFEK BACKGROUND GAMBAR OPTIMASILed ---
const style = document.createElement('style');
style.innerHTML = `body::before { background-image: url('https://raw.githubusercontent.com/tempayanpapaya-coder/Komponen/refs/heads/main/Footer.png'); }`;
document.head.appendChild(style);
