/**
 * User Panel & Admin Management Module
 * Allows every user to manage their own profile, custom logo, view stats, and (for admins) manage team users.
 */

const admin = {
  renderPanel() {
    const session = StorageService.getSession();
    if (!session) return;

    // 1. Update Titles
    const titleEl = document.getElementById('admin-panel-title');
    const subEl = document.getElementById('admin-panel-subtitle');
    const navAdminText = document.getElementById('nav-admin-text');

    if (session.role === 'Admin') {
      if (titleEl) titleEl.textContent = 'Painel do Administrador & Equipe';
      if (subEl) subEl.textContent = 'Gerencie seu perfil, logotipo da empresa e os usuários cadastrados no sistema.';
      if (navAdminText) navAdminText.textContent = 'Painel Admin';
    } else {
      if (titleEl) titleEl.textContent = `Meu Painel (${session.name})`;
      if (subEl) subEl.textContent = 'Gerencie seus dados de acesso, senha e logotipo padrão da sua empresa.';
      if (navAdminText) navAdminText.textContent = 'Meu Painel';
    }

    // 2. Calculate User Metrics
    const allRecords = StorageService.getRecords();
    const myRecords = allRecords.filter(r => {
      return r.userId === session.id ||
             r.createdBy === session.email ||
             (!r.userId && r.encarregado && r.encarregado.toLowerCase() === session.name.toLowerCase());
    });

    let totalHH = 0;
    myRecords.forEach(r => {
      totalHH += parseFloat(r.totalHH) || 0;
    });

    const statRdos = document.getElementById('user-stat-rdos');
    const statHH = document.getElementById('user-stat-hh');
    const statRole = document.getElementById('user-stat-role');

    if (statRdos) statRdos.textContent = myRecords.length;
    if (statHH) statHH.textContent = (totalHH % 1 === 0 ? totalHH : totalHH.toFixed(1)) + ' HH';
    if (statRole) statRole.textContent = session.role;

    // 3. Fill Profile Form
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const pwdInput = document.getElementById('profile-password');

    if (nameInput) nameInput.value = session.name || '';
    if (emailInput) emailInput.value = session.email || '';
    if (pwdInput) pwdInput.value = '';

    // 4. Render User Logo in Panel
    this.renderPanelLogo();

    // 5. Render Brevo Configuration
    this.renderBrevoConfig();

    // 6. Admin Section (Users Table)
    const adminSection = document.getElementById('section-admin-users');
    if (adminSection) {
      if (session.role === 'Admin') {
        adminSection.classList.remove('hidden');
        this.renderUsers();
      } else {
        adminSection.classList.add('hidden');
      }
    }
  },

  renderBrevoConfig() {
    const cfg = StorageService.getBrevoConfig();
    const keyInput = document.getElementById('brevo-api-key');
    const emailInput = document.getElementById('brevo-sender-email');
    const nameInput = document.getElementById('brevo-sender-name');

    if (keyInput) keyInput.value = cfg.apiKey || '';
    if (emailInput) emailInput.value = cfg.senderEmail || 'sistemasengenharia@cmpcrs.com.br';
    if (nameInput) nameInput.value = cfg.senderName || 'Engenharia CMPC - SGQ';
  },

  handleSaveBrevoConfig(event) {
    if (event) event.preventDefault();
    const key = document.getElementById('brevo-api-key')?.value.trim();
    const email = document.getElementById('brevo-sender-email')?.value.trim();
    const name = document.getElementById('brevo-sender-name')?.value.trim();

    StorageService.saveBrevoConfig(key, email, name);
    app.showToast('Configurações da Brevo salvas com sucesso!', 'success');
  },

  renderPanelLogo() {
    const session = StorageService.getSession();
    const logoBase64 = StorageService.getUserLogo(session ? session.id : null);
    const panelImg = document.getElementById('panel-logo-img');
    const panelEmpty = document.getElementById('panel-logo-empty');
    const removeBtn = document.getElementById('btn-remove-user-logo');
    const statBadgeImg = document.getElementById('user-stat-badge-logo');

    if (statBadgeImg) {
      statBadgeImg.src = logoBase64 || 'logo cmpc.png';
      statBadgeImg.title = logoBase64 ? 'Logotipo cadastrado para seu perfil' : 'Logotipo Padrão CMPC';
    }

    if (logoBase64 && panelImg && panelEmpty) {
      panelImg.src = logoBase64;
      panelImg.classList.remove('hidden');
      panelEmpty.classList.add('hidden');
      if (removeBtn) removeBtn.classList.remove('hidden');
    } else if (panelImg && panelEmpty) {
      panelImg.src = '';
      panelImg.classList.add('hidden');
      panelEmpty.classList.remove('hidden');
      if (removeBtn) removeBtn.classList.add('hidden');
    }
  },

  handleSaveMyProfile(event) {
    event.preventDefault();
    const session = StorageService.getSession();
    if (!session) return;

    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim().toLowerCase();
    const password = document.getElementById('profile-password').value;

    if (!name || !email) {
      app.showToast('Preencha seu nome e e-mail.', 'error');
      return;
    }

    const users = StorageService.getUsers();
    const duplicate = users.find(u => u.email === email && u.id !== session.id);
    if (duplicate) {
      app.showToast('Este e-mail já está sendo utilizado por outro usuário.', 'error');
      return;
    }

    const payload = { name, email };
    if (password) {
      if (password.length < 6) {
        app.showToast('A senha deve conter no mínimo 6 caracteres.', 'error');
        return;
      }
      payload.password = password;
    }

    StorageService.updateUser(session.id, payload);

    // Update Session
    const updatedSession = { ...session, name, email };
    StorageService.setSession(updatedSession);

    // Update Navbar display
    document.getElementById('current-user-name').textContent = name;
    app.showToast('Seus dados de perfil foram atualizados com sucesso!', 'success');

    this.renderPanel();
  },

  handleRemoveMyLogo() {
    const session = StorageService.getSession();
    if (!session) return;

    app.openDeleteModal({
      targetText: 'Logotipo Padrão da Empresa',
      message: 'Deseja realmente remover o logotipo personalizado cadastrado para sua empresa?',
      onConfirm: () => {
        StorageService.removeUserLogo(session.id);
        this.renderPanelLogo();
        app.loadCompanyLogo();
        app.showToast('Logotipo removido com sucesso.', 'info');
      }
    });
  },

  // USERS MANAGEMENT (FOR ADMIN)
  renderUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    const users = StorageService.getUsers();
    const currentSession = StorageService.getSession();

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--slate-400);">Nenhum usuário cadastrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(user => {
      const isSelf = currentSession && currentSession.id === user.id;
      const formattedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-';
      
      let badgeClass = 'badge-diurno';
      if (user.role === 'Admin') badgeClass = 'badge-hours';
      else if (user.role === 'Engenheiro') badgeClass = 'badge-noturno';

      return `
        <tr>
          <td><strong>${app.escapeHtml(user.name)}</strong> ${isSelf ? '<small class="text-muted">(Você)</small>' : ''}</td>
          <td>${app.escapeHtml(user.email)}</td>
          <td><span class="${badgeClass}">${app.escapeHtml(user.role)}</span></td>
          <td>${formattedDate}</td>
          <td style="text-align: right;">
            <div class="actions-cell">
              <button class="btn btn-outline btn-xs" onclick="admin.editUser('${user.id}')" title="Editar Usuário">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Editar</span>
              </button>
              ${!isSelf ? `
                <button class="btn btn-ghost btn-xs text-danger" style="color: #ef4444;" onclick="admin.deleteUser('${user.id}')" title="Excluir Usuário">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openUserModal(userId = null) {
    const modal = document.getElementById('modal-user');
    const form = document.getElementById('form-user');
    form.reset();

    const titleElem = document.getElementById('modal-user-title');
    const idInput = document.getElementById('user-form-id');
    const nameInput = document.getElementById('user-form-name');
    const emailInput = document.getElementById('user-form-email');
    const roleInput = document.getElementById('user-form-role');
    const pwdInput = document.getElementById('user-form-password');
    const pwdHelp = document.getElementById('pwd-help-text');

    if (userId) {
      const users = StorageService.getUsers();
      const user = users.find(u => u.id === userId);
      if (!user) return;

      titleElem.textContent = 'Editar Usuário da Equipe';
      idInput.value = user.id;
      nameInput.value = user.name;
      emailInput.value = user.email;
      roleInput.value = user.role;
      pwdInput.required = false;
      pwdHelp.textContent = '(Deixe em branco para manter a senha atual)';
    } else {
      titleElem.textContent = 'Novo Usuário da Equipe';
      idInput.value = '';
      pwdInput.required = true;
      pwdHelp.textContent = '(mínimo 6 caracteres)';
    }

    modal.classList.remove('hidden');
  },

  closeUserModal() {
    const modal = document.getElementById('modal-user');
    modal.classList.add('hidden');
  },

  handleSaveUser(event) {
    event.preventDefault();
    const id = document.getElementById('user-form-id').value;
    const name = document.getElementById('user-form-name').value.trim();
    const email = document.getElementById('user-form-email').value.trim().toLowerCase();
    const role = document.getElementById('user-form-role').value;
    const password = document.getElementById('user-form-password').value;

    const users = StorageService.getUsers();

    // Check duplicate email
    const duplicate = users.find(u => u.email === email && u.id !== id);
    if (duplicate) {
      app.showToast('Já existe um usuário com este e-mail.', 'error');
      return;
    }

    if (id) {
      // Edit
      const payload = { name, email, role };
      if (password) {
        if (password.length < 6) {
          app.showToast('A senha deve conter no mínimo 6 caracteres.', 'error');
          return;
        }
        payload.password = password;
      }
      StorageService.updateUser(id, payload);
      app.showToast('Usuário atualizado com sucesso!', 'success');
    } else {
      // Create
      if (!password || password.length < 6) {
        app.showToast('A senha deve conter no mínimo 6 caracteres.', 'error');
        return;
      }
      StorageService.addUser({ name, email, role, password });
      app.showToast('Novo usuário cadastrado com sucesso!', 'success');
    }

    this.closeUserModal();
    this.renderUsers();
  },

  editUser(userId) {
    this.openUserModal(userId);
  },

  deleteUser(userId) {
    const users = StorageService.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.email.toLowerCase() === 'engelmobile2020@gmail.com') {
      app.showToast('O Administrador Master não pode ser excluído.', 'error');
      return;
    }

    app.openDeleteModal({
      targetText: `Usuário ${user.name}`,
      message: `Você está prestes a excluir o acesso do usuário <strong class="delete-warning-target">${app.escapeHtml(user.name)}</strong> (<code>${app.escapeHtml(user.email)}</code> - Perfil: ${user.role}).`,
      onConfirm: () => {
        StorageService.deleteUser(userId);
        app.showToast(`Usuário ${user.name} excluído com sucesso.`, 'info');
        this.renderUsers();
      }
    });
  }
};
