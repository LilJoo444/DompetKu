// ==========================================
// 1. DATA & STATE MANAGEMENT
// ==========================================
const STORAGE_KEY = 'DOMPETKU_DATA';
const BUDGET_KEY = 'DOMPETKU_BUDGET';

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let monthlyBudget = parseFloat(localStorage.getItem(BUDGET_KEY)) || 0;

let currentFilterType = 'all';

// NEW FEATURE: State Bulan (Default bulan saat ini YYYY-MM)
const today = new Date();
let currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
document.getElementById('monthFilter').value = currentMonth;

const saveTransactions = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
const saveBudget = () => localStorage.setItem(BUDGET_KEY, monthlyBudget);

// Helper Formatter
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const formatNumberDots = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// ==========================================
// 2. DARK MODE LOGIC
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
    if (myChart) updateChartData(); // Update warna chart
});

// ==========================================
// 3. UI RENDERER & NEW FEATURES
// ==========================================

// Ambil data khusus bulan yang dipilih
const getMonthlyData = () => {
    return transactions.filter(t => t.date.startsWith(currentMonth));
};

const updateApp = () => {
    updateSummary();
    updateBudgetUI();
    generateInsights();
    renderTransactions();
    updateChartData();
};

// Update Card
const updateSummary = () => {
    const monthlyData = getMonthlyData(); // Cuma itung bulan ini
    const income = monthlyData.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = monthlyData.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

    document.getElementById('totalIncome').innerText = formatRupiah(income);
    document.getElementById('totalExpense').innerText = formatRupiah(expense);
    document.getElementById('totalBalance').innerText = formatRupiah(income - expense);
};

// NEW FEATURE: Update Budget Progress
const updateBudgetUI = () => {
    const monthlyData = getMonthlyData();
    const expense = monthlyData.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

    const bar = document.getElementById('budgetProgressBar');
    const statusText = document.getElementById('budgetStatusText');

    if (monthlyBudget <= 0) {
        bar.style.width = '0%';
        statusText.innerText = "Belum ada budget di-set.";
        return;
    }

    let percentage = (expense / monthlyBudget) * 100;
    if (percentage > 100) percentage = 100;

    bar.style.width = percentage + '%';

    // Ubah warna bar sesuai persentase
    if (percentage < 70) {
        bar.className = 'h-full bg-income w-0 transition-all duration-500';
    } else if (percentage < 90) {
        bar.className = 'h-full bg-yellow-400 w-0 transition-all duration-500';
    } else {
        bar.className = 'h-full bg-expense w-0 transition-all duration-500';
    }

    statusText.innerHTML = `Terpakai <b>${formatRupiah(expense)}</b> dari ${formatRupiah(monthlyBudget)}`;
};

// NEW FEATURE: Smart Insights
const generateInsights = () => {
    const monthlyData = getMonthlyData();
    const expenseData = monthlyData.filter(t => t.type === 'expense');
    const insightDiv = document.getElementById('smartInsight');
    const insightText = document.getElementById('insightText');

    if (expenseData.length === 0) {
        insightDiv.classList.add('hidden');
        return;
    }

    // Cari kategori paling boros
    const catTotals = {};
    expenseData.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);

    let topCategory = Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b);
    let topAmount = catTotals[topCategory];
    let totalExpense = expenseData.reduce((acc, curr) => acc + curr.amount, 0);

    insightDiv.classList.remove('hidden');

    if (topAmount > (totalExpense * 0.5)) {
        insightText.innerHTML = `Pengeluaranmu bulan ini didominasi <b>${topCategory}</b> (${formatRupiah(topAmount)}). Coba direm dikit yuk!`;
    } else if (monthlyBudget > 0 && totalExpense > monthlyBudget) {
        insightText.innerHTML = `<span class="text-rose-600 font-semibold">Waduh! Pengeluaranmu udah ngelewatin batas budget bulanan!</span>`;
    } else {
        insightText.innerHTML = `Pencatatan yang bagus! Tetap pantau pengeluaranmu ya.`;
    }
};

// Render List (Filter by Type & Month)
const renderTransactions = () => {
    const listContainer = document.getElementById('transactionList');
    listContainer.innerHTML = '';

    let filteredData = getMonthlyData(); // Filter bulan
    if (currentFilterType !== 'all') {
        filteredData = filteredData.filter(t => t.type === currentFilterType);
    }

    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredData.length === 0) {
        listContainer.innerHTML = `<div class="text-center text-slate-500 py-8"><i class="ph ph-receipt text-4xl mb-2"></i><p>Belum ada transaksi bulan ini.</p></div>`;
        return;
    }

    filteredData.forEach(trx => {
        const isIncome = trx.type === 'income';
        const itemHTML = `
            <div class="flex justify-between items-center p-3 md:p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                <div class="flex items-center gap-3 md:gap-4">
                    <div class="${isIncome ? 'text-income bg-emerald-50 dark:bg-emerald-500/10' : 'text-expense bg-rose-50 dark:bg-rose-500/10'} w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-xl">
                        <i class="ph ${isIncome ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-sm md:text-base">${trx.description}</h4>
                        <div class="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">${trx.category}</span>
                            <span>•</span><span>${formatDate(trx.date)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="font-bold ${isIncome ? 'text-income' : 'text-slate-800 dark:text-white'} text-sm md:text-base whitespace-nowrap">
                        ${isIncome ? '+' : '-'} ${formatRupiah(trx.amount)}
                    </div>
                    <button onclick="deleteTransaction(${trx.id})" class="text-slate-400 hover:text-rose-500 p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 rounded-md transition">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>`;
        listContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
};

// ==========================================
// LOGIC CUSTOM MODAL (POPUP)
// ==========================================
let idToDelete = null; // Menyimpan ID sementara yang mau dihapus

// Helper untuk Buka Modal dengan Animasi
const openModal = (modalId, backdropId, contentId) => {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById(backdropId);
    const content = document.getElementById(contentId);

    modal.classList.remove('hidden');
    // Beri jeda dikit biar display:block ngerender dulu sebelum animasi jalan
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

// Helper untuk Tutup Modal dengan Animasi
const closeModal = (modalId, backdropId, contentId) => {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById(backdropId);
    const content = document.getElementById(contentId);

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');

    // Tunggu animasi selesai baru di-hide
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// --- LOGIC HAPUS DATA ---
window.deleteTransaction = (id) => {
    idToDelete = id; // Simpan ID ke variable global sementara
    openModal('deleteModal', 'deleteBackdrop', 'deleteModalContent');
};

document.getElementById('btnCancelDelete').addEventListener('click', () => {
    closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent');
    idToDelete = null; // Reset ID
});

document.getElementById('btnConfirmDelete').addEventListener('click', () => {
    if (idToDelete !== null) {
        transactions = transactions.filter(t => t.id !== idToDelete);
        saveTransactions();
        updateApp();
        resetChartTimer();
        closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent');
        idToDelete = null; // Reset ID
    }
});

// ==========================================
// 4. CHART.JS LOGIC
// ==========================================
let myChart, currentChartMode = 'type', chartRotateInterval, progressInterval;
const categoryColors = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

const initChart = () => {
    const ctx = document.getElementById('financeChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });
};

const updateChartData = () => {
    if (!myChart) initChart();
    const isDark = document.documentElement.classList.contains('dark');
    myChart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#475569';
    myChart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#fff';
    myChart.data.datasets[0].borderWidth = isDark ? 2 : 0;

    const monthlyData = getMonthlyData(); // Pake data bulan ini aja

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

const resetChartTimer = () => {
    clearInterval(chartRotateInterval); clearInterval(progressInterval);
    const bar = document.getElementById('chartTimerBar');
    bar.style.width = '0%';
    let width = 0;
    progressInterval = setInterval(() => { width += 2; bar.style.width = width + '%'; }, 100);
    chartRotateInterval = setInterval(() => {
        currentChartMode = currentChartMode === 'type' ? 'category' : 'type';
        document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
            if (btn.dataset.target === currentChartMode) {
                btn.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-white', 'shadow-sm');
                btn.classList.remove('text-slate-500');
            } else {
                btn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-white', 'shadow-sm');
                btn.classList.add('text-slate-500');
            }
        });
        updateChartData(); resetChartTimer();
    }, 5000);
};

// ==========================================
// 5. EVENT LISTENERS
// ==========================================

// NEW FEATURE: Format Input Nominal Auto Titik
const amountInput = document.getElementById('amountDisplay');
amountInput.addEventListener('keyup', function (e) {
    let val = this.value.replace(/[^0-9]/g, ''); // Hapus semua selain angka
    if (val) this.value = formatNumberDots(val); // Kasih titik
    else this.value = '';
});

document.getElementById('transactionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;

    // Hapus titik sebelum save jadi angka murni
    const rawAmount = document.getElementById('amountDisplay').value.replace(/\./g, '');
    const amount = parseFloat(rawAmount);

    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    transactions.push({ id: Date.now(), type, amount, category, date, description });
    saveTransactions();
    this.reset();
    document.getElementById('date').valueAsDate = new Date(); // Reset tanggal ke hari ini
    updateApp(); resetChartTimer();
});

// Filter Tipe Klik
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
            b.classList.add('text-slate-500');
        });
        e.target.classList.remove('text-slate-500');
        e.target.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
        currentFilterType = e.target.getAttribute('data-filter');
        renderTransactions();
    });
});

// NEW FEATURE: Filter Bulan Berubah
document.getElementById('monthFilter').addEventListener('change', function () {
    currentMonth = this.value;
    updateApp();
    resetChartTimer();
});

// --- LOGIC ATUR BUDGET ---
const budgetInput = document.getElementById('budgetModalInput');

// Format Auto Titik di Input Modal Budget
budgetInput.addEventListener('keyup', function () {
    let val = this.value.replace(/[^0-9]/g, '');
    if (val) this.value = formatNumberDots(val);
    else this.value = '';
});

// Tombol Buka Modal Budget di Main Screen
document.getElementById('btnSetBudget').addEventListener('click', () => {
    // Isi inputan dengan budget saat ini (kalau ada)
    budgetInput.value = monthlyBudget > 0 ? formatNumberDots(monthlyBudget) : '';
    openModal('budgetModal', 'budgetBackdrop', 'budgetModalContent');
    // Auto fokus ke inputan
    setTimeout(() => budgetInput.focus(), 100);
});

// Tombol Batal Modal Budget
document.getElementById('btnCancelBudget').addEventListener('click', () => {
    closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent');
});

// Tombol Simpan Modal Budget
document.getElementById('btnSaveBudget').addEventListener('click', () => {
    // Bersihin titiknya dulu sebelum disave jadi angka
    const rawBudget = budgetInput.value.replace(/\./g, '');
    const newBudget = parseFloat(rawBudget);

    if (!isNaN(newBudget) && newBudget >= 0) {
        monthlyBudget = newBudget;
        saveBudget();
        updateBudgetUI();
        generateInsights();
        closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent');
    } else {
        alert("Mohon masukkan nominal yang valid."); // Fallback kecil jika salah input
    }
});

// NEW FEATURE: Export Data
document.getElementById('btnExport').addEventListener('click', () => {
    const dataStr = JSON.stringify(transactions);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DompetKu_Backup_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// NEW FEATURE: Import Data
document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                transactions = importedData;
                saveTransactions();
                updateApp();
                alert("Data berhasil di-import!");
            } else {
                alert("Format file tidak sesuai!");
            }
        } catch (err) {
            alert("Error membaca file JSON!");
        }
    };
    reader.readAsText(file);
    this.value = ''; // Reset input
});

document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentChartMode = e.target.dataset.target;
        updateChartData(); resetChartTimer();
    });
});

// ==========================================
// 6. INIT APLIKASI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').valueAsDate = new Date();
    initChart(); updateApp(); resetChartTimer();
});