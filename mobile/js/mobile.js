/**
 * Controller Mobile - Sistema RDO Engenharia CMPC
 * Otimizado exclusivamente para Lançamentos de Campo em Celulares
 */

const ACTIVITIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const mobileApp = {
  currentRDOId: null,
  lastSavedRDOId: null,
  FIXED_PHOTO_SLOTS: 4,
  currentPhotos: ['', '', '', ''],
  currentSignatures: {
    planejamento: '',
    engenheiro: '',
    fiscalizacao: ''
  },
  currentLightboxIndex: 0,
  currentSigTarget: null,
  workerCounter: 0,
  equipCounter: 0,
  
  // Canvas de Assinatura Mobile
  sigCanvas: null,
  sigCtx: null,
  isDrawing: false,
  hasDrawn: false,
  penColor: '#1d4ed8',

  init() {
    StorageService.init();
    this.bindEvents();
    this.initSignatureCanvas();
    this.checkSession();
  },

  bindEvents() {
    // Form de Login
    const formLogin = document.getElementById('form-login-mobile');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Modal de Sucesso - Fechar ao clicar fora
    const successModal = document.getElementById('modal-success-mobile');
    if (successModal) {
      successModal.addEventListener('click', (e) => {
        if (e.target === successModal) this.closeSuccessModal();
      });
    }

    // Modal Lightbox - Fechar ao clicar fora
    const lightboxModal = document.getElementById('modal-lightbox-mobile');
    if (lightboxModal) {
      lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) this.closeLightbox();
      });
    }

    // Modal de Assinatura - Fechar ao clicar fora
    const sigModal = document.getElementById('modal-signature-mobile');
    if (sigModal) {
      sigModal.addEventListener('click', (e) => {
        if (e.target === sigModal) this.closeSignatureModal();
      });
    }

    // ESC para fechar modais
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeLightbox();
        this.closeSuccessModal();
        this.closeSignatureModal();
      }
    });
  },

  checkSession() {
    const session = StorageService.getSession();
    const loginView = document.getElementById('view-login-mobile');
    const appView = document.getElementById('view-app-mobile');

    if (session) {
      if (loginView) loginView.classList.add('hidden');
      if (appView) appView.classList.remove('hidden');

      // Atualiza perfil no cabeçalho
      const userNameEl = document.getElementById('user-name-mobile');
      const userRoleEl = document.getElementById('user-role-mobile');
      if (userNameEl) userNameEl.textContent = session.name || session.email;
      if (userRoleEl) userRoleEl.textContent = session.role || 'Usuário';

      this.initNewRDO();
    } else {
      if (loginView) loginView.classList.remove('hidden');
      if (appView) appView.classList.add('hidden');
    }
  },

  toggleLoginPassword() {
    const input = document.getElementById('login-password-mobile');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  handleLogin() {
    const email = (document.getElementById('login-email-mobile').value || '').trim().toLowerCase();
    const password = (document.getElementById('login-password-mobile').value || '').trim();

    if (!email || !password) {
      this.showToast('Por favor, informe e-mail e senha.', 'error');
      return;
    }

    const users = StorageService.getUsers();
    let user = users.find(u => (u.email || '').trim().toLowerCase() === email && String(u.password || '').trim() === password);

    // Fallback garantido para o Administrador Master padrão
    if (!user && email === 'engelmobile2020@gmail.com' && password === '789512') {
      user = {
        id: 'user-admin-master',
        name: 'Administrador Master',
        email: 'engelmobile2020@gmail.com',
        role: 'Admin'
      };
      if (StorageService.initLocalDefaults) {
        StorageService.initLocalDefaults();
      }
    }

    if (!user) {
      this.showToast('Credenciais inválidas. Verifique seu e-mail e senha.', 'error');
      return;
    }

    StorageService.setSession(user);
    if (StorageService.sendPresenceHeartbeat) {
      StorageService.sendPresenceHeartbeat();
    }

    this.showToast(`Bem-vindo, ${user.name}!`, 'success');
    this.checkSession();
  },

  logout() {
    if (confirm('Deseja realmente sair da sua conta?')) {
      StorageService.removePresence();
      StorageService.clearSession();
      this.checkSession();
      this.showToast('Você saiu do sistema.', 'info');
    }
  },

  // ================================================================
  // INICIALIZAÇÃO DE UM NOVO RDO
  // ================================================================
  initNewRDO() {
    this.currentRDOId = null;
    const session = StorageService.getSession();
    const currentDT = this.getCurrentDateTimeLocal();
    const year = new Date().getFullYear();
    const records = StorageService.getRecords();
    const nextNum = String(records.length + 1).padStart(4, '0') + '/' + year;

    // Reset campos de cabeçalho
    const numInput = document.getElementById('m-rdo-numero');
    const dataInput = document.getElementById('m-rdo-data');
    const diaInput = document.getElementById('m-rdo-dia-semana');
    const turnoInput = document.getElementById('m-rdo-turno');
    const cManhaInput = document.getElementById('m-rdo-clima-manha');
    const cTardeInput = document.getElementById('m-rdo-clima-tarde');
    const cNoiteInput = document.getElementById('m-rdo-clima-noite');
    const contratoInput = document.getElementById('m-rdo-contrato');
    const contratanteInput = document.getElementById('m-rdo-contratante');
    const contratadaInput = document.getElementById('m-rdo-contratada');
    const encarregadoInput = document.getElementById('m-rdo-encarregado');
    const comentariosInput = document.getElementById('m-rdo-comentarios');

    if (numInput) numInput.value = nextNum;
    if (dataInput) dataInput.value = currentDT;
    if (diaInput) diaInput.value = this.getDayOfWeekName(currentDT);
    if (turnoInput) turnoInput.value = 'Diurno';
    if (cManhaInput) cManhaInput.value = 'Sol';
    if (cTardeInput) cTardeInput.value = 'Sol';
    if (cNoiteInput) cNoiteInput.value = 'Sem Trabalho';
    if (contratoInput) contratoInput.value = '';
    if (contratanteInput) contratanteInput.value = 'CMPC CELULOSE RIOGRANDENSE';
    if (contratadaInput) contratadaInput.value = '';
    if (encarregadoInput) encarregadoInput.value = session ? session.name : '';
    if (comentariosInput) comentariosInput.value = '';
    const obsAdicionalInput = document.getElementById('m-rdo-obs-adicional');
    if (obsAdicionalInput) obsAdicionalInput.value = '';

    // Assinaturas reset
    this.currentSignatures = {
      planejamento: '',
      engenheiro: '',
      fiscalizacao: ''
    };
    this.populateSignatureDropdowns();
    ['planejamento', 'engenheiro', 'fiscalizacao'].forEach(t => {
      this.updateSignatureBoxUI(t, '');
    });

    // Limpa colaboradores e insere 2 colaboradores iniciais
    const workersContainer = document.getElementById('workers-container-mobile');
    if (workersContainer) {
      workersContainer.innerHTML = '';
      this.workerCounter = 0;
      this.addWorker();
      this.addWorker();
    }

    // Limpa equipamentos e insere 2 linhas iniciais
    const equipContainer = document.getElementById('equipments-container-mobile');
    if (equipContainer) {
      equipContainer.innerHTML = '';
      this.equipCounter = 0;
      this.addEquipment();
      this.addEquipment();
    }

    // Renderiza atividades A até J
    this.renderActivitiesMobile();

    // Reset de fotos (dinâmicas)
    this.renderAllPhotosUI(['', '', '', '']);

    this.renderDraftStatusBanner(null);
    this.renderMyDraftsMobile();
    this.recalculateAllHours();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  getCurrentDateTimeLocal() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  },

  getDayOfWeekName(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const days = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];
    return days[date.getDay()];
  },

  handleDateChange(e) {
    const val = e.target.value;
    const diaInput = document.getElementById('m-rdo-dia-semana');
    if (diaInput) {
      diaInput.value = this.getDayOfWeekName(val);
    }
  },

  // TURNO SELECTION
  currentTurno: 'Diurno',
  setTurno(turno) {
    this.currentTurno = turno;
    const pillDiurno = document.getElementById('turno-diurno');
    const pillNoturno = document.getElementById('turno-noturno');
    if (pillDiurno && pillNoturno) {
      if (turno === 'Diurno') {
        pillDiurno.classList.add('active');
        pillNoturno.classList.remove('active');
      } else {
        pillNoturno.classList.add('active');
        pillDiurno.classList.remove('active');
      }
    }
  },

  // ================================================================
  // COLABORADORES COM MINI-GRADE DE HORAS E REGRA DE 11 HORAS
  // ================================================================
  addWorker(data = null) {
    this.workerCounter++;
    const container = document.getElementById('workers-container-mobile');
    if (!container) return;

    const workerIndex = this.workerCounter;
    const card = document.createElement('div');
    card.className = 'worker-card-mobile';
    card.id = `worker-card-${workerIndex}`;

    const matricula = data ? data.matricula || '' : '';
    const funcao = data ? data.funcao || '' : '';
    const nome = data ? data.nome || '' : '';
    const activities = data && data.activities ? data.activities : {};

    card.innerHTML = `
      <div class="worker-header">
        <div class="worker-index-tag">
          <span>👷</span>
          <span>Colaborador #${workerIndex}</span>
        </div>
        <div class="worker-header-right">
          <span class="worker-total-badge" id="worker-total-${workerIndex}">0h</span>
          <button type="button" class="btn-remove-worker" onclick="mobileApp.removeWorker(${workerIndex})" title="Remover Colaborador">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="worker-limit-alert hidden" id="worker-alert-${workerIndex}">
        ⚠️ <strong>Atenção:</strong> Limite de 11h na jornada excedido!
      </div>

      <div class="grid-2-col">
        <div class="form-field">
          <label class="form-label">Matrícula</label>
          <input type="text" class="form-input w-matricula" placeholder="Ex: 253" value="${matricula}" inputmode="numeric">
        </div>
        <div class="form-field">
          <label class="form-label">Função</label>
          <input type="text" class="form-input w-funcao" placeholder="Ex: Soldador" value="${funcao}">
        </div>
      </div>

      <div class="form-field">
        <label class="form-label">Nome Completo</label>
        <input type="text" class="form-input w-nome" placeholder="Nome do colaborador" value="${nome}">
      </div>

      <!-- Apropriação de Horas (Atividades A a J) -->
      <div class="worker-hours-box">
        <div class="worker-hours-label">
          <span>Horas por Atividade (A a J):</span>
          <span class="worker-hours-subtotal" id="worker-subtotal-text-${workerIndex}">0 horas</span>
        </div>
        <div class="hours-grid">
          ${ACTIVITIES.map(letter => {
            const hVal = (activities[letter] !== undefined && activities[letter] !== null && activities[letter] !== '') ? activities[letter] : '';
            return `
              <div class="hour-item">
                <span class="hour-letter">${letter}</span>
                <input type="number" 
                       inputmode="decimal" 
                       step="0.5" 
                       min="0" 
                       max="24" 
                       class="hour-input w-hour-${letter} ${hVal ? 'has-value' : ''}" 
                       data-act="${letter}" 
                       data-worker="${workerIndex}" 
                       value="${hVal}" 
                       placeholder="-"
                       oninput="mobileApp.onWorkerHoursChange(${workerIndex})">
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.appendChild(card);
    this.onWorkerHoursChange(workerIndex);
  },

  removeWorker(index) {
    const card = document.getElementById(`worker-card-${index}`);
    if (card) {
      card.remove();
      this.recalculateAllHours();
      this.showToast('Colaborador removido.', 'info');
    }
  },

  onWorkerHoursChange(workerIndex) {
    const card = document.getElementById(`worker-card-${workerIndex}`);
    if (!card) return;

    let totalWorker = 0;
    ACTIVITIES.forEach(letter => {
      const inp = card.querySelector(`.w-hour-${letter}`);
      if (inp) {
        const val = parseFloat(inp.value) || 0;
        if (val > 0) {
          inp.classList.add('has-value');
        } else {
          inp.classList.remove('has-value');
        }
        totalWorker += val;
      }
    });

    const badge = document.getElementById(`worker-total-${workerIndex}`);
    const subtotalText = document.getElementById(`worker-subtotal-text-${workerIndex}`);
    const alertBox = document.getElementById(`worker-alert-${workerIndex}`);

    const fmtTotal = totalWorker % 1 === 0 ? totalWorker : totalWorker.toFixed(1);

    if (badge) {
      if (totalWorker > 11) {
        badge.classList.add('exceeded');
        badge.classList.remove('extra');
        badge.textContent = `⚠️ ${fmtTotal}h (Máx 11h)`;
      } else if (totalWorker > 8) {
        badge.classList.remove('exceeded');
        badge.classList.add('extra');
        const he = totalWorker - 8;
        const fmtHE = he % 1 === 0 ? he : he.toFixed(1);
        badge.textContent = `${fmtTotal}h (+${fmtHE} HE)`;
      } else {
        badge.classList.remove('exceeded');
        badge.classList.remove('extra');
        badge.textContent = `${fmtTotal}h`;
      }
    }

    if (subtotalText) {
      subtotalText.textContent = `${fmtTotal} horas`;
    }

    if (totalWorker > 11) {
      card.classList.add('worker-card-exceeded');
      if (alertBox) alertBox.classList.remove('hidden');
    } else {
      card.classList.remove('worker-card-exceeded');
      if (alertBox) alertBox.classList.add('hidden');
    }

    this.recalculateAllHours();
  },

  recalculateAllHours() {
    // 1. Calcula a soma por atividade (A a J) de todos os colaboradores
    const actSums = {};
    ACTIVITIES.forEach(letter => actSums[letter] = 0);

    let totalGeralHH = 0;
    const workerCards = document.querySelectorAll('#workers-container-mobile .worker-card-mobile');
    workerCards.forEach(card => {
      ACTIVITIES.forEach(letter => {
        const inp = card.querySelector(`.w-hour-${letter}`);
        if (inp) {
          const val = parseFloat(inp.value) || 0;
          actSums[letter] += val;
          totalGeralHH += val;
        }
      });
    });

    // 2. Atualiza os badges no Card 3 de Atividades
    ACTIVITIES.forEach(letter => {
      const actBadge = document.getElementById(`act-hours-sum-${letter}`);
      if (actBadge) {
        const sum = actSums[letter];
        const fmt = sum % 1 === 0 ? sum : sum.toFixed(1);
        actBadge.textContent = `${fmt}h`;
        if (sum > 0) {
          actBadge.classList.add('has-hours');
        } else {
          actBadge.classList.remove('has-hours');
        }
      }
    });

    // 3. Atualiza os banners de Total Geral HH
    const fmtGeral = totalGeralHH % 1 === 0 ? totalGeralHH : totalGeralHH.toFixed(1);
    const display = document.getElementById('total-hh-display');
    const displayAct = document.getElementById('total-hh-act-display');
    if (display) display.textContent = `${fmtGeral} Horas`;
    if (displayAct) displayAct.textContent = `${fmtGeral} Horas`;

    return totalGeralHH;
  },

  // ================================================================
  // DESCRIÇÕES DAS ATIVIDADES COM VISTO (A A J)
  // ================================================================
  renderActivitiesMobile() {
    const container = document.getElementById('activities-container-mobile');
    if (!container) return;

    let html = '';
    ACTIVITIES.forEach(letter => {
      html += `
        <div class="activity-card-mobile" data-act="${letter}">
          <div class="activity-header">
            <div class="activity-letter-badge">${letter}</div>
            <div class="activity-title" style="flex: 1;">Atividade ${letter}</div>
            <span class="worker-subtotal-badge" id="act-hours-sum-${letter}" style="font-size: 11px;">0h</span>
          </div>

          <div class="form-field">
            <label class="form-label">Descrição do Serviço (${letter})</label>
            <input type="text" class="form-input act-desc-mobile" placeholder="Descreva o serviço executado na atividade ${letter}...">
          </div>

          <div class="form-field">
            <label class="form-label">Visto / Rubrica do Encarregado (${letter})</label>
            <input type="text" class="form-input act-ass-mobile" placeholder="Assinatura / Visto">
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  // ================================================================
  // EQUIPAMENTOS & QT (MOBILE)
  // ================================================================
  addEquipment(data = null) {
    this.equipCounter++;
    const container = document.getElementById('equipments-container-mobile');
    if (!container) return;

    const eqIndex = this.equipCounter;
    const row = document.createElement('div');
    row.className = 'equip-row-mobile';
    row.id = `equip-row-${eqIndex}`;
    row.style.cssText = 'display: grid; grid-template-columns: 1fr 78px 36px; gap: 6px; align-items: center;';

    const nome = data ? (data.nome || '') : '';
    const qt = (data && data.qt !== undefined && data.qt !== null) ? data.qt : '';

    row.innerHTML = `
      <input type="text" class="form-input eq-nome" placeholder="Equipamento utilizado..." value="${nome}">
      <input type="number" inputmode="numeric" min="0" step="1" class="form-input eq-qt" placeholder="QT" value="${qt}" style="text-align: center; font-weight: 700;">
      <button type="button" class="btn-remove-worker" onclick="mobileApp.removeEquipment(${eqIndex})" title="Remover Equipamento" style="height: 40px; width: 36px; display: flex; align-items: center; justify-content: center;">
        ✕
      </button>
    `;
    container.appendChild(row);
  },

  removeEquipment(index) {
    const row = document.getElementById(`equip-row-${index}`);
    if (row) {
      row.remove();
    }
  },

  // ================================================================
  // ASSINATURAS: NOMES CADASTRADOS & EMAIL AUTOMÁTICO
  // ================================================================
  populateSignatureDropdowns() {
    const targets = ['planejamento', 'engenheiro', 'fiscalizacao'];
    const users = StorageService.getUsers() || [];

    targets.forEach(t => {
      const select = document.getElementById(`m-rdo-sig-${t}`);
      if (!select) return;
      const cur = select.value || '';
      select.innerHTML = '<option value="">-- Selecionar Nome --</option>';
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.name;
        opt.textContent = `${u.name} (${u.role || 'Usuário'})`;
        opt.dataset.email = u.email || '';
        opt.dataset.userid = u.id || '';
        select.appendChild(opt);
      });
      if (cur && !users.some(u => u.name === cur)) {
        const customOpt = document.createElement('option');
        customOpt.value = cur;
        customOpt.textContent = cur;
        select.appendChild(customOpt);
      }
      select.value = cur;
    });
  },

  onSigUserChange(target, selectedName) {
    const emailInput = document.getElementById(`m-rdo-sig-email-${target}`);
    if (!selectedName) {
      if (emailInput) emailInput.value = '';
      this.updateSignatureBoxUI(target, this.currentSignatures[target] || '');
      return;
    }

    const users = StorageService.getUsers() || [];
    const matched = users.find(u => u.name === selectedName);
    if (matched) {
      if (emailInput) emailInput.value = matched.email || '';

      // REGRA DE PERFIL: só carrega automaticamente se o usuário logado for o próprio selecionado
      const session = StorageService.getSession();
      const isMe = session && (
        (session.name && session.name.trim().toLowerCase() === selectedName.trim().toLowerCase()) ||
        (session.email && matched.email && session.email.trim().toLowerCase() === matched.email.trim().toLowerCase())
      );

      const userSig = StorageService.getUserSignature ? StorageService.getUserSignature(matched.id) : null;
      if (isMe && userSig && !this.currentSignatures[target]) {
        this.currentSignatures[target] = userSig;
        this.updateSignatureBoxUI(target, userSig);
        this.showToast(`Sua assinatura permanente (${matched.name}) foi carregada!`, 'info');
      } else {
        this.updateSignatureBoxUI(target, this.currentSignatures[target] || '');
      }
    }
  },

  // ================================================================
  // CANVAS TOUCH DE ASSINATURA DIGITAL (MOBILE)
  // ================================================================
  initSignatureCanvas() {
    const canvas = document.getElementById('sig-canvas-mobile');
    if (!canvas) return;

    this.sigCanvas = canvas;
    this.sigCtx = canvas.getContext('2d', { willReadFrequently: true });

    // Configuração do traço
    this.sigCtx.lineCap = 'round';
    this.sigCtx.lineJoin = 'round';
    this.sigCtx.lineWidth = 2.4;
    this.sigCtx.strokeStyle = this.penColor;

    // Ajusta resolução do canvas para a tela do dispositivo (retina/touch)
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      this.sigCtx.scale(dpr, dpr);
      this.sigCtx.lineCap = 'round';
      this.sigCtx.lineJoin = 'round';
      this.sigCtx.lineWidth = 2.4;
      this.sigCtx.strokeStyle = this.penColor;
    };

    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100);

    // Eventos Mouse
    canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    canvas.addEventListener('mousemove', (e) => this.draw(e));
    canvas.addEventListener('mouseup', () => this.endDraw());
    canvas.addEventListener('mouseleave', () => this.endDraw());

    // Eventos Touch (Mobile Dedos / Stylus)
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDraw(e.touches[0]);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.endDraw();
    }, { passive: false });
  },

  getCanvasCoords(e) {
    const rect = this.sigCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  },

  startDraw(e) {
    this.isDrawing = true;
    this.hasDrawn = true;
    const coords = this.getCanvasCoords(e);
    this.sigCtx.beginPath();
    this.sigCtx.moveTo(coords.x, coords.y);
  },

  draw(e) {
    if (!this.isDrawing) return;
    const coords = this.getCanvasCoords(e);
    this.sigCtx.lineTo(coords.x, coords.y);
    this.sigCtx.stroke();
  },

  endDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.sigCtx.closePath();
  },

  clearSignatureCanvas() {
    if (!this.sigCanvas || !this.sigCtx) return;
    const rect = this.sigCanvas.getBoundingClientRect();
    this.sigCtx.clearRect(0, 0, rect.width, rect.height);
    this.hasDrawn = false;
  },

  setPenColor(color, btn) {
    this.penColor = color;
    if (this.sigCtx) this.sigCtx.strokeStyle = color;
    document.querySelectorAll('.btn-color-pick').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  },

  openSignatureModal(target) {
    const session = StorageService.getSession();
    if (!session) {
      this.showToast('Faça login no sistema para assinar.', 'warning');
      return;
    }

    const select = document.getElementById(`m-rdo-sig-${target}`);
    const selectedName = select ? select.value.trim() : '';
    const emailInput = document.getElementById(`m-rdo-sig-email-${target}`);
    const selectedEmail = emailInput ? emailInput.value.trim() : '';

    const titles = {
      planejamento: 'Planejamento Executante',
      engenheiro: 'Engenheiro de Produção Executante',
      fiscalizacao: 'Fiscalização CMPC'
    };
    const tName = titles[target] || 'Assinatura Técnica';

    if (!selectedName) {
      this.showToast(`Selecione primeiro o responsável para "${tName}".`, 'warning');
      if (select) select.focus();
      return;
    }

    // REGRA DE PERFIL:
    const sessionName = (session.name || '').trim().toLowerCase();
    const sessionEmail = (session.email || '').trim().toLowerCase();
    const selName = selectedName.toLowerCase();
    const selEmail = selectedEmail.toLowerCase();

    const isMatch = (sessionName === selName) || (sessionEmail && selectedEmail && sessionEmail === selEmail);

    if (!isMatch) {
      this.showToast(`⛔ Apenas o usuário "${selectedName}" pode assinar este campo com seu perfil. Você está como "${session.name}".`, 'error');
      return;
    }

    this.currentSigTarget = target;
    const modal = document.getElementById('modal-signature-mobile');
    const titleEl = document.getElementById('sig-modal-title-mobile');
    const subtitleEl = document.getElementById('sig-modal-subtitle-mobile');

    if (titleEl) titleEl.textContent = `✍️ ${tName}`;
    if (subtitleEl) subtitleEl.textContent = `Assinando como "${selectedName}" (${session.role || 'Usuário'})`;

    this.clearSignatureCanvas();
    if (modal) modal.classList.remove('hidden');

    // Se o próprio usuário tiver assinatura gravada no perfil, carrega
    const userSig = StorageService.getUserSignature ? StorageService.getUserSignature(session.id) : (session.signature || null);
    if (userSig) {
      this.loadSignatureImageToCanvas(userSig);
    }
  },

  closeSignatureModal() {
    const modal = document.getElementById('modal-signature-mobile');
    if (modal) modal.classList.add('hidden');
    this.currentSigTarget = null;
  },

  loadSignatureImageToCanvas(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.clearSignatureCanvas();
      const rect = this.sigCanvas.getBoundingClientRect();
      const ratio = Math.min((rect.width - 20) / img.width, (rect.height - 20) / img.height, 1);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (rect.width - w) / 2;
      const y = (rect.height - h) / 2;
      this.sigCtx.drawImage(img, x, y, w, h);
      this.hasDrawn = true;
    };
    img.src = dataUrl;
  },

  handleSignatureImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.loadSignatureImageToCanvas(e.target.result);
      this.showToast('Imagem carregada no quadro de assinatura.', 'info');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  },

  confirmSignature() {
    if (!this.hasDrawn) {
      this.showToast('Por favor, assine na tela ou carregue uma imagem antes de confirmar.', 'error');
      return;
    }

    const dataUrl = this.sigCanvas.toDataURL('image/png');
    const target = this.currentSigTarget;
    if (!target) return;

    this.currentSignatures[target] = dataUrl;
    this.updateSignatureBoxUI(target, dataUrl);

    // Salvar no perfil do usuário selecionado para usar sempre
    const saveProfileCheck = document.getElementById('check-save-profile-mobile');
    if (saveProfileCheck && saveProfileCheck.checked) {
      const select = document.getElementById(`m-rdo-sig-${target}`);
      const selectedName = select ? select.value : '';
      const users = StorageService.getUsers() || [];
      const matched = users.find(u => u.name === selectedName);
      if (matched && StorageService.saveUserSignature) {
        StorageService.saveUserSignature(matched.id, dataUrl);
        this.showToast(`Assinatura gravada no perfil de ${matched.name}!`, 'success');
      }
    }

    this.closeSignatureModal();
    this.showToast('Assinatura confirmada com sucesso!', 'success');
  },

  clearSignature(target) {
    this.currentSignatures[target] = '';
    this.updateSignatureBoxUI(target, '');
    this.showToast('Assinatura removida.', 'info');
  },

  updateSignatureBoxUI(target, dataUrl) {
    const previewWrap = document.getElementById(`sig-preview-${target}`);
    const img = document.getElementById(`sig-img-${target}`);
    const btnTrigger = document.getElementById(`btn-sig-trigger-${target}`);

    if (dataUrl && previewWrap && img && btnTrigger) {
      img.src = dataUrl;
      previewWrap.classList.remove('hidden');
      btnTrigger.classList.add('hidden');
    } else if (previewWrap && img && btnTrigger) {
      img.src = '';
      previewWrap.classList.add('hidden');
      btnTrigger.classList.remove('hidden');
    }
  },

  // ================================================================
  // REGISTRO FOTOGRÁFICO (4 FOTOS) & LIGHTBOX
  // ================================================================
  compressImage(file, maxWidth = 800, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  handlePhotoSlotClick(index) {
    if (this.currentPhotos[index]) {
      this.openLightbox(index);
    } else {
      const input = document.getElementById(`photo-file-${index}`);
      if (input) input.click();
    }
  },

  async handlePhotoUpload(event, index) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Por favor, selecione uma imagem válida.', 'error');
      return;
    }

    try {
      this.showToast('Compactando foto...', 'info');
      const base64 = await this.compressImage(file);
      this.currentPhotos[index] = base64;
      this.updatePhotoSlotUI(index, base64);
      this.showToast(`Foto ${index + 1} anexada com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      this.showToast('Erro ao processar foto.', 'error');
    }
    event.target.value = '';
  },

  getPhotoSlotCount() {
    return document.querySelectorAll('#photos-grid-mobile .photo-slot-mobile').length;
  },

  updatePhotosHeaderTitle() {
    const title = document.getElementById('m-photos-header-title');
    if (title) {
      const n = this.getPhotoSlotCount();
      title.textContent = `5. Registro Fotográfico (${n} ${n === 1 ? 'Foto' : 'Fotos'})`;
    }
  },

  createExtraPhotoSlot(index) {
    const grid = document.getElementById('photos-grid-mobile');
    if (!grid) return;
    const n = index + 1;
    const slot = document.createElement('div');
    slot.className = 'photo-slot-mobile photo-slot-extra-mobile';
    slot.id = `photo-slot-mobile-${index}`;
    slot.innerHTML = `
      <input type="file" id="photo-file-${index}" accept="image/*" class="hidden" onchange="mobileApp.handlePhotoUpload(event, ${index})">
      <div class="photo-preview-mobile" id="photo-preview-${index}" onclick="mobileApp.handlePhotoSlotClick(${index})">
        <div class="photo-empty-state" id="photo-empty-${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>Foto ${n}</span>
          <small style="font-size: 10px; color: var(--slate-400);">Toque p/ foto</small>
        </div>
      </div>
      <input type="text" id="photo-caption-${index}" class="photo-caption-mobile" placeholder="Legenda da foto ${n}">
      <div class="photo-actions-mobile" id="photo-actions-${index}">
        <button type="button" class="btn-photo-action hidden" id="photo-change-btn-${index}" onclick="document.getElementById('photo-file-${index}').click()">Trocar</button>
        <button type="button" class="btn-photo-action btn-del" onclick="mobileApp.removePhoto(${index})">Excluir</button>
      </div>
    `;
    grid.appendChild(slot);
  },

  addPhotoSlot() {
    const index = this.getPhotoSlotCount();
    this.currentPhotos[index] = '';
    this.createExtraPhotoSlot(index);
    this.updatePhotoSlotUI(index, '', '');
    this.updatePhotosHeaderTitle();
    const slot = document.getElementById(`photo-slot-mobile-${index}`);
    if (slot) slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  removePhoto(index) {
    if (index >= this.FIXED_PHOTO_SLOTS) {
      const items = [];
      const total = this.getPhotoSlotCount();
      for (let i = 0; i < total; i++) {
        if (i === index) continue;
        items.push({
          url: this.currentPhotos[i] || '',
          caption: document.getElementById(`photo-caption-${i}`)?.value || ''
        });
      }
      this.renderAllPhotosUI(items);
      this.showToast('Campo de foto removido.', 'info');
      return;
    }

    this.currentPhotos[index] = '';
    const captionInput = document.getElementById(`photo-caption-${index}`);
    if (captionInput) {
      captionInput.value = index === 0 ? 'FOTO DA PT' : '';
    }
    this.updatePhotoSlotUI(index, '', index === 0 ? 'FOTO DA PT' : '');
    this.showToast(index === 0 ? 'Foto da PT removida. Lembre-se: ela é obrigatória.' : `Foto ${index + 1} removida.`, 'info');
  },

  updatePhotoSlotUI(index, base64Url, caption = null) {
    const preview = document.getElementById(`photo-preview-${index}`);
    const emptyState = document.getElementById(`photo-empty-${index}`);
    const actions = document.getElementById(`photo-actions-${index}`);
    const changeBtn = document.getElementById(`photo-change-btn-${index}`);
    const captionInput = document.getElementById(`photo-caption-${index}`);

    if (caption !== null && captionInput) {
      captionInput.value = (index === 0 && !caption) ? 'FOTO DA PT' : caption;
    } else if (index === 0 && captionInput && !captionInput.value.trim()) {
      captionInput.value = 'FOTO DA PT';
    }

    if (base64Url && preview && emptyState) {
      let img = preview.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        preview.appendChild(img);
      }
      img.src = base64Url;
      img.classList.remove('hidden');
      emptyState.classList.add('hidden');
      if (actions) actions.classList.remove('hidden');
      if (changeBtn) changeBtn.classList.remove('hidden');
    } else if (preview && emptyState) {
      const img = preview.querySelector('img');
      if (img) img.remove();
      emptyState.classList.remove('hidden');
      if (actions && index < this.FIXED_PHOTO_SLOTS) actions.classList.add('hidden');
      if (changeBtn) changeBtn.classList.add('hidden');
    }
  },

  renderAllPhotosUI(photos = []) {
    const total = Math.max(this.FIXED_PHOTO_SLOTS, photos.length);
    let current = this.getPhotoSlotCount();
    while (current > total) {
      document.getElementById(`photo-slot-mobile-${current - 1}`)?.remove();
      current--;
    }
    while (current < total) {
      this.createExtraPhotoSlot(current);
      current++;
    }
    this.currentPhotos.length = total;
    this.updatePhotosHeaderTitle();

    for (let i = 0; i < total; i++) {
      const item = photos[i];
      let url = '';
      let cap = i === 0 ? 'FOTO DA PT' : '';
      if (item) {
        if (typeof item === 'string') {
          url = item;
        } else {
          url = item.url || '';
          cap = item.caption || (i === 0 ? 'FOTO DA PT' : '');
        }
      }
      this.currentPhotos[i] = url;
      this.updatePhotoSlotUI(i, url, cap);
    }
  },

  openLightbox(index) {
    const url = this.currentPhotos[index];
    if (!url) return;

    this.currentLightboxIndex = index;
    const modal = document.getElementById('modal-lightbox-mobile');
    const img = document.getElementById('lightbox-img-mobile');
    const tag = document.getElementById('lightbox-tag-mobile');
    const captionEl = document.getElementById('lightbox-caption-mobile');
    const captionInput = document.getElementById(`photo-caption-${index}`);

    const caption = (captionInput && captionInput.value.trim()) ? captionInput.value.trim() : 'Registro fotográfico da obra';

    if (img) img.src = url;
    if (tag) tag.textContent = `Foto ${index + 1} de ${this.getPhotoSlotCount()}`;
    if (captionEl) captionEl.textContent = caption;

    if (modal) modal.classList.remove('hidden');
  },

  closeLightbox() {
    const modal = document.getElementById('modal-lightbox-mobile');
    if (modal) modal.classList.add('hidden');
  },

  // ================================================================
  // RASCUNHOS DO PERFIL (COM LOGO À ESQUERDA), SALVAR E ENVIAR RDO
  // ================================================================
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  renderDraftStatusBanner(rdo) {
    const banner = document.getElementById('m-draft-status-banner');
    if (!banner) return;
    if (!rdo || !rdo.isDraft) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div>
        <strong>📝 Editando Rascunho (${this.escapeHtml(rdo.numero || '-')})</strong>
        <div style="font-size: 11px; margin-top: 2px;">Ainda não enviado. Só aparece no seu perfil. Quando terminar, toque em <strong>Salvar e Enviar RDO</strong>.</div>
      </div>
    `;
  },

  renderMyDraftsMobile() {
    const card = document.getElementById('m-drafts-card');
    const listEl = document.getElementById('m-drafts-list');
    const countEl = document.getElementById('m-drafts-count');
    if (!card || !listEl) return;

    const session = StorageService.getSession();
    if (!session) {
      card.classList.add('hidden');
      return;
    }

    const records = StorageService.getRecords() || [];
    const users = StorageService.getUsers() || [];
    const drafts = records.filter(r => {
      if (!r.isDraft || r.sent === true) return false;
      return r.userId === session.id ||
        (r.createdBy && session.email && r.createdBy.toLowerCase() === session.email.toLowerCase()) ||
        (!r.userId && r.encarregado && r.encarregado.toLowerCase() === (session.name || '').toLowerCase());
    });

    if (drafts.length === 0) {
      card.classList.add('hidden');
      listEl.innerHTML = '';
      return;
    }

    card.classList.remove('hidden');
    if (countEl) countEl.textContent = String(drafts.length);

    listEl.innerHTML = drafts.map(r => {
      const ownerName = (r.createdByName || r.encarregado || '').trim().toLowerCase();
      const owner = users.find(u =>
        (r.userId && u.id === r.userId) ||
        (r.createdBy && u.email && u.email.toLowerCase() === String(r.createdBy).toLowerCase()) ||
        (!r.userId && ownerName && u.name && u.name.trim().toLowerCase() === ownerName)
      );
      const rowLogo = owner
        ? (owner.logo || localStorage.getItem(`cmpc_rdo_logo_${owner.id}`) || '')
        : (r.logo || '');
      const logoHtml = rowLogo
        ? `<img src="${rowLogo}" alt="Logo" class="m-draft-logo">`
        : `<div class="m-draft-logo-empty">📝</div>`;

      let fmtDate = '-';
      if (r.data) {
        if (r.data.includes('T')) {
          const [dPart, tPart] = r.data.split('T');
          const [y, m, d] = dPart.split('-');
          fmtDate = `${d}/${m}/${y} ${tPart.slice(0, 5)}`;
        } else {
          fmtDate = r.data.split('-').reverse().join('/');
        }
      }

      return `
        <div class="m-draft-item">
          <div class="m-draft-logo-wrap">${logoHtml}</div>
          <div class="m-draft-info">
            <div class="m-draft-top">
              <span class="m-draft-num">RDO ${this.escapeHtml(r.numero || '-')}</span>
              ${r.contrato ? `<span class="m-draft-ctr">• ${this.escapeHtml(r.contrato)}</span>` : ''}
            </div>
            <div class="m-draft-sub">${this.escapeHtml(fmtDate)} • ${r.totalHH || 0} HH</div>
          </div>
          <div class="m-draft-actions">
            <button type="button" class="btn-draft-open" onclick="mobileApp.loadRDO('${r.id}')">Continuar</button>
            <button type="button" class="btn-draft-del" onclick="mobileApp.deleteDraftMobile('${r.id}')" title="Excluir rascunho">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  loadRDO(rdoId) {
    const rdo = StorageService.getRecordById(rdoId);
    if (!rdo) {
      this.showToast('Rascunho não encontrado.', 'error');
      return;
    }
    this.currentRDOId = rdo.id;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    let dateVal = rdo.data || '';
    if (dateVal && dateVal.length === 10) dateVal += 'T08:00';

    setVal('m-rdo-contrato', rdo.contrato);
    setVal('m-rdo-numero', rdo.numero);
    setVal('m-rdo-data', dateVal);
    setVal('m-rdo-dia-semana', rdo.diaSemana || this.getDayOfWeekName(dateVal));
    setVal('m-rdo-clima-manha', rdo.climaManha || 'Sol');
    setVal('m-rdo-clima-tarde', rdo.climaTarde || 'Sol');
    setVal('m-rdo-clima-noite', rdo.climaNoite || 'Sem Trabalho');
    setVal('m-rdo-contratante', rdo.contratante || 'CMPC CELULOSE RIOGRANDENSE');
    setVal('m-rdo-contratada', rdo.contratada);
    setVal('m-rdo-encarregado', rdo.encarregado);
    setVal('m-rdo-comentarios', rdo.comentarios);
    setVal('m-rdo-obs-adicional', rdo.obsAdicional || rdo.sendObs);

    const workersContainer = document.getElementById('workers-container-mobile');
    if (workersContainer) {
      workersContainer.innerHTML = '';
      this.workerCounter = 0;
      if (Array.isArray(rdo.workers) && rdo.workers.length > 0) {
        rdo.workers.forEach(w => this.addWorker(w));
      } else {
        this.addWorker();
      }
    }

    const equipContainer = document.getElementById('equipments-container-mobile');
    if (equipContainer) {
      equipContainer.innerHTML = '';
      this.equipCounter = 0;
      if (Array.isArray(rdo.equipments) && rdo.equipments.length > 0) {
        rdo.equipments.forEach(eq => this.addEquipment(eq));
      } else {
        this.addEquipment();
      }
    }

    this.renderActivitiesMobile();
    ACTIVITIES.forEach(letter => {
      const card = document.querySelector(`#activities-container-mobile .activity-card-mobile[data-act="${letter}"]`);
      if (card) {
        const descInp = card.querySelector('.act-desc-mobile');
        const assInp = card.querySelector('.act-ass-mobile');
        if (descInp) descInp.value = (rdo.activitiesDescriptions && rdo.activitiesDescriptions[letter]) || '';
        if (assInp) assInp.value = (rdo.activitiesSignatures && rdo.activitiesSignatures[letter]) || '';
      }
    });

    this.renderAllPhotosUI(rdo.photos || []);

    this.populateSignatureDropdowns();
    setVal('m-rdo-sig-planejamento', rdo.sigPlanejamento);
    setVal('m-rdo-sig-engenheiro', rdo.sigEngenheiro);
    setVal('m-rdo-sig-fiscalizacao', rdo.sigFiscalizacao);
    setVal('m-rdo-sig-email-planejamento', rdo.sigEmailPlanejamento);
    setVal('m-rdo-sig-email-engenheiro', rdo.sigEmailEngenheiro);
    setVal('m-rdo-sig-email-fiscalizacao', rdo.sigEmailFiscalizacao);

    this.currentSignatures = {
      planejamento: rdo.sigImgPlanejamento || '',
      engenheiro: rdo.sigImgEngenheiro || '',
      fiscalizacao: rdo.sigImgFiscalizacao || ''
    };
    ['planejamento', 'engenheiro', 'fiscalizacao'].forEach(t => {
      this.updateSignatureBoxUI(t, this.currentSignatures[t]);
    });

    this.renderDraftStatusBanner(rdo);
    this.recalculateAllHours();
    this.showToast(`Rascunho ${rdo.numero || ''} carregado!`, 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  deleteDraftMobile(rdoId) {
    if (!confirm('Deseja excluir este rascunho?')) return;
    StorageService.deleteRecord(rdoId);
    if (this.currentRDOId === rdoId) {
      this.initNewRDO();
    } else {
      this.renderMyDraftsMobile();
    }
    this.showToast('Rascunho excluído.', 'info');
  },

  saveRDO(draftMode = false) {
    draftMode = (draftMode === true);
    const numero = document.getElementById('m-rdo-numero')?.value.trim();
    const data = document.getElementById('m-rdo-data')?.value;
    const diaSemana = document.getElementById('m-rdo-dia-semana')?.value.trim();
    const turno = document.getElementById('m-rdo-turno')?.value || 'Diurno';
    const climaManha = document.getElementById('m-rdo-clima-manha')?.value || 'Sol';
    const climaTarde = document.getElementById('m-rdo-clima-tarde')?.value || 'Sol';
    const climaNoite = document.getElementById('m-rdo-clima-noite')?.value || 'Sem Trabalho';

    let climaResumo = `Manhã: ${climaManha} | Tarde: ${climaTarde}`;
    if (climaNoite && climaNoite !== 'Sem Trabalho') {
      climaResumo += ` | Noite: ${climaNoite}`;
    }
    const clima = climaResumo;

    const contrato = document.getElementById('m-rdo-contrato')?.value.trim();
    const contratante = document.getElementById('m-rdo-contratante')?.value.trim();
    const contratada = document.getElementById('m-rdo-contratada')?.value.trim();
    const encarregado = document.getElementById('m-rdo-encarregado')?.value.trim();

    if (!numero) {
      this.showToast('Por favor, informe o número do RDO.', 'error');
      return;
    }
    if (!data) {
      this.showToast('Por favor, informe a data do RDO.', 'error');
      return;
    }
    if (!draftMode && !encarregado) {
      this.showToast('Por favor, informe o nome do encarregado.', 'error');
      return;
    }

    // Validação obrigatória da Foto da PT (Foto 1) apenas ao enviar/finalizar
    const fotoPT = this.currentPhotos[0];
    const capPT = document.getElementById('photo-caption-0')?.value.trim();
    if (!draftMode && !fotoPT) {
      this.showToast('A FOTO DA PT (Foto 1) é obrigatória! Por favor, tire ou anexe a foto da PT.', 'error');
      const preview0 = document.getElementById('photo-preview-0');
      if (preview0) {
        preview0.scrollIntoView({ behavior: 'smooth', block: 'center' });
        preview0.style.outline = '3px solid #ef4444';
        preview0.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)';
        setTimeout(() => {
          preview0.style.outline = '';
          preview0.style.boxShadow = '';
        }, 4000);
      }
      return;
    }
    if (!capPT) {
      const inputCap = document.getElementById('photo-caption-0');
      if (inputCap) inputCap.value = 'FOTO DA PT';
    }

    // Coleta colaboradores e verifica regra das 11 horas
    const workers = [];
    const workerCards = document.querySelectorAll('#workers-container-mobile .worker-card-mobile');
    let hasExceededWorker = false;
    let exceededWorkerName = '';
    let exceededWorkerHours = 0;

    workerCards.forEach(card => {
      const matricula = card.querySelector('.w-matricula')?.value.trim() || '';
      const funcao = card.querySelector('.w-funcao')?.value.trim() || '';
      const nome = card.querySelector('.w-nome')?.value.trim() || '';

      const activities = {};
      let workerTotal = 0;

      ACTIVITIES.forEach(letter => {
        const inp = card.querySelector(`.w-hour-${letter}`);
        const val = inp ? (parseFloat(inp.value) || 0) : 0;
        activities[letter] = val;
        workerTotal += val;
      });

      if (workerTotal > 11) {
        hasExceededWorker = true;
        exceededWorkerName = nome || `Matrícula ${matricula}` || 'Colaborador';
        exceededWorkerHours = workerTotal;
      }

      if (matricula || funcao || nome || workerTotal > 0) {
        workers.push({ matricula, funcao, nome, activities });
      }
    });

    // REGRA BÁSICA: QUALQUER LINHA QUE PASSAR DE 11 HORAS BLOQUEIA O ENVIO!
    if (!draftMode && hasExceededWorker) {
      const fmtH = exceededWorkerHours % 1 === 0 ? exceededWorkerHours : exceededWorkerHours.toFixed(1);
      this.showToast(`⛔ Bloqueado! O colaborador "${exceededWorkerName}" está com ${fmtH} horas. A jornada máxima permitida na CMPC é de no máximo 11 horas!`, 'error');
      const firstExceeded = document.querySelector('.worker-card-exceeded');
      if (firstExceeded) {
        firstExceeded.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Coleta descrições e vistos das atividades (A a J)
    const activitiesDescriptions = {};
    const activitiesSignatures = {};
    let totalHH = 0;
    let totalHE = 0;

    ACTIVITIES.forEach(letter => {
      const card = document.querySelector(`#activities-container-mobile .activity-card-mobile[data-act="${letter}"]`);
      if (card) {
        activitiesDescriptions[letter] = card.querySelector('.act-desc-mobile')?.value.trim() || '';
        activitiesSignatures[letter] = card.querySelector('.act-ass-mobile')?.value.trim() || '';
      }
    });

    // Total HH e Horas Extras (> 8h por colaborador)
    workers.forEach(w => {
      let wHours = 0;
      ACTIVITIES.forEach(letter => {
        const v = (parseFloat(w.activities[letter]) || 0);
        totalHH += v;
        wHours += v;
      });
      if (wHours > 8) totalHE += (wHours - 8);
    });

    // Coleta comentários, observações adicionais, equipamentos e assinaturas
    const comentarios = document.getElementById('m-rdo-comentarios')?.value.trim() || '';
    const obsAdicional = document.getElementById('m-rdo-obs-adicional')?.value.trim() || '';
    const sigPlanejamento = document.getElementById('m-rdo-sig-planejamento')?.value.trim() || '';
    const sigEngenheiro = document.getElementById('m-rdo-sig-engenheiro')?.value.trim() || '';
    const sigFiscalizacao = document.getElementById('m-rdo-sig-fiscalizacao')?.value.trim() || '';
    const sigEmailPlanejamento = document.getElementById('m-rdo-sig-email-planejamento')?.value.trim() || '';
    const sigEmailEngenheiro = document.getElementById('m-rdo-sig-email-engenheiro')?.value.trim() || '';
    const sigEmailFiscalizacao = document.getElementById('m-rdo-sig-email-fiscalizacao')?.value.trim() || '';

    const equipments = [];
    const equipRows = document.querySelectorAll('#equipments-container-mobile .equip-row-mobile');
    equipRows.forEach(row => {
      const nome = row.querySelector('.eq-nome')?.value.trim() || '';
      const qtRaw = row.querySelector('.eq-qt')?.value.trim() || '';
      const qt = qtRaw !== '' ? (parseFloat(qtRaw) || 0) : '';
      if (nome || qt !== '') {
        equipments.push({ nome, qt: qt === '' ? 1 : qt });
      }
    });

    // Coleta fotos dinâmicas
    const photos = [];
    const photoTotal = this.getPhotoSlotCount();
    for (let i = 0; i < photoTotal; i++) {
      const url = this.currentPhotos[i] || '';
      const caption = document.getElementById(`photo-caption-${i}`)?.value.trim() || '';
      photos.push({ url, caption });
    }
    while (photos.length > this.FIXED_PHOTO_SLOTS && !photos[photos.length - 1].url && !photos[photos.length - 1].caption) {
      photos.pop();
    }

    const session = StorageService.getSession();
    const existingRDO = this.currentRDOId ? StorageService.getRecordById(this.currentRDOId) : null;
    const isDraft = draftMode ? true : (existingRDO ? existingRDO.isDraft === true : true);
    const rdoStatus = isDraft ? 'rascunho' : (existingRDO ? (existingRDO.status || 'pendente') : 'pendente');

    const rdoPayload = {
      id: this.currentRDOId,
      numero,
      data,
      diaSemana,
      turno,
      clima,
      climaManha,
      climaTarde,
      climaNoite,
      contrato,
      contratante,
      contratada,
      encarregado,
      workers,
      totalHH,
      totalHE,
      activitiesDescriptions,
      activitiesSignatures,
      comentarios,
      sendObs: obsAdicional,
      obsAdicional,
      equipments,
      photos,
      isDraft,
      status: rdoStatus,
      sigPlanejamento,
      sigEngenheiro,
      sigFiscalizacao,
      sigEmailPlanejamento,
      sigEmailEngenheiro,
      sigEmailFiscalizacao,
      sigImgPlanejamento: this.currentSignatures.planejamento || '',
      sigImgEngenheiro: this.currentSignatures.engenheiro || '',
      sigImgFiscalizacao: this.currentSignatures.fiscalizacao || '',
      logo: StorageService.getUserLogo(session ? session.id : null),
      userId: existingRDO ? (existingRDO.userId || (session ? session.id : null)) : (session ? session.id : null),
      createdBy: existingRDO ? (existingRDO.createdBy || (session ? session.email : '')) : (session ? session.email : ''),
      createdByName: existingRDO ? (existingRDO.createdByName || (session ? session.name : '')) : (session ? session.name : ''),
      origem: 'mobile'
    };

    try {
      const saved = StorageService.saveRecord(rdoPayload);
      this.currentRDOId = saved.id;
      this.lastSavedRDOId = saved.id;
      this.renderMyDraftsMobile();

      if (draftMode) {
        this.renderDraftStatusBanner(saved);
        this.showToast('Rascunho salvo! O RDO NÃO foi enviado. Você pode continuar depois.', 'success');
        return;
      }

      this.openSuccessModal(saved);
      this.showToast('RDO salvo! Confirme o envio por e-mail se desejar.', 'success');
    } catch (err) {
      console.error('Erro ao salvar RDO:', err);
      this.showToast('Erro ao salvar RDO.', 'error');
    }
  },

  openSuccessModal(savedRecord) {
    this.lastSavedRDOId = savedRecord.id;
    const modal = document.getElementById('modal-success-mobile');
    const numEl = document.getElementById('success-rdo-num');
    const hhEl = document.getElementById('success-rdo-hh');
    const dateEl = document.getElementById('success-rdo-date');
    const emailInput = document.getElementById('m-send-email-input');
    const obsInput = document.getElementById('m-send-obs-input');
    const statusMsg = document.getElementById('m-send-status-msg');
    const sendBtn = document.getElementById('btn-m-confirm-send');

    if (numEl) numEl.textContent = savedRecord.numero;
    if (hhEl) hhEl.textContent = `${savedRecord.totalHH || 0} Horas`;
    if (dateEl) {
      const dt = new Date(savedRecord.data);
      dateEl.textContent = !isNaN(dt.getTime()) ? dt.toLocaleDateString('pt-BR') : savedRecord.data;
    }
    if (emailInput) emailInput.value = savedRecord.sentTo || savedRecord.sigEmailFiscalizacao || '';
    if (obsInput) obsInput.value = savedRecord.sendObs || savedRecord.obsAdicional || '';
    if (statusMsg) statusMsg.textContent = '';
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>✉️ Confirmar e Enviar E-mail</span>';
    }

    if (modal) modal.classList.remove('hidden');
  },

  BREVO_CONFIG: {
    apiKey: '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',
    senderName: 'Engenharia CMPC - SGQ',
    senderEmail: 'sistemasengenharia@cmpcrs.com.br',
    apiUrl: 'https://api.brevo.com/v3/smtp/email'
  },

  generateRDOEmailHtmlMobile(rdo, obs = '') {
    let formattedDate = '-';
    if (rdo.data) {
      if (rdo.data.includes('T')) {
        const [dPart, tPart] = rdo.data.split('T');
        const [y, m, d] = dPart.split('-');
        formattedDate = `${d}/${m}/${y} às ${tPart.slice(0, 5)}`;
      } else {
        formattedDate = rdo.data.split('-').reverse().join('/');
      }
    }
    return `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background: #065f46; color: #fff; padding: 20px; text-align: center;">
          <h2 style="margin:0;">Sistema de Gestão da Qualidade - ENGENHARIA CMPC</h2>
          <p style="margin:6px 0 0;">RDO N.º ${this.escapeHtml(rdo.numero || '-')} • ${this.escapeHtml(rdo.contrato || '-')}</p>
        </div>
        <div style="padding: 20px; font-size: 14px; color: #1e293b;">
          ${obs ? `<p style="background:#eff6ff; border-left:4px solid #3b82f6; padding:10px;"><strong>Observação:</strong> ${this.escapeHtml(obs)}</p>` : ''}
          <p><strong>Data / Hora:</strong> ${this.escapeHtml(formattedDate)} (${this.escapeHtml(rdo.diaSemana || '-')})</p>
          <p><strong>Encarregado:</strong> ${this.escapeHtml(rdo.encarregado || '-')} • <strong>Total HH:</strong> ${rdo.totalHH || 0} HH</p>
          <p><strong>Clima:</strong> ${this.escapeHtml(rdo.clima || '-')}</p>
          <p style="margin-top: 16px;">
            <a href="https://rdocmpc.netlify.app" target="_blank" style="background:#059669; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:700;">Acessar Sistema para Aprovar RDO</a>
          </p>
        </div>
      </div>
    `;
  },

  async handleConfirmSendMobile() {
    const rdoId = this.lastSavedRDOId || this.currentRDOId;
    const email = document.getElementById('m-send-email-input')?.value.trim() || '';
    const obs = document.getElementById('m-send-obs-input')?.value.trim() || '';
    const statusMsg = document.getElementById('m-send-status-msg');
    const sendBtn = document.getElementById('btn-m-confirm-send');

    if (!rdoId || !email) {
      this.showToast('Informe ao menos um e-mail de destino válido.', 'error');
      return;
    }

    const rdo = StorageService.getRecordById(rdoId);
    if (!rdo) {
      this.showToast('RDO não encontrado.', 'error');
      return;
    }

    const emailList = email.split(/[,;]/).map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'));
    if (emailList.length === 0) {
      this.showToast('Informe um endereço de e-mail válido.', 'error');
      return;
    }

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span>Enviando...</span>';
    }

    try {
      const cfg = StorageService.getBrevoConfig ? StorageService.getBrevoConfig() : {};
      const apiKey = (cfg && cfg.apiKey) ? cfg.apiKey.trim() : this.BREVO_CONFIG.apiKey;
      const senderEmail = (cfg && cfg.senderEmail) ? cfg.senderEmail.trim() : this.BREVO_CONFIG.senderEmail;
      const senderName = (cfg && cfg.senderName) ? cfg.senderName.trim() : this.BREVO_CONFIG.senderName;

      if (!apiKey) throw new Error('Chave de API Brevo não configurada.');

      const res = await fetch(this.BREVO_CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: emailList.map(e => ({ email: e })),
          subject: `[RDO CMPC] Relatório Diário de Obra Nº ${rdo.numero || '-'} - ${rdo.contrato || ''}`,
          htmlContent: this.generateRDOEmailHtmlMobile(rdo, obs)
        })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || `Erro HTTP ${res.status}`);
      }

      StorageService.markRecordAsSent(rdoId, email, obs);
      this.renderMyDraftsMobile();
      this.renderDraftStatusBanner(null);
      this.currentRDOId = null;
      if (statusMsg) statusMsg.innerHTML = `<span style="color:#059669;">✅ RDO enviado com sucesso para ${this.escapeHtml(email)}!</span>`;
      if (sendBtn) sendBtn.innerHTML = '<span>✅ Enviado!</span>';
      this.showToast(`✅ RDO ${rdo.numero} enviado para ${email}!`, 'success');
    } catch (err) {
      StorageService.markRecordAsSent(rdoId, email, obs);
      this.renderMyDraftsMobile();
      this.renderDraftStatusBanner(null);
      this.currentRDOId = null;
      if (statusMsg) statusMsg.innerHTML = `<span style="color:#b45309;">⚠️ RDO confirmado, mas Brevo retornou: ${this.escapeHtml(err.message)}</span>`;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>✉️ Tentar Reenviar E-mail</span>';
      }
      this.showToast(`⚠️ RDO confirmado, mas Brevo retornou: ${err.message}`, 'warning');
    }
  },

  closeSuccessModal() {
    const modal = document.getElementById('modal-success-mobile');
    if (modal) modal.classList.add('hidden');
  },

  startAnotherRDO() {
    this.closeSuccessModal();
    this.initNewRDO();
    this.showToast('Formulário pronto para novo lançamento.', 'info');
  },

  // ================================================================
  // TOAST NOTIFICATIONS
  // ================================================================
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container-mobile');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
};

// Start Mobile App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  mobileApp.init();
});
