(() => {
  'use strict';

  /* ---------- Setup ---------- */

  const STORAGE_KEY = 'taskflow.tasks.v1';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const state = {
    tasks: loadTasks(),
    filter: 'all',
    search: '',
    priority: 'all',
    sort: 'due',
    menuFor: null
  };

  const labels = { all: 'All tasks', todo: 'To do', inprogress: 'In progress', done: 'Completed' };
  const priorityRank = { high: 0, medium: 1, low: 2 };
  let toastTimer;

  /* ---------- Storage ---------- */

  function loadTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved)
        ? saved.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string')
        : [];
    } catch {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch {
      showToast('Could not save in this browser.');
    }
  }

  /* ---------- Helpers ---------- */

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function dateOnly(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function todayIso() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    if (!value) return 'No due date';
    const d = new Date(value + 'T12:00:00');
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  function isOverdue(task) {
    return Boolean(task.dueDate && task.dueDate < todayIso() && task.status !== 'done');
  }

  function isToday(task) {
    return Boolean(task.dueDate && task.dueDate === todayIso() && task.status !== 'done');
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function statusLabel(status) {
    return ({ todo: 'To do', inprogress: 'In progress', done: 'Completed' })[status] || 'To do';
  }

  function counts() {
    return {
      all: state.tasks.length,
      todo: state.tasks.filter(t => t.status === 'todo').length,
      inprogress: state.tasks.filter(t => t.status === 'inprogress').length,
      done: state.tasks.filter(t => t.status === 'done').length
    };
  }

  /* ---------- Rendering ---------- */

  function renderStats() {
    const c = counts();

    Object.entries(c).forEach(([key, value]) => {
      const el = $('#count-' + key);
      if (el) el.textContent = value;
    });

    $('#stat-total').textContent = c.all;
    $('#stat-progress').textContent = c.inprogress;
    $('#stat-done').textContent = c.done;
    $('#stat-overdue').textContent = state.tasks.filter(isOverdue).length;
    $('#completion-foot').textContent = c.all
      ? `${Math.round(c.done / c.all * 100)}% of all tasks completed`
      : 'Keep the momentum going';
  }

  function visibleTasks() {
    let tasks = state.tasks.filter(t => state.filter === 'all' || t.status === state.filter);

    if (state.priority !== 'all') {
      tasks = tasks.filter(t => t.priority === state.priority);
    }

    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      tasks = tasks.filter(t => `${t.title} ${t.description || ''}`.toLowerCase().includes(q));
    }

    return tasks.sort((a, b) => {
      if (state.sort === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (state.sort === 'priority') {
        return priorityRank[a.priority] - priorityRank[b.priority]
          || (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      }
      if (state.sort === 'title') {
        return a.title.localeCompare(b.title);
      }
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
        || (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function taskRow(task) {
    const dueClass = isOverdue(task) ? 'overdue' : isToday(task) ? 'today' : '';
    const dueText = isOverdue(task)
      ? 'Overdue · ' + formatDate(task.dueDate)
      : isToday(task)
        ? 'Due today'
        : formatDate(task.dueDate);

    return `<article class="task-row" data-task-id="${escapeHtml(task.id)}">
      <div class="task-info"><button class="task-check ${task.status==='done'?'checked':''}" data-action="toggle" title="${task.status==='done'?'Mark as not completed':'Mark completed'}" aria-label="Toggle completion">${task.status==='done'?'✓':''}</button><div class="task-copy"><div class="task-title ${task.status==='done'?'completed':''}">${escapeHtml(task.title)}</div>${task.description?`<div class="task-description">${escapeHtml(task.description)}</div>`:''}</div></div>
      <div class="priority-cell"><span class="priority-pill priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority[0].toUpperCase()+task.priority.slice(1))}</span></div>
      <div class="due-cell"><span class="due-date ${dueClass}">${escapeHtml(dueText)}</span></div>
      <div class="status-cell"><button class="status-pill status-${escapeHtml(task.status)}" data-action="cycle-status" title="Click to change status">${escapeHtml(statusLabel(task.status))} ▾</button></div>
      <div class="row-actions"><button class="more-btn" data-action="menu" aria-label="Task actions" aria-expanded="${state.menuFor===task.id}">···</button>${state.menuFor===task.id?`<div class="action-menu"><button data-action="edit">Edit task</button><button data-action="cycle-status">Change status</button><button class="delete-action" data-action="delete">Delete task</button></div>`:''}</div>
    </article>`;
  }

  function renderTasks() {
    const tasks = visibleTasks();

    $('#page-title').childNodes[0].textContent = labels[state.filter] + ' ';
    $('#breadcrumb-title').textContent = labels[state.filter];
    $('#heading-count').textContent = counts()[state.filter];

    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === state.filter));

    $('#results-label').textContent =
      `Showing ${tasks.length} of ${state.tasks.length} task${state.tasks.length===1?'':'s'}`;

    if (!tasks.length) {
      const filtered = state.search || state.priority !== 'all' || state.filter !== 'all';
      $('#task-list').innerHTML = `<div class="empty-state"><div class="empty-illustration">${filtered?'⌕':'✓'}</div><h3>${filtered?'No tasks match your filters':'A fresh start ✨'}</h3><p>${filtered?'Try another search or change your filters.':'Create your first task and start building momentum.'}</p>${filtered?'<button class="secondary-button" id="reset-filters">Reset filters</button>':'<button class="primary-button" id="empty-add">＋ Create your first task</button>'}</div>`;
    } else {
      $('#task-list').innerHTML = tasks.map(taskRow).join('');
    }

    renderStats();
  }

  function render() {
    renderTasks();
  }

  /* ---------- Modal ---------- */

  function openModal(task = null) {
    $('#task-form').reset();
    $('#form-error').textContent = '';
    $('#task-id').value = task?.id || '';

    $('#modal-title').textContent = task ? 'Edit task' : 'Create a task';
    $('#save-task-btn').textContent = task ? 'Save changes' : 'Create task';

    $('#task-title').value = task?.title || '';
    $('#task-description').value = task?.description || '';
    $('#task-priority').value = task?.priority || 'medium';
    $('#task-status').value = task?.status || 'todo';
    $('#task-due').value = task?.dueDate || '';

    $('#modal-backdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#task-title').focus(), 30);
  }

  function closeModal() {
    $('#modal-backdrop').hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------- Task actions ---------- */

  function saveTask(event) {
    event.preventDefault();

    const title = $('#task-title').value.trim();
    if (!title) {
      $('#form-error').textContent = 'Please enter a task title.';
      $('#task-title').focus();
      return;
    }

    const id = $('#task-id').value;
    const existing = state.tasks.find(t => t.id === id);

    const task = {
      id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
      title,
      description: $('#task-description').value.trim(),
      priority: $('#task-priority').value,
      status: $('#task-status').value,
      dueDate: $('#task-due').value,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (existing) {
      state.tasks = state.tasks.map(t => t.id === id ? task : t);
    } else {
      state.tasks.unshift(task);
    }

    persist();
    closeModal();
    render();
    showToast(existing ? 'Task updated successfully.' : 'Task created successfully.');
  }

  function cycleStatus(task) {
    task.status = ({ todo: 'inprogress', inprogress: 'done', done: 'todo' })[task.status] || 'todo';
    task.updatedAt = Date.now();
    state.menuFor = null;
    persist();
    render();
    showToast('Status changed to ' + statusLabel(task.status) + '.');
  }

  function deleteTask(task) {
    if (!confirm(`Delete “${task.title}”? This cannot be undone.`)) return;

    state.tasks = state.tasks.filter(t => t.id !== task.id);
    state.menuFor = null;
    persist();
    render();
    showToast('Task deleted.');
  }

  function onListClick(event) {
    const actionButton = event.target.closest('[data-action]');

    if (event.target.closest('#empty-add')) {
      openModal();
      return;
    }

    if (event.target.closest('#reset-filters')) {
      state.search = '';
      state.priority = 'all';
      state.filter = 'all';
      $('#search-input').value = '';
      $('#priority-filter').value = 'all';
      render();
      return;
    }

    if (!actionButton) {
      if (state.menuFor) {
        state.menuFor = null;
        renderTasks();
      }
      return;
    }

    const row = actionButton.closest('[data-task-id]');
    const task = state.tasks.find(t => t.id === row?.dataset.taskId);
    if (!task) return;

    switch (actionButton.dataset.action) {
      case 'toggle':
        task.status = task.status === 'done' ? 'todo' : 'done';
        task.updatedAt = Date.now();
        persist();
        render();
        showToast(task.status === 'done' ? 'Task completed!' : 'Task moved to To do.');
        break;
      case 'cycle-status':
        cycleStatus(task);
        break;
      case 'menu':
        state.menuFor = state.menuFor === task.id ? null : task.id;
        renderTasks();
        break;
      case 'edit':
        state.menuFor = null;
        openModal(task);
        break;
      case 'delete':
        deleteTask(task);
        break;
    }
  }

  /* ---------- Event listeners ---------- */

  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    state.menuFor = null;
    render();
  }));

  $('#add-task-btn').addEventListener('click', () => openModal());
  $('#close-modal').addEventListener('click', closeModal);
  $('#cancel-modal').addEventListener('click', closeModal);
  $('#task-form').addEventListener('submit', saveTask);
  $('#task-list').addEventListener('click', onListClick);

  $('#modal-backdrop').addEventListener('click', e => {
    if (e.target === $('#modal-backdrop')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal-backdrop').hidden) closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('#search-input').focus();
    }
  });

  $('#search-input').addEventListener('input', e => {
    state.search = e.target.value;
    renderTasks();
  });

  $('#priority-filter').addEventListener('change', e => {
    state.priority = e.target.value;
    renderTasks();
  });

  $('#sort-select').addEventListener('change', e => {
    state.sort = e.target.value;
    renderTasks();
  });

  $('#clear-completed').addEventListener('click', () => {
    const count = state.tasks.filter(t => t.status === 'done').length;

    if (!count) {
      showToast('There are no completed tasks to clear.');
      return;
    }
    if (!confirm(`Delete ${count} completed task${count===1?'':'s'}?`)) return;

    state.tasks = state.tasks.filter(t => t.status !== 'done');
    persist();
    render();
    showToast('Completed tasks cleared.');
  });

  /* ---------- Theme ---------- */

  $('#theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');

    try {
      localStorage.setItem('taskflow.theme', dark ? 'dark' : 'light');
    } catch {}

    $('#theme-toggle').textContent = dark ? '☾' : '☼';
  });

  try {
    if (localStorage.getItem('taskflow.theme') === 'dark') {
      document.body.classList.add('dark');
      $('#theme-toggle').textContent = '☾';
    }
  } catch {}

  /* ---------- Mobile navigation ---------- */

  // Keep the full sidebar accessible behind a menu button.
  const sidebar = $('.sidebar');
  const topbar = $('.topbar');

  if (sidebar && topbar && !$('#mobile-menu-toggle')) {
    const menuButton = document.createElement('button');
    menuButton.id = 'mobile-menu-toggle';
    menuButton.className = 'icon-button mobile-menu-toggle';
    menuButton.type = 'button';
    menuButton.setAttribute('aria-label', 'Open navigation menu');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = '☰';
    topbar.insertBefore(menuButton, topbar.firstChild);

    const menuBackdrop = document.createElement('button');
    menuBackdrop.id = 'mobile-menu-backdrop';
    menuBackdrop.className = 'mobile-menu-backdrop';
    menuBackdrop.type = 'button';
    menuBackdrop.setAttribute('aria-label', 'Close navigation menu');
    document.body.appendChild(menuBackdrop);

    const closeMobileMenu = () => {
      document.body.classList.remove('mobile-nav-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation menu');
      menuButton.textContent = '☰';
    };

    menuButton.addEventListener('click', () => {
      const isOpen = document.body.classList.toggle('mobile-nav-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
      menuButton.textContent = isOpen ? '×' : '☰';
    });

    menuBackdrop.addEventListener('click', closeMobileMenu);
    $$('.nav-item').forEach(button => button.addEventListener('click', closeMobileMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileMenu();
    });
  }

  /* ---------- Init ---------- */

  $('#today-label').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  render();
})();
