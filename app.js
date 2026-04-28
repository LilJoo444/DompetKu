// ==========================================
// 1. DATA & STATE MANAGEMENT (LOCAL DATABASE)
// ==========================================
const DB_USERS = 'DOMPETKU_USERS_V2'; // Diganti Key biar gak bentrok sama data lama yg pake PIN
const DB_TXNS = 'DOMPETKU_TXNS';
const DB_BUDGETS = 'DOMPETKU_BUDGETS';
const ACTIVE_USER_ID = 'DOMPETKU_ACTIVE_USER';

let usersTable = JSON.parse(localStorage.getItem(DB_USERS)) || [];
let txnsTable = JSON.parse(localStorage.getItem(DB_TXNS)) || [];
let budgetsTable = JSON.parse(localStorage.getItem(DB_BUDGETS)) || {};

let currentUser = null;
let currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
let currentFilterType = 'all';

const saveDB = () => {
    localStorage.setItem(DB_USERS, JSON.stringify(usersTable));
    localStorage.setItem(DB_TXNS, JSON.stringify(txnsTable));
    localStorage.setItem(DB_BUDGETS, JSON.stringify(budgetsTable));
};

const getMyTransactions = () => txnsTable.filter(t => t.userId === currentUser.id);
const getMyMonthlyData = () => getMyTransactions().filter(t => t.date.startsWith(currentMonth));
const getMyBudget = () => budgetsTable[currentUser.id] || 0;

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const formatNumberDots = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// Modal Error Custom Helper
const openModal = (m, b, c) => { document.getElementById(m).classList.remove('hidden'); setTimeout(() => { document.getElementById(b).classList.remove('opacity-0'); document.getElementById(c).classList.remove('scale-95', 'opacity-0'); }, 10); };
const closeModal = (m, b, c) => { document.getElementById(b).classList.add('opacity-0'); document.getElementById(c).classList.add('scale-95', 'opacity-0'); setTimeout(() => { document.getElementById(m).classList.add('hidden'); }, 300); };
const showModalMsg = (title, desc, isSuccess = false) => {
    document.getElementById('errorModalTitle').innerText = title;
    document.getElementById('errorModalDesc').innerHTML = desc;

    const iconDiv = document.getElementById('errorIcon');
    if (isSuccess) {
        iconDiv.className = "bg-emerald-100 text-emerald-500 p-3 rounded-full mb-4 inline-block";
        iconDiv.innerHTML = '<i class="ph ph-check-circle text-3xl"></i>';
    } else {
        iconDiv.className = "bg-rose-100 text-rose-500 p-3 rounded-full mb-4 inline-block";
        iconDiv.innerHTML = '<i class="ph ph-x-circle text-3xl"></i>';
    }
    openModal('errorModal', 'errorBackdrop', 'errorModalContent');
};
document.getElementById('btnOkayError').addEventListener('click', () => closeModal('errorModal', 'errorBackdrop', 'errorModalContent'));


// ==========================================
// 2. SISTEM LOGIN & REGISTER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('monthFilter').value = currentMonth;
    document.getElementById('date').valueAsDate = new Date();

    const savedUserId = localStorage.getItem(ACTIVE_USER_ID);
    if (savedUserId) {
        currentUser = usersTable.find(u => u.id === savedUserId);
        if (currentUser) return masukAplikasi();
    }
});

// Helper buat nampilin Error di dalem Form (Bukan Popup)
const showAuthError = (msg) => {
    const alertBox = document.getElementById('authAlert');
    document.getElementById('authAlertText').innerText = msg;
    alertBox.classList.remove('hidden');
};
const hideAuthError = () => {
    document.getElementById('authAlert').classList.add('hidden');
};

// Toggle Auth Tabs
document.getElementById('tabLogin').addEventListener('click', () => {
    hideAuthError(); // Sembunyikan error pas ganti tab
    document.getElementById('tabLogin').classList.replace('text-slate-500', 'text-slate-800');
    document.getElementById('tabLogin').classList.replace('dark:text-slate-400', 'dark:text-white');
    document.getElementById('tabLogin').classList.add('bg-white', 'dark:bg-slate-600', 'shadow-sm');

    document.getElementById('tabRegister').classList.replace('text-slate-800', 'text-slate-500');
    document.getElementById('tabRegister').classList.replace('dark:text-white', 'dark:text-slate-400');
    document.getElementById('tabRegister').classList.remove('bg-white', 'dark:bg-slate-600', 'shadow-sm');

    document.getElementById('formLogin').classList.remove('hidden');
    document.getElementById('formRegister').classList.add('hidden');
});

document.getElementById('tabRegister').addEventListener('click', () => {
    hideAuthError(); // Sembunyikan error pas ganti tab
    document.getElementById('tabRegister').classList.replace('text-slate-500', 'text-slate-800');
    document.getElementById('tabRegister').classList.replace('dark:text-slate-400', 'dark:text-white');
    document.getElementById('tabRegister').classList.add('bg-white', 'dark:bg-slate-600', 'shadow-sm');

    document.getElementById('tabLogin').classList.replace('text-slate-800', 'text-slate-500');
    document.getElementById('tabLogin').classList.replace('dark:text-white', 'dark:text-slate-400');
    document.getElementById('tabLogin').classList.remove('bg-white', 'dark:bg-slate-600', 'shadow-sm');

    document.getElementById('formRegister').classList.remove('hidden');
    document.getElementById('formLogin').classList.add('hidden');
});

// REGISTER SUBMIT
document.getElementById('formRegister').addEventListener('submit', (e) => {
    e.preventDefault();
    hideAuthError(); // Reset error lama

    const email = document.getElementById('regEmail').value.trim();
    const dompetId = document.getElementById('regDompetId').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;

    if (!email.endsWith('@gmail.com')) return showAuthError("Harap gunakan email dengan domain @gmail.com");
    if (password !== confirm) return showAuthError("Konfirmasi password tidak cocok dengan password awal.");
    if (usersTable.some(u => u.email === email)) return showAuthError("Email ini sudah terdaftar. Silakan ke menu Masuk.");

    const newUser = { id: 'u_' + Date.now(), email, dompetId, password, avatar: '' };
    usersTable.push(newUser); saveDB();
    currentUser = newUser;
    masukAplikasi();
});

// LOGIN SUBMIT
document.getElementById('formLogin').addEventListener('submit', (e) => {
    e.preventDefault();
    hideAuthError(); // Reset error lama

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const user = usersTable.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        masukAplikasi();
    } else {
        showAuthError("Email atau Password salah!");
        document.getElementById('loginPassword').value = '';
    }
});

const updateNavProfile = () => {
    const navInit = document.getElementById('navInitial');
    const navImg = document.getElementById('navAvatar');
    if (currentUser.avatar) {
        navImg.src = currentUser.avatar; navImg.classList.remove('hidden'); navInit.classList.add('hidden');
    } else {
        navInit.innerText = currentUser.dompetId.charAt(0).toUpperCase();
        navImg.classList.add('hidden'); navInit.classList.remove('hidden');
    }
};

const masukAplikasi = () => {
    localStorage.setItem(ACTIVE_USER_ID, currentUser.id);
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('greetingText').innerText = `Halo, ${currentUser.dompetId}! 👋`;

    hideAuthError(); // Bersihin error buat jaga-jaga kalau logout nanti
    updateNavProfile(); initChart(); updateApp(); resetChartTimer();
};


// ==========================================
// 3. DROPDOWN MENU & NAVIGASI HALAMAN
// ==========================================
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');

profileBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('hidden'); });
document.addEventListener('click', (e) => { if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) profileDropdown.classList.add('hidden'); });

// LOGOUT
document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
        localStorage.removeItem(ACTIVE_USER_ID); currentUser = null;
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('dashboardPage').classList.remove('hidden'); // Reset view for next login
        document.getElementById('settingsPage').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('formLogin').reset(); document.getElementById('formRegister').reset();
        profileDropdown.classList.add('hidden');
    }
});

// ROUTING: Pindah ke Halaman Settings
let tempAvatarBase64 = '';
document.getElementById('btnManageAccount').addEventListener('click', () => {
    profileDropdown.classList.add('hidden');
    document.getElementById('dashboardPage').classList.add('hidden');
    document.getElementById('settingsPage').classList.remove('hidden');

    // Isi data profile saat ini
    document.getElementById('editDompetId').value = currentUser.dompetId;
    document.getElementById('editEmail').value = currentUser.email;

    const prevImg = document.getElementById('editAvatarPreview');
    const prevInit = document.getElementById('editAvatarInitial');

    if (currentUser.avatar) {
        prevImg.src = currentUser.avatar; prevImg.classList.remove('hidden'); prevInit.classList.add('hidden');
    } else {
        prevInit.innerText = currentUser.dompetId.charAt(0).toUpperCase();
        prevImg.classList.add('hidden'); prevInit.classList.remove('hidden');
    }
    tempAvatarBase64 = currentUser.avatar;
});

// ROUTING: Balik ke Dashboard
document.getElementById('btnBackToDashboard').addEventListener('click', () => {
    document.getElementById('settingsPage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.remove('hidden');
    // Clear password forms just in case
    document.getElementById('formUpdatePassword').reset();
});


// ==========================================
// 4. LOGIC HALAMAN PENGATURAN (SETTINGS)
// ==========================================

// --- BAGIAN A: INFORMASI PROFILE ---
document.getElementById('editAvatarInput').addEventListener('change', function (e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        tempAvatarBase64 = evt.target.result;
        const prevImg = document.getElementById('editAvatarPreview');
        prevImg.src = tempAvatarBase64; prevImg.classList.remove('hidden');
        document.getElementById('editAvatarInitial').classList.add('hidden');
    }; reader.readAsDataURL(file);
});

document.getElementById('formUpdateProfile').addEventListener('submit', (e) => {
    e.preventDefault();
    const newDompetId = document.getElementById('editDompetId').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();

    if (!newEmail.endsWith('@gmail.com')) return showModalMsg("Gagal", "Email harus menggunakan @gmail.com");
    if (newEmail !== currentUser.email && usersTable.some(u => u.email === newEmail)) return showModalMsg("Gagal", "Email tersebut sudah dipakai akun lain!");

    currentUser.dompetId = newDompetId;
    currentUser.email = newEmail;
    currentUser.avatar = tempAvatarBase64;

    const userIndex = usersTable.findIndex(u => u.id === currentUser.id);
    usersTable[userIndex] = currentUser; saveDB();

    document.getElementById('greetingText').innerText = `Halo, ${currentUser.dompetId}! 👋`;
    updateNavProfile();
    showModalMsg("Berhasil", "Informasi Profile berhasil diperbarui!", true);
});

// --- BAGIAN B: KEAMANAN AKUN ---
document.getElementById('formUpdatePassword').addEventListener('submit', (e) => {
    e.preventDefault();
    const currPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confNewPass = document.getElementById('confirmNewPassword').value;

    if (currPass !== currentUser.password) return showModalMsg("Gagal", "Kata Sandi Saat Ini yang Anda masukkan salah!");
    if (newPass !== confNewPass) return showModalMsg("Gagal", "Konfirmasi Sandi Baru tidak sama!");
    if (newPass === currPass) return showModalMsg("Peringatan", "Sandi baru tidak boleh sama dengan sandi lama.");

    currentUser.password = newPass;
    const userIndex = usersTable.findIndex(u => u.id === currentUser.id);
    usersTable[userIndex] = currentUser; saveDB();

    document.getElementById('formUpdatePassword').reset();
    showModalMsg("Berhasil", "Kata sandi akun Anda berhasil diganti!", true);
});


// ==========================================
// 5. UI RENDERER (DASHBOARD)
// ==========================================
const updateApp = () => { updateSummary(); updateBudgetUI(); generateInsights(); renderTransactions(); updateChartData(); };

const updateSummary = () => {
    const myAllTxns = getMyTransactions(); const myMonthlyTxns = getMyMonthlyData();
    const totalIncome = myAllTxns.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpense = myAllTxns.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const monthlyIncome = myMonthlyTxns.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const monthlyExpense = myMonthlyTxns.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    document.getElementById('totalBalance').innerText = formatRupiah(totalIncome - totalExpense); document.getElementById('totalIncome').innerText = formatRupiah(monthlyIncome); document.getElementById('totalExpense').innerText = formatRupiah(monthlyExpense);
};

const updateBudgetUI = () => {
    const myBudget = getMyBudget(); const expense = getMyMonthlyData().filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const bar = document.getElementById('budgetProgressBar'); const statusText = document.getElementById('budgetStatusText');
    if (myBudget <= 0) { bar.style.width = '0%'; statusText.innerText = "Belum ada budget di-set."; return; }
    let percentage = (expense / myBudget) * 100; if (percentage > 100) percentage = 100; bar.style.width = percentage + '%';
    if (percentage < 70) bar.className = 'h-full bg-income w-0 transition-all duration-500'; else if (percentage < 90) bar.className = 'h-full bg-yellow-400 w-0 transition-all duration-500'; else bar.className = 'h-full bg-expense w-0 transition-all duration-500';
    statusText.innerHTML = `Terpakai <b>${formatRupiah(expense)}</b> dari ${formatRupiah(myBudget)}`;
};

const generateInsights = () => {
    const myBudget = getMyBudget(); const expenseData = getMyMonthlyData().filter(t => t.type === 'expense');
    const insightDiv = document.getElementById('smartInsight'); const insightText = document.getElementById('insightText');
    if (expenseData.length === 0 || myBudget <= 0) { insightDiv.classList.add('hidden'); return; }
    const catTotals = {}; expenseData.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);
    let topCategory = Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b); let topAmount = catTotals[topCategory]; let totalExpense = expenseData.reduce((acc, curr) => acc + curr.amount, 0);
    insightDiv.classList.remove('hidden');
    if (totalExpense > myBudget) insightText.innerHTML = `<span class="text-rose-600 font-semibold">Waduh! Pengeluaranmu ngelewatin batas budget!</span>`; else if (topAmount > (totalExpense * 0.5)) insightText.innerHTML = `Pengeluaran didominasi <b>${topCategory}</b> (${formatRupiah(topAmount)}). Direm dikit yuk!`; else insightText.innerHTML = `Pencatatan yang bagus! Tetap pantau pengeluaranmu.`;
};

const renderTransactions = () => {
    const listContainer = document.getElementById('transactionList'); listContainer.innerHTML = '';
    let filteredData = getMyMonthlyData(); if (currentFilterType !== 'all') filteredData = filteredData.filter(t => t.type === currentFilterType);
    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filteredData.length === 0) { listContainer.innerHTML = `<div class="text-center text-slate-500 py-8"><i class="ph ph-receipt text-4xl mb-2 opacity-50"></i><p class="text-sm">Belum ada transaksi.</p></div>`; return; }
    filteredData.forEach(trx => {
        const isInc = trx.type === 'income';
        listContainer.insertAdjacentHTML('beforeend', `
            <div class="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                <div class="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div class="${isInc ? 'text-income bg-emerald-50 dark:bg-emerald-500/10' : 'text-expense bg-rose-50 dark:bg-rose-500/10'} w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-lg"><i class="ph ${isInc ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i></div>
                    <div class="flex-1 min-w-0"><h4 class="font-semibold text-sm truncate text-slate-800 dark:text-white">${trx.description}</h4><div class="flex items-center gap-1.5 text-[11px] md:text-xs text-slate-500 mt-0.5 truncate"><span class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${trx.category}</span><span>•</span><span>${formatDate(trx.date)}</span></div></div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="font-bold ${isInc ? 'text-income' : 'text-slate-800 dark:text-white'} text-sm whitespace-nowrap">${isInc ? '+' : '-'} ${formatRupiah(trx.amount)}</div>
                    <button onclick="confirmDelete(${trx.id})" class="text-slate-400 hover:text-rose-500 p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 rounded-md transition"><i class="ph ph-trash"></i></button>
                </div>
            </div>`);
    });
};

// ==========================================
// 6. CHART, UTILS, & FORM EVENTS
// ==========================================
const themeToggleBtn = document.getElementById('themeToggle'); const themeIcon = document.getElementById('themeIcon');
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.documentElement.classList.add('dark'); themeIcon.classList.replace('ph-moon', 'ph-sun'); }
themeToggleBtn.addEventListener('click', () => { document.documentElement.classList.toggle('dark'); const isDark = document.documentElement.classList.contains('dark'); localStorage.theme = isDark ? 'dark' : 'light'; themeIcon.classList.replace(isDark ? 'ph-moon' : 'ph-sun', isDark ? 'ph-sun' : 'ph-moon'); if (myChart) updateChartData(); });

let myChart, currentChartMode = 'type', chartRotateInterval, progressInterval; const categoryColors = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];
const initChart = () => { const ctx = document.getElementById('financeChart').getContext('2d'); if (myChart) myChart.destroy(); myChart = new Chart(ctx, { type: 'doughnut', data: { labels: [], datasets: [{ data: [], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } } }); };
const updateChartData = () => {
    if (!myChart) return; const isDark = document.documentElement.classList.contains('dark');
    myChart.options.plugins.legend.labels.color = isDark ? '#e2e8f0' : '#475569'; myChart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#fff'; myChart.data.datasets[0].borderWidth = isDark ? 2 : 0;
    const myMonthlyData = getMyMonthlyData();
    if (myMonthlyData.length === 0) {
        myChart.data.labels = ['Kosong']; myChart.data.datasets[0].data = [1]; myChart.data.datasets[0].backgroundColor = isDark ? ['#334155'] : ['#E2E8F0'];
    } else {
        if (currentChartMode === 'type') {
            const inc = myMonthlyData.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0); const exp = myMonthlyData.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0); myChart.data.labels = ['Pemasukan', 'Pengeluaran']; myChart.data.datasets[0].data = [inc, exp]; myChart.data.datasets[0].backgroundColor = ['#10B981', '#F43F5E'];
        } else { const catTotals = {}; myMonthlyData.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount); myChart.data.labels = Object.keys(catTotals); myChart.data.datasets[0].data = Object.values(catTotals); myChart.data.datasets[0].backgroundColor = categoryColors; }
    } myChart.update();
};
const updateChartBtnUI = () => { document.querySelectorAll('.chart-toggle-btn').forEach(btn => { if (btn.dataset.target === currentChartMode) { btn.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-white', 'shadow-sm'); btn.classList.remove('text-slate-500'); } else { btn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-800', 'dark:text-white', 'shadow-sm'); btn.classList.add('text-slate-500'); } }); };
const resetChartTimer = () => { clearInterval(chartRotateInterval); clearInterval(progressInterval); const bar = document.getElementById('chartTimerBar'); bar.style.width = '0%'; let width = 0; progressInterval = setInterval(() => { width += 2; bar.style.width = width + '%'; }, 100); chartRotateInterval = setInterval(() => { currentChartMode = currentChartMode === 'type' ? 'category' : 'type'; updateChartBtnUI(); updateChartData(); resetChartTimer(); }, 5000); };
document.querySelectorAll('.chart-toggle-btn').forEach(btn => { btn.addEventListener('click', (e) => { currentChartMode = e.target.dataset.target; updateChartBtnUI(); updateChartData(); resetChartTimer(); }); });

document.getElementById('amountDisplay').addEventListener('keyup', function () { let val = this.value.replace(/[^0-9]/g, ''); if (val) this.value = formatNumberDots(val); else this.value = ''; });
document.getElementById('transactionForm').addEventListener('submit', function (e) {
    e.preventDefault(); const type = document.querySelector('input[name="type"]:checked').value; const amount = parseFloat(document.getElementById('amountDisplay').value.replace(/\./g, '')); const category = document.getElementById('category').value; const date = document.getElementById('date').value; const description = document.getElementById('description').value;
    if (category === "") return showModalMsg("Kategori Kosong", "Pilih kategori transaksi terlebih dahulu.");
    if (type === 'expense') { const tInc = getMyTransactions().filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0); const tExp = getMyTransactions().filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0); if (amount > (tInc - tExp)) return showModalMsg("Saldo Tidak Cukup!", `Sisa saldomu saat ini hanya <b>${formatRupiah(tInc - tExp)}</b>.`); }
    txnsTable.push({ id: Date.now(), userId: currentUser.id, type, amount, category, date, description }); saveDB(); this.reset(); document.getElementById('amountDisplay').value = ''; document.getElementById('date').valueAsDate = new Date(); updateApp(); resetChartTimer();
});

let idToDelete = null; window.confirmDelete = (id) => { idToDelete = id; openModal('deleteModal', 'deleteBackdrop', 'deleteModalContent'); };
document.getElementById('btnCancelDelete').addEventListener('click', () => { closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent'); idToDelete = null; });
document.getElementById('btnConfirmDelete').addEventListener('click', () => { if (idToDelete) { txnsTable = txnsTable.filter(t => t.id !== idToDelete); saveDB(); updateApp(); resetChartTimer(); closeModal('deleteModal', 'deleteBackdrop', 'deleteModalContent'); idToDelete = null; } });

const budgetInput = document.getElementById('budgetModalInput'); budgetInput.addEventListener('keyup', function () { let val = this.value.replace(/[^0-9]/g, ''); if (val) this.value = formatNumberDots(val); else this.value = ''; });
document.getElementById('btnSetBudget').addEventListener('click', () => { budgetInput.value = getMyBudget() > 0 ? formatNumberDots(getMyBudget()) : ''; openModal('budgetModal', 'budgetBackdrop', 'budgetModalContent'); setTimeout(() => budgetInput.focus(), 100); });
document.getElementById('btnCancelBudget').addEventListener('click', () => closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent'));
document.getElementById('btnSaveBudget').addEventListener('click', () => { budgetsTable[currentUser.id] = parseFloat(budgetInput.value.replace(/\./g, '')) || 0; saveDB(); updateApp(); closeModal('budgetModal', 'budgetBackdrop', 'budgetModalContent'); });

document.querySelectorAll('.filter-btn').forEach(btn => { btn.addEventListener('click', (e) => { document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white'); b.classList.add('text-slate-500'); }); e.target.classList.remove('text-slate-500'); e.target.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-white'); currentFilterType = e.target.getAttribute('data-filter'); renderTransactions(); }); });
document.getElementById('monthFilter').addEventListener('change', function () { currentMonth = this.value; updateApp(); resetChartTimer(); });

document.getElementById('btnExportJSON').addEventListener('click', () => { const myTxns = getMyTransactions(); if (myTxns.length === 0) return alert("Belum ada data."); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(myTxns)], { type: "application/json" })); a.download = `Backup_${currentUser.dompetId}_${new Date().getTime()}.json`; a.click(); });
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', function (e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (evt) { try { const data = JSON.parse(evt.target.result); if (Array.isArray(data)) { txnsTable = txnsTable.filter(t => t.userId !== currentUser.id); data.forEach(d => { d.userId = currentUser.id; txnsTable.push(d); }); saveDB(); updateApp(); alert("Data berhasil di-import!"); } else alert("Format salah!"); } catch (err) { alert("Error membaca file!"); } }; reader.readAsText(file); this.value = ''; });

document.getElementById('btnExportPDF').addEventListener('click', () => { const myMonthlyData = getMyMonthlyData(); if (myMonthlyData.length === 0) return alert("Belum ada transaksi di bulan ini."); const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Laporan Keuangan - DompetKu", 14, 20); doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text(`Nama: ${currentUser.dompetId}`, 14, 28); doc.text(`Periode: ${currentMonth}`, 14, 34); const mInc = myMonthlyData.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0); const mExp = myMonthlyData.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0); doc.text(`Total Pemasukan: ${formatRupiah(mInc)}`, 14, 42); doc.text(`Total Pengeluaran: ${formatRupiah(mExp)}`, 14, 48); const tableRows = []; myMonthlyData.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(trx => { tableRows.push([formatDate(trx.date), trx.category, trx.description, trx.type === 'income' ? 'Pemasukan' : 'Pengeluaran', formatRupiah(trx.amount)]); }); doc.autoTable({ head: [["Tanggal", "Kategori", "Catatan", "Tipe", "Nominal"]], body: tableRows, startY: 55, theme: 'grid', headStyles: { fillColor: [79, 70, 229] } }); doc.save(`Laporan_${currentUser.dompetId}_${currentMonth}.pdf`); });