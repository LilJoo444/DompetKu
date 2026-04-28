// ==========================================
// 1. DATA & STATE MANAGEMENT
// ==========================================
const STORAGE_KEY = 'DOMPETKU_DATA';
const BUDGET_KEY = 'DOMPETKU_BUDGET';

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let monthlyBudget = parseFloat(localStorage.getItem(BUDGET_KEY)) || 0;

let currentFilterType = 'all'; 

const today = new Date();
let currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
document.getElementById('monthFilter').value = currentMonth;

const saveTransactions = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
const saveBudget = () => localStorage.setItem(BUDGET_KEY, monthlyBudget);

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
    if (myChart) updateChartData(); 
});

// ==========================================
// 3. UI RENDERER & LOGIC
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

    // Total Saldo Dihitung Semua Waktu (Biar saldo bulan lalu kebawa ke bulan ini)
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const globalBalance = totalIncome - totalExpense;

    // Pemasukan & Pengeluaran Dihitung Cuma Bulan Ini Saja
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

// REVISI: Alert Insight hanya muncul kalau budget SUDAH DIATUR (> 0)
const generateInsights = () => {
    const expenseData = getMonthlyData().filter(t => t.type === 'expense');
    const insightDiv = document.getElementById('smartInsight');
    const insightText = document.getElementById('insightText');

    // Sembunyikan insight jika tidak ada data pengeluaran ATAU budget belum di set
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
        insightText.innerHTML = `Pengeluaranmu bulan ini didominasi <b>${topCategory}</b> (${formatRupiah(topAmount)}). Coba direm dikit yuk!`;
    } else {
        insightText.innerHTML = `Pencatatan yang bagus! Tetap pantau pengeluaranmu ya.`;
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
        // REVISI RESPONSIVE LIST: Pake class truncate dan flex-1 biar HP layar sempit gak berantakan
        const itemHTML = `
            <div class="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                <div class="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div class="${isIncome ? 'text-income bg-emerald-50 dark:bg-emerald-500/10' : 'text-expense bg-rose-50 dark:bg-rose-500/10'} w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-lg">
                        <i class="ph ${isIncome ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-sm truncate text-slate-800 dark:text-white">${trx.description}</h4>
                        <div class="flex items-center gap-1.5 text-[11px] md:text-xs text-slate-500 mt-0.5 truncate">
                            <span class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${trx.category}</span>
                            <span>•</span><span>${formatDate(trx.date)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <div class="font-bold ${isIncome ? 'text-income' : 'text-slate-800 dark:text-white'} text-sm whitespace-nowrap">
                        ${isIncome ? '+' : '-'} ${formatRupiah(trx.amount)}
                    </div>
                    <button onclick="confirmDelete(${trx.id})" class="text-slate-400 hover:text-rose-500 p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 rounded-md transition">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>`;
        listContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
};

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
// 5. EVENT LISTENERS & MODALS
// ==========================================

// Helper Modal
const openModal = (modalId, backdropId, contentId) => {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById(backdropId);
    const content = document.getElementById(contentId);
    modal.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
        content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

const closeModal = (modalId, backdropId, contentId) => {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById(backdropId);
    const content = document.getElementById(contentId);
    backdrop.classList.remove('opacity-100'); backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
};

// Logic Modal Delete
let idToDelete = null;
window.confirmDelete = (id) => {
    idToDelete = id;
    openModal('deleteModal', 'deleteBackdrop', 'deleteModalContent');
};
document.getElementById('btnCancelDelete').addEventListener('click', () => {
    closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent');
    idToDelete = null;
});
document.getElementById('btnConfirmDelete').addEventListener('click', () => {
    if (idToDelete !== null) {
        transactions = transactions.filter(t => t.id !== idToDelete);
        saveTransactions(); updateApp(); resetChartTimer();
        closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent');
        idToDelete = null;
    }
});

// Logic Modal Budget
const budgetInput = document.getElementById('budgetModalInput');
budgetInput.addEventListener('keyup', function() {
    let val = this.value.replace(/[^0-9]/g, '');
    if(val) this.value = formatNumberDots(val);
    else this.value = '';
});

document.getElementById('btnSetBudget').addEventListener('click', () => {
    budgetInput.value = monthlyBudget > 0 ? formatNumberDots(monthlyBudget) : '';
    openModal('budgetModal', 'budgetBackdrop', 'budgetModalContent');
    setTimeout(() => budgetInput.focus(), 100); 
});
document.getElementById('btnCancelBudget').addEventListener('click', () => {
    closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent');
});
document.getElementById('btnSaveBudget').addEventListener('click', () => {
    const rawBudget = budgetInput.value.replace(/\./g, '');
    const newBudget = rawBudget === '' ? 0 : parseFloat(rawBudget); // Kalau dihapus kosong, set 0

    if (!isNaN(newBudget)) {
        monthlyBudget = newBudget;
        saveBudget(); updateApp(); // Render ulang budget & insight
        closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent');
    }
});

// Format Input Nominal Form
document.getElementById('amountDisplay').addEventListener('keyup', function() {
    let val = this.value.replace(/[^0-9]/g, ''); 
    if(val) this.value = formatNumberDots(val); 
    else this.value = '';
});

// Tutup Modal Error
document.getElementById('btnOkayError').addEventListener('click', () => {
    closeModal('errorModal', 'errorBackdrop', 'errorModalContent');
});

// Submit Form Transaksi
document.getElementById('transactionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const rawAmount = document.getElementById('amountDisplay').value.replace(/\./g, '');
    const amount = parseFloat(rawAmount);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    // --- LOGIC VALIDASI SALDO ---
    if (type === 'expense') {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        const currentBalance = totalIncome - totalExpense;

        if (amount > currentBalance) {
            // Update teks modal error dengan sisa saldo saat ini
            document.getElementById('errorSaldoAmount').innerText = formatRupiah(currentBalance);
            openModal('errorModal', 'errorBackdrop', 'errorModalContent');
            return; // Hentikan proses simpan
        }
    }

    // Kalau lolos validasi, simpan data
    transactions.push({ id: Date.now(), type, amount, category, date, description });
    saveTransactions();
    this.reset();
    document.getElementById('amountDisplay').value = ''; // Kosongkan input nominal
    document.getElementById('date').valueAsDate = new Date();
    updateApp();
    resetChartTimer();
});

// Filter & Data
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

document.getElementById('monthFilter').addEventListener('change', function() {
    currentMonth = this.value;
    updateApp(); resetChartTimer();
});

// Export & Import
document.getElementById('btnExport').addEventListener('click', () => {
    if(transactions.length === 0) return alert("Belum ada data untuk di-export.");
    const blob = new Blob([JSON.stringify(transactions)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `DompetKu_Backup_${new Date().getTime()}.json`; a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileInput').click());

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if(Array.isArray(importedData)) {
                transactions = importedData; saveTransactions(); updateApp(); alert("Data berhasil di-import!");
            } else alert("Format file tidak sesuai!");
        } catch (err) { alert("Error membaca file JSON!"); }
    };
    reader.readAsText(file);
    this.value = ''; 
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