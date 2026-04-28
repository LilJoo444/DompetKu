// ==========================================
// 1. DATA & STATE MANAGEMENT
// ==========================================
const STORAGE_KEY = 'DOMPETKU_DATA';
const BUDGET_KEY = 'DOMPETKU_BUDGET';
const AUTH_KEY = 'DOMPETKU_AUTH';

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let monthlyBudget = parseFloat(localStorage.getItem(BUDGET_KEY)) || 0;
let userAuth = JSON.parse(localStorage.getItem(AUTH_KEY)) || null;

let currentFilterType = 'all';

const today = new Date();
let currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

// Pastikan elemen DOM ada sebelum di-set (karena disembunyikan di awal)
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('monthFilter').value = currentMonth;
    document.getElementById('date').valueAsDate = new Date();
    initApp();
});

const saveTransactions = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
const saveBudget = () => localStorage.setItem(BUDGET_KEY, monthlyBudget);

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const formatNumberDots = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// ==========================================
// 2. SISTEM LOGIN / AUTH
// ==========================================
const initApp = () => {
    if (userAuth) {
        // Mode Login (Sudah pernah daftar)
        document.getElementById('nameFieldGroup').classList.add('hidden');
        document.getElementById('authName').removeAttribute('required');
        document.getElementById('loginSubtext').innerText = "Masukkan PIN rahasia Anda";
    } else {
        // Mode Daftar
        document.getElementById('nameFieldGroup').classList.remove('hidden');
        document.getElementById('authName').setAttribute('required', 'true');
        document.getElementById('loginSubtext').innerText = "Buat Nama dan PIN rahasia untuk akunmu";
    }
};

document.getElementById('authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = document.getElementById('authPin').value;

    if (!userAuth) {
        // Register Proses
        const name = document.getElementById('authName').value;
        userAuth = { name: name, pin: pin };
        localStorage.setItem(AUTH_KEY, JSON.stringify(userAuth));
        masukAplikasi();
    } else {
        // Login Proses
        if (pin === userAuth.pin) {
            masukAplikasi();
        } else {
            alert("PIN Salah! Coba lagi.");
            document.getElementById('authPin').value = '';
        }
    }
});

const masukAplikasi = () => {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('greetingText').innerText = `Halo, ${userAuth.name}! 👋`;

    // Inisialisasi Dashboard
    initChart();
    updateApp();
    resetChartTimer();
};

document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('authPin').value = '';
        initApp(); // Set UI ke mode login
    }
});


// ==========================================
// 3. DARK MODE LOGIC
// ==========================================
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const htmlElement = document.documentElement;

if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlElement.classList.add('dark');
    themeIcon.classList.replace('ph-moon', 'ph-sun');
}

themeToggleBtn.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    const isDark = htmlElement.classList.contains('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    themeIcon.classList.replace(isDark ? 'ph-moon' : 'ph-sun', isDark ? 'ph-sun' : 'ph-moon');
    if (myChart) updateChartData();
});


// ==========================================
// 4. UI RENDERER & LOGIC
// ==========================================
const getMonthlyData = () => transactions.filter(t => t.date.startsWith(currentMonth));

const updateApp = () => {
    updateSummary();
    updateBudgetUI();
    generateInsights();
    renderTransactions();
    updateChartData();
};

const updateSummary = () => {
    const monthlyData = getMonthlyData();

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const globalBalance = totalIncome - totalExpense;

    const monthlyIncome = monthlyData.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyExpense = monthlyData.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

    document.getElementById('totalBalance').innerText = formatRupiah(globalBalance);
    document.getElementById('totalIncome').innerText = formatRupiah(monthlyIncome);
    document.getElementById('totalExpense').innerText = formatRupiah(monthlyExpense);
};

const updateBudgetUI = () => {
    const expense = getMonthlyData().filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const bar = document.getElementById('budgetProgressBar');
    const statusText = document.getElementById('budgetStatusText');

    if (monthlyBudget <= 0 || isNaN(monthlyBudget)) {
        bar.style.width = '0%';
        statusText.innerText = "Belum ada budget di-set.";
        return;
    }

    let percentage = (expense / monthlyBudget) * 100;
    if (percentage > 100) percentage = 100;
    bar.style.width = percentage + '%';

    if (percentage < 70) bar.className = 'h-full bg-income w-0 transition-all duration-500';
    else if (percentage < 90) bar.className = 'h-full bg-yellow-400 w-0 transition-all duration-500';
    else bar.className = 'h-full bg-expense w-0 transition-all duration-500';

    statusText.innerHTML = `Terpakai <b>${formatRupiah(expense)}</b> dari ${formatRupiah(monthlyBudget)}`;
};

const generateInsights = () => {
    const expenseData = getMonthlyData().filter(t => t.type === 'expense');
    const insightDiv = document.getElementById('smartInsight');
    const insightText = document.getElementById('insightText');

    if (expenseData.length === 0 || monthlyBudget <= 0 || isNaN(monthlyBudget)) {
        insightDiv.classList.add('hidden');
        return;
    }

    const catTotals = {};
    expenseData.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);
    let topCategory = Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b);
    let topAmount = catTotals[topCategory];
    let totalExpense = expenseData.reduce((acc, curr) => acc + curr.amount, 0);

    insightDiv.classList.remove('hidden');

    if (totalExpense > monthlyBudget) {
        insightText.innerHTML = `<span class="text-rose-600 font-semibold">Waduh! Pengeluaranmu udah ngelewatin batas budget bulanan!</span>`;
    } else if (topAmount > (totalExpense * 0.5)) {
        insightText.innerHTML = `Pengeluaranmu didominasi <b>${topCategory}</b> (${formatRupiah(topAmount)}). Direm dikit yuk!`;
    } else {
        insightText.innerHTML = `Pencatatan yang bagus! Tetap pantau pengeluaranmu.`;
    }
};

const renderTransactions = () => {
    const listContainer = document.getElementById('transactionList');
    listContainer.innerHTML = '';

    let filteredData = getMonthlyData();
    if (currentFilterType !== 'all') filteredData = filteredData.filter(t => t.type === currentFilterType);

    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredData.length === 0) {
        listContainer.innerHTML = `<div class="text-center text-slate-500 py-8"><i class="ph ph-receipt text-4xl mb-2 opacity-50"></i><p class="text-sm">Belum ada transaksi.</p></div>`;
        return;
    }

    filteredData.forEach(trx => {
        const isIncome = trx.type === 'income';
        const itemHTML = `
            <div class="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                <div class="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div class="${isIncome ? 'text-income bg-emerald-50 dark:bg-emerald-500/10' : 'text-expense bg-rose-50 dark:bg-rose-500/10'} w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-lg"><i class="ph ${isIncome ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i></div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-sm truncate text-slate-800 dark:text-white">${trx.description}</h4>
                        <div class="flex items-center gap-1.5 text-[11px] md:text-xs text-slate-500 mt-0.5 truncate"><span class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${trx.category}</span><span>•</span><span>${formatDate(trx.date)}</span></div>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="font-bold ${isIncome ? 'text-income' : 'text-slate-800 dark:text-white'} text-sm whitespace-nowrap">${isIncome ? '+' : '-'} ${formatRupiah(trx.amount)}</div>
                    <button onclick="confirmDelete(${trx.id})" class="text-slate-400 hover:text-rose-500 p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 rounded-md transition"><i class="ph ph-trash"></i></button>
                </div>
            </div>`;
        listContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
};


// ==========================================
// 5. CHART.JS LOGIC & REVISI TOMBOL
// ==========================================
let myChart, currentChartMode = 'type', chartRotateInterval, progressInterval;
const categoryColors = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

const initChart = () => {
    const ctx = document.getElementById('financeChart').getContext('2d');
    myChart = new Chart(ctx, { type: 'doughnut', data: { labels: [], datasets: [{ data: [], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } } });
};

const updateChartData = () => {
    if (!myChart) return;
    const isDark = document.documentElement.classList.contains('dark');
    myChart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#475569';
    myChart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#fff';
    myChart.data.datasets[0].borderWidth = isDark ? 2 : 0;

    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) {
        myChart.data.labels = ['Kosong'];
        myChart.data.datasets[0].data = [1];
        myChart.data.datasets[0].backgroundColor = isDark ? ['#334155'] : ['#E2E8F0'];
    } else {
        if (currentChartMode === 'type') {
            const inc = monthlyData.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
            const exp = monthlyData.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
            myChart.data.labels = ['Pemasukan', 'Pengeluaran'];
            myChart.data.datasets[0].data = [inc, exp];
            myChart.data.datasets[0].backgroundColor = ['#10B981', '#F43F5E'];
        } else {
            const catTotals = {};
            monthlyData.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);
            myChart.data.labels = Object.keys(catTotals);
            myChart.data.datasets[0].data = Object.values(catTotals);
            myChart.data.datasets[0].backgroundColor = categoryColors;
        }
    }
    myChart.update();
};

// Fungsi update warna tombol chart
const updateChartBtnUI = () => {
    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        if (btn.dataset.target === currentChartMode) {
            btn.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-white', 'shadow-sm');
            btn.classList.remove('text-slate-500');
        } else {
            btn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-white', 'shadow-sm');
            btn.classList.add('text-slate-500');
        }
    });
};

const resetChartTimer = () => {
    clearInterval(chartRotateInterval); clearInterval(progressInterval);
    const bar = document.getElementById('chartTimerBar');
    bar.style.width = '0%'; let width = 0;
    progressInterval = setInterval(() => { width += 2; bar.style.width = width + '%'; }, 100);
    chartRotateInterval = setInterval(() => {
        currentChartMode = currentChartMode === 'type' ? 'category' : 'type';
        updateChartBtnUI();
        updateChartData();
        resetChartTimer();
    }, 5000);
};

// REVISI 1: Event listener tombol Chart biar sinkron
document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentChartMode = e.target.dataset.target;
        updateChartBtnUI(); // Pindah warna tombolnya
        updateChartData();  // Ganti grafiknya
        resetChartTimer();  // Reset timernya biar gak langsung lompat
    });
});


// ==========================================
// 6. EVENT LISTENERS & MODALS
// ==========================================
const openModal = (m, b, c) => { document.getElementById(m).classList.remove('hidden'); setTimeout(() => { document.getElementById(b).classList.remove('opacity-0'); document.getElementById(c).classList.remove('scale-95', 'opacity-0'); }, 10); };
const closeModal = (m, b, c) => { document.getElementById(b).classList.add('opacity-0'); document.getElementById(c).classList.add('scale-95', 'opacity-0'); setTimeout(() => { document.getElementById(m).classList.add('hidden'); }, 300); };

// Show Custom Error Text
const showError = (title, desc) => {
    document.getElementById('errorModalTitle').innerText = title;
    document.getElementById('errorModalDesc').innerHTML = desc;
    openModal('errorModal', 'errorBackdrop', 'errorModalContent');
};

document.getElementById('btnOkayError').addEventListener('click', () => closeModal('errorModal', 'errorBackdrop', 'errorModalContent'));

// Form Transaksi (Dengan Revisi 2 & Validasi Saldo)
document.getElementById('amountDisplay').addEventListener('keyup', function () { let val = this.value.replace(/[^0-9]/g, ''); if (val) this.value = formatNumberDots(val); else this.value = ''; });

document.getElementById('transactionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const rawAmount = document.getElementById('amountDisplay').value.replace(/\./g, '');
    const amount = parseFloat(rawAmount);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    // REVISI 2: Cek Kategori Kosong
    if (category === "") {
        showError("Kategori Kosong", "Pilih kategori transaksi terlebih dahulu sebelum menyimpan.");
        return;
    }

    // Logic Validasi Saldo (All Time)
    if (type === 'expense') {
        const tInc = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const tExp = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
        if (amount > (tInc - tExp)) {
            showError("Saldo Tidak Cukup!", `Sisa saldomu saat ini hanya <b>${formatRupiah(tInc - tExp)}</b>.`);
            return;
        }
    }

    transactions.push({ id: Date.now(), type, amount, category, date, description });
    saveTransactions(); this.reset();
    document.getElementById('amountDisplay').value = '';
    document.getElementById('date').valueAsDate = new Date();
    updateApp(); resetChartTimer();
});

// Fitur Delete & Budget
let idToDelete = null;
window.confirmDelete = (id) => { idToDelete = id; openModal('deleteModal', 'deleteBackdrop', 'deleteModalContent'); };
document.getElementById('btnCancelDelete').addEventListener('click', () => { closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent'); idToDelete = null; });
document.getElementById('btnConfirmDelete').addEventListener('click', () => { if (idToDelete) { transactions = transactions.filter(t => t.id !== idToDelete); saveTransactions(); updateApp(); resetChartTimer(); closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent'); idToDelete = null; } });

const budgetInput = document.getElementById('budgetModalInput');
budgetInput.addEventListener('keyup', function () { let val = this.value.replace(/[^0-9]/g, ''); if (val) this.value = formatNumberDots(val); else this.value = ''; });
document.getElementById('btnSetBudget').addEventListener('click', () => { budgetInput.value = monthlyBudget > 0 ? formatNumberDots(monthlyBudget) : ''; openModal('budgetModal', 'budgetBackdrop', 'budgetModalContent'); setTimeout(() => budgetInput.focus(), 100); });
document.getElementById('btnCancelBudget').addEventListener('click', () => closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent'));
document.getElementById('btnSaveBudget').addEventListener('click', () => { const newBudget = parseFloat(budgetInput.value.replace(/\./g, '')) || 0; monthlyBudget = newBudget; saveBudget(); updateApp(); closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent'); });

// Filter
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white'); b.classList.add('text-slate-500'); });
        e.target.classList.remove('text-slate-500'); e.target.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
        currentFilterType = e.target.getAttribute('data-filter'); renderTransactions();
    });
});
document.getElementById('monthFilter').addEventListener('change', function () { currentMonth = this.value; updateApp(); resetChartTimer(); });

// ==========================================
// 7. EXPORT & IMPORT (PDF & JSON)
// ==========================================

// EXPORT JSON (Buat Backup / Pindah HP)
document.getElementById('btnExportJSON').addEventListener('click', () => {
    if (transactions.length === 0) return alert("Belum ada data.");
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(transactions)], { type: "application/json" }));
    a.download = `Backup_DompetKu_${new Date().getTime()}.json`; a.click();
});

// IMPORT JSON
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', function (e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (Array.isArray(data)) { transactions = data; saveTransactions(); updateApp(); alert("Data berhasil di-import!"); }
            else alert("Format salah!");
        } catch (err) { alert("Error membaca file!"); }
    };
    reader.readAsText(file); this.value = '';
});

// REVISI 3: EXPORT PDF (Buat dibaca / di-share)
document.getElementById('btnExportPDF').addEventListener('click', () => {
    const monthlyData = getMonthlyData();
    if (monthlyData.length === 0) return alert("Belum ada transaksi di bulan ini.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Kop Laporan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Laporan Keuangan - DompetKu", 14, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nama: ${userAuth.name}`, 14, 28);
    doc.text(`Periode Bulan: ${currentMonth}`, 14, 34);

    // Hitung Pemasukan & Pengeluaran Bulan Ini
    const mInc = monthlyData.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const mExp = monthlyData.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

    doc.text(`Total Pemasukan: ${formatRupiah(mInc)}`, 14, 42);
    doc.text(`Total Pengeluaran: ${formatRupiah(mExp)}`, 14, 48);

    // Bikin Tabel
    const tableColumn = ["Tanggal", "Kategori", "Catatan", "Tipe", "Nominal"];
    const tableRows = [];

    // Urutkan data berdasarkan tanggal dari yang terlama
    monthlyData.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(trx => {
        const typeStr = trx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const amountStr = formatRupiah(trx.amount);
        tableRows.push([formatDate(trx.date), trx.category, trx.description, typeStr, amountStr]);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] } // Warna Primary Tailwind
    });

    doc.save(`Laporan_Bulan_${currentMonth}.pdf`);
});