// ============================================================
// Помощник определения цен — логика приложения
// ============================================================

let appData = [
    { id: 1, name: 'Картинг', type: 'РЗ', duration: 60, price: 1250, modules: '' },
    { id: 2, name: 'Картинг', type: 'Пакет', duration: 60, price: 2000, modules: 1 },
    { id: 3, name: 'Картинг', type: 'МК', duration: 30, price: 1500, modules: '' },
    { id: 4, name: 'Керамика', type: 'РЗ', duration: 60, price: 1000, modules: '' },
    { id: 5, name: 'Керамика', type: 'МК', duration: 30, price: 1300, modules: '' },
    { id: 6, name: 'Керамика', type: 'Пакет', duration: 60, price: '', modules: 3 }
];

let rowCounter = 100;

// ------------------------------------------------------------
// Инициализация
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    render();
    ['coefPkg', 'coefMK', 'disc2', 'disc3'].forEach(id => {
        document.getElementById(id).addEventListener('input', render);
    });
});

// ------------------------------------------------------------
// Управление строками
// ------------------------------------------------------------
function addRow(name = '', type = 'РЗ', duration = '', price = '', modules = '') {
    appData.push({
        id: ++rowCounter,
        name, type, duration, price, modules
    });
    render();
}

function removeRow(id) {
    appData = appData.filter(row => row.id !== id);
    render();
}

function updateRow(id, field, value) {
    const row = appData.find(r => r.id === id);
    if (row) {
        row[field] = value;
        render();
    }
}

function clearAll() {
    if (confirm('Удалить все данные?')) {
        appData = [];
        render();
    }
}

// ------------------------------------------------------------
// Настройки
// ------------------------------------------------------------
function getSettings() {
    return {
        coefPkg: parseFloat(document.getElementById('coefPkg').value) || 1.6,
        coefMK:  parseFloat(document.getElementById('coefMK').value)  || 2.4,
        disc2:   (parseFloat(document.getElementById('disc2').value) || 0) / 100,
        disc3:   (parseFloat(document.getElementById('disc3').value) || 0) / 100
    };
}

// ------------------------------------------------------------
// Расчёт
// ------------------------------------------------------------
function calculate() {
    const s = getSettings();
    const grouped = {};

    // Группировка по наименованию
    appData.forEach(row => {
        if (!row.name) return;
        if (!grouped[row.name]) {
            grouped[row.name] = {
                name: row.name,
                rz:  { total: null, duration: null, perHour: null, isCalc: false },
                mk:  { total: null, duration: null, perHour: null, isCalc: false },
                pkg: { total: null, duration: null, perHour: null, modules: 1, isCalc: false }
            };
        }
        const item = grouped[row.name];
        const price = row.price ? parseFloat(row.price) : null;
        const duration = row.duration ? parseFloat(row.duration) : null;

        if (row.type === 'РЗ') {
            item.rz.total = price;
            item.rz.duration = duration;
            if (price && duration) item.rz.perHour = price / duration * 60;
        } else if (row.type === 'МК') {
            item.mk.total = price;
            item.mk.duration = duration;
            if (price && duration) item.mk.perHour = price / duration * 60;
        } else if (row.type === 'Пакет') {
            item.pkg.total = price;
            item.pkg.duration = duration;
            item.pkg.modules = parseInt(row.modules) || 1;
            if (price && duration) item.pkg.perHour = price / duration * 60;
        }
    });

    // Расчёт недостающего
    Object.values(grouped).forEach(item => {
        const modules = item.pkg.modules;
        const discount = modules === 1 ? 0
                       : modules === 2 ? s.disc2
                       : modules === 3 ? s.disc3
                       : 0;

        // Пакет
        if (!item.pkg.perHour) {
            if (item.mk.perHour) {
                item.pkg.perHour = item.mk.perHour * (1 - discount);
                item.pkg.isCalc = true;
            } else if (item.rz.perHour) {
                item.pkg.perHour = item.rz.perHour * s.coefMK * (1 - discount);
                item.pkg.isCalc = true;
            }
        }
        // МК
        if (!item.mk.perHour) {
            if (item.rz.perHour) {
                item.mk.perHour = item.rz.perHour * s.coefMK;
                item.mk.isCalc = true;
            } else if (item.pkg.perHour) {
                item.mk.perHour = item.pkg.perHour / (1 - discount);
                item.mk.isCalc = true;
            }
        }
        // РЗ
        if (!item.rz.perHour) {
            if (item.mk.perHour) {
                item.rz.perHour = item.mk.perHour / s.coefMK;
                item.rz.isCalc = true;
            } else if (item.pkg.perHour) {
                item.rz.perHour = (item.pkg.perHour / (1 - discount)) / s.coefMK;
                item.rz.isCalc = true;
            }
        }

        // Итоговые цены
        if (!item.rz.total && item.rz.perHour && item.rz.duration) {
            item.rz.total = item.rz.perHour * item.rz.duration / 60;
            item.rz.isCalc = true;
        }
        if (!item.mk.total && item.mk.perHour && item.mk.duration) {
            item.mk.total = item.mk.perHour * item.mk.duration / 60;
            item.mk.isCalc = true;
        }
        if (!item.pkg.total && item.pkg.perHour && item.pkg.duration) {
            item.pkg.total = item.pkg.perHour * item.pkg.duration / 60;
            item.pkg.isCalc = true;
        }

        // Округление до 10 ₽
        const step = 10;
        if (item.rz.total)  item.rz.total  = Math.round(item.rz.total  / step) * step;
        if (item.mk.total)  item.mk.total  = Math.round(item.mk.total  / step) * step;
        if (item.pkg.total) item.pkg.total = Math.round(item.pkg.total / step) * step;
    });

    return grouped;
}

// ------------------------------------------------------------
// Отрисовка
// ------------------------------------------------------------
function render() {
    renderInputTable();
    renderResultTable();
}

function renderInputTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (appData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Нет строк. Нажмите «Добавить строку».</td></tr>';
        return;
    }

    appData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${escapeHtml(row.name)}" 
                       oninput="updateRow(${row.id}, 'name', this.value)" 
                       placeholder="Название услуги"></td>
            <td>
                <select onchange="updateRow(${row.id}, 'type', this.value)">
                    <option value="РЗ" ${row.type === 'РЗ' ? 'selected' : ''}>РЗ (Регулярное)</option>
                    <option value="Пакет" ${row.type === 'Пакет' ? 'selected' : ''}>Пакет</option>
                    <option value="МК" ${row.type === 'МК' ? 'selected' : ''}>МК (Мастер-класс)</option>
                </select>
            </td>
            <td><input type="number" value="${row.duration}" 
                       oninput="updateRow(${row.id}, 'duration', this.value)" 
                       placeholder="мин" min="0"></td>
            <td><input type="number" value="${row.price}" 
                       oninput="updateRow(${row.id}, 'price', this.value)" 
                       placeholder="₽" min="0"></td>
            <td><input type="number" value="${row.modules}" 
                       oninput="updateRow(${row.id}, 'modules', this.value)" 
                       ${row.type === 'Пакет' ? '' : 'disabled'} 
                       placeholder="шт" min="1"></td>
            <td><button class="btn btn-danger" onclick="removeRow(${row.id})">✕</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderResultTable() {
    const results = calculate();
    const tbody = document.getElementById('resultBody');
    tbody.innerHTML = '';

    const keys = Object.keys(results);
    if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Добавьте данные для расчёта</td></tr>';
        return;
    }

    const fp = v => v ? v.toFixed(0) + ' ₽' : '—';
    const fph = v => v ? v.toFixed(0) + ' ₽/час' : '—';
    const badge = isCalc => isCalc
        ? '<span class="badge badge-calc">Рассчитано</span>'
        : '<span class="badge badge-manual">Введено</span>';

    Object.values(results).forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${fp(item.rz.total)}<br><small>${fph(item.rz.perHour)}</small><br>${badge(item.rz.isCalc)}</td>
            <td>${fp(item.pkg.total)} <small>(${item.pkg.modules} мод.)</small><br>
                <small>${fph(item.pkg.perHour)}</small><br>${badge(item.pkg.isCalc)}</td>
            <td>${fp(item.mk.total)}<br><small>${fph(item.mk.perHour)}</small><br>${badge(item.mk.isCalc)}</td>
            <td><span class="highlight">
                ${fph(item.rz.perHour)} / ${fph(item.pkg.perHour)} / ${fph(item.mk.perHour)}
            </span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ------------------------------------------------------------
// Экспорт в XLS
// ------------------------------------------------------------
function exportToXls() {
    const results = calculate();
    const s = getSettings();

    let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">';
    html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
    html += '<x:Name>Цены</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
    html += '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
    html += '</head><body>';

    html += '<table border="1" style="font-family:Arial;border-collapse:collapse;">';
    html += '<thead><tr style="background:#ff8c00;color:#fff;font-weight:bold;">';
    ['Наименование','Тип','Длительность, мин','Цена, ₽','Цена за 1 час, ₽','Кол-во модулей','Источник']
        .forEach(h => html += `<th style="padding:8px;">${h}</th>`);
    html += '</tr></thead><tbody>';

    const rows = [
        { type: 'РЗ', data: 'rz' },
        { type: 'Пакет', data: 'pkg' },
        { type: 'МК', data: 'mk' }
    ];

    Object.values(results).forEach(item => {
        rows.forEach(r => {
            const d = item[r.data];
            html += '<tr>';
            html += `<td style="padding:6px;">${escapeHtml(item.name)}</td>`;
            html += `<td style="padding:6px;">${r.type}</td>`;
            html += `<td style="padding:6px;">${d.duration || ''}</td>`;
            html += `<td style="padding:6px;">${d.total ? d.total.toFixed(0) : ''}</td>`;
            html += `<td style="padding:6px;">${d.perHour ? d.perHour.toFixed(0) : ''}</td>`;
            html += `<td style="padding:6px;">${r.data === 'pkg' ? d.modules : ''}</td>`;
            html += `<td style="padding:6px;">${d.isCalc ? 'Рассчитано' : 'Введено'}</td>`;
            html += '</tr>';
        });
    });

    html += '</tbody></table><br><br>';

    html += '<table border="1" style="font-family:Arial;border-collapse:collapse;">';
    html += `<tr><td style="padding:6px;font-weight:bold;">Коэффициент Пакета к РЗ</td><td style="padding:6px;">${s.coefPkg}</td></tr>`;
    html += `<tr><td style="padding:6px;font-weight:bold;">Коэффициент МК к РЗ</td><td style="padding:6px;">${s.coefMK}</td></tr>`;
    html += `<tr><td style="padding:6px;font-weight:bold;">Скидка за 2 модуля, %</td><td style="padding:6px;">${(s.disc2*100).toFixed(0)}</td></tr>`;
    html += `<tr><td style="padding:6px;font-weight:bold;">Скидка за 3 модуля, %</td><td style="padding:6px;">${(s.disc3*100).toFixed(0)}</td></tr>`;
    html += `<tr><td style="padding:6px;font-weight:bold;">Дата экспорта</td><td style="padding:6px;">${new Date().toLocaleString('ru-RU')}</td></tr>`;
    html += '</table>';

    html += '</body></html>';

    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prices_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ------------------------------------------------------------
// Утилита: экранирование HTML
// ------------------------------------------------------------
function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
