// ==========================================
// 1. DATA & STATE MANAGEMENT
// ==========================================
let transactions = [
    { id: 1, type: 'income', amount: 5000000, category: 'Gaji', date: '2023-10-01', description: 'Gaji Bulan Oktober' },
    { id: 2, type: 'expense', amount: 150000, category: 'Makanan', date: '2023-10-02', description: 'Makan Bareng Teman' },
    { id: 3, type: 'expense', amount: 50000, category: 'Transportasi', date: '2023-10-03', description: 'Isi Bensin' },
    { id: 4, type: 'income', amount: 300000, category: 'Lainnya', date: '2023-10-05', description: 'Jual Barang Bekas' },
    { id: 5, type: 'expense', amount: 200000, category: 'Belanja', date: '2023-10-06', description: 'Beli Kemeja Baru' }
];

// Helper Formatter
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
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
} else {
    htmlElement.classList.remove('dark');
}

themeToggleBtn.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    const isDark = htmlElement.classList.contains('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    themeIcon.classList.replace(isDark ? 'ph-moon' : 'ph-sun', isDark ? 'ph-sun' : 'ph-moon');

    // Update warna font legend Chart saat ganti tema
    if (myChart) {
        myChart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#475569';
        myChart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#fff';
        myChart.data.datasets[0].borderWidth = isDark ? 2 : 0;
        myChart.update();
    }
});


// ==========================================
// 3. UI RENDERER (CARD & LIST)
// ==========================================
const updateApp = (filter = 'all') => {
    updateSummary();
    renderTransactions(filter);
    updateChartData();
};

const updateSummary = () => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    document.getElementById('totalIncome').innerText = formatRupiah(income);
    document.getElementById('totalExpense').innerText = formatRupiah(expense);
    document.getElementById('totalBalance').innerText = formatRupiah(income - expense);
};

const renderTransactions = (filter) => {
    const listContainer = document.getElementById('transactionList');
    listContainer.innerHTML = '';

    let filteredData = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredData.length === 0) {
        listContainer.innerHTML = `<div class="text-center text-slate-500 dark:text-slate-400 py-6">Belum ada transaksi di kategori ini.</div>`;
        return;
    }

    filteredData.forEach(trx => {
        const isIncome = trx.type === 'income';
        const colorClass = isIncome ? 'text-income bg-emerald-50 dark:bg-emerald-500/10' : 'text-expense bg-rose-50 dark:bg-rose-500/10';
        const iconClass = isIncome ? 'ph-arrow-down-left' : 'ph-arrow-up-right';
        const amountPrefix = isIncome ? '+' : '-';
        const amountColor = isIncome ? 'text-income' : 'text-slate-800 dark:text-white';

        const itemHTML = `
            <div class="flex justify-between items-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-transparent hover:border-slate-100 dark:hover:border-slate-600 group">
                <div class="flex items-center gap-4">
                    <div class="${colorClass} w-12 h-12 rounded-full flex items-center justify-center text-2xl"><i class="ph ${iconClass}"></i></div>
                    <div>
                        <h4 class="font-semibold text-sm md:text-base">${trx.description}</h4>
                        <div class="flex items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            <span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">${trx.category}</span>
                            <span>•</span><span>${formatDate(trx.date)}</span>
                        </div>
                    </div>
                </div>
                <div class="font-bold ${amountColor} text-sm md:text-base">${amountPrefix} ${formatRupiah(trx.amount)}</div>
            </div>`;
        listContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
};


// ==========================================
// 4. CHART.JS LOGIC & TIMER
// ==========================================
let myChart;
let currentChartMode = 'type';
let chartRotateInterval;
let progressInterval;
const ROTATE_TIME = 5000;
const categoryColors = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

const initChart = () => {
    const ctx = document.getElementById('financeChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: isDark ? '#e2e8f0' : '#475569', font: { family: "'Inter', sans-serif" }, padding: 15 } }
            }
        }
    });
};

const updateChartData = () => {
    if (!myChart) initChart();

    const isDark = document.documentElement.classList.contains('dark');
    myChart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#fff';
    myChart.data.datasets[0].borderWidth = isDark ? 2 : 0;

    if (currentChartMode === 'type') {
        const income = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

        myChart.data.labels = ['Pemasukan', 'Pengeluaran'];
        myChart.data.datasets[0].data = [income, expense];
        myChart.data.datasets[0].backgroundColor = ['#10B981', '#F43F5E'];
    }
    else if (currentChartMode === 'category') {
        const catTotals = {};
        transactions.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });

        const labels = Object.keys(catTotals);
        const data = Object.values(catTotals);

        myChart.data.labels = labels;
        myChart.data.datasets[0].data = data;
        myChart.data.datasets[0].backgroundColor = categoryColors.slice(0, labels.length);
    }

    myChart.update();
};

const resetChartTimer = () => {
    clearInterval(chartRotateInterval);
    clearInterval(progressInterval);

    const progressBar = document.getElementById('chartTimerBar');
    progressBar.style.width = '0%';

    let width = 0;
    progressInterval = setInterval(() => {
        width += (100 / (ROTATE_TIME / 100));
        progressBar.style.width = width + '%';
    }, 100);

    chartRotateInterval = setInterval(() => {
        switchChartMode(currentChartMode === 'type' ? 'category' : 'type');
    }, ROTATE_TIME);
};

const switchChartMode = (mode) => {
    currentChartMode = mode;
    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        if (btn.dataset.target === mode) {
            btn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
            btn.classList.remove('text-slate-500', 'dark:text-slate-400');
        } else {
            btn.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
            btn.classList.add('text-slate-500', 'dark:text-slate-400');
        }
    });

    updateChartData();
    resetChartTimer();
};

document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchChartMode(e.target.dataset.target));
});


// ==========================================
// 5. EVENT LISTENERS (FORM & FILTER)
// ==========================================

// --- FITUR TANGGAL BARU ---
const dateInput = document.getElementById('date');

// Hanya isi dengan tanggal hari ini JIKA diklik (focus) dan kolom masih kosong
dateInput.addEventListener('focus', function () {
    if (!this.value) {
        this.valueAsDate = new Date();
    }
});
// --------------------------

document.getElementById('transactionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    transactions.push({ id: Date.now(), type, amount, category, date, description });

    // Ini otomatis mereset semua form menjadi kosong (termasuk tanggal kembali jadi mm/dd/yyyy)
    this.reset();

    updateApp();
    resetChartTimer();
    alert('Transaksi berhasil ditambahkan!');
});

const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => {
            b.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
            b.classList.add('text-slate-500', 'dark:text-slate-400');
        });
        e.target.classList.remove('text-slate-500', 'dark:text-slate-400');
        e.target.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white');
        renderTransactions(e.target.getAttribute('data-filter'));
    });
});

// ==========================================
// 6. INIT APLIKASI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    updateApp();
    resetChartTimer();
});