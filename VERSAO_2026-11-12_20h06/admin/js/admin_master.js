/**
 * Super Admin Master Panel Controller - RDO Engenharia CMPC
 * Gestão Centralizada de Empresas, Usuários, RDOs e Nuvem
 */

const superAdmin = {
  activeTab: 'dashboard',
  editingCompanyId: null,
  editingUserId: null,
  currentCompanyLogoBase64: '',

  init() {
    this.initTheme();
    this.bindEvents();
    this.checkAuth();
    this.updateCloudStatus();
    
    // Inicia presença e atualiza dados
    if (typeof StorageService !== 'undefined') {
      StorageService.init();
    }
  },

  // ==========================================================================
  // THEME MANAGEMENT (CLARO / ESCURO)
  // ==========================================================================
  initTheme() {
    const savedTheme = localStorage.getItem('cmpc_admin_theme') || 'dark';
    this.applyTheme(savedTheme);
  },

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('cmpc_admin_theme', theme);

    // Atualiza botões de alternância de tema
    const icons = document.querySelectorAll('.theme-toggle-icon');
    const labels = document.querySelectorAll('.theme-toggle-label');

    icons.forEach(el => {
      el.textContent = theme === 'light' ? '🌙' : '☀️';
    });
    labels.forEach(el => {
      el.textContent = theme === 'light' ? 'Modo Escuro' : 'Modo Claro';
    });
  },

  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(nextTheme);
    this.showToast(`Tema ${nextTheme === 'light' ? 'Claro' : 'Escuro'} ativado.`, 'info');
  },

  // ==========================================================================
  // AUTHENTICATION & ACCESS CONTROL
  // ==========================================================================
  checkAuth() {
    const session = StorageService.getSession();
    const isMaster = session && (
      session.isSuperAdmin || 
      session.role === 'SuperAdmin' || 
      (session.email && session.email.toLowerCase() === 'engelmobile2020@gmail.com')
    );

    if (isMaster) {
      document.getElementById('view-auth').classList.add('hidden');
      document.getElementById('view-app').classList.remove('hidden');
      
      const userEl = document.getElementById('sidebar-user-name');
      if (userEl) userEl.textContent = session.name || 'Administrador Master';
      
      this.refreshAllData();
    } else {
      document.getElementById('view-auth').classList.remove('hidden');
      document.getElementById('view-app').classList.add('hidden');
    }
  },

  login(e) {
    if (e) e.preventDefault();
    const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
    const password = (document.getElementById('login-password').value || '').trim();

    const users = StorageService.getUsers();
    let user = users.find(u => (u.email || '').trim().toLowerCase() === email && String(u.password || '').trim() === password);

    // Master fallback garantido
    if (!user && email === 'engelmobile2020@gmail.com' && password === '789512') {
      user = {
        id: 'user-admin-master',
        name: 'Administrador Master',
        email: 'engelmobile2020@gmail.com',
        role: 'Admin',
        isSuperAdmin: true
      };
      StorageService.initLocalDefaults();
    }

    if (!user) {
      this.showToast('Credenciais incorretas. Verifique seu e-mail e senha.', 'error');
      return;
    }

    // Apenas Super Admin ou Master Admin pode acessar este painel geral
    const isAuthorized = user.isSuperAdmin || user.role === 'SuperAdmin' || (user.email.toLowerCase() === 'engelmobile2020@gmail.com');
    if (!isAuthorized) {
      this.showToast('Acesso negado: Este painel é exclusivo para o Administrador Geral da Plataforma.', 'error');
      return;
    }

    StorageService.setSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'SuperAdmin',
      isSuperAdmin: true,
      companyId: user.companyId || null,
      companyName: user.companyName || null
    });

    this.showToast(`Bem-vindo ao Painel Master, ${user.name}!`, 'success');
    this.checkAuth();
  },

  logout() {
    if (confirm('Deseja realmente sair do Painel Master?')) {
      StorageService.clearSession();
      this.showToast('Sessão encerrada.', 'info');
      this.checkAuth();
    }
  },

  toggleLoginPassword() {
    const input = document.getElementById('login-password');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  // ==========================================================================
  // NAVIGATION & TABS
  // ==========================================================================
  showTab(tabName) {
    this.activeTab = tabName;
    
    // Atualiza classes dos botões da sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
    });

    // Atualiza painéis visíveis
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('hidden', pane.id !== `tab-${tabName}`);
    });

    // Atualiza título da Topbar
    const titleEl = document.getElementById('topbar-page-title');
    const titles = {
      dashboard: 'Visão Geral & Métricas da Plataforma',
      companies: 'Gestão Central de Empresas & Clientes',
      users: 'Gestão Global de Usuários & Logins',
      rdos: 'Visão Geral de Todos os RDOs',
      settings: 'Configurações do Sistema & Nuvem',
      backup: 'Backup & Restauração Geral'
    };
    if (titleEl) titleEl.textContent = titles[tabName] || 'Painel Master';

    // Dispara renders específicos
    if (tabName === 'dashboard') this.renderDashboard();
    if (tabName === 'companies') this.renderCompanies();
    if (tabName === 'users') this.renderUsers();
    if (tabName === 'rdos') this.renderRDOList();
    if (tabName === 'settings') this.renderSettings();
  },

  refreshAllData() {
    this.renderDashboard();
    this.renderCompanies();
    this.renderUsers();
    this.renderRDOList();
  },

  // ==========================================================================
  // DASHBOARD METRICS
  // ==========================================================================
  renderDashboard() {
    const companies = StorageService.getCompanies();
    const users = StorageService.getUsers();
    const rdos = StorageService.getRecords();

    const activeCompanies = companies.filter(c => c.status !== 'inactive').length;
    const totalHH = rdos.reduce((acc, r) => acc + (Number(r.totalHH) || 0), 0);

    const elComp = document.getElementById('stat-companies-count');
    const elUsers = document.getElementById('stat-users-count');
    const elRDOs = document.getElementById('stat-rdos-count');
    const elHH = document.getElementById('stat-hh-count');

    if (elComp) elComp.textContent = activeCompanies;
    if (elUsers) elUsers.textContent = users.length;
    if (elRDOs) elRDOs.textContent = rdos.length;
    if (elHH) elHH.textContent = totalHH + ' HH';

    // Renderiza lista recente de empresas no Dashboard
    const recentCompaniesTbody = document.getElementById('recent-companies-tbody');
    if (recentCompaniesTbody) {
      if (companies.length === 0) {
        recentCompaniesTbody.innerHTML = `<tr><td colspan="4" class="table-empty-state">Nenhuma empresa cadastrada ainda.</td></tr>`;
      } else {
        recentCompaniesTbody.innerHTML = companies.slice(0, 5).map(c => `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${c.logo ? `<img src="${c.logo}" style="width: 32px; height: 24px; object-fit: contain; background: #fff; border-radius: 4px; padding: 2px;">` : `<div style="width: 32px; height: 24px; background: rgba(255,255,255,0.06); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px;">🏢</div>`}
                <strong>${this.escapeHtml(c.name || 'Sem nome')}</strong>
              </div>
            </td>
            <td><code>${this.escapeHtml(c.cnpj || '-')}</code></td>
            <td>${this.escapeHtml(c.contract || '-')}</td>
            <td><span class="badge ${c.status === 'inactive' ? 'badge-inactive' : 'badge-active'}">${c.status === 'inactive' ? 'Inativa' : 'Ativa'}</span></td>
          </tr>
        `).join('');
      }
    }
  },

  // ==========================================================================
  // CRUD EMPRESAS
  // ==========================================================================
  renderCompanies() {
    const tbody = document.getElementById('companies-tbody');
    if (!tbody) return;

    const search = (document.getElementById('filter-company-search')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filter-company-status')?.value || 'all';

    let list = StorageService.getCompanies();
    const allUsers = StorageService.getUsers();

    if (search) {
      list = list.filter(c => 
        (c.name || '').toLowerCase().includes(search) || 
        (c.cnpj || '').toLowerCase().includes(search) || 
        (c.contract || '').toLowerCase().includes(search) ||
        (c.responsible || '').toLowerCase().includes(search)
      );
    }

    if (status !== 'all') {
      list = list.filter(c => (c.status || 'active') === status);
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty-state">Nenhuma empresa encontrada com os filtros aplicados.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const userCount = allUsers.filter(u => u.companyId === c.id).length;
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              ${c.logo ? `<img src="${c.logo}" class="logo-preview-img" style="width: 44px; height: 32px;">` : `<div style="width: 44px; height: 32px; background: rgba(255,255,255,0.05); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">🏢</div>`}
              <div>
                <strong style="color: #fff; font-size: 0.95rem;">${this.escapeHtml(c.name || '-')}</strong>
                ${c.tradeName ? `<div style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(c.tradeName)}</div>` : ''}
              </div>
            </div>
          </td>
          <td><code>${this.escapeHtml(c.cnpj || '-')}</code></td>
          <td>${this.escapeHtml(c.contract || '-')}</td>
          <td>${this.escapeHtml(c.responsible || '-')}</td>
          <td><span class="badge badge-admin">${userCount} usuário(s)</span></td>
          <td>
            <span class="badge ${c.status === 'inactive' ? 'badge-inactive' : 'badge-active'}" style="cursor: pointer;" onclick="superAdmin.toggleCompanyStatus('${c.id}')" title="Clique para alterar status">
              ${c.status === 'inactive' ? 'Inativa' : 'Ativa'}
            </span>
          </td>
          <td>
            <button class="btn-icon-action edit" onclick="superAdmin.openCompanyModal('${c.id}')" title="Editar Empresa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn-icon-action delete" onclick="superAdmin.deleteCompany('${c.id}')" title="Excluir Empresa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openCompanyModal(id = null) {
    this.editingCompanyId = id;
    const modal = document.getElementById('modal-company');
    const titleEl = document.getElementById('modal-company-title');
    const previewEl = document.getElementById('company-logo-preview');

    if (id) {
      const company = StorageService.getCompanyById(id);
      if (!company) return;
      if (titleEl) titleEl.textContent = 'Editar Empresa';
      
      document.getElementById('company-name').value = company.name || '';
      document.getElementById('company-trade-name').value = company.tradeName || '';
      document.getElementById('company-cnpj').value = company.cnpj || '';
      document.getElementById('company-contract').value = company.contract || '';
      document.getElementById('company-client').value = company.client || '';
      document.getElementById('company-contractor').value = company.contractor || '';
      document.getElementById('company-responsible').value = company.responsible || '';
      document.getElementById('company-email').value = company.email || '';
      document.getElementById('company-phone').value = company.phone || '';
      document.getElementById('company-status').value = company.status || 'active';
      document.getElementById('company-max-users').value = company.maxUsers || 10;
      document.getElementById('company-notes').value = company.notes || '';
      
      this.currentCompanyLogoBase64 = company.logo || '';
      if (previewEl) {
        if (company.logo) {
          previewEl.src = company.logo;
          previewEl.classList.remove('hidden');
        } else {
          previewEl.classList.add('hidden');
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Cadastrar Nova Empresa';
      document.getElementById('form-company').reset();
      this.currentCompanyLogoBase64 = '';
      if (previewEl) previewEl.classList.add('hidden');
    }

    if (modal) modal.classList.remove('hidden');
  },

  closeCompanyModal() {
    const modal = document.getElementById('modal-company');
    if (modal) modal.classList.add('hidden');
    this.editingCompanyId = null;
    this.currentCompanyLogoBase64 = '';
  },

  handleCompanyLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.currentCompanyLogoBase64 = event.target.result;
      const previewEl = document.getElementById('company-logo-preview');
      if (previewEl) {
        previewEl.src = this.currentCompanyLogoBase64;
        previewEl.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  },

  saveCompany(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('company-name').value.trim();
    if (!name) {
      this.showToast('Por favor, informe a Razão Social ou Nome da Empresa.', 'error');
      return;
    }

    const payload = {
      name,
      tradeName: document.getElementById('company-trade-name').value.trim(),
      cnpj: document.getElementById('company-cnpj').value.trim(),
      contract: document.getElementById('company-contract').value.trim(),
      client: document.getElementById('company-client').value.trim(),
      contractor: document.getElementById('company-contractor').value.trim(),
      responsible: document.getElementById('company-responsible').value.trim(),
      email: document.getElementById('company-email').value.trim(),
      phone: document.getElementById('company-phone').value.trim(),
      status: document.getElementById('company-status').value,
      maxUsers: parseInt(document.getElementById('company-max-users').value, 10) || 10,
      notes: document.getElementById('company-notes').value.trim(),
      logo: this.currentCompanyLogoBase64
    };

    if (this.editingCompanyId) {
      StorageService.updateCompany(this.editingCompanyId, payload);
      this.showToast(`Empresa "${name}" atualizada com sucesso!`, 'success');
    } else {
      StorageService.addCompany(payload);
      this.showToast(`Empresa "${name}" cadastrada com sucesso!`, 'success');
    }

    this.closeCompanyModal();
    this.renderCompanies();
    this.renderDashboard();
  },

  toggleCompanyStatus(id) {
    const company = StorageService.getCompanyById(id);
    if (!company) return;
    const newStatus = company.status === 'inactive' ? 'active' : 'inactive';
    StorageService.updateCompany(id, { status: newStatus });
    this.showToast(`Status da empresa alterado para ${newStatus === 'active' ? 'Ativa' : 'Inativa'}.`, 'info');
    this.renderCompanies();
    this.renderDashboard();
  },

  deleteCompany(id) {
    const company = StorageService.getCompanyById(id);
    if (!company) return;

    if (confirm(`Deseja realmente excluir permanentemente a empresa "${company.name}"? Atenção: isso não exclui automaticamente os usuários vinculados a ela.`)) {
      StorageService.deleteCompany(id);
      this.showToast(`Empresa "${company.name}" excluída com sucesso.`, 'info');
      this.renderCompanies();
      this.renderDashboard();
    }
  },

  // ==========================================================================
  // CRUD USUÁRIOS
  // ==========================================================================
  renderUsers() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    const search = (document.getElementById('filter-user-search')?.value || '').toLowerCase().trim();
    const companyFilter = document.getElementById('filter-user-company')?.value || 'all';
    const roleFilter = document.getElementById('filter-user-role')?.value || 'all';

    let users = StorageService.getUsers();
    const companies = StorageService.getCompanies();

    // Atualiza o filtro de empresas do select de usuários
    const companySelect = document.getElementById('filter-user-company');
    if (companySelect && companySelect.options.length <= 1) {
      companySelect.innerHTML = `<option value="all">Todas as Empresas</option>` + 
        companies.map(c => `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`).join('');
    }

    if (search) {
      users = users.filter(u => 
        (u.name || '').toLowerCase().includes(search) || 
        (u.email || '').toLowerCase().includes(search)
      );
    }

    if (companyFilter !== 'all') {
      users = users.filter(u => u.companyId === companyFilter);
    }

    if (roleFilter !== 'all') {
      users = users.filter(u => (u.role || '').toLowerCase() === roleFilter.toLowerCase());
    }

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty-state">Nenhum usuário encontrado com os filtros aplicados.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const company = companies.find(c => c.id === u.companyId);
      const companyName = company ? company.name : (u.companyName || 'Matriz CMPC / Geral');
      
      let roleBadgeClass = 'badge-encarregado';
      if (u.role === 'SuperAdmin' || u.isSuperAdmin) roleBadgeClass = 'badge-superadmin';
      else if (u.role === 'Admin') roleBadgeClass = 'badge-admin';
      else if (u.role === 'Engenheiro') roleBadgeClass = 'badge-engenheiro';

      const isMaster = u.email && u.email.toLowerCase() === 'engelmobile2020@gmail.com';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.78rem;">${(u.name || 'U').charAt(0).toUpperCase()}</div>
              <div>
                <strong style="color: #fff;">${this.escapeHtml(u.name || 'Sem nome')}</strong>
                ${isMaster ? `<span style="font-size: 0.7rem; color: #a855f7; font-weight: 700; margin-left: 6px;">[MASTER]</span>` : ''}
              </div>
            </div>
          </td>
          <td><code>${this.escapeHtml(u.email || '-')}</code></td>
          <td><span class="badge ${roleBadgeClass}">${this.escapeHtml(u.role || 'Usuário')}</span></td>
          <td><span style="color: var(--text-muted); font-size: 0.85rem;">🏢 ${this.escapeHtml(companyName)}</span></td>
          <td><span class="badge ${u.status === 'inactive' ? 'badge-inactive' : 'badge-active'}">${u.status === 'inactive' ? 'Inativo' : 'Ativo'}</span></td>
          <td>
            <button class="btn-icon-action edit" onclick="superAdmin.openUserModal('${u.id}')" title="Editar Usuário">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            ${!isMaster ? `
            <button class="btn-icon-action delete" onclick="superAdmin.deleteUser('${u.id}')" title="Excluir Usuário">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  openUserModal(id = null) {
    this.editingUserId = id;
    const modal = document.getElementById('modal-user');
    const titleEl = document.getElementById('modal-user-title');
    const companySelect = document.getElementById('user-company');

    // Popula dropdown de empresas dinamicamente
    const companies = StorageService.getCompanies();
    if (companySelect) {
      companySelect.innerHTML = `<option value="">Nenhuma / Acesso Global</option>` +
        companies.map(c => `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`).join('');
    }

    if (id) {
      const users = StorageService.getUsers();
      const user = users.find(u => u.id === id);
      if (!user) return;

      if (titleEl) titleEl.textContent = 'Editar Usuário & Acesso';
      document.getElementById('user-name').value = user.name || '';
      document.getElementById('user-email').value = user.email || '';
      document.getElementById('user-password').value = user.password || '';
      document.getElementById('user-role').value = user.role || 'Encarregado';
      document.getElementById('user-company').value = user.companyId || '';
      document.getElementById('user-status').value = user.status || 'active';
    } else {
      if (titleEl) titleEl.textContent = 'Cadastrar Novo Usuário';
      document.getElementById('form-user').reset();
      document.getElementById('user-password').value = '';
    }

    if (modal) modal.classList.remove('hidden');
  },

  closeUserModal() {
    const modal = document.getElementById('modal-user');
    if (modal) modal.classList.add('hidden');
    this.editingUserId = null;
  },

  saveUser(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim().toLowerCase();
    const password = document.getElementById('user-password').value.trim();
    const role = document.getElementById('user-role').value;
    const companyId = document.getElementById('user-company').value;
    const status = document.getElementById('user-status').value;

    if (!name || !email || !password) {
      this.showToast('Preencha Nome, E-mail e Senha.', 'error');
      return;
    }

    const companies = StorageService.getCompanies();
    const selComp = companies.find(c => c.id === companyId);
    const companyName = selComp ? selComp.name : '';

    const payload = {
      name,
      email,
      password,
      role,
      companyId: companyId || null,
      companyName: companyName || null,
      status: status || 'active',
      isSuperAdmin: role === 'SuperAdmin'
    };

    if (this.editingUserId) {
      StorageService.updateUser(this.editingUserId, payload);
      this.showToast(`Usuário "${name}" atualizado com sucesso!`, 'success');
    } else {
      // Verifica se o e-mail já existe
      const users = StorageService.getUsers();
      if (users.some(u => u.email.toLowerCase() === email)) {
        this.showToast(`O e-mail "${email}" já está cadastrado no sistema!`, 'error');
        return;
      }
      StorageService.addUser(payload);
      this.showToast(`Usuário "${name}" cadastrado com sucesso!`, 'success');
    }

    this.closeUserModal();
    this.renderUsers();
    this.renderDashboard();
  },

  deleteUser(id) {
    const users = StorageService.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (user.email && user.email.toLowerCase() === 'engelmobile2020@gmail.com') {
      this.showToast('O Administrador Master não pode ser excluído.', 'error');
      return;
    }

    if (confirm(`Deseja realmente excluir o login do usuário "${user.name}"?`)) {
      StorageService.deleteUser(id);
      this.showToast(`Usuário "${user.name}" excluído com sucesso.`, 'info');
      this.renderUsers();
      this.renderDashboard();
    }
  },

  // ==========================================================================
  // VISÃO GLOBAL DE RDOS
  // ==========================================================================
  renderRDOList() {
    const tbody = document.getElementById('rdos-tbody');
    if (!tbody) return;

    const search = (document.getElementById('filter-rdo-search')?.value || '').toLowerCase().trim();
    const companyFilter = document.getElementById('filter-rdo-company')?.value || 'all';

    let rdos = StorageService.getRecords();
    const companies = StorageService.getCompanies();

    // Atualiza filtro de empresas do select de RDOs
    const rdoCompanySelect = document.getElementById('filter-rdo-company');
    if (rdoCompanySelect && rdoCompanySelect.options.length <= 1) {
      rdoCompanySelect.innerHTML = `<option value="all">Todas as Empresas</option>` + 
        companies.map(c => `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`).join('');
    }

    if (search) {
      rdos = rdos.filter(r => 
        (r.numero || '').toLowerCase().includes(search) || 
        (r.contrato || '').toLowerCase().includes(search) || 
        (r.encarregado || '').toLowerCase().includes(search) ||
        (r.contratada || '').toLowerCase().includes(search)
      );
    }

    if (companyFilter !== 'all') {
      rdos = rdos.filter(r => r.companyId === companyFilter);
    }

    if (rdos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty-state">Nenhum RDO encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = rdos.map(r => `
      <tr>
        <td><strong>${this.escapeHtml(r.numero || '-')}</strong></td>
        <td>${this.escapeHtml(r.data ? r.data.replace('T', ' ') : '-')}</td>
        <td>🏢 ${this.escapeHtml(r.companyName || r.contratada || 'CMPC Engenharia')}</td>
        <td>${this.escapeHtml(r.contrato || '-')}</td>
        <td>${this.escapeHtml(r.encarregado || '-')}</td>
        <td><span class="badge badge-admin">${r.totalHH || 0} HH</span></td>
        <td>
          <button class="btn-icon-action delete" onclick="superAdmin.deleteRDO('${r.id}')" title="Excluir RDO do Banco">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `).join('');
  },

  deleteRDO(id) {
    const rdo = StorageService.getRecordById(id);
    if (!rdo) return;

    if (confirm(`Excluir permanentemente o Relatório RDO ${rdo.numero}?`)) {
      StorageService.deleteRecord(id);
      this.showToast(`RDO ${rdo.numero} excluído do banco.`, 'info');
      this.renderRDOList();
      this.renderDashboard();
    }
  },

  // ==========================================================================
  // CONFIGURAÇÕES & NUVEM
  // ==========================================================================
  renderSettings() {
    const brevoKey = localStorage.getItem('cmpc_brevo_key') || '';
    const brevoSender = localStorage.getItem('cmpc_brevo_sender') || '';
    const brevoSenderName = localStorage.getItem('cmpc_brevo_sender_name') || '';

    const keyEl = document.getElementById('cfg-brevo-key');
    const senderEl = document.getElementById('cfg-brevo-sender');
    const nameEl = document.getElementById('cfg-brevo-sender-name');

    if (keyEl) keyEl.value = brevoKey;
    if (senderEl) senderEl.value = brevoSender;
    if (nameEl) nameEl.value = brevoSenderName;
  },

  saveSettings(e) {
    if (e) e.preventDefault();
    const apiKey = document.getElementById('cfg-brevo-key')?.value.trim() || '';
    const senderEmail = document.getElementById('cfg-brevo-sender')?.value.trim() || '';
    const senderName = document.getElementById('cfg-brevo-sender-name')?.value.trim() || '';

    localStorage.setItem('cmpc_brevo_key', apiKey);
    localStorage.setItem('cmpc_brevo_sender', senderEmail);
    localStorage.setItem('cmpc_brevo_sender_name', senderName);

    if (typeof db !== 'undefined' && db) {
      db.collection('settings').doc('brevo').set({
        apiKey,
        senderEmail,
        senderName,
        updatedAt: new Date().toISOString()
      }, { merge: true })
        .then(() => console.log('Configurações Brevo salvas no Firestore'))
        .catch(err => console.warn('Erro ao salvar Brevo Firestore:', err));
    }

    this.showToast('Configurações salvas com sucesso!', 'success');
  },

  updateCloudStatus() {
    const pill = document.getElementById('topbar-cloud-pill');
    const textEl = document.getElementById('cloud-status-text');
    if (typeof isFirebaseConnected !== 'undefined' && isFirebaseConnected) {
      if (pill) pill.className = 'cloud-pill';
      if (textEl) textEl.textContent = 'Firebase Conectado';
    } else {
      if (pill) pill.className = 'cloud-pill';
      if (textEl) textEl.textContent = 'Modo Local / Offline';
    }
  },

  // ==========================================================================
  // BACKUP & RESTAURAÇÃO COMPLETA
  // ==========================================================================
  exportFullBackup() {
    const backupData = {
      system: 'RDO Engenharia CMPC - Plataforma Master',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      companies: StorageService.getCompanies(),
      users: StorageService.getUsers(),
      rdos: StorageService.getRecords(),
      settings: {
        brevoKey: localStorage.getItem('cmpc_brevo_key') || '',
        brevoSender: localStorage.getItem('cmpc_brevo_sender') || '',
        brevoSenderName: localStorage.getItem('cmpc_brevo_sender_name') || ''
      }
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_master_rdo_cmpc_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Backup completo baixado com sucesso!', 'success');
  },

  importFullBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: A restauração substituirá os dados atuais pelo conteúdo do arquivo de backup. Deseja prosseguir?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.companies && Array.isArray(data.companies)) {
          StorageService.saveCompanies(data.companies);
        }
        if (data.users && Array.isArray(data.users)) {
          StorageService.saveUsers(data.users);
        }
        const rdoList = Array.isArray(data.rdos) ? data.rdos : (Array.isArray(data.records) ? data.records : null);
        if (rdoList) {
          StorageService.saveRecords(rdoList);
        }
        if (data.settings) {
          if (data.settings.brevoKey) localStorage.setItem('cmpc_brevo_key', data.settings.brevoKey);
          if (data.settings.brevoSender) localStorage.setItem('cmpc_brevo_sender', data.settings.brevoSender);
          if (data.settings.brevoSenderName) localStorage.setItem('cmpc_brevo_sender_name', data.settings.brevoSenderName);
        }

        this.showToast('Dados restaurados com sucesso!', 'success');
        this.refreshAllData();
      } catch (err) {
        this.showToast('Erro ao ler arquivo de backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = `ℹ️`;
    if (type === 'success') icon = `✅`;
    if (type === 'error') icon = `⚠️`;

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  bindEvents() {
    // Form Login
    const formLogin = document.getElementById('form-superadmin-login');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => this.login(e));
    }

    // Form Company
    const formCompany = document.getElementById('form-company');
    if (formCompany) {
      formCompany.addEventListener('submit', (e) => this.saveCompany(e));
    }

    // Form User
    const formUser = document.getElementById('form-user');
    if (formUser) {
      formUser.addEventListener('submit', (e) => this.saveUser(e));
    }

    // Form Settings
    const formSettings = document.getElementById('form-settings');
    if (formSettings) {
      formSettings.addEventListener('submit', (e) => this.saveSettings(e));
    }
  }
};

// Auto inicialização
document.addEventListener('DOMContentLoaded', () => {
  superAdmin.init();
});
