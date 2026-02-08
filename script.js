    const defaultConfig = {
      app_title: "Construction Sidekick",
      capture_tab_label: "Capture",
      todo_tab_label: "To-Do",
      issues_tab_label: "Issues",
      sites_tab_label: "Sites",
      capture_section_title: "Site Capture",
      todo_section_title: "Today's Checklist",
      issues_section_title: "Report Issues",
      sites_section_title: "Find My Site",
      footer_text: "Construction Sidekick · Demo"
    };

    function cfg(config, key) {
      return (config && config[key]) || defaultConfig[key];
    }

    async function setupElementSdk() {
      if (!window.elementSdk) {
        applyConfigToUI(defaultConfig);
        return;
      }

      window.elementSdk.init({
        defaultConfig,
        onConfigChange: async (config) => {
          applyConfigToUI(config);
        },
        mapToCapabilities: (config) => {
          return {
            recolorables: [],
            borderables: [],
            fontEditable: undefined,
            fontSizeable: undefined
          };
        },
        mapToEditPanelValues: (config) => {
          const c = config || defaultConfig;
          return new Map([
            ['app_title', c.app_title || defaultConfig.app_title],
            ['capture_tab_label', c.capture_tab_label || defaultConfig.capture_tab_label],
            ['todo_tab_label', c.todo_tab_label || defaultConfig.todo_tab_label],
            ['issues_tab_label', c.issues_tab_label || defaultConfig.issues_tab_label],
            ['sites_tab_label', c.sites_tab_label || defaultConfig.sites_tab_label],
            ['capture_section_title', c.capture_section_title || defaultConfig.capture_section_title],
            ['todo_section_title', c.todo_section_title || defaultConfig.todo_section_title],
            ['issues_section_title', c.issues_section_title || defaultConfig.issues_section_title],
            ['sites_section_title', c.sites_section_title || defaultConfig.sites_section_title],
            ['footer_text', c.footer_text || defaultConfig.footer_text]
          ]);
        }
      });

      applyConfigToUI(window.elementSdk.config || defaultConfig);
    }

    function applyConfigToUI(config) {
      const els = {
        app_title: document.getElementById('app-title'),
        capture_tab_label: document.getElementById('capture-tab-label'),
        todo_tab_label: document.getElementById('todo-tab-label'),
        issues_tab_label: document.getElementById('issues-tab-label'),
        sites_tab_label: document.getElementById('sites-tab-label'),
        capture_section_title: document.getElementById('capture-section-title'),
        todo_section_title: document.getElementById('todo-section-title'),
        issues_section_title: document.getElementById('issues-section-title'),
        sites_section_title: document.getElementById('sites-section-title'),
        footer_text: document.getElementById('footer-text')
      };

      Object.keys(els).forEach(key => {
        if (els[key]) els[key].textContent = cfg(config, key);
      });
    }
    
    const STORAGE_KEYS = {
      CURRENT_USER: 'construction_sidekick_user',
      CAPTURE_ENTRIES: 'construction_sidekick_capture',
      TODO_ITEMS: 'construction_sidekick_todos',
      ISSUE_ITEMS: 'construction_sidekick_issues',
      PROGRESS_REPORTS: 'construction_sidekick_reports',
      SITES: 'construction_sidekick_sites'
    };
    
    function saveToLocalStorage(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    }
    
    function loadFromLocalStorage(key, defaultValue = null) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
      } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return defaultValue;
      }
    }

    const captureEntries = loadFromLocalStorage(STORAGE_KEYS.CAPTURE_ENTRIES, []);
    let todoItems = loadFromLocalStorage(STORAGE_KEYS.TODO_ITEMS, []);
    let issueItems = loadFromLocalStorage(STORAGE_KEYS.ISSUE_ITEMS, []);
    let progressReports = loadFromLocalStorage(STORAGE_KEYS.PROGRESS_REPORTS, []);
    let currentIssueFilter = 'all';
    let currentTodoSiteFilter = '';
    let currentSiteView = null;
    
    let currentUser = loadFromLocalStorage(STORAGE_KEYS.CURRENT_USER, null);
    let isAppReady = false;
    
    const DEMO_CREDENTIALS = {
      email: 'demo@construction.com',
      password: 'demo123',
      name: 'Demo User'
    };
    
    const DEFAULT_SITES = [
      {
        id: '1',
        name: 'CBD Office Tower',
        city: 'Downtown',
        distanceKm: 2.1,
        status: 'Concrete works',
        crew: 12,
        color: 'brandAccent'
      },
      {
        id: '2',
        name: 'Riverside Residential',
        city: 'Riverside',
        distanceKm: 5.4,
        status: 'Brickwork & roofing',
        crew: 8,
        color: 'brandTeal'
      },
      {
        id: '3',
        name: 'Logistics Park',
        city: 'Industrial Zone',
        distanceKm: 11.3,
        status: 'Foundations',
        crew: 15,
        color: 'brandPink'
      }
    ];
    
    let sites = loadFromLocalStorage(STORAGE_KEYS.SITES, null);
    if (!sites || sites.length === 0) {
      sites = [...DEFAULT_SITES];
      saveToLocalStorage(STORAGE_KEYS.SITES, sites);
    }

    function formatDateShort(d) {
      const date = d instanceof Date ? d : new Date(d);
      return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short'
      });
    }

    function updateSummary() {
      const workEl = document.getElementById('summary-work-entries');
      const tasksEl = document.getElementById('summary-tasks');
      const issuesEl = document.getElementById('summary-issues');
      const sitesEl = document.getElementById('summary-sites');

      if (workEl) workEl.textContent = captureEntries.length;
      
      const open = todoItems.filter(t => !t.completed).length;
      if (tasksEl) tasksEl.textContent = open;
      
      const openIssues = issueItems.filter(i => i.status === 'open').length;
      if (issuesEl) issuesEl.textContent = openIssues;
      
      if (sitesEl) sitesEl.textContent = sites.length;
    }

    function renderCaptureEntries() {
      const list = document.getElementById('capture-entries');
      if (!list) return;
      list.innerHTML = '';

      if (captureEntries.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-sm text-gray-500 text-center py-4';
        li.textContent = 'No entries yet. Fill out the form above to start logging.';
        list.appendChild(li);
        return;
      }

      captureEntries.slice(-5).reverse().forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = 'card-modern rounded-3xl bg-white border-2 border-gray-100 px-5 py-4 shadow-lg hover:shadow-xl';
        li.style.animationDelay = `${index * 0.1}s`;
        li.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <span class="text-base font-bold text-gray-900">${entry.site || 'Unnamed Site'}</span>
            <span class="text-[10px] text-brandAccent bg-brandAccent/10 px-2.5 py-1 rounded-full font-semibold">${formatDateShort(entry.date)}</span>
          </div>
          <p class="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">${entry.work || 'No description'}</p>
          <div class="flex items-center gap-4 text-xs text-gray-500 font-medium">
            <span class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              ${entry.foreman || 'N/A'}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              ${entry.crew || 0} crew
            </span>
          </div>
        `;
        list.appendChild(li);
      });
    }

    function renderTodos() {
      const list = document.getElementById('todo-list');
      const counter = document.getElementById('todo-counter');
      const filterLabel = document.getElementById('todo-filter-label');
      if (!list) return;

      list.innerHTML = '';
      
      const filtered = currentTodoSiteFilter 
        ? todoItems.filter(t => t.site === currentTodoSiteFilter)
        : todoItems;
      
      if (filtered.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-sm text-gray-500 text-center py-6';
        li.textContent = currentTodoSiteFilter 
          ? `No tasks for ${currentTodoSiteFilter} yet.`
          : 'No tasks yet. Add your first task above!';
        list.appendChild(li);
      } else {
        filtered.forEach((item, index) => {
          const li = document.createElement('li');
          li.dataset.id = item.id;
          li.className = 'card-modern rounded-3xl border-2 border-gray-100 bg-white px-5 py-4 shadow-lg hover:shadow-xl';
          li.style.animationDelay = `${index * 0.05}s`;

          const checkboxId = `todo-checkbox-${item.id}`;

          const siteColors = {
            'CBD Office Tower': 'bg-brandAccent/10 text-brandAccent',
            'Riverside Residential': 'bg-brandTeal/10 text-brandTeal',
            'Logistics Park': 'bg-brandPink/10 text-brandPink'
          };
          const siteColor = siteColors[item.site] || 'bg-gray-100 text-gray-600';

          li.innerHTML = `
            <div class="flex items-start gap-4">
              <input
                id="${checkboxId}"
                type="checkbox"
                class="todo-checkbox w-6 h-6 rounded-xl border-2 border-gray-300 text-brandTeal focus:ring-0 cursor-pointer transition-all mt-0.5"
                ${item.completed ? 'checked' : ''}
              />
              <label for="${checkboxId}" class="flex-1 cursor-pointer min-w-0">
                <p class="text-base font-semibold ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'} mb-1">${item.text}</p>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${siteColor} text-[10px] font-bold">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    ${item.site}
                  </span>
                  <span class="text-[10px] text-gray-500 font-medium">${formatDateShort(item.createdAt)}</span>
                </div>
              </label>
              <button
                type="button"
                class="todo-delete text-brandPink hover:text-brandPink/70 font-bold text-xl btn-press flex-shrink-0"
              >
                ✕
              </button>
            </div>
          `;
          list.appendChild(li);
        });
      }

      const open = todoItems.filter(t => !t.completed).length;
      const done = todoItems.filter(t => t.completed).length;
      if (counter) {
        counter.textContent = `${open} open${done > 0 ? ` · ${done} done` : ''}`;
      }

      if (filterLabel) {
        filterLabel.textContent = currentTodoSiteFilter 
          ? `${currentTodoSiteFilter} tasks`
          : 'All tasks';
      }

      updateSummary();
    }

    function renderIssues() {
      const list = document.getElementById('issues-list');
      const badge = document.getElementById('issues-badge');
      if (!list) return;

      list.innerHTML = '';

      const filtered = currentIssueFilter === 'all' 
        ? issueItems 
        : issueItems.filter(i => i.priority === currentIssueFilter);

      if (filtered.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-sm text-gray-500 text-center py-6';
        li.textContent = currentIssueFilter === 'all' 
          ? 'No issues reported yet. Great work!' 
          : `No ${currentIssueFilter} priority issues.`;
        list.appendChild(li);
      } else {
        filtered.forEach((issue, index) => {
          const li = document.createElement('li');
          li.dataset.id = issue.id;
          li.className = 'card-modern rounded-3xl bg-white border-2 border-gray-100 px-5 py-4 shadow-lg hover:shadow-xl';
          li.style.animationDelay = `${index * 0.1}s`;

          const priorityConfig = {
            high: { color: 'bg-red-500', text: 'text-red-500', label: 'High' },
            medium: { color: 'bg-orange-500', text: 'text-orange-500', label: 'Medium' },
            low: { color: 'bg-yellow-500', text: 'text-yellow-500', label: 'Low' }
          };

          const config = priorityConfig[issue.priority];
          const statusColor = issue.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
          const statusText = issue.status === 'open' ? 'Open' : 'Resolved';

          li.innerHTML = `
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <span class="w-2 h-2 rounded-full ${config.color} flex-shrink-0 mt-2" aria-hidden="true"></span>
                <div class="flex-1 min-w-0">
                  <p class="text-base font-bold text-gray-900 mb-1 truncate">${issue.title}</p>
                  <p class="text-xs text-gray-600 mb-2 line-clamp-2 leading-relaxed">${issue.description}</p>
                  <div class="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                    <span class="flex items-center gap-1.5">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      ${issue.site}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      ${issue.reporter}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 flex-shrink-0 ml-3">
                <span class="text-[10px] ${statusColor} px-2.5 py-1 rounded-full font-bold">${statusText}</span>
                <span class="text-[10px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-semibold">${formatDateShort(issue.date)}</span>
              </div>
            </div>
            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${config.color} text-white text-[11px] font-bold shadow-md">
                <span class="w-2 h-2 rounded-full bg-white/80"></span> ${config.label} Priority
              </span>
              ${issue.status === 'open' ? `
                <button
                  type="button"
                  class="issue-resolve flex items-center gap-1.5 text-green-600 hover:text-green-700 font-bold text-xs btn-press px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-100"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Resolve
                </button>
              ` : ''}
            </div>
          `;
          list.appendChild(li);
        });
      }

      const openCount = issueItems.filter(i => i.status === 'open').length;
      const resolvedCount = issueItems.filter(i => i.status === 'resolved').length;
      if (badge) {
        badge.textContent = `${openCount} open${resolvedCount > 0 ? ` · ${resolvedCount} resolved` : ''}`;
      }

      updateSummary();
    }

    function updateSiteDropdowns() {
      const captureSiteSelect = document.getElementById('site-name');
      if (captureSiteSelect) {
        const currentValue = captureSiteSelect.value;
        captureSiteSelect.innerHTML = '<option value="">Select a site</option>';
        sites.forEach(site => {
          const option = document.createElement('option');
          option.value = site.name;
          option.textContent = site.name;
          captureSiteSelect.appendChild(option);
        });
        if (currentValue) captureSiteSelect.value = currentValue;
      }

      const issueSiteSelect = document.getElementById('issue-site');
      if (issueSiteSelect) {
        const currentValue = issueSiteSelect.value;
        issueSiteSelect.innerHTML = '<option value="">Select a site</option>';
        sites.forEach(site => {
          const option = document.createElement('option');
          option.value = site.name;
          option.textContent = site.name;
          issueSiteSelect.appendChild(option);
        });
        if (currentValue) issueSiteSelect.value = currentValue;
      }

      const todoSiteSelect = document.getElementById('todo-site-select');
      if (todoSiteSelect) {
        const currentValue = todoSiteSelect.value;
        todoSiteSelect.innerHTML = '<option value="">All Sites</option>';
        sites.forEach(site => {
          const option = document.createElement('option');
          option.value = site.name;
          option.textContent = site.name;
          todoSiteSelect.appendChild(option);
        });
        if (currentValue) todoSiteSelect.value = currentValue;
      }
    }

    function renderSites(filterText) {
      const accordion = document.getElementById('sites-accordion');
      if (!accordion) return;
      accordion.innerHTML = '';

      const query = (filterText || '').toLowerCase();
      const filtered = sites.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.city.toLowerCase().includes(query)
      );

      updateSiteDropdowns();

      if (filtered.length === 0) {
        const div = document.createElement('div');
        div.className = 'text-sm text-gray-500 text-center py-6';
        div.textContent = 'No matching sites found.';
        accordion.appendChild(div);
        return;
      }

      filtered.forEach((site, index) => {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'card-modern rounded-3xl border-2 border-gray-100 bg-white shadow-lg overflow-hidden relative';
        accordionItem.dataset.id = site.id;
        accordionItem.style.animationDelay = `${index * 0.1}s`;

        const colorClass = 
          site.color === 'brandAccent' ? 'bg-gradient-to-br from-brandAccent to-brandAccent/90 text-white' :
          site.color === 'brandTeal' ? 'bg-gradient-to-br from-brandTeal to-brandTeal/90 text-white' :
          'bg-gradient-to-br from-brandPink to-brandPink/90 text-white';

        const isExpanded = currentSiteView && currentSiteView.id === site.id;

        accordionItem.innerHTML = `
          <div class="site-accordion-header-wrapper">
            <button type="button" class="site-accordion-header w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors" data-site-id="${site.id}">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-lg font-bold text-gray-900 truncate mb-1">${site.name}</p>
                    <p class="text-xs text-gray-500 font-medium truncate flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      ${site.city} · ${site.distanceKm.toFixed(1)} km away
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                  <svg class="w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold flex-1 min-w-0">
                  <span class="w-2 h-2 rounded-full bg-green-500 pulse flex-shrink-0"></span>
                  <span class="truncate">${site.status}</span>
                </span>
                <span class="flex items-center gap-1.5 text-xs text-gray-700 font-bold bg-gray-100 px-3 py-2 rounded-xl flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  ${site.crew}
                </span>
              </div>
            </button>
            <button
              type="button"
              class="delete-site-btn absolute top-[36px] right-[11.5px] text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 transition-colors z-10"
              data-site-id="${site.id}"
              title="Delete site"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          <div class="site-accordion-content ${isExpanded ? '' : 'hidden'}" data-site-id="${site.id}">
            <div class="px-5 pb-5 pt-2 border-t-2 border-gray-100">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-base font-bold text-gray-900">Weekly Progress Reports</h4>
                <button
                  type="button"
                  class="add-report-btn card-modern flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brandAccent to-brandAccent/90 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-brandAccent/30 btn-press"
                  data-site-id="${site.id}"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
              </div>
              
              <!-- Report Form -->
              <div class="report-form-container hidden mb-4" data-site-id="${site.id}">
                <form class="progress-report-form card-modern rounded-2xl bg-gray-50 border-2 border-gray-200 p-4 shadow-md space-y-3">
                  <div class="flex items-center justify-between mb-2">
                    <h5 class="text-sm font-bold text-gray-900">New Weekly Report</h5>
                    <button
                      type="button"
                      class="cancel-report-btn text-gray-400 hover:text-gray-600 font-bold text-lg"
                      data-site-id="${site.id}"
                    >
                      ✕
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block mb-1 text-xs font-bold text-gray-700">Week Start</label>
                      <input
                        type="date"
                        name="week_start"
                        class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0"
                        required
                      />
                    </div>
                    <div>
                      <label class="block mb-1 text-xs font-bold text-gray-700">Week End</label>
                      <input
                        type="date"
                        name="week_end"
                        class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700">Foreman Name</label>
                    <input
                      type="text"
                      name="foreman_name"
                      class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0"
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700">Progress Summary</label>
                    <textarea
                      name="progress_summary"
                      rows="2"
                      class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0 resize-none"
                      placeholder="Overall progress this week..."
                      required
                    ></textarea>
                  </div>

                  <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700">Completed Tasks</label>
                    <textarea
                      name="completed_tasks"
                      rows="2"
                      class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0 resize-none"
                      placeholder="Tasks completed..."
                    ></textarea>
                  </div>

                  <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700">Upcoming Tasks</label>
                    <textarea
                      name="upcoming_tasks"
                      rows="2"
                      class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0 resize-none"
                      placeholder="Planned for next week..."
                    ></textarea>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block mb-1 text-xs font-bold text-gray-700">Crew Size</label>
                      <input
                        type="number"
                        name="crew_size"
                        min="0"
                        class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label class="block mb-1 text-xs font-bold text-gray-700">Hours Worked</label>
                      <input
                        type="number"
                        name="hours_worked"
                        min="0"
                        step="0.5"
                        class="w-full rounded-xl border-2 border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brandAccent focus:ring-0"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    class="submit-report-btn w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brandAccent to-brandAccent/90 px-4 py-2 text-sm font-bold text-white shadow-lg btn-press"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span class="submit-text">Save Report</span>
                  </button>
                </form>
              </div>
              
              <!-- Reports List -->
              <div class="progress-reports-list" data-site-id="${site.id}">
                <!-- Reports will be injected here -->
              </div>
            </div>
          </div>
        `;
        accordion.appendChild(accordionItem);
      });

      if (currentSiteView) {
        renderProgressReports();
      }
    }

    function renderProgressReports() {
      if (!currentSiteView) return;

      const list = document.querySelector(`.progress-reports-list[data-site-id="${currentSiteView.id}"]`);
      if (!list) return;

      list.innerHTML = '';

      const siteReports = progressReports
        .filter(r => r.site_id === currentSiteView.id)
        .sort((a, b) => new Date(b.week_start) - new Date(a.week_start));

      if (siteReports.length === 0) {
        const div = document.createElement('div');
        div.className = 'text-xs text-gray-500 text-center py-4';
        div.textContent = 'No progress reports yet. Click "New" to add one.';
        list.appendChild(div);
        return;
      }

      siteReports.forEach((report, index) => {
        const reportCard = document.createElement('div');
        reportCard.className = 'card-modern rounded-2xl bg-gray-50 border-2 border-gray-200 px-4 py-3 shadow-md mb-3';
        reportCard.style.animationDelay = `${index * 0.05}s`;

        const weekStart = new Date(report.week_start);
        const weekEnd = new Date(report.week_end);
        const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

        reportCard.innerHTML = `
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-brandAccent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h5 class="text-sm font-bold text-gray-900">${weekLabel}</h5>
            </div>
            <span class="text-[9px] text-brandAccent bg-brandAccent/10 px-2 py-1 rounded-full font-semibold">
              Week ${getWeekNumber(weekStart)}
            </span>
          </div>

          <p class="text-[10px] text-gray-600 font-medium mb-2">
            <span class="font-bold">Foreman:</span> ${report.foreman_name}
          </p>

          <div class="space-y-1.5">
            <div>
              <p class="text-[10px] font-bold text-gray-700 mb-0.5">Progress</p>
              <p class="text-xs text-gray-600 leading-relaxed">${report.progress_summary}</p>
            </div>
            ${report.completed_tasks ? `
              <div>
                <p class="text-[10px] font-bold text-gray-700 mb-0.5">Completed</p>
                <p class="text-xs text-gray-600 leading-relaxed">${report.completed_tasks}</p>
              </div>
            ` : ''}
            ${report.upcoming_tasks ? `
              <div>
                <p class="text-[10px] font-bold text-gray-700 mb-0.5">Upcoming</p>
                <p class="text-xs text-gray-600 leading-relaxed">${report.upcoming_tasks}</p>
              </div>
            ` : ''}
          </div>

          <div class="flex items-center gap-3 mt-2 pt-2 border-t border-gray-300 text-[10px] text-gray-600">
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="font-semibold">${report.crew_size || 0} crew</span>
            </span>
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="font-semibold">${report.hours_worked || 0} hrs</span>
            </span>
          </div>
        `;
        list.appendChild(reportCard);
      });
    }

    function getWeekNumber(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }



    function setActiveTab(tabId) {
      const tabs = document.querySelectorAll('.tab-button');
      const panels = document.querySelectorAll('.tab-panel');

      tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabId;
        const icon = tab.querySelector('svg');
        
        if (isActive) {
          if (tabId === 'capture') {
            tab.className = 'tab-button flex items-center justify-center px-4 py-2 rounded-2xl tab-transition bg-brandAccent/10';
            if (icon) icon.className = 'w-7 h-7 tab-transition text-brandAccent';
          } else if (tabId === 'todo') {
            tab.className = 'tab-button flex items-center justify-center px-4 py-2 rounded-2xl tab-transition bg-brandTeal/10';
            if (icon) icon.className = 'w-7 h-7 tab-transition text-brandTeal';
          } else if (tabId === 'issues') {
            tab.className = 'tab-button flex items-center justify-center px-4 py-2 rounded-2xl tab-transition bg-red-500/10';
            if (icon) icon.className = 'w-7 h-7 tab-transition text-red-500';
          } else {
            tab.className = 'tab-button flex items-center justify-center px-4 py-2 rounded-2xl tab-transition bg-brandPrimary/10';
            if (icon) icon.className = 'w-7 h-7 tab-transition text-brandPrimary';
          }
        } else {
          tab.className = 'tab-button flex items-center justify-center px-4 py-2 rounded-2xl tab-transition';
          if (icon) icon.className = 'w-7 h-7 tab-transition text-gray-400 opacity-50';
        }
      });

      panels.forEach(panel => {
        if (panel.id === `panel-${tabId}`) {
          panel.classList.remove('hidden');
          panel.classList.add('fade-slide-up');
          setTimeout(() => panel.classList.remove('fade-slide-up'), 500);
        } else {
          panel.classList.add('hidden');
        }
      });
    }
    
    function showSplashScreen() {
      const splashScreen = document.getElementById('splash-screen');
      const loginScreen = document.getElementById('login-screen');
      const mainAppContent = document.getElementById('main-app-content');
      
      if (splashScreen) splashScreen.classList.remove('hidden');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (mainAppContent) mainAppContent.classList.add('hidden');
      
      setTimeout(() => {
        showLoginScreen();
      }, 2000);
    }
    
    function showLoginScreen() {
      const splashScreen = document.getElementById('splash-screen');
      const loginScreen = document.getElementById('login-screen');
      const mainAppContent = document.getElementById('main-app-content');
      
      if (splashScreen) splashScreen.classList.add('hidden');
      if (loginScreen) loginScreen.classList.remove('hidden');
      if (mainAppContent) mainAppContent.classList.add('hidden');
    }
    
    function showMainApp() {
      const splashScreen = document.getElementById('splash-screen');
      const loginScreen = document.getElementById('login-screen');
      const mainAppContent = document.getElementById('main-app-content');
      
      if (splashScreen) splashScreen.classList.add('hidden');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (mainAppContent) mainAppContent.classList.remove('hidden');
    }
    
    function updateAuthUI() {
      const userDisplayName = document.getElementById('user-display-name');
      const userDisplayEmail = document.getElementById('user-display-email');
      const userAvatarInitial = document.getElementById('user-avatar-initial');
      
      if (currentUser) {
        if (userDisplayName) userDisplayName.textContent = currentUser.name;
        if (userDisplayEmail) userDisplayEmail.textContent = currentUser.email;
        if (userAvatarInitial) {
          userAvatarInitial.textContent = currentUser.name.charAt(0).toUpperCase();
        }
      }
    }
    
    function handleLogin(email, password) {
      if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
        currentUser = {
          name: DEMO_CREDENTIALS.name,
          email: DEMO_CREDENTIALS.email,
          avatar: DEMO_CREDENTIALS.name.charAt(0).toUpperCase()
        };
        
        saveToLocalStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
        updateAuthUI();
        showMainApp();
        showToast(`Welcome back, ${currentUser.name}!`);
        return true;
      } else {
        showToast('Invalid email or password');
        return false;
      }
    }
    
    function handleLogout() {
      currentUser = null;
      saveToLocalStorage(STORAGE_KEYS.CURRENT_USER, null);
      closeAllModals();
      showLoginScreen();
      showToast('Logged out successfully');
    }
    
    function closeAllModals() {
      const userMenuDropdown = document.getElementById('user-menu-dropdown');
      if (userMenuDropdown) userMenuDropdown.classList.add('hidden');
    }

    function bindEvents() {
      const mainLoginForm = document.getElementById('main-login-form');
      if (mainLoginForm) {
        mainLoginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.getElementById('main-login-email').value.trim();
          const password = document.getElementById('main-login-password').value;
          
          if (email && password) {
            handleLogin(email, password);
          }
        });
      }
      
      const userMenuBtn = document.getElementById('user-menu-btn');
      const userMenuDropdown = document.getElementById('user-menu-dropdown');
      const userMenuBackdrop = document.getElementById('user-menu-backdrop');
      const closeMenuLoggedInBtn = document.getElementById('close-menu-logged-in-btn');
      
      if (userMenuBtn && userMenuDropdown) {
        userMenuBtn.addEventListener('click', () => {
          userMenuDropdown.classList.toggle('hidden');
        });
      }
      
      if (userMenuBackdrop) {
        userMenuBackdrop.addEventListener('click', () => {
          userMenuDropdown.classList.add('hidden');
        });
      }
      
      if (closeMenuLoggedInBtn) {
        closeMenuLoggedInBtn.addEventListener('click', () => {
          userMenuDropdown.classList.add('hidden');
        });
      }
      
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          handleLogout();
        });
      }
    
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
          setActiveTab(btn.dataset.tab);
        });
      });

      const captureForm = document.getElementById('capture-form');
      const captureStatus = document.getElementById('capture-status');
      if (captureForm && captureStatus) {
        captureForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const site = document.getElementById('site-name').value.trim();
          const date = document.getElementById('date').value || new Date().toISOString();
          const foreman = document.getElementById('foreman-name').value.trim();
          const crewSize = document.getElementById('crew-size').value;
          const workDone = document.getElementById('work-done').value.trim();
          const employeeNotes = document.getElementById('employee-notes').value.trim();

          if (!site && !workDone) {
            captureStatus.textContent = '⚠️ Add at least a site name or work description';
            captureStatus.className = 'text-xs text-center text-brandPink pt-1 font-semibold';
            return;
          }

          captureEntries.push({
            site,
            date,
            foreman,
            crew: crewSize || 0,
            work: workDone,
            employees: employeeNotes,
            createdAt: new Date().toISOString()
          });

          saveToLocalStorage(STORAGE_KEYS.CAPTURE_ENTRIES, captureEntries);

          captureForm.reset();
          captureStatus.textContent = '✅ Entry saved successfully!';
          captureStatus.className = 'text-xs text-center text-brandTeal pt-1 font-semibold';

          renderCaptureEntries();
          updateSummary();

          setTimeout(() => {
            captureStatus.textContent = 'Ready to capture';
            captureStatus.className = 'text-xs text-center text-gray-500 pt-1';
          }, 2000);
        });
      }

      const todoForm = document.getElementById('todo-form');
      const todoInput = document.getElementById('todo-input');
      const todoSiteSelect = document.getElementById('todo-site-select');
      if (todoForm && todoInput && todoSiteSelect) {
        todoForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const text = todoInput.value.trim();
          const site = todoSiteSelect.value;
          if (!text) return;
          if (!site) {
            showToast('Please select a site for this task');
            return;
          }
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          todoItems.push({
            id,
            text,
            site,
            completed: false,
            createdAt: new Date()
          });
          saveToLocalStorage(STORAGE_KEYS.TODO_ITEMS, todoItems);
          todoInput.value = '';
          todoSiteSelect.value = '';
          renderTodos();
          showToast(`Task added to ${site}`);
        });
      }

      const todoList = document.getElementById('todo-list');
      if (todoList) {
        todoList.addEventListener('change', (e) => {
          const checkbox = e.target;
          if (!checkbox.classList.contains('todo-checkbox')) return;
          const li = checkbox.closest('li');
          if (!li) return;
          const id = li.dataset.id;
          const item = todoItems.find(t => t.id === id);
          if (item) {
            item.completed = checkbox.checked;
            saveToLocalStorage(STORAGE_KEYS.TODO_ITEMS, todoItems);
            renderTodos();
          }
        });

        todoList.addEventListener('click', (e) => {
          const btn = e.target.closest('.todo-delete');
          if (!btn) return;
          const li = btn.closest('li');
          if (!li) return;
          const id = li.dataset.id;
          todoItems = todoItems.filter(t => t.id !== id);
          saveToLocalStorage(STORAGE_KEYS.TODO_ITEMS, todoItems);
          renderTodos();
        });
      }

      const clearCompletedBtn = document.getElementById('todo-clear-completed');
      if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', () => {
          todoItems = todoItems.filter(t => !t.completed);
          saveToLocalStorage(STORAGE_KEYS.TODO_ITEMS, todoItems);
          renderTodos();
        });
      }

      const todoSiteFilterButtons = document.querySelectorAll('.todo-site-filter-btn');
      todoSiteFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          currentTodoSiteFilter = btn.dataset.site;
          todoSiteFilterButtons.forEach(b => {
            if (b === btn) {
              b.className = 'todo-site-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-200 text-gray-700 flex-shrink-0';
            } else {
              b.className = 'todo-site-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 flex-shrink-0';
            }
          });
          renderTodos();
        });
      });

      const issuesForm = document.getElementById('issues-form');
      const issuesStatus = document.getElementById('issues-status');
      if (issuesForm && issuesStatus) {
        issuesForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const site = document.getElementById('issue-site').value.trim();
          const priority = document.getElementById('issue-priority').value;
          const title = document.getElementById('issue-title').value.trim();
          const description = document.getElementById('issue-description').value.trim();
          const reporter = document.getElementById('issue-reporter').value.trim();

          if (!title || !description) {
            issuesStatus.textContent = '⚠️ Please provide a title and description';
            issuesStatus.className = 'text-xs text-center text-red-500 pt-1 font-semibold';
            return;
          }

          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          issueItems.push({
            id,
            site: site || 'Unspecified Site',
            priority,
            title,
            description,
            reporter: reporter || 'Anonymous',
            date: new Date(),
            status: 'open'
          });

          saveToLocalStorage(STORAGE_KEYS.ISSUE_ITEMS, issueItems);

          issuesForm.reset();
          issuesStatus.textContent = '✅ Issue reported successfully!';
          issuesStatus.className = 'text-xs text-center text-green-600 pt-1 font-semibold';

          renderIssues();

          setTimeout(() => {
            issuesStatus.textContent = 'Ready to report';
            issuesStatus.className = 'text-xs text-center text-gray-500 pt-1';
          }, 2000);
        });
      }

      const filterButtons = document.querySelectorAll('.issue-filter-btn');
      filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          currentIssueFilter = btn.dataset.filter;
          filterButtons.forEach(b => {
            if (b === btn) {
              b.className = 'issue-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-200 text-gray-700';
            } else {
              b.className = 'issue-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-500';
            }
          });
          renderIssues();
        });
      });

      const issuesList = document.getElementById('issues-list');
      if (issuesList) {
        issuesList.addEventListener('click', (e) => {
          const btn = e.target.closest('.issue-resolve');
          if (!btn) return;
          const li = btn.closest('li');
          if (!li) return;
          const id = li.dataset.id;
          const issue = issueItems.find(i => i.id === id);
          if (issue) {
            issue.status = 'resolved';
            saveToLocalStorage(STORAGE_KEYS.ISSUE_ITEMS, issueItems);
            renderIssues();
            showToast('Issue marked as resolved');
          }
        });
      }

      const siteSearchForm = document.getElementById('site-search-form');
      const siteSearchInput = document.getElementById('site-search');
      if (siteSearchForm && siteSearchInput) {
        siteSearchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          renderSites(siteSearchInput.value);
        });
        siteSearchInput.addEventListener('input', () => {
          renderSites(siteSearchInput.value);
        });
      }

      const useLocationBtn = document.getElementById('site-use-location');
      if (useLocationBtn) {
        useLocationBtn.addEventListener('click', () => {
          sites.sort((a, b) => a.distanceKm - b.distanceKm);
          renderSites(siteSearchInput ? siteSearchInput.value : '');
          showToast('Sorted by distance');
        });
      }

      const addSiteBtn = document.getElementById('add-site-btn');
      const addSiteFormContainer = document.getElementById('add-site-form-container');
      const cancelAddSiteBtn = document.getElementById('cancel-add-site-btn');
      
      if (addSiteBtn && addSiteFormContainer) {
        addSiteBtn.addEventListener('click', () => {
          addSiteFormContainer.classList.remove('hidden');
          addSiteFormContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }

      if (cancelAddSiteBtn && addSiteFormContainer) {
        cancelAddSiteBtn.addEventListener('click', () => {
          addSiteFormContainer.classList.add('hidden');
          document.getElementById('add-site-form').reset();
        });
      }

      const addSiteForm = document.getElementById('add-site-form');
      if (addSiteForm) {
        addSiteForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const name = document.getElementById('new-site-name').value.trim();
          const city = document.getElementById('new-site-city').value.trim();
          const status = document.getElementById('new-site-status').value.trim();
          const crew = parseInt(document.getElementById('new-site-crew').value) || 0;
          const distance = parseFloat(document.getElementById('new-site-distance').value) || 0;
          const colorInput = document.querySelector('input[name="site-color"]:checked');
          const color = colorInput ? colorInput.value : 'brandAccent';

          const newSite = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name,
            city,
            distanceKm: distance,
            status,
            crew,
            color
          };

          sites.push(newSite);
          saveToLocalStorage(STORAGE_KEYS.SITES, sites);
          addSiteForm.reset();
          addSiteFormContainer.classList.add('hidden');
          renderSites(siteSearchInput ? siteSearchInput.value : '');
          updateSiteDropdowns();
          updateSummary();
          showToast(`${name} added successfully!`);
        });
      }

      const sitesAccordion = document.getElementById('sites-accordion');
      if (sitesAccordion) {
        sitesAccordion.addEventListener('click', (e) => {
          const deleteBtn = e.target.closest('.delete-site-btn');
          if (deleteBtn) {
            const siteId = deleteBtn.dataset.siteId;
            const site = sites.find(s => s.id === siteId);
            if (!site) return;

            const confirmMsg = document.createElement('div');
            confirmMsg.className = 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 card-modern rounded-3xl bg-white border-2 border-red-200 p-6 shadow-2xl max-w-sm';
            confirmMsg.innerHTML = `
              <div class="text-center">
                <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h4 class="text-lg font-bold text-gray-900 mb-2">Delete Site?</h4>
                <p class="text-sm text-gray-600 mb-6">Are you sure you want to delete <strong>${site.name}</strong>? This will also delete all progress reports for this site.</p>
                <div class="flex gap-3">
                  <button
                    id="confirm-delete-site"
                    type="button"
                    class="flex-1 rounded-2xl bg-red-500 hover:bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg btn-press"
                  >
                    Delete
                  </button>
                  <button
                    id="cancel-delete-site"
                    type="button"
                    class="flex-1 rounded-2xl bg-gray-200 hover:bg-gray-300 px-4 py-3 text-sm font-bold text-gray-700 btn-press"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            `;

            const backdrop = document.createElement('div');
            backdrop.className = 'fixed inset-0 bg-black/50 z-40';
            
            document.body.appendChild(backdrop);
            document.body.appendChild(confirmMsg);

            const confirmBtn = document.getElementById('confirm-delete-site');
            const cancelBtn = document.getElementById('cancel-delete-site');

            const cleanup = () => {
              backdrop.remove();
              confirmMsg.remove();
            };

            confirmBtn.addEventListener('click', () => {
              const index = sites.findIndex(s => s.id === siteId);
              if (index !== -1) {
                sites.splice(index, 1);
              }

              progressReports = progressReports.filter(r => r.site_id !== siteId);

              todoItems = todoItems.filter(t => t.site !== site.name);

              issueItems = issueItems.filter(i => i.site !== site.name);

              if (currentSiteView && currentSiteView.id === siteId) {
                currentSiteView = null;
              }

              saveToLocalStorage(STORAGE_KEYS.SITES, sites);
              saveToLocalStorage(STORAGE_KEYS.PROGRESS_REPORTS, progressReports);
              saveToLocalStorage(STORAGE_KEYS.TODO_ITEMS, todoItems);
              saveToLocalStorage(STORAGE_KEYS.ISSUE_ITEMS, issueItems);

              cleanup();
              renderSites(siteSearchInput ? siteSearchInput.value : '');
              updateSiteDropdowns();
              renderTodos();
              renderIssues();
              updateSummary();
              showToast(`${site.name} deleted`);
            });

            cancelBtn.addEventListener('click', cleanup);
            backdrop.addEventListener('click', cleanup);

            return;
          }
        });

        sitesAccordion.addEventListener('click', (e) => {
          const header = e.target.closest('.site-accordion-header');
          if (!header) return;
          
          const siteId = header.dataset.siteId;
          const site = sites.find(s => s.id === siteId);
          if (!site) return;

          const content = document.querySelector(`.site-accordion-content[data-site-id="${siteId}"]`);
          const chevron = header.querySelector('svg:last-child');
          
          if (content.classList.contains('hidden')) {
            document.querySelectorAll('.site-accordion-content').forEach(c => c.classList.add('hidden'));
            document.querySelectorAll('.site-accordion-header svg:last-child').forEach(ch => ch.classList.remove('rotate-180'));
            
            content.classList.remove('hidden');
            chevron.classList.add('rotate-180');
            currentSiteView = site;
            renderProgressReports();
            
            setTimeout(() => {
              content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
          } else {
            content.classList.add('hidden');
            chevron.classList.remove('rotate-180');
            currentSiteView = null;
          }
        });

        sitesAccordion.addEventListener('click', (e) => {
          const btn = e.target.closest('.add-report-btn');
          if (!btn) return;
          
          const siteId = btn.dataset.siteId;
          const formContainer = document.querySelector(`.report-form-container[data-site-id="${siteId}"]`);
          if (formContainer) {
            formContainer.classList.remove('hidden');
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        sitesAccordion.addEventListener('click', (e) => {
          const btn = e.target.closest('.cancel-report-btn');
          if (!btn) return;
          
          const siteId = btn.dataset.siteId;
          const formContainer = document.querySelector(`.report-form-container[data-site-id="${siteId}"]`);
          const form = formContainer?.querySelector('.progress-report-form');
          if (formContainer && form) {
            formContainer.classList.add('hidden');
            form.reset();
          }
        });

        sitesAccordion.addEventListener('submit', async (e) => {
          const form = e.target.closest('.progress-report-form');
          if (!form) return;
          
          e.preventDefault();
          
          if (!currentSiteView) return;
          if (progressReports.length >= 999) {
            showToast('Maximum limit of 999 reports reached');
            return;
          }

          const submitBtn = form.querySelector('.submit-report-btn');
          const submitText = form.querySelector('.submit-text');
          
          submitBtn.disabled = true;
          submitText.textContent = 'Saving...';

          const formData = new FormData(form);
          const reportData = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            site_id: currentSiteView.id,
            site_name: currentSiteView.name,
            week_start: formData.get('week_start'),
            week_end: formData.get('week_end'),
            foreman_name: formData.get('foreman_name').trim(),
            progress_summary: formData.get('progress_summary').trim(),
            completed_tasks: formData.get('completed_tasks').trim(),
            upcoming_tasks: formData.get('upcoming_tasks').trim(),
            crew_size: parseInt(formData.get('crew_size')) || 0,
            hours_worked: parseFloat(formData.get('hours_worked')) || 0,
            created_at: new Date().toISOString()
          };

          if (window.dataSdk) {
            const result = await window.dataSdk.create(reportData);
            if (result.isOk) {
              form.reset();
              form.closest('.report-form-container').classList.add('hidden');
              showToast('Report saved successfully!');
            } else {
              showToast('Error saving report. Please try again.');
              console.error('Failed to save report:', result.error);
            }
          } else {
            progressReports.push(reportData);
            saveToLocalStorage(STORAGE_KEYS.PROGRESS_REPORTS, progressReports);
            form.reset();
            form.closest('.report-form-container').classList.add('hidden');
            renderProgressReports();
            showToast('Report saved successfully!');
          }

          submitBtn.disabled = false;
          submitText.textContent = 'Save Report';
        });
      }
    }

    let toastTimeout;
    function showToast(message) {
      let toast = document.getElementById('demo-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'demo-toast';
        toast.className = 'fixed left-1/2 bottom-24 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm font-bold shadow-2xl border border-white/10';
        toast.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 10px)';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      
      setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, 0)';
      }, 10);

      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 10px)';
      }, 2500);
    }

    async function setupDataSdk() {
      if (!window.dataSdk) {
        return;
      }

      const dataHandler = {
        onDataChanged(data) {
          progressReports = data;
          if (currentSiteView) {
            renderProgressReports();
          }
        }
      };

      const result = await window.dataSdk.init(dataHandler);
      if (!result.isOk) {
        console.error('Failed to initialize Data SDK:', result.error);
      }
    }

    async function registerServiceWorker() {
      if (!('serviceWorker' in navigator)) {
        return;
      }

      try {
        const swCode = `
          const CACHE_NAME = 'construction-sidekick-v1';
          const urlsToCache = ['/'];

          self.addEventListener('install', (event) => {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
            );
            self.skipWaiting();
          });

          self.addEventListener('fetch', (event) => {
            event.respondWith(
              caches.match(event.request).then((response) => {
                return response || fetch(event.request);
              })
            );
          });

          self.addEventListener('activate', (event) => {
            event.waitUntil(
              caches.keys().then((cacheNames) => {
                return Promise.all(
                  cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                      return caches.delete(cacheName);
                    }
                  })
                );
              })
            );
            self.clients.claim();
          });
        `;

        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        const registration = await navigator.serviceWorker.register(swUrl);
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }

    let deferredPrompt;

    function setupPWAInstall() {
      const installBanner = document.getElementById('pwa-install-banner');
      const installBtn = document.getElementById('pwa-install-btn');
      const laterBtn = document.getElementById('pwa-install-later');
      const closeBtn = document.getElementById('pwa-install-close');

      if (!installBanner || !installBtn) return;

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        setTimeout(() => {
          installBanner.classList.remove('hidden');
          installBanner.classList.add('scale-fade');
        }, 2000);
      });

      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          showToast('App installed successfully!');
        }
        
        deferredPrompt = null;
        installBanner.classList.add('hidden');
      });

      if (laterBtn) {
        laterBtn.addEventListener('click', () => {
          installBanner.classList.add('hidden');
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          installBanner.classList.add('hidden');
        });
      }

      window.addEventListener('appinstalled', () => {
        installBanner.classList.add('hidden');
        showToast('Construction Sidekick installed!');
      });
    }

    (async function init() {
      if (currentUser) {
        updateAuthUI();
        showMainApp();
      } else {
        showSplashScreen();
      }
      
      const dateEl = document.getElementById('current-date');
      const timeEl = document.getElementById('current-time');
      if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
      }
      if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }

      bindEvents();
      renderCaptureEntries();
      renderTodos();
      renderIssues();
      renderSites('');
      updateSiteDropdowns();
      updateSummary();
      await setupDataSdk();
      await setupElementSdk();
      await registerServiceWorker();
      setupPWAInstall();
      
      isAppReady = true;
    })();