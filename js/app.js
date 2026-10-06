document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  loadInitialNotifications();
  setupFormValidationAndSubmit();
  setupLiveValidation();
});

// 1. Загрузка карточек и строк таблицы из dashboard.json
async function loadDashboardData() {
  const cardsContainer = document.getElementById('statsCardsContainer');
  const tableBody = document.getElementById('activityTableBody');
  const countBadge = document.getElementById('activityCount');

  try {
    const response = await fetch('dataset/dashboard.json');
    if (!response.ok) throw new Error('Не удалось загрузить dashboard.json');
    
    const data = await response.json();

    // 1.1 Отрисовка метрик
    if (data.metrics && cardsContainer) {
      cardsContainer.innerHTML = '';
      data.metrics.forEach(item => {
        const cardCol = document.createElement('div');
        cardCol.className = 'col-12 col-sm-6 col-xl-3';
        
        cardCol.innerHTML = `
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body">
              <span class="text-muted small fw-bold d-block mb-2">${item.title}</span>
              <h3 class="card-title h2 mb-0">${item.value}</h3>
            </div>
          </div>
        `;
        cardsContainer.appendChild(cardCol);
      });
    }

    // 1.2 Отрисовка строк таблицы из JSON
    if (data.rows && tableBody) {
      tableBody.innerHTML = '';
      data.rows.forEach(row => {
        appendTableRow(row.id, 'Система', row.action, row.status);
      });

      if (countBadge) {
        countBadge.textContent = `Записей: ${data.rows.length}`;
      }
    }
  } catch (error) {
    console.warn('Ошибка загрузки dashboard.json:', error);
  }
}

// 2. Загрузка уведомлений из notifications.json
async function loadInitialNotifications() {
  try {
    const response = await fetch('data/notifications.json');
    if (!response.ok) return;

    const notifications = await response.json();

    if (Array.isArray(notifications) && notifications.length > 0) {
      const notif = notifications[0];
      const title = notif.type === 'success' ? 'Успешно' : 'Внимание';
      showToast(title, notif.text, 'только что');
    }
  } catch (error) {
    console.warn('Ошибка загрузки notifications.json:', error);
  }
}

// Вспомогательная функция показа Toast через Bootstrap API
function showToast(title, message, time = 'только что') {
  const toastEl = document.getElementById('liveToast');
  if (!toastEl) return;

  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastBody').textContent = message;
  document.getElementById('toastTime').textContent = time;

  const toastInstance = bootstrap.Toast.getOrCreateInstance(toastEl);
  toastInstance.show();
}

// 3. Вставка строки в таблицу
function appendTableRow(id, userName, action, status = 'Готово') {
  const tbody = document.getElementById('activityTableBody');
  const countBadge = document.getElementById('activityCount');
  if (!tbody) return;

  const newRow = document.createElement('tr');
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Динамический цвет бейджа в зависимости от статуса из JSON
  let statusBadgeClass = 'bg-secondary';
  if (status === 'Готово') statusBadgeClass = 'bg-success';
  else if (status === 'В работе') statusBadgeClass = 'bg-warning text-dark';
  else if (status === 'Новая') statusBadgeClass = 'bg-info text-dark';

  newRow.innerHTML = `
    <td><strong>#${id}</strong></td>
    <td>${userName}</td>
    <td>${action}</td>
    <td>${now}</td>
    <td><span class="badge ${statusBadgeClass}">${status}</span></td>
  `;

  // Обработчик событий: клик по строке таблицы
  newRow.addEventListener('click', () => {
    showToast('Детали записи', `Выбрана запись #${id}: ${action} [Статус: ${status}]`);
  });

  tbody.appendChild(newRow);

  if (countBadge) {
    countBadge.textContent = `Записей: ${tbody.children.length}`;
  }
}

// 4. Валидация и отправка формы
function setupFormValidationAndSubmit() {
  const form = document.getElementById('addRecordForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const nameInput = document.getElementById('userNameInput');
    const emailInput = document.getElementById('userEmailInput');
    const actionSelect = document.getElementById('actionSelect');

    let isValid = true;

    // Валидация Имени
    if (!nameInput.value.trim()) {
      nameInput.classList.add('is-invalid');
      nameInput.classList.remove('is-valid');
      isValid = false;
    } else {
      nameInput.classList.remove('is-invalid');
      nameInput.classList.add('is-valid');
    }

    // Валидация Email
    if (!validateEmail(emailInput.value)) {
      emailInput.classList.add('is-invalid');
      emailInput.classList.remove('is-valid');
      isValid = false;
    } else {
      emailInput.classList.remove('is-invalid');
      emailInput.classList.add('is-valid');
    }

    // Валидация Выбора действия
    if (!actionSelect.value) {
      actionSelect.classList.add('is-invalid');
      actionSelect.classList.remove('is-valid');
      isValid = false;
    } else {
      actionSelect.classList.remove('is-invalid');
      actionSelect.classList.add('is-valid');
    }

    if (!isValid) return;

    // Генерация следующего ID для новой строки
    const tbody = document.getElementById('activityTableBody');
    const newId = (tbody ? tbody.children.length : 0) + 1;

    appendTableRow(newId, nameInput.value, actionSelect.value, 'Новая');

    // Закрытие модального окна через Bootstrap API
    const modalEl = document.getElementById('addRecordModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.hide();

    // Сброс формы
    form.reset();
    [nameInput, emailInput, actionSelect].forEach(el => el.classList.remove('is-valid', 'is-invalid'));

    showToast('Успешно', 'Новая запись добавлена в таблицу');
  });
}

// 5. Живая валидация Email
function setupLiveValidation() {
  const emailInput = document.getElementById('userEmailInput');
  if (!emailInput) return;

  emailInput.addEventListener('input', () => {
    if (validateEmail(emailInput.value)) {
      emailInput.classList.remove('is-invalid');
      emailInput.classList.add('is-valid');
    } else {
      emailInput.classList.remove('is-valid');
      if (emailInput.value.length > 0) {
        emailInput.classList.add('is-invalid');
      }
    }
  });
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}