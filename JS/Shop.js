// ===============================================
// TOKO TAEGEUK / SHOP MANAGEMENT (FULLY SYNCED)
// ===============================================

// Fungsi untuk kembali ke Halaman Utama / Game
function goToHome() {
    setTimeout(() => {
        // Jika file HTML Anda ditaruh di luar folder utama setelah pemisahan, sesuaikan jalurnya
        window.location.href = "TKD.html"; 
    }, 50);
}

// Buka / Tutup Panel dengan optimasi rendering aman
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.toggle("show");
        // Gunakan setTimeout kecil agar CSS selesai merender class 'show' sebelum UI diupdate
        if (panelId === "shopPanel" && panel.classList.contains("show")) {
            setTimeout(updateShopUI, 30);
        }
    }
}

// Menampilkan data inventaris dengan penanganan fallback nilai default secara aman
function updateShopUI() {
    const coins = parseInt(localStorage.getItem("tkd_coins")) || 0;
    const hint = parseInt(localStorage.getItem("item_hint")) || 0;
    const noLimit = parseInt(localStorage.getItem("item_noLimit")) || 0;
    const shuffle = parseInt(localStorage.getItem("item_shuffle")) || 0;

    const elCoins = document.getElementById("shopCoins");
    const elHint = document.getElementById("ownedHint");
    const elNoLimit = document.getElementById("ownedNoLimit");
    const elShuffle = document.getElementById("ownedShuffle");

    if (elCoins) elCoins.textContent = "Rp. " + coins + "K"; // Format disamakan dengan Game
    if (elHint) elHint.textContent = hint;
    if (elNoLimit) elNoLimit.textContent = noLimit;
    if (elShuffle) elShuffle.textContent = shuffle;
}

// Fungsi beli item teroptimasi & Anti-Gagal
function buyItemShop(itemType, price) {
    let coins = parseInt(localStorage.getItem("tkd_coins")) || 0;

    if (coins < price) {
        alert("❌ Koin (Rp) tidak cukup untuk membeli item ini!");
        return;
    }

    // Solusi Brilian: Memastikan tipe item dipaksa berhuruf kecil agar cocok dengan Storage.js game
    const cleanType = itemType.trim(); 
    let key = `item_${cleanType}`;
    
    // Antitesis error typo parameter HTML
    if (cleanType === "hint") key = "item_hint";
    if (cleanType === "noLimit" || cleanType === "no_limit") key = "item_noLimit";
    if (cleanType === "shuffle") key = "item_shuffle";

    coins -= price;
    let itemCount = parseInt(localStorage.getItem(key)) || 0;
    itemCount++;

    // Simpan ke localStorage
    localStorage.setItem("tkd_coins", coins);
    localStorage.setItem(key, itemCount);

    // Update Tampilan Toko saat itu juga
    updateShopUI();
    alert(`✅ Pembelian Berhasil!\n\nSekarang Anda memiliki ${itemCount} buah item.`);
}

// Deteksi pemanggilan halaman secara asinkron
window.addEventListener("load", () => {
    updateShopUI();

    if (localStorage.getItem("openShopOnLoad") === "true") {
        localStorage.removeItem("openShopOnLoad");
        
        requestAnimationFrame(() => {
            setTimeout(() => {
                const panel = document.getElementById("shopPanel");
                if (panel) panel.classList.add("show");
            }, 100);
        });
    }
});

// 🔥 IDE BRILIAN: Sinkronisasi Otomatis Lintas Halaman Browser
// Jika user mengubah data di game, Toko otomatis memperbarui angkanya tanpa di-refresh
window.addEventListener("storage", (e) => {
    if (e.key === "tkd_coins" || e.key.startsWith("item_")) {
        updateShopUI();
    }
});
