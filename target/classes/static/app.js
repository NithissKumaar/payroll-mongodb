const API_BASE = 'http://localhost:9090';
const ENDPOINTS = {
  add: `${API_BASE}/add`,
  all: `${API_BASE}/all`,
};

// ─── STATE ────────────────────────────────────────────────
let allEmployees = [];          // cached employee list
let salaryChart = null;         // Chart.js donut (dashboard)
let breakdownChart = null;      // Chart.js donut (form preview)
let barChart = null;            // Chart.js bar (analytics)
let stackedChart = null;        // Chart.js stacked bar (analytics)

// ─── SALARY FORMULA ───────────────────────────────────────
/**
 * Compute all salary components from basic.
 * HRA=20%, DA=10%, PF=12% of basic, Tax=5% of basic
 */
function calcSalary(basic) {
  const hra  = basic * 0.20;
  const da   = basic * 0.10;
  const pf   = basic * 0.12;  // standard PF
  const tax  = basic * 0.05;
  const gross = basic + hra + da;
  const net  = gross - pf - tax;
  return { basic, hra, da, pf, tax, gross, net };
}

/** Format number as Indian Rupee string */
function rupee(n) {
  if (n == null || isNaN(n)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ─── SECTION NAVIGATION ───────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const target = item.dataset.section;
    navigateTo(target);
  });
});

function navigateTo(sectionId) {
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`[data-section="${sectionId}"]`);
  if (navEl) navEl.classList.add('active');

  // Show section
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(`section-${sectionId}`);
  if (sec) sec.classList.add('active');

  // Trigger section-specific init
  if (sectionId === 'employees') loadAllEmployees();
  if (sectionId === 'payslip')   renderPayslipList();
  if (sectionId === 'analytics') renderAnalytics();
}

// ─── THEME TOGGLE ─────────────────────────────────────────
const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
  const html = document.documentElement;
  const isDark = html.dataset.theme === 'dark';
  html.dataset.theme = isDark ? 'light' : 'dark';
  themeBtn.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
  // Redraw charts for theme change
  if (allEmployees.length) {
    drawDashboardChart(allEmployees);
    renderAnalytics();
  }
});

// ─── TOAST NOTIFICATIONS ──────────────────────────────────
/**
 * Show a toast message
 * @param {string} msg  - message text
 * @param {'success'|'error'|'info'} type
 */
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => el.remove());
  }, 3500);
}

// ─── FETCH ALL EMPLOYEES ──────────────────────────────────
async function loadAllEmployees() {
  showSpinner(true);
  try {
    const res = await fetch(ENDPOINTS.all);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allEmployees = Array.isArray(data) ? data : [];
    renderTable(allEmployees);
    updateDashboard(allEmployees);
    renderPayslipList();
    toast(`Loaded ${allEmployees.length} employees`, 'success');
  } catch (err) {
    console.error('Load error:', err);
    toast('Could not reach backend. Is it running on :9090?', 'error');
    renderTable([]);
  } finally {
    showSpinner(false);
  }
}

function showSpinner(show) {
  document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}

// ─── DASHBOARD ────────────────────────────────────────────
function updateDashboard(employees) {
  const total  = employees.length;
  const nets   = employees.map(e => Number(e.net || 0));
  const basics = employees.map(e => Number(e.basic || 0));
  const avgNet = total ? nets.reduce((a,b)=>a+b,0)/total : 0;
  const totalPayroll = nets.reduce((a,b)=>a+b,0);
  const highest = nets.length ? Math.max(...nets) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-avg').textContent = rupee(avgNet);
  document.getElementById('stat-payroll').textContent = rupee(totalPayroll);
  document.getElementById('stat-highest').textContent = rupee(highest);

  // Recent list
  const recent = [...employees].slice(-5).reverse();
  const recentEl = document.getElementById('recent-list');
  if (!recent.length) {
    recentEl.innerHTML = '<div class="empty-state">No employees yet</div>';
  } else {
    recentEl.innerHTML = recent.map(e => `
      <div class="recent-item">
        <div class="ri-avatar">${(e.name||'?')[0].toUpperCase()}</div>
        <div class="ri-info">
          <div class="ri-name">${e.name || 'Unknown'}</div>
          <div class="ri-id">ID #${e.empId || '—'}</div>
        </div>
        <div class="ri-salary">${rupee(e.net)}</div>
      </div>
    `).join('');
  }

  drawDashboardChart(employees);
}

function drawDashboardChart(employees) {
  const ctx = document.getElementById('salaryChart').getContext('2d');
  if (salaryChart) salaryChart.destroy();

  const isDark = document.documentElement.dataset.theme === 'dark';
  const textColor = isDark ? 'rgba(232,232,255,0.6)' : 'rgba(26,26,46,0.6)';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const top = [...employees]
    .sort((a,b) => b.net - a.net)
    .slice(0, 8);

  salaryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(e => e.name || 'N/A'),
      datasets: [{
        label: 'Net Salary',
        data: top.map(e => e.net || 0),
        backgroundColor: top.map((_, i) => {
          const hues = ['#6C63FF','#FF6584','#43E97B','#F7971E','#38F9D7','#FA709A','#4FACFE','#FFBA56'];
          return hues[i % hues.length] + '99';
        }),
        borderColor: top.map((_, i) => {
          const hues = ['#6C63FF','#FF6584','#43E97B','#F7971E','#38F9D7','#FA709A','#4FACFE','#FFBA56'];
          return hues[i % hues.length];
        }),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ' ' + rupee(ctx.raw) }
        }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: {
          ticks: { color: textColor, callback: v => rupee(v) },
          grid: { color: gridColor }
        }
      }
    }
  });
}

// ─── EMPLOYEE TABLE ───────────────────────────────────────
function renderTable(employees) {
  const tbody = document.getElementById('emp-tbody');
  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No employees found</td></tr>';
    return;
  }
  tbody.innerHTML = employees.map((e, i) => `
    <tr style="animation-delay:${i*0.04}s">
      <td>${e.empId || '—'}</td>
      <td class="emp-name-cell">${e.name || '—'}</td>
      <td>${rupee(e.basic)}</td>
      <td class="green">${rupee(e.hra)}</td>
      <td class="green">${rupee(e.da)}</td>
      <td>${rupee(e.gross)}</td>
      <td class="red">${rupee(e.tax)}</td>
      <td class="red">${rupee(e.pf)}</td>
      <td class="net-cell">${rupee(e.net)}</td>
      <td>
        <button class="action-btn" onclick="viewPayslipFor(${i})">View Slip</button>
      </td>
    </tr>
  `).join('');
}

/** Filter + sort the table */
function filterEmployees() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const sort = document.getElementById('sortSelect').value;

  let filtered = allEmployees.filter(e =>
    (e.name || '').toLowerCase().includes(q)
  );

  if (sort === 'name') filtered.sort((a,b) => (a.name||'').localeCompare(b.name||''));
  if (sort === 'net-asc') filtered.sort((a,b) => (a.net||0)-(b.net||0));
  if (sort === 'net-desc') filtered.sort((a,b) => (b.net||0)-(a.net||0));
  if (sort === 'basic-desc') filtered.sort((a,b) => (b.basic||0)-(a.basic||0));

  renderTable(filtered);
}

// ─── ADD EMPLOYEE FORM ────────────────────────────────────
const empNameInput = document.getElementById('empName');
const basicInput   = document.getElementById('basicSalary');
const breakdownBox = document.getElementById('breakdownBox');

// Live preview as user types
empNameInput.addEventListener('input', () => {
  const val = empNameInput.value.trim();
  document.getElementById('formNamePreview').textContent = val || 'New Employee';
  document.getElementById('formAvatar').textContent = val ? val[0].toUpperCase() : '?';
});

basicInput.addEventListener('input', () => {
  const basic = parseFloat(basicInput.value) || 0;
  if (basic > 0) {
    breakdownBox.style.display = 'block';
    updatePreview(basic);
    updateBreakdownChart(basic);
  } else {
    breakdownBox.style.display = 'none';
    resetBreakdownChart();
  }
});

function updatePreview(basic) {
  const s = calcSalary(basic);
  document.getElementById('prev-basic').textContent = rupee(s.basic);
  document.getElementById('prev-hra').textContent   = rupee(s.hra);
  document.getElementById('prev-da').textContent    = rupee(s.da);
  document.getElementById('prev-gross').textContent = rupee(s.gross);
  document.getElementById('prev-tax').textContent   = rupee(s.tax);
  document.getElementById('prev-pf').textContent    = rupee(s.pf);
  document.getElementById('prev-net').textContent   = rupee(s.net);
}

/** Doughnut chart for form preview */
function updateBreakdownChart(basic) {
  const s = calcSalary(basic);
  const ctx = document.getElementById('breakdownChart').getContext('2d');
  const colors = ['#6C63FF','#43E97B','#38F9D7','#FF6584','#F7971E'];
  const labels = ['Basic','HRA','DA','Tax','PF'];
  const values = [s.basic, s.hra, s.da, s.tax, s.pf];

  if (breakdownChart) {
    breakdownChart.data.datasets[0].data = values;
    breakdownChart.update();
  } else {
    breakdownChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map(c => c + 'BB'),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.label}: ${rupee(ctx.raw)}` }
          }
        }
      }
    });
  }

  // Legend
  const legend = document.getElementById('chartLegend');
  legend.innerHTML = labels.map((l, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span>${l}: ${rupee(values[i])}</span>
    </div>
  `).join('');
}

function resetBreakdownChart() {
  if (breakdownChart) { breakdownChart.destroy(); breakdownChart = null; }
  document.getElementById('chartLegend').innerHTML = '<span class="legend-empty">Enter salary to preview</span>';
}

// FORM SUBMIT
document.getElementById('employeeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const btnText = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');

  const empId = parseInt(document.getElementById('empId').value);
  const name  = empNameInput.value.trim();
  const basic = parseFloat(basicInput.value);

  if (!name || isNaN(basic) || basic <= 0) {
    toast('Please fill in all fields correctly', 'error');
    return;
  }

  // Compute salary components
  const s = calcSalary(basic);

  // Build payload matching the Employee model
  const payload = {
    empId,
    name,
    basic: s.basic,
    hra:   s.hra,
    da:    s.da,
    pf:    s.pf,
    tax:   s.tax,
    gross: s.gross,
    net:   s.net,
  };

  // Show loading state
  btnText.style.display = 'none';
  spinner.style.display = 'block';
  btn.disabled = true;

  try {
    const res = await fetch(ENDPOINTS.add, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    toast(`${name} added successfully!`, 'success');
    document.getElementById('employeeForm').reset();
    breakdownBox.style.display = 'none';
    resetBreakdownChart();
    document.getElementById('formNamePreview').textContent = 'New Employee';
    document.getElementById('formAvatar').textContent = '?';
    // Refresh data
    await loadAllEmployees();
    navigateTo('employees');
  } catch (err) {
    console.error('Add error:', err);
    toast('Failed to add employee. Check backend.', 'error');
  } finally {
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
    btn.disabled = false;
  }
});

// ─── PAYSLIP ──────────────────────────────────────────────
function renderPayslipList() {
  const list = document.getElementById('payslip-emp-list');
  const searchEl = document.getElementById('payslipSearch');

  if (!allEmployees.length) {
    list.innerHTML = '<div class="empty-state">No employees — go to Employees tab to load</div>';
    return;
  }

  renderFilteredPayslipList(allEmployees);
}

function filterPayslipList() {
  const q = document.getElementById('payslipSearch').value.toLowerCase();
  const filtered = allEmployees.filter(e => (e.name||'').toLowerCase().includes(q));
  renderFilteredPayslipList(filtered);
}

function renderFilteredPayslipList(employees) {
  const list = document.getElementById('payslip-emp-list');
  if (!employees.length) {
    list.innerHTML = '<div class="empty-state">No match found</div>';
    return;
  }
  list.innerHTML = employees.map((e, i) => `
    <div class="ps-emp-item" onclick="showPayslip(${allEmployees.indexOf(e)})" id="ps-item-${allEmployees.indexOf(e)}">
      <div class="ps-emp-avatar">${(e.name||'?')[0].toUpperCase()}</div>
      <div>
        <div class="ps-emp-name">${e.name}</div>
        <div class="ps-emp-id">EMP #${e.empId || '—'}</div>
      </div>
    </div>
  `).join('');
}

/** Show payslip for employee at allEmployees[index] */
function showPayslip(index) {
  const emp = allEmployees[index];
  if (!emp) return;

  // Highlight active list item
  document.querySelectorAll('.ps-emp-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(`ps-item-${index}`);
  if (activeItem) activeItem.classList.add('active');

  // Populate payslip card
  document.getElementById('ps-avatar').textContent = (emp.name||'?')[0].toUpperCase();
  document.getElementById('ps-name').textContent   = emp.name || '—';
  document.getElementById('ps-id').textContent     = `EMP ID: ${emp.empId || '—'}`;
  document.getElementById('ps-basic').textContent  = rupee(emp.basic);
  document.getElementById('ps-hra').textContent    = rupee(emp.hra);
  document.getElementById('ps-da').textContent     = rupee(emp.da);
  document.getElementById('ps-gross').textContent  = rupee(emp.gross);
  document.getElementById('ps-tax').textContent    = rupee(emp.tax);
  document.getElementById('ps-pf').textContent     = rupee(emp.pf);
  const deductions = (Number(emp.tax)||0) + (Number(emp.pf)||0);
  document.getElementById('ps-deductions').textContent = rupee(deductions);
  document.getElementById('ps-net').textContent    = rupee(emp.net);
  document.getElementById('ps-date').textContent   = new Date().toLocaleDateString('en-IN', { year:'numeric',month:'long',day:'numeric' });

  document.getElementById('payslip-view').classList.remove('hidden');
  document.getElementById('payslip-placeholder').classList.add('hidden');
}

/** Called from the employee table "View Slip" button */
function viewPayslipFor(index) {
  navigateTo('payslip');
  setTimeout(() => showPayslip(index), 100);
}

