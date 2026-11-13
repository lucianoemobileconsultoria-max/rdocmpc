/**
 * Main Application Controller - RDO Engenharia CMPC
 */

const ACTIVITIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const app = {
  currentRDOId: null,
  currentPhotos: ['', '', '', ''],
  currentSignatures: {
    planejamento: '',
    engenheiro: '',
    fiscalizacao: ''
  },
  currentSigTarget: null,
  sigPad: {
    canvas: null,
    ctx: null,
    isDrawing: false,
    hasDrawn: false,
    color: '#1d4ed8',
    lineWidth: 3.0,
    lastX: 0,
    lastY: 0
  },

  init() {
    this.bindEvents();
    this.checkSession();
    this.loadCompanyLogo();
    this.startLiveTimer();
  },

  // COMPRESS IMAGE HELPER
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

  currentLightboxIndex: 0,

  // PHOTO HANDLERS & LIGHTBOX
  handlePhotoSlotClick(event, index) {
    // If there is already an image in this slot, open fullscreen Lightbox!
    if (this.currentPhotos[index]) {
      this.openLightbox(index);
    } else {
      // Empty slot: trigger file input to upload
      const input = document.getElementById(`photo-input-${index}`);
      if (input) input.click();
    }
  },

  openLightbox(index) {
    const url = this.currentPhotos[index];
    if (!url) return;

    this.currentLightboxIndex = index;
    const modal = document.getElementById('modal-lightbox');
    const img = document.getElementById('lightbox-img');
    const slotTag = document.getElementById('lightbox-slot-tag');
    const captionEl = document.getElementById('lightbox-caption');
    const descInput = document.getElementById(`photo-desc-${index}`);

    const caption = (descInput && descInput.value.trim()) ? descInput.value.trim() : 'Registro fotográfico da obra';

    if (img) img.src = url;
    if (slotTag) slotTag.textContent = `Foto ${index + 1}`;
    if (captionEl) captionEl.textContent = caption;

    if (modal) modal.classList.remove('hidden');
  },

  closeLightbox(event = null) {
    const modal = document.getElementById('modal-lightbox');
    if (modal) modal.classList.add('hidden');
  },

  triggerChangeFromLightbox() {
    const idx = this.currentLightboxIndex;
    this.closeLightbox();
    const input = document.getElementById(`photo-input-${idx}`);
    if (input) input.click();
  },

  async handlePhotoUpload(event, index) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Por favor, selecione uma imagem válida.', 'error');
      return;
    }

    try {
      const base64 = await this.compressImage(file);
      this.currentPhotos[index] = base64;
      this.updatePhotoSlotUI(index, base64);
      this.showToast(`Foto ${index + 1} anexada com sucesso! Clique nela para ampliar.`, 'success');
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      this.showToast('Erro ao processar imagem.', 'error');
    }
    event.target.value = '';
  },

  removePhoto(index) {
    this.currentPhotos[index] = '';
    const descInput = document.getElementById(`photo-desc-${index}`);
    if (descInput) {
      descInput.value = index === 0 ? 'FOTO DA PT' : '';
    }
    this.updatePhotoSlotUI(index, '', index === 0 ? 'FOTO DA PT' : '');
    this.showToast(index === 0 ? 'Foto da PT removida. Lembre-se: ela é obrigatória.' : `Foto ${index + 1} removida.`, 'info');
  },

  updatePhotoSlotUI(index, base64Url, caption = null) {
    const img = document.getElementById(`photo-img-${index}`);
    const placeholder = document.getElementById(`photo-placeholder-${index}`);
    const delBtn = document.getElementById(`photo-del-${index}`);
    const changeBtn = document.getElementById(`photo-change-${index}`);
    const overlay = document.getElementById(`photo-overlay-${index}`);
    const descInput = document.getElementById(`photo-desc-${index}`);

    if (caption !== null && descInput) {
      descInput.value = (index === 0 && !caption) ? 'FOTO DA PT' : caption;
    } else if (index === 0 && descInput && !descInput.value.trim()) {
      descInput.value = 'FOTO DA PT';
    }

    if (base64Url && img && placeholder) {
      img.src = base64Url;
      img.classList.remove('hidden');
      placeholder.classList.add('hidden');
      if (overlay) overlay.classList.remove('hidden');
      if (delBtn) delBtn.classList.remove('hidden');
      if (changeBtn) changeBtn.classList.remove('hidden');
    } else if (img && placeholder) {
      img.src = '';
      img.classList.add('hidden');
      placeholder.classList.remove('hidden');
      if (overlay) overlay.classList.add('hidden');
      if (delBtn) delBtn.classList.add('hidden');
      if (changeBtn) changeBtn.classList.add('hidden');
    }
  },

  renderAllPhotosUI(photos = []) {
    for (let i = 0; i < 4; i++) {
      const photoItem = photos[i];
      let url = '';
      let cap = i === 0 ? 'FOTO DA PT' : '';
      if (photoItem) {
        if (typeof photoItem === 'string') {
          url = photoItem;
        } else {
          url = photoItem.url || '';
          cap = photoItem.caption || (i === 0 ? 'FOTO DA PT' : '');
        }
      }
      this.currentPhotos[i] = url;
      this.updatePhotoSlotUI(i, url, cap);
    }
  },

  // ==========================================================================
  // DIGITAL SIGNATURES CONTROLLER (DRAW, PASTE VIA CTRL+V, OR UPLOAD)
  // ==========================================================================
  openSignatureModal(target) {
    this.currentSigTarget = target;
    const modal = document.getElementById('modal-digital-signature');
    const titleEl = document.getElementById('sig-modal-title');
    const subtitleEl = document.getElementById('sig-modal-subtitle');
    const statusEl = document.getElementById('sig-status-indicator');

    const titles = {
      planejamento: 'Planejamento Executante',
      engenheiro: 'Engenheiro de Produção Executante',
      fiscalizacao: 'Fiscalização CMPC'
    };

    const targetTitle = titles[target] || 'Responsável';

    if (titleEl) {
      titleEl.textContent = `✍️ Assinatura: ${targetTitle}`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `Rubrica oficial para o campo "${targetTitle}"`;
    }
    if (statusEl) {
      statusEl.innerHTML = 'Pronto para assinar na tela, colar com <strong>Ctrl+V</strong> ou carregar imagem.';
    }

    if (modal) modal.classList.remove('hidden');

    // Popula select de usuários no modal da assinatura com os dados do target atual
    this.populateSigModalUserDropdown(target);

    // Initialize Canvas after modal display
    setTimeout(() => {
      this.initSignatureCanvas();
      const existing = this.currentSignatures[target];
      if (existing) {
        this.loadSignatureImageToCanvas(existing);
      }
    }, 60);

    this.bindSignaturePasteListener();
  },

  closeSignatureModal(event = null) {
    if (event && event.target && event.target.id !== 'modal-digital-signature') return;
    const modal = document.getElementById('modal-digital-signature');
    if (modal) modal.classList.add('hidden');
    this.unbindSignaturePasteListener();
  },

  initSignatureCanvas() {
    const canvas = document.getElementById('sig-pad-canvas');
    const container = document.getElementById('sig-canvas-container');
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Use actual pixel density for crisp retina strokes
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.sigPad.color;
    ctx.lineWidth = this.sigPad.lineWidth;

    this.sigPad.canvas = canvas;
    this.sigPad.ctx = ctx;
    this.sigPad.hasDrawn = false;

    // Attach listeners once
    if (!canvas._signatureListenersBound) {
      canvas._signatureListenersBound = true;

      const getNormalizedPos = (e) => {
        const r = canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }
        const scaleX = (canvas.width / dpr) / r.width;
        const scaleY = (canvas.height / dpr) / r.height;
        return {
          x: (clientX - r.left) * scaleX,
          y: (clientY - r.top) * scaleY
        };
      };

      const startDraw = (e) => {
        e.preventDefault();
        this.sigPad.isDrawing = true;
        const pos = getNormalizedPos(e);
        this.sigPad.lastX = pos.x;
        this.sigPad.lastY = pos.y;
        this.sigPad.hasDrawn = true;
      };

      const draw = (e) => {
        if (!this.sigPad.isDrawing) return;
        e.preventDefault();
        const pos = getNormalizedPos(e);
        const ctx = this.sigPad.ctx;
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(this.sigPad.lastX, this.sigPad.lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = this.sigPad.color;
        ctx.lineWidth = this.sigPad.lineWidth;
        ctx.stroke();

        this.sigPad.lastX = pos.x;
        this.sigPad.lastY = pos.y;
      };

      const stopDraw = () => {
        this.sigPad.isDrawing = false;
      };

      // Mouse Listeners
      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      window.addEventListener('mouseup', stopDraw);

      // Touch Listeners
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDraw);

      // Drag & Drop File Listeners
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('dragover');
      });
      container.addEventListener('dragleave', () => {
        container.classList.remove('dragover');
      });
      container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              this.loadSignatureImageToCanvas(loadEvt.target.result);
              this.showToast('Imagem arrastada e carregada com sucesso!', 'success');
            };
            reader.readAsDataURL(file);
          }
        }
      });
    }
  },

  setSignatureColor(color) {
    this.sigPad.color = color;
    document.querySelectorAll('.sig-color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    if (this.sigPad.ctx) {
      this.sigPad.ctx.strokeStyle = color;
    }
  },

  setSignatureWidth(width) {
    this.sigPad.lineWidth = width;
    const btnThin = document.getElementById('btn-size-thin');
    const btnMed = document.getElementById('btn-size-med');
    const btnThick = document.getElementById('btn-size-thick');
    if (btnThin) btnThin.classList.toggle('active', width < 2.5);
    if (btnMed) btnMed.classList.toggle('active', width >= 2.5 && width < 4.0);
    if (btnThick) btnThick.classList.toggle('active', width >= 4.0);
    if (this.sigPad.ctx) {
      this.sigPad.ctx.lineWidth = width;
    }
  },

  clearSignatureCanvas() {
    const canvas = this.sigPad.canvas;
    const ctx = this.sigPad.ctx;
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    this.sigPad.hasDrawn = false;

    const statusEl = document.getElementById('sig-status-indicator');
    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#64748b;">Quadro limpo. Desenhe sua rubrica, cole com <strong>Ctrl+V</strong> ou carregue uma imagem.</span>';
    }
  },

  loadSignatureImageToCanvas(dataUrl) {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = this.sigPad.canvas;
      const ctx = this.sigPad.ctx;
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const canvasW = canvas.width / dpr;
      const canvasH = canvas.height / dpr;

      ctx.clearRect(0, 0, canvasW, canvasH);

      // Fit image neatly inside canvas with padding
      const maxW = canvasW * 0.90;
      const maxH = canvasH * 0.85;
      let drawW = img.width;
      let drawH = img.height;

      const scale = Math.min(maxW / drawW, maxH / drawH, 1.0);
      drawW = drawW * scale;
      drawH = drawH * scale;

      const posX = (canvasW - drawW) / 2;
      const posY = (canvasH - drawH) / 2;

      ctx.drawImage(img, posX, posY, drawW, drawH);
      this.sigPad.hasDrawn = true;
    };
    img.src = dataUrl;
  },

  // CLIPBOARD PASTE LISTENER (CTRL + V)
  _sigPasteHandler: null,
  bindSignaturePasteListener() {
    this.unbindSignaturePasteListener();
    this._sigPasteHandler = (e) => {
      const modal = document.getElementById('modal-digital-signature');
      if (!modal || modal.classList.contains('hidden')) return;

      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData || !clipboardData.items) return;

      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            this.loadSignatureImageToCanvas(loadEvt.target.result);
            const statusEl = document.getElementById('sig-status-indicator');
            if (statusEl) {
              statusEl.innerHTML = '<span style="color:#059669; font-weight:700;">✅ Assinatura colada da Área de Transferência com sucesso!</span>';
            }
            this.showToast('Assinatura colada com sucesso da área de transferência!', 'success');
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    window.addEventListener('paste', this._sigPasteHandler);
  },

  unbindSignaturePasteListener() {
    if (this._sigPasteHandler) {
      window.removeEventListener('paste', this._sigPasteHandler);
      this._sigPasteHandler = null;
    }
  },

  handleSignatureFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Por favor, selecione um arquivo de imagem válido (PNG, JPG, etc).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      this.loadSignatureImageToCanvas(loadEvt.target.result);
      const statusEl = document.getElementById('sig-status-indicator');
      if (statusEl) {
        statusEl.innerHTML = '<span style="color:#059669; font-weight:700;">✅ Imagem carregada do arquivo com sucesso!</span>';
      }
      this.showToast('Imagem carregada com sucesso!', 'success');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  },

  applySignatureFromModal() {
    const target = this.currentSigTarget;
    if (!target) return;

    const canvas = this.sigPad.canvas;
    if (!canvas || !this.sigPad.hasDrawn) {
      this.showToast('Por favor, desenhe uma rubrica, cole com Ctrl+V ou carregue uma imagem antes de confirmar.', 'warning');
      return;
    }

    // Export canvas as PNG Data URL
    const dataUrl = canvas.toDataURL('image/png');
    this.currentSignatures[target] = dataUrl;
    this.updateSignatureBoxUI(target, dataUrl);
    this.closeSignatureModal();
    this.showToast('Assinatura digital aplicada com sucesso!', 'success');
  },

  clearDigitalSignature(target) {
    this.currentSignatures[target] = '';
    this.updateSignatureBoxUI(target, '');
    this.showToast('Assinatura digital removida.', 'info');
  },

  // ==========================================================================
  // USUÁRIOS NAS ASSINATURAS (AUTO PREENCHIMENTO DE NOME E EMAIL)
  // ==========================================================================
  populateSignatureUserDropdowns() {
    const targets = ['planejamento', 'engenheiro', 'fiscalizacao'];
    const users = StorageService.getUsers() || [];

    targets.forEach(t => {
      const select = document.getElementById(`rdo-sig-${t}`);
      if (!select) return;

      const currentVal = select.value || '';
      select.innerHTML = '<option value="">-- Selecionar Nome --</option>';

      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.name;
        opt.textContent = `${u.name} (${u.role || 'Usuário'})`;
        opt.dataset.email = u.email || '';
        select.appendChild(opt);
      });

      // Se havia valor customizado que não está na lista de opções, adiciona
      if (currentVal && !users.some(u => u.name === currentVal)) {
        const customOpt = document.createElement('option');
        customOpt.value = currentVal;
        customOpt.textContent = currentVal;
        select.appendChild(customOpt);
      }
      select.value = currentVal;
    });
  },

  onSigUserSelectChange(target, selectedName) {
    const select = document.getElementById(`rdo-sig-${target}`);
    const emailInput = document.getElementById(`rdo-sig-email-${target}`);
    if (!emailInput) return;

    if (!selectedName) {
      emailInput.value = '';
      return;
    }

    const users = StorageService.getUsers() || [];
    const matched = users.find(u => u.name === selectedName);
    if (matched && matched.email) {
      emailInput.value = matched.email;
    } else {
      const opt = select?.selectedOptions?.[0];
      emailInput.value = opt?.dataset?.email || '';
    }

    // Auto-carrega assinatura salva no perfil do usuário, se houver
    if (matched && matched.signature && !this.currentSignatures[target]) {
      this.currentSignatures[target] = matched.signature;
      this.updateSignatureBoxUI(target, matched.signature);
      this.showToast(`Assinatura permanente de "${matched.name}" carregada automaticamente!`, 'info');
    }
  },

  syncSigEmailField(target, name, existingEmail = '') {
    const emailInput = document.getElementById(`rdo-sig-email-${target}`);
    if (!emailInput) return;

    if (existingEmail) {
      emailInput.value = existingEmail;
      return;
    }

    if (!name) {
      emailInput.value = '';
      return;
    }

    const users = StorageService.getUsers() || [];
    const matched = users.find(u => u.name === name);
    emailInput.value = matched ? (matched.email || '') : '';
  },

  populateSigModalUserDropdown(target) {
    const modalSelect = document.getElementById('sig-modal-user-select');
    const modalEmail = document.getElementById('sig-modal-user-email');
    if (!modalSelect || !modalEmail) return;

    const users = StorageService.getUsers() || [];
    const mainSelect = document.getElementById(`rdo-sig-${target}`);
    const mainVal = mainSelect ? mainSelect.value : '';

    modalSelect.innerHTML = '<option value="">-- Selecionar Nome --</option>';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.name;
      opt.textContent = `${u.name} (${u.role || 'Usuário'})`;
      opt.dataset.email = u.email || '';
      modalSelect.appendChild(opt);
    });

    if (mainVal && !users.some(u => u.name === mainVal)) {
      const customOpt = document.createElement('option');
      customOpt.value = mainVal;
      customOpt.textContent = mainVal;
      modalSelect.appendChild(customOpt);
    }

    modalSelect.value = mainVal;
    const matched = users.find(u => u.name === mainVal);
    const mainEmailInput = document.getElementById(`rdo-sig-email-${target}`);
    modalEmail.value = mainEmailInput?.value || (matched ? (matched.email || '') : '');
  },

  onSigModalUserChange(selectedName) {
    const modalSelect = document.getElementById('sig-modal-user-select');
    const modalEmail = document.getElementById('sig-modal-user-email');
    if (!modalEmail) return;

    if (!selectedName) {
      modalEmail.value = '';
    } else {
      const users = StorageService.getUsers() || [];
      const matched = users.find(u => u.name === selectedName);
      if (matched && matched.email) {
        modalEmail.value = matched.email;
      } else {
        const opt = modalSelect?.selectedOptions?.[0];
        modalEmail.value = opt?.dataset?.email || '';
      }
    }

    // Sincroniza imediatamente com o card principal da assinatura
    const target = this.currentSigTarget;
    if (target) {
      const mainSelect = document.getElementById(`rdo-sig-${target}`);
      const mainEmail = document.getElementById(`rdo-sig-email-${target}`);
      if (mainSelect) mainSelect.value = selectedName;
      if (mainEmail) mainEmail.value = modalEmail.value;

      // Se o usuário selecionado no modal tem assinatura permanente salva e o canvas está em branco
      const users = StorageService.getUsers() || [];
      const matched = users.find(u => u.name === selectedName);
      if (matched && matched.signature && (!this.sigPad.hasDrawn || !this.currentSignatures[target])) {
        this.loadSignatureImageToCanvas(matched.signature);
        const statusEl = document.getElementById('sig-status-indicator');
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:#059669; font-weight:700;">✅ Assinatura padrão do perfil de "${matched.name}" carregada no quadro!</span>`;
        }
      }
    }
  },

  saveSignatureToUserProfile() {
    const canvas = this.sigPad.canvas;
    if (!canvas || !this.sigPad.hasDrawn) {
      this.showToast('Por favor, desenhe uma rubrica, cole com Ctrl+V ou carregue uma imagem antes de salvar no perfil.', 'warning');
      return;
    }

    const modalSelect = document.getElementById('sig-modal-user-select');
    const selectedName = modalSelect?.value || '';

    if (!selectedName) {
      this.showToast('Selecione primeiro qual usuário receberá esta assinatura permanente na lista abaixo do quadro.', 'warning');
      return;
    }

    const users = StorageService.getUsers() || [];
    const userIndex = users.findIndex(u => u.name === selectedName);
    if (userIndex < 0) {
      this.showToast(`Usuário "${selectedName}" não encontrado no cadastro do sistema.`, 'error');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const targetUser = users[userIndex];
    targetUser.signature = dataUrl;

    StorageService.updateUser(targetUser.id, { signature: dataUrl });

    // Aplica no target atual imediatamente
    const target = this.currentSigTarget;
    if (target) {
      this.currentSignatures[target] = dataUrl;
      this.updateSignatureBoxUI(target, dataUrl);
    }

    this.showToast(`Assinatura permanente de "${targetUser.name}" salva com sucesso no banco de dados!`, 'success');
  },

  updateSignatureBoxUI(target, base64Url) {
    const img = document.getElementById(`sig-img-${target}`);
    const prompt = document.getElementById(`sig-prompt-${target}`);
    const clearBtn = document.getElementById(`sig-clear-${target}`);

    if (base64Url) {
      if (img) {
        img.src = base64Url;
        img.classList.remove('hidden');
      }
      if (prompt) prompt.classList.add('hidden');
      if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
      if (img) {
        img.src = '';
        img.classList.add('hidden');
      }
      if (prompt) prompt.classList.remove('hidden');
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  },

  // CREDITS & ABOUT MODAL
  openCreditsModal() {
    const modal = document.getElementById('modal-credits');
    if (modal) modal.classList.remove('hidden');
  },

  closeCreditsModal(event = null) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('modal-credits');
    if (modal) modal.classList.add('hidden');
  },

  // MANUAL MODAL
  openManualModal() {
    const modal = document.getElementById('modal-manual');
    if (modal) modal.classList.remove('hidden');
  },

  closeManualModal(event = null) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('modal-manual');
    if (modal) modal.classList.add('hidden');
  },

  bindEvents() {
    // Escape key to close lightbox and modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeLightbox();
        this.closeManualModal();
        this.closeCreditsModal();
        this.closeDeleteModal();
        this.closeSendModal();
        this.closeApproveModal();
        this.closeSignatureModal();
        if (typeof admin !== 'undefined' && admin.closeUserModal) {
          admin.closeUserModal();
        }
      }
    });

    // Login form
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login();
      });
    }

    // Modal background click to close
    const modalUser = document.getElementById('modal-user');
    if (modalUser) {
      modalUser.addEventListener('click', (e) => {
        if (e.target === modalUser) {
          admin.closeUserModal();
        }
      });
    }
  },

  // AUTHENTICATION
  checkSession() {
    const session = StorageService.getSession();
    if (session) {
      this.showAppView(session);
    } else {
      this.showLoginView();
    }
  },

  toggleLoginPassword() {
    const input = document.getElementById('login-password');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  login() {
    const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
    const password = (document.getElementById('login-password').value || '').trim();

    const users = StorageService.getUsers();
    let matched = users.find(u => (u.email || '').trim().toLowerCase() === email && String(u.password || '').trim() === password);

    // Fallback garantido para o Administrador Master padrão
    if (!matched && email === 'engelmobile2020@gmail.com' && password === '789512') {
      matched = {
        id: 'user-admin-master',
        name: 'Administrador Master',
        email: 'engelmobile2020@gmail.com',
        role: 'Admin'
      };
      if (StorageService.initLocalDefaults) {
        StorageService.initLocalDefaults();
      }
    }

    if (matched) {
      StorageService.setSession({
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role
      });
      if (StorageService.sendPresenceHeartbeat) {
        StorageService.sendPresenceHeartbeat();
      }
      this.showToast(`Bem-vindo, ${matched.name}!`, 'success');
      this.showAppView(matched);
    } else {
      this.showToast('E-mail ou senha incorretos. Verifique suas credenciais.', 'error');
    }
  },

  logout() {
    if (StorageService.removePresence) {
      StorageService.removePresence();
    }
    StorageService.clearSession();
    this.showLoginView();
    this.showToast('Sessão encerrada.', 'info');
  },

  showLoginView() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-app').classList.add('hidden');
  },

  showAppView(user) {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');

    document.getElementById('current-user-name').textContent = user.name;
    document.getElementById('current-user-role').textContent = user.role;

    // Update Nav Admin Text
    const navAdminText = document.getElementById('nav-admin-text');
    if (navAdminText) {
      navAdminText.textContent = user.role === 'Admin' ? 'Painel Admin' : 'Meu Painel';
    }

    // Update list subtitle
    const pageSub = document.querySelector('#tab-list .page-subtitle');
    if (pageSub) {
      if (user.role === 'Admin') {
        pageSub.textContent = 'Visão de Administrador: visualizando todos os RDOs cadastrados no sistema.';
      } else {
        pageSub.textContent = `Visualizando apenas os RDOs emitidos pelo seu usuário (${user.name}).`;
      }
    }

    this.showTab('list');
    this.renderRDOList();
  },

  // TABS NAVIGATION
  showTab(tabName) {
    const tabs = ['list', 'form', 'admin'];
    tabs.forEach(t => {
      const el = document.getElementById(`tab-${t}`);
      const btn = document.getElementById(`nav-btn-${t}`);
      if (el) el.classList.toggle('hidden', t !== tabName);
      if (btn) btn.classList.toggle('active', t === tabName);
    });

    if (tabName === 'list') {
      this.renderRDOList();
    } else if (tabName === 'admin') {
      admin.renderPanel();
    }
  },

  // LOGO MANAGEMENT (PER USER)
  loadCompanyLogo(customLogo = null) {
    const session = StorageService.getSession();
    const userLogo = StorageService.getUserLogo(session ? session.id : null);
    const logoSrc = customLogo !== null ? customLogo : (userLogo || 'logo cmpc.png');
    const logoImg = document.getElementById('cmpc-logo-img');
    const logoText = document.getElementById('logo-placeholder-text');
    const statBadgeImg = document.getElementById('user-stat-badge-logo');

    if (statBadgeImg) {
      statBadgeImg.src = logoSrc;
    }

    if (logoImg && logoText) {
      if (logoSrc) {
        logoImg.src = logoSrc;
        logoImg.classList.remove('hidden');
        logoText.classList.add('hidden');
      } else {
        logoImg.src = 'logo cmpc.png';
        logoImg.classList.remove('hidden');
        logoText.classList.add('hidden');
      }
    }
  },

  async handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Por favor, selecione uma imagem válida para o logotipo.', 'error');
      return;
    }

    try {
      const base64 = await this.compressImage(file, 400, 0.85);
      const session = StorageService.getSession();
      StorageService.setUserLogo(session ? session.id : null, base64);
      this.loadCompanyLogo(base64);
      if (typeof admin !== 'undefined' && admin.renderPanelLogo) {
        admin.renderPanelLogo();
      }
      this.showToast('Logotipo da sua empresa salvo como padrão para seus RDOs!', 'success');
    } catch (err) {
      console.error('Erro ao processar logotipo:', err);
      this.showToast('Erro ao processar imagem do logotipo.', 'error');
    }
    event.target.value = '';
  },

  getRDOExpiryInfo(rdo) {
    if (!rdo) {
      return {
        isSent: false,
        isApproved: false,
        isRejected: false,
        isPendingApproval: false,
        isExpired: false,
        remainingMs: 0,
        text: '',
        hours: 0,
        minutes: 0,
        sentTo: '',
        sentAt: null,
        approvedBy: '',
        approvedAt: null,
        approvalNotes: '',
        approvalStatus: 'pendente'
      };
    }

    const isApproved = Boolean(rdo.approved === true || rdo.approvalStatus === 'aprovado' || rdo.status === 'aprovado');
    const isRejected = Boolean(rdo.approvalStatus === 'reprovado');
    const isSent = Boolean(rdo.sent === true || rdo.status === 'enviado' || rdo.sentAt || isApproved);
    const isPendingApproval = isSent && !isApproved && !isRejected;

    let createdTime = null;
    if (rdo.createdAt) {
      createdTime = new Date(rdo.createdAt).getTime();
    } else if (rdo.data) {
      createdTime = new Date(rdo.data).getTime();
    }

    if (!createdTime || isNaN(createdTime)) {
      createdTime = Date.now();
    }

    const now = Date.now();
    const expiryTime = createdTime + (24 * 60 * 60 * 1000); // 24 horas a partir da criação
    const remainingMs = expiryTime - now;
    const isExpired = !isSent && (remainingMs <= 0);

    let text = '';
    let hours = 0;
    let minutes = 0;

    if (isApproved) {
      const appDate = rdo.approvedAt ? new Date(rdo.approvedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      text = `Aprovado${appDate ? ' (' + appDate + ')' : ''}`;
    } else if (isRejected) {
      text = 'Reprovado';
    } else if (isSent) {
      const sentDate = rdo.sentAt ? new Date(rdo.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      text = `Aguardando Aprovação${sentDate ? ' (' + sentDate + ')' : ''}`;
    } else if (isExpired) {
      text = 'Bloqueado (+24h)';
    } else {
      const totalMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)));
      hours = Math.floor(totalMinutes / 60);
      minutes = totalMinutes % 60;
      text = `Expira em ${hours}h ${minutes}m`;
    }

    return {
      isSent,
      isApproved,
      isRejected,
      isPendingApproval,
      isExpired,
      remainingMs,
      hours,
      minutes,
      text,
      sentTo: rdo.sentTo || '',
      sentAt: rdo.sentAt || null,
      approvedBy: rdo.approvedBy || '',
      approvedAt: rdo.approvedAt || null,
      approvalNotes: rdo.approvalNotes || '',
      approvalStatus: rdo.approvalStatus || (isApproved ? 'aprovado' : (isRejected ? 'reprovado' : 'pendente'))
    };
  },

  isRDOLocked(rdo) {
    if (!rdo) return false;
    const info = this.getRDOExpiryInfo(rdo);
    return info.isExpired;
  },

  renderRDOFormStatusBanner(rdo) {
    const banner = document.getElementById('rdo-form-status-banner');
    const sendBtnLabel = document.getElementById('btn-editor-send-label');
    if (!banner) return;

    if (!rdo || !rdo.id) {
      banner.className = 'rdo-form-status-banner rdo-banner-new';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span>⏱️</span>
          <span><strong>Novo RDO:</strong> O prazo de 24 horas para envio e aprovação iniciará assim que o RDO for salvo.</span>
        </div>
      `;
      if (sendBtnLabel) sendBtnLabel.textContent = 'Enviar RDO';
      return;
    }

    const session = StorageService.getSession();
    const canApprove = session && (session.role === 'Admin' || session.role === 'Engenheiro');
    const info = this.getRDOExpiryInfo(rdo);

    if (info.isApproved) {
      const appDate = info.approvedAt ? new Date(info.approvedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      banner.className = 'rdo-form-status-banner rdo-banner-approved';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.25rem;">✅</span>
          <div>
            <strong>RDO Aprovado pela Fiscalização / Engenharia!</strong>
            <span style="font-size:0.82rem; margin-left:6px; opacity:0.95;">Aprovador: <strong>${this.escapeHtml(info.approvedBy || rdo.sigFiscalizacao || 'Fiscalização')}</strong>${appDate ? ' • ' + appDate : ''}</span>
            ${info.approvalNotes ? `<div style="font-size:0.8rem; font-style:italic; margin-top:2px;">Parecer: "${this.escapeHtml(info.approvalNotes)}"</div>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          ${canApprove ? `<button type="button" class="btn btn-outline btn-xs" style="background:#fff; color:#065f46; border-color:#a7f3d0;" onclick="app.openApproveModal('${rdo.id}')">Alterar Parecer</button>` : ''}
          <button type="button" class="btn btn-outline btn-xs" style="background:#fff; color:#065f46; border-color:#a7f3d0;" onclick="app.openSendModal('${rdo.id}')">Reenviar E-mail</button>
        </div>
      `;
      if (sendBtnLabel) sendBtnLabel.textContent = 'Reenviar';
    } else if (info.isRejected) {
      const appDate = info.approvedAt ? new Date(info.approvedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      banner.className = 'rdo-form-status-banner rdo-banner-rejected';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.25rem;">❌</span>
          <div>
            <strong>RDO Reprovado / Ajustes Solicitados pela Fiscalização</strong>
            <span style="font-size:0.82rem; margin-left:6px; opacity:0.95;">Parecer: <strong>${this.escapeHtml(info.approvalNotes || 'Não aprovado')}</strong>${appDate ? ' • ' + appDate : ''}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          ${canApprove ? `<button type="button" class="btn btn-primary btn-xs btn-approve-quick" onclick="app.openApproveModal('${rdo.id}')">Reavaliar / Aprovar</button>` : ''}
          <button type="button" class="btn btn-outline btn-xs" onclick="app.openSendModal('${rdo.id}')">Reenviar E-mail</button>
        </div>
      `;
      if (sendBtnLabel) sendBtnLabel.textContent = 'Reenviar';
    } else if (info.isSent) {
      const sentDate = info.sentAt ? new Date(info.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      banner.className = 'rdo-form-status-banner rdo-banner-pending-approval';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.25rem;">⏳</span>
          <div>
            <strong>RDO Enviado — Aguardando Aprovação (Check) da Fiscalização</strong>
            <span style="font-size:0.82rem; margin-left:6px; opacity:0.95;">Enviado para: <strong>${this.escapeHtml(info.sentTo || 'Cadastrado')}</strong>${sentDate ? ' • ' + sentDate : ''}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          ${canApprove ? `<button type="button" class="btn btn-primary btn-xs btn-approve-quick" onclick="app.openApproveModal('${rdo.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Aprovar RDO</span>
          </button>` : ''}
          <button type="button" class="btn btn-outline btn-xs" style="background:#fff; color:#1e40af; border-color:#bfdbfe;" onclick="app.openSendModal('${rdo.id}')">
            Reenviar
          </button>
        </div>
      `;
      if (sendBtnLabel) sendBtnLabel.textContent = 'Reenviar';
    } else if (info.isExpired) {
      banner.className = 'rdo-form-status-banner rdo-banner-expired';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.2rem;">🔒</span>
          <div>
            <strong>RDO Bloqueado (+24 horas sem envio):</strong>
            <span style="font-size:0.82rem; margin-left:6px;">O prazo regulamentar de 24 horas encerrou-se sem envio de confirmação.</span>
          </div>
        </div>
      `;
      if (sendBtnLabel) sendBtnLabel.textContent = 'Enviar RDO';
    } else {
      banner.className = 'rdo-form-status-banner rdo-banner-countdown';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.2rem;">⏳</span>
          <div>
            <strong>Contador Regressivo de Envio:</strong>
            <span>Restam <strong>${info.hours}h ${info.minutes}m</strong> para confirmar o envio por e-mail antes do bloqueio de 24h.</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-xs" style="background:#059669; border-color:#059669; display:inline-flex; align-items:center; gap:5px;" onclick="app.openSendModal('${rdo.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          <span>Enviar Agora</span>
        </button>
      `;
      if (sendBtnLabel) sendBtnLabel.textContent = 'Enviar RDO';
    }
  },

  getCurrentDateTimeLocal() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  },

  // RDO CRUD & FORM MANAGEMENT
  createNewRDO() {
    this.currentRDOId = null;
    document.getElementById('editor-page-heading').textContent = 'Novo Relatório Diário de Obra (RDO)';

    const watermark = document.getElementById('rdo-lock-watermark');
    if (watermark) watermark.classList.add('hidden');

    this.renderRDOFormStatusBanner(null);

    const currentDT = this.getCurrentDateTimeLocal();
    const year = new Date().getFullYear();
    const records = StorageService.getRecords();
    const nextNum = String(records.length + 1).padStart(4, '0') + '/' + year;

    // Load default company logo for active user
    this.loadCompanyLogo();

    // Reset Form fields
    document.getElementById('rdo-numero').value = nextNum;
    document.getElementById('rdo-data').value = currentDT;
    document.getElementById('rdo-dia-semana').value = this.getDayOfWeekName(currentDT);
    document.getElementById('rdo-turno').value = 'Diurno';
    const cManhaEl = document.getElementById('rdo-clima-manha');
    if (cManhaEl) cManhaEl.value = 'Sol';
    const cTardeEl = document.getElementById('rdo-clima-tarde');
    if (cTardeEl) cTardeEl.value = 'Sol';
    const cNoiteEl = document.getElementById('rdo-clima-noite');
    if (cNoiteEl) cNoiteEl.value = 'Sem Trabalho';
    document.getElementById('rdo-contrato').value = '';
    document.getElementById('rdo-contratante').value = 'CMPC CELULOSE RIOGRANDENSE';
    document.getElementById('rdo-contratada').value = '';
    
    const session = StorageService.getSession();
    document.getElementById('rdo-encarregado').value = session ? session.name : '';

    // Clear worker rows and add 3 blank default rows
    const tbody = document.getElementById('workers-tbody');
    tbody.innerHTML = '';
    this.addWorkerRow();
    this.addWorkerRow();
    this.addWorkerRow();

    // Clear Activities
    ACTIVITIES.forEach(letter => {
      const row = document.querySelector(`#activities-tbody tr[data-act="${letter}"]`);
      if (row) {
        row.querySelector('.act-desc-input').value = '';
        row.querySelector('.act-ass-input').value = '';
      }
    });

    document.getElementById('rdo-comentarios').value = '';
    const obsAdicionalInit = document.getElementById('rdo-obs-adicional');
    if (obsAdicionalInit) obsAdicionalInit.value = '';
    const equipTbody = document.getElementById('equipments-tbody');
    if (equipTbody) {
      equipTbody.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        this.addEquipmentRow();
      }
    }
    document.getElementById('rdo-sig-planejamento').value = '';
    document.getElementById('rdo-sig-engenheiro').value = '';
    document.getElementById('rdo-sig-fiscalizacao').value = '';
    const emailPlan = document.getElementById('rdo-sig-email-planejamento');
    const emailEng = document.getElementById('rdo-sig-email-engenheiro');
    const emailFisc = document.getElementById('rdo-sig-email-fiscalizacao');
    if (emailPlan) emailPlan.value = '';
    if (emailEng) emailEng.value = '';
    if (emailFisc) emailFisc.value = '';

    // Popula dropdowns de usuários nas assinaturas
    this.populateSignatureUserDropdowns();

    // Reset Digital Signatures
    this.currentSignatures = { planejamento: '', engenheiro: '', fiscalizacao: '' };
    this.updateSignatureBoxUI('planejamento', '');
    this.updateSignatureBoxUI('engenheiro', '');
    this.updateSignatureBoxUI('fiscalizacao', '');

    // Reset and render 4 photos
    this.renderAllPhotosUI(['', '', '', '']);

    this.calculateTotalHH();
    this.showTab('form');
  },

  duplicateRDO(rdoId) {
    const rdo = StorageService.getRecordById(rdoId);
    if (!rdo) {
      this.showToast('RDO original não encontrado para duplicação.', 'error');
      return;
    }

    const session = StorageService.getSession();
    const isOwner = session && (
      rdo.userId === session.id ||
      rdo.createdBy === session.email ||
      (!rdo.userId && rdo.encarregado && rdo.encarregado.toLowerCase() === session.name.toLowerCase())
    );

    if (session && session.role !== 'Admin' && !isOwner) {
      this.showToast('Acesso restrito: você só pode duplicar os RDOs criados por você.', 'error');
      return;
    }

    this.currentRDOId = null;
    document.getElementById('editor-page-heading').textContent = 'Novo Relatório Diário de Obra (RDO Duplicado)';

    const watermark = document.getElementById('rdo-lock-watermark');
    if (watermark) {
      watermark.classList.add('hidden');
    }

    this.renderRDOFormStatusBanner(null);

    // Gera novo número e nova data/hora local atual
    const currentDT = this.getCurrentDateTimeLocal();
    const year = new Date().getFullYear();
    const records = StorageService.getRecords();
    const nextNum = String(records.length + 1).padStart(4, '0') + '/' + year;

    document.getElementById('rdo-numero').value = nextNum;
    document.getElementById('rdo-data').value = currentDT;
    document.getElementById('rdo-dia-semana').value = this.getDayOfWeekName(currentDT);
    document.getElementById('rdo-turno').value = rdo.turno || 'Diurno';

    // Clima
    let cManha = rdo.climaManha;
    let cTarde = rdo.climaTarde;
    let cNoite = rdo.climaNoite;

    if (!cManha && rdo.clima) {
      if (rdo.clima.includes('Chuva Forte')) cManha = 'Chuva Forte';
      else if (rdo.clima.includes('Chuva Fraca')) cManha = 'Chuva Fraca';
      else if (rdo.clima.includes('Nublado')) cManha = 'Nublado';
      else if (rdo.clima.includes('Vento')) cManha = 'Vento Forte';
      else if (rdo.clima.includes('Impraticável') || rdo.clima.includes('Imprat.')) cManha = 'Impraticável';
      else cManha = 'Sol';
      cTarde = cManha;
      cNoite = 'Sem Trabalho';
    }

    const cManhaEl = document.getElementById('rdo-clima-manha');
    if (cManhaEl) cManhaEl.value = cManha || 'Sol';
    const cTardeEl = document.getElementById('rdo-clima-tarde');
    if (cTardeEl) cTardeEl.value = cTarde || 'Sol';
    const cNoiteEl = document.getElementById('rdo-clima-noite');
    if (cNoiteEl) cNoiteEl.value = cNoite || 'Sem Trabalho';

    document.getElementById('rdo-contrato').value = rdo.contrato || '';
    document.getElementById('rdo-contratante').value = rdo.contratante || 'CMPC CELULOSE RIOGRANDENSE';
    document.getElementById('rdo-contratada').value = rdo.contratada || '';
    document.getElementById('rdo-encarregado').value = session ? session.name : (rdo.encarregado || '');

    // Equipe / Colaboradores (Mantém a equipe preenchida)
    const tbody = document.getElementById('workers-tbody');
    tbody.innerHTML = '';
    if (rdo.workers && rdo.workers.length > 0) {
      rdo.workers.forEach(w => this.addWorkerRow(w));
    } else {
      this.addWorkerRow();
      this.addWorkerRow();
      this.addWorkerRow();
    }

    // Atividades (Mantém descrições das atividades de A a J, e limpa vistos/rubricas)
    ACTIVITIES.forEach(letter => {
      const row = document.querySelector(`#activities-tbody tr[data-act="${letter}"]`);
      if (row) {
        row.querySelector('.act-desc-input').value = (rdo.activitiesDescriptions && rdo.activitiesDescriptions[letter]) || '';
        row.querySelector('.act-ass-input').value = '';
      }
    });

    // Equipamentos (Mantém lista de equipamentos)
    const equipTbody = document.getElementById('equipments-tbody');
    if (equipTbody) {
      equipTbody.innerHTML = '';
      const equipList = Array.isArray(rdo.equipments) ? rdo.equipments : [];
      const minRows = Math.max(4, equipList.length);
      for (let i = 0; i < minRows; i++) {
        this.addEquipmentRow(equipList[i] || null);
      }
    }

    // ================================================================
    // CAMPOS LIMPOS CONFORME SOLICITADO:
    // 1. Fotos (limpas)
    // 2. Comentários (limpos)
    // 3. Observações / Mensagem Adicional (limpas)
    // 4. Assinaturas (limpas)
    // ================================================================
    
    // 1. Fotos Limpas
    this.currentPhotos = ['', '', '', ''];
    this.renderAllPhotosUI(['', '', '', '']);

    // 2. Comentários Limpos
    document.getElementById('rdo-comentarios').value = '';

    // 3. Observações / Mensagem Adicional Limpas
    const obsAdicionalEl = document.getElementById('rdo-obs-adicional');
    if (obsAdicionalEl) obsAdicionalEl.value = '';

    // 4. Assinaturas Limpas
    this.populateSignatureUserDropdowns();
    document.getElementById('rdo-sig-planejamento').value = '';
    document.getElementById('rdo-sig-engenheiro').value = '';
    document.getElementById('rdo-sig-fiscalizacao').value = '';
    this.syncSigEmailField('planejamento', '');
    this.syncSigEmailField('engenheiro', '');
    this.syncSigEmailField('fiscalizacao', '');

    this.currentSignatures = {
      planejamento: '',
      engenheiro: '',
      fiscalizacao: ''
    };
    this.updateSignatureBoxUI('planejamento', '');
    this.updateSignatureBoxUI('engenheiro', '');
    this.updateSignatureBoxUI('fiscalizacao', '');

    // Logotipo
    this.loadCompanyLogo(rdo.logo !== undefined ? rdo.logo : null);

    this.calculateTotalHH();
    this.showTab('form');
    this.showToast(`RDO ${rdo.numero} duplicado com sucesso! Fotos, comentários, observações e assinaturas foram reiniciados.`, 'success');
  },

  duplicateCurrentRDO() {
    if (this.currentRDOId) {
      this.duplicateRDO(this.currentRDOId);
    } else {
      this.showToast('Salve ou abra um RDO já existente para duplicar.', 'info');
    }
  },

  editRDO(rdoId) {
    const rdo = StorageService.getRecordById(rdoId);
    if (!rdo) {
      this.showToast('RDO não encontrado.', 'error');
      return;
    }

    const session = StorageService.getSession();
    const isOwner = session && (
      rdo.userId === session.id ||
      rdo.createdBy === session.email ||
      (!rdo.userId && rdo.encarregado && rdo.encarregado.toLowerCase() === session.name.toLowerCase())
    );

    if (session && session.role !== 'Admin' && !isOwner) {
      this.showToast('Acesso restrito: você só pode visualizar e editar os RDOs criados por você.', 'error');
      return;
    }

    this.currentRDOId = rdo.id;
    document.getElementById('editor-page-heading').textContent = `Editando RDO: ${rdo.numero}`;

    const isLocked = this.isRDOLocked(rdo);
    const watermark = document.getElementById('rdo-lock-watermark');
    if (watermark) {
      watermark.classList.toggle('hidden', !isLocked);
    }

    this.renderRDOFormStatusBanner(rdo);

    let dateVal = rdo.data || '';
    if (dateVal && dateVal.length === 10) {
      dateVal = dateVal + 'T08:00';
    }

    document.getElementById('rdo-numero').value = rdo.numero || '';
    document.getElementById('rdo-data').value = dateVal;
    document.getElementById('rdo-dia-semana').value = rdo.diaSemana || this.getDayOfWeekName(dateVal);
    document.getElementById('rdo-turno').value = rdo.turno || 'Diurno';

    // Clima por períodos (com fallback para rdo.clima legado)
    let cManha = rdo.climaManha;
    let cTarde = rdo.climaTarde;
    let cNoite = rdo.climaNoite;

    if (!cManha && rdo.clima) {
      if (rdo.clima.includes('Chuva Forte')) cManha = 'Chuva Forte';
      else if (rdo.clima.includes('Chuva Fraca')) cManha = 'Chuva Fraca';
      else if (rdo.clima.includes('Nublado')) cManha = 'Nublado';
      else if (rdo.clima.includes('Vento')) cManha = 'Vento Forte';
      else if (rdo.clima.includes('Impraticável') || rdo.clima.includes('Imprat.')) cManha = 'Impraticável';
      else cManha = 'Sol';
      cTarde = cManha;
      cNoite = 'Sem Trabalho';
    }

    const cManhaEl = document.getElementById('rdo-clima-manha');
    if (cManhaEl) cManhaEl.value = cManha || 'Sol';
    const cTardeEl = document.getElementById('rdo-clima-tarde');
    if (cTardeEl) cTardeEl.value = cTarde || 'Sol';
    const cNoiteEl = document.getElementById('rdo-clima-noite');
    if (cNoiteEl) cNoiteEl.value = cNoite || 'Sem Trabalho';

    document.getElementById('rdo-contrato').value = rdo.contrato || '';
    document.getElementById('rdo-contratante').value = rdo.contratante || '';
    document.getElementById('rdo-contratada').value = rdo.contratada || '';
    document.getElementById('rdo-encarregado').value = rdo.encarregado || '';

    // Workers table
    const tbody = document.getElementById('workers-tbody');
    tbody.innerHTML = '';
    if (rdo.workers && rdo.workers.length > 0) {
      rdo.workers.forEach(w => this.addWorkerRow(w));
    } else {
      this.addWorkerRow();
    }

    // Activities
    ACTIVITIES.forEach(letter => {
      const row = document.querySelector(`#activities-tbody tr[data-act="${letter}"]`);
      if (row) {
        row.querySelector('.act-desc-input').value = (rdo.activitiesDescriptions && rdo.activitiesDescriptions[letter]) || '';
        row.querySelector('.act-ass-input').value = (rdo.activitiesSignatures && rdo.activitiesSignatures[letter]) || '';
      }
    });

    document.getElementById('rdo-comentarios').value = rdo.comentarios || '';
    const obsAdicionalLoad = document.getElementById('rdo-obs-adicional');
    if (obsAdicionalLoad) obsAdicionalLoad.value = rdo.sendObs || rdo.obsAdicional || '';
    const equipTbody = document.getElementById('equipments-tbody');
    if (equipTbody) {
      equipTbody.innerHTML = '';
      const equipList = Array.isArray(rdo.equipments) ? rdo.equipments : [];
      const minRows = Math.max(4, equipList.length);
      for (let i = 0; i < minRows; i++) {
        this.addEquipmentRow(equipList[i] || null);
      }
    }
    // Popula dropdowns de usuários nas assinaturas antes de definir valores
    this.populateSignatureUserDropdowns();

    document.getElementById('rdo-sig-planejamento').value = rdo.sigPlanejamento || '';
    document.getElementById('rdo-sig-engenheiro').value = rdo.sigEngenheiro || '';
    document.getElementById('rdo-sig-fiscalizacao').value = rdo.sigFiscalizacao || '';
    this.syncSigEmailField('planejamento', rdo.sigPlanejamento || '', rdo.sigEmailPlanejamento || '');
    this.syncSigEmailField('engenheiro', rdo.sigEngenheiro || '', rdo.sigEmailEngenheiro || '');
    this.syncSigEmailField('fiscalizacao', rdo.sigFiscalizacao || '', rdo.sigEmailFiscalizacao || '');

    // Load Digital Signatures
    this.currentSignatures = {
      planejamento: rdo.sigImgPlanejamento || '',
      engenheiro: rdo.sigImgEngenheiro || '',
      fiscalizacao: rdo.sigImgFiscalizacao || ''
    };
    this.updateSignatureBoxUI('planejamento', this.currentSignatures.planejamento);
    this.updateSignatureBoxUI('engenheiro', this.currentSignatures.engenheiro);
    this.updateSignatureBoxUI('fiscalizacao', this.currentSignatures.fiscalizacao);

    // Load 4 photos
    this.renderAllPhotosUI(rdo.photos || []);

    // Load company logo for this RDO
    this.loadCompanyLogo(rdo.logo !== undefined ? rdo.logo : null);

    this.calculateTotalHH();
    this.showTab('form');
  },

  addWorkerRow(data = null) {
    const tbody = document.getElementById('workers-tbody');
    const tr = document.createElement('tr');
    tr.className = 'worker-row';

    const matricula = data ? data.matricula || '' : '';
    const funcao = data ? data.funcao || '' : '';
    const nome = data ? data.nome || '' : '';
    const acts = (data && data.activities) ? data.activities : {};

    let actCellsHtml = '';
    ACTIVITIES.forEach(letter => {
      const val = acts[letter] !== undefined && acts[letter] !== 0 ? acts[letter] : '';
      actCellsHtml += `
        <td>
          <input type="number" step="0.5" min="0" max="24" class="worker-cell-input worker-act-input" data-act="${letter}" value="${val}" oninput="app.calculateTotalHH()" placeholder="">
        </td>
      `;
    });

    tr.innerHTML = `
      <td><input type="text" class="worker-cell-input worker-matricula text-center font-bold" value="${this.escapeHtml(matricula)}" placeholder="Matrícula"></td>
      <td><input type="text" class="worker-cell-input worker-funcao" value="${this.escapeHtml(funcao)}" placeholder="Função"></td>
      <td><input type="text" class="worker-cell-input worker-nome" value="${this.escapeHtml(nome)}" placeholder="Nome completo"></td>
      ${actCellsHtml}
      <td class="worker-total-cell">
        <div class="worker-total-wrap">
          <span class="worker-row-total">0h</span>
          <button type="button" class="btn-remove-row no-print" onclick="app.removeWorkerRow(this)" title="Remover linha">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
    this.calculateTotalHH();
  },

  removeWorkerRow(btn) {
    const row = btn.closest('tr');
    const tbody = document.getElementById('workers-tbody');
    if (tbody.children.length <= 1) {
      this.showToast('O RDO deve ter pelo menos uma linha de efetivo.', 'error');
      return;
    }
    row.remove();
    this.calculateTotalHH();
  },

  addEquipmentRow(data = null) {
    const tbody = document.getElementById('equipments-tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = 'equip-row';

    const nome = data ? (data.nome || '') : '';
    const qt = (data && data.qt !== undefined && data.qt !== null && data.qt !== '') ? data.qt : '';

    tr.innerHTML = `
      <td>
        <input type="text" class="equip-name-input" value="${this.escapeHtml(String(nome))}" placeholder="Equipamento utilizado...">
      </td>
      <td>
        <div class="equip-qt-wrap">
          <input type="number" min="0" step="1" class="equip-qt-input" value="${this.escapeHtml(String(qt))}" placeholder="0">
          <button type="button" class="btn-remove-row no-print" onclick="app.removeEquipmentRow(this)" title="Remover equipamento">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  },

  removeEquipmentRow(btn) {
    const row = btn.closest('tr');
    const tbody = document.getElementById('equipments-tbody');
    if (!tbody || !row) return;
    if (tbody.children.length <= 1) {
      const nameInp = row.querySelector('.equip-name-input');
      const qtInp = row.querySelector('.equip-qt-input');
      if (nameInp) nameInp.value = '';
      if (qtInp) qtInp.value = '';
      return;
    }
    row.remove();
  },

  calculateTotalHH() {
    let grandTotal = 0;
    let exceededCount = 0;
    const workerRows = document.querySelectorAll('#workers-tbody tr');

    workerRows.forEach(row => {
      let rowTotal = 0;
      const actInputs = row.querySelectorAll('.worker-act-input');
      actInputs.forEach(input => {
        const val = parseFloat(input.value) || 0;
        rowTotal += val;
      });

      grandTotal += rowTotal;

      const formattedRowTotal = rowTotal % 1 === 0 ? rowTotal : rowTotal.toFixed(1);
      const rowTotalEl = row.querySelector('.worker-row-total');
      if (rowTotalEl) {
        rowTotalEl.textContent = `${formattedRowTotal}h`;
        rowTotalEl.title = `${formattedRowTotal} horas`;
      }

      const isExceeded = rowTotal > 11;
      const isExtra = rowTotal > 8 && rowTotal <= 11;
      if (isExceeded) {
        exceededCount++;
      }

      row.classList.toggle('worker-row-exceeded', isExceeded);
      row.classList.toggle('worker-row-extra', isExtra);
      const totalCell = row.querySelector('.worker-total-cell');
      if (totalCell) {
        totalCell.classList.toggle('worker-total-exceeded', isExceeded);
        totalCell.classList.toggle('worker-total-extra', isExtra);
        if (isExceeded) {
          totalCell.title = `Limite excedido (${formattedRowTotal} horas)! Máximo permitido: 11 horas por colaborador na jornada.`;
        } else if (isExtra) {
          const he = rowTotal - 8;
          const fmtHE = he % 1 === 0 ? he : he.toFixed(1);
          totalCell.title = `Total do colaborador: ${formattedRowTotal} horas (+${fmtHE}h Hora Extra Prevista)`;
        } else {
          totalCell.title = `Total do colaborador: ${formattedRowTotal} horas (máx. 11h)`;
        }
      }
    });

    const alertBox = document.getElementById('workers-limit-alert');
    if (alertBox) {
      alertBox.classList.toggle('hidden', exceededCount === 0);
    }

    const sumElem = document.getElementById('total-hh-sum');
    if (sumElem) {
      sumElem.textContent = grandTotal % 1 === 0 ? grandTotal : grandTotal.toFixed(1);
    }
    return grandTotal;
  },

  validateWorkerHoursLimit() {
    const workerRows = document.querySelectorAll('#workers-tbody tr');
    const exceededWorkers = [];
    let firstExceededRow = null;

    workerRows.forEach((row, index) => {
      let rowTotal = 0;
      row.querySelectorAll('.worker-act-input').forEach(inp => {
        rowTotal += parseFloat(inp.value) || 0;
      });

      if (rowTotal > 11) {
        if (!firstExceededRow) firstExceededRow = row;
        const nome = row.querySelector('.worker-nome')?.value.trim() || '';
        const matricula = row.querySelector('.worker-matricula')?.value.trim() || '';
        const label = nome || (matricula ? `Matr. ${matricula}` : `Linha ${index + 1}`);
        const fmtHours = rowTotal % 1 === 0 ? rowTotal : rowTotal.toFixed(1);
        exceededWorkers.push(`${label} (${fmtHours} horas)`);
      }
    });

    if (exceededWorkers.length > 0) {
      this.calculateTotalHH();
      if (firstExceededRow) {
        firstExceededRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      this.showToast(
        `Não é permitido salvar o RDO: colaborador(es) acima do limite máximo de 11 horas na jornada — ${exceededWorkers.join(', ')}. Corrija as linhas em vermelho.`,
        'error'
      );
      return false;
    }
    return true;
  },

  saveCurrentRDO() {
    const numero = document.getElementById('rdo-numero').value.trim();
    const data = document.getElementById('rdo-data').value;
    const diaSemana = document.getElementById('rdo-dia-semana').value;
    const turno = document.getElementById('rdo-turno')?.value || 'Diurno';
    const climaManha = document.getElementById('rdo-clima-manha')?.value || 'Sol';
    const climaTarde = document.getElementById('rdo-clima-tarde')?.value || 'Sol';
    const climaNoite = document.getElementById('rdo-clima-noite')?.value || 'Sem Trabalho';

    let climaResumo = `Manhã: ${climaManha} | Tarde: ${climaTarde}`;
    if (climaNoite && climaNoite !== 'Sem Trabalho') {
      climaResumo += ` | Noite: ${climaNoite}`;
    }
    const clima = climaResumo;

    const contrato = document.getElementById('rdo-contrato').value.trim();
    const contratante = document.getElementById('rdo-contratante').value.trim();
    const contratada = document.getElementById('rdo-contratada').value.trim();
    const encarregado = document.getElementById('rdo-encarregado').value.trim();

    if (!numero) {
      this.showToast('Informe o número do RDO.', 'error');
      return;
    }
    if (!data) {
      this.showToast('Informe a data do RDO.', 'error');
      return;
    }

    // Regra básica: cada colaborador não pode exceder 11 horas na jornada
    if (!this.validateWorkerHoursLimit()) {
      return;
    }

    // Validação Obrigatória: FOTO DA PT (Foto 1)
    const fotoPT = this.currentPhotos[0];
    const descPTInput = document.getElementById('photo-desc-0');
    const descPT = descPTInput ? descPTInput.value.trim() : '';

    if (!fotoPT) {
      this.showToast('A FOTO DA PT (Foto 1) é obrigatória! Por favor, anexe a foto da PT.', 'error');
      const slot0 = document.getElementById('photo-slot-0');
      if (slot0) {
        slot0.scrollIntoView({ behavior: 'smooth', block: 'center' });
        slot0.style.outline = '3px solid #ef4444';
        slot0.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)';
        setTimeout(() => {
          slot0.style.outline = '';
          slot0.style.boxShadow = '';
        }, 4000);
      }
      return;
    }
    if (!descPT && descPTInput) {
      descPTInput.value = 'FOTO DA PT';
    }

    if (this.currentRDOId) {
      const existing = StorageService.getRecordById(this.currentRDOId);
      if (existing && this.isRDOLocked(existing)) {
        const session = StorageService.getSession();
        if (session && session.role !== 'Admin') {
          this.showToast('Este RDO foi criado há mais de 24 horas e está BLOQUEADO para alterações.', 'error');
          return;
        }
      }
    }

    // Collect Workers
    const workers = [];
    const workerRows = document.querySelectorAll('#workers-tbody tr');
    workerRows.forEach(row => {
      const matricula = row.querySelector('.worker-matricula').value.trim();
      const funcao = row.querySelector('.worker-funcao').value.trim();
      const nome = row.querySelector('.worker-nome').value.trim();

      const activities = {};
      let rowTotal = 0;
      row.querySelectorAll('.worker-act-input').forEach(inp => {
        const letter = inp.getAttribute('data-act');
        const val = parseFloat(inp.value) || 0;
        activities[letter] = val;
        rowTotal += val;
      });

      if (matricula || funcao || nome || rowTotal > 0) {
        workers.push({ matricula, funcao, nome, activities });
      }
    });

    // Collect Activities descriptions & signatures
    const activitiesDescriptions = {};
    const activitiesSignatures = {};
    ACTIVITIES.forEach(letter => {
      const row = document.querySelector(`#activities-tbody tr[data-act="${letter}"]`);
      if (row) {
        activitiesDescriptions[letter] = row.querySelector('.act-desc-input').value.trim();
        activitiesSignatures[letter] = row.querySelector('.act-ass-input').value.trim();
      }
    });

    const comentarios = document.getElementById('rdo-comentarios').value.trim();
    const sendObs = document.getElementById('rdo-obs-adicional')?.value.trim() || '';

    // Collect Equipments & QT
    const equipments = [];
    const equipRows = document.querySelectorAll('#equipments-tbody tr');
    equipRows.forEach(row => {
      const nome = (row.querySelector('.equip-name-input')?.value || '').trim();
      const qtRaw = (row.querySelector('.equip-qt-input')?.value || '').trim();
      const qt = qtRaw !== '' ? (parseFloat(qtRaw) || 0) : '';
      if (nome || qt !== '') {
        equipments.push({ nome, qt: qt === '' ? 1 : qt });
      }
    });

    const sigPlanejamento = document.getElementById('rdo-sig-planejamento').value.trim();
    const sigEngenheiro = document.getElementById('rdo-sig-engenheiro').value.trim();
    const sigFiscalizacao = document.getElementById('rdo-sig-fiscalizacao').value.trim();
    const sigEmailPlanejamento = document.getElementById('rdo-sig-email-planejamento')?.value.trim() || '';
    const sigEmailEngenheiro = document.getElementById('rdo-sig-email-engenheiro')?.value.trim() || '';
    const sigEmailFiscalizacao = document.getElementById('rdo-sig-email-fiscalizacao')?.value.trim() || '';
    const totalHH = this.calculateTotalHH();

    // Calcular Total de Horas Extras Previstas do RDO (> 8h por colaborador)
    let totalHE = 0;
    workers.forEach(w => {
      let wHours = 0;
      if (w.activities) {
        for (const act of ACTIVITIES) {
          wHours += parseFloat(w.activities[act]) || 0;
        }
      }
      if (wHours > 8) {
        totalHE += (wHours - 8);
      }
    });

    // Collect Photos
    const photos = [];
    for (let i = 0; i < 4; i++) {
      const url = this.currentPhotos[i] || '';
      const caption = document.getElementById(`photo-desc-${i}`)?.value.trim() || '';
      photos.push({ url, caption });
    }

    const session = StorageService.getSession();
    const existingRDO = this.currentRDOId ? StorageService.getRecordById(this.currentRDOId) : null;

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
      sendObs: sendObs || (existingRDO ? (existingRDO.sendObs || '') : ''),
      obsAdicional: sendObs || (existingRDO ? (existingRDO.obsAdicional || '') : ''),
      equipments,
      photos,
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
      createdByName: existingRDO ? (existingRDO.createdByName || (session ? session.name : '')) : (session ? session.name : '')
    };

    const saved = StorageService.saveRecord(rdoPayload);
    this.currentRDOId = saved.id;
    this.showToast('RDO salvo com sucesso!', 'success');
    this.showTab('list');
  },

  pendingDeleteAction: null,

  openDeleteModal(options) {
    this.pendingDeleteAction = options.onConfirm;
    
    const modal = document.getElementById('modal-delete-confirm');
    const msgEl = document.getElementById('delete-modal-message');
    const pwdInput = document.getElementById('delete-security-password');
    const errEl = document.getElementById('delete-pwd-error');

    if (msgEl) {
      msgEl.innerHTML = options.message || `Deseja realmente excluir <strong class="delete-warning-target">${this.escapeHtml(options.targetText || 'este item')}</strong>? Esta operação não pode ser desfeita.`;
    }
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.classList.remove('is-invalid');
    }
    if (errEl) {
      errEl.classList.add('hidden');
    }

    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => pwdInput && pwdInput.focus(), 80);
    }
  },

  closeDeleteModal(event = null) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) modal.classList.add('hidden');
    this.pendingDeleteAction = null;
  },

  handleConfirmDelete(event) {
    if (event) event.preventDefault();
    const pwdInput = document.getElementById('delete-security-password');
    const errEl = document.getElementById('delete-pwd-error');
    const entered = pwdInput ? pwdInput.value.trim() : '';

    const validPasswords = ['123456', '789512'];
    const session = StorageService.getSession();
    if (session && session.password) validPasswords.push(session.password.trim());

    if (!validPasswords.includes(entered)) {
      if (errEl) {
        errEl.classList.remove('hidden');
        errEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>Senha incorreta! Digite <strong>123456</strong> ou <strong>789512</strong> para confirmar.</span>`;
      }
      if (pwdInput) {
        pwdInput.classList.add('is-invalid');
        pwdInput.focus();
        pwdInput.select();
      }
      this.showToast('Senha de confirmação incorreta! Digite 123456 ou sua senha de Admin.', 'error');
      return;
    }

    if (typeof this.pendingDeleteAction === 'function') {
      const action = this.pendingDeleteAction;
      this.closeDeleteModal();
      action();
    } else {
      this.closeDeleteModal();
    }
  },

  deleteRDO(id) {
    const rdo = StorageService.getRecordById(id);
    if (!rdo) return;

    const session = StorageService.getSession();
    const isOwner = session && (
      rdo.userId === session.id ||
      rdo.createdBy === session.email ||
      (!rdo.userId && rdo.encarregado && rdo.encarregado.toLowerCase() === session.name.toLowerCase())
    );

    if (session && session.role !== 'Admin' && !isOwner) {
      this.showToast('Acesso restrito: você só pode excluir os RDOs criados por você.', 'error');
      return;
    }

    this.openDeleteModal({
      targetText: `RDO ${rdo.numero}`,
      message: `Você está prestes a excluir permanentemente o relatório <strong class="delete-warning-target">RDO ${this.escapeHtml(rdo.numero || '-')}</strong> de <strong>${this.escapeHtml(rdo.data || '-')}</strong>.`,
      onConfirm: () => {
        StorageService.deleteRecord(id);
        this.showToast(`RDO ${rdo.numero} excluído com sucesso.`, 'info');
        this.renderRDOList();
      }
    });
  },

  printCurrentRDO() {
    window.print();
  },

  // LIST & FILTER
  renderRDOList() {
    const tbody = document.getElementById('rdo-table-body');
    const emptyState = document.getElementById('rdo-empty-state');
    if (!tbody) return;

    const session = StorageService.getSession();
    const query = (document.getElementById('rdo-search-input')?.value || '').toLowerCase();
    const filterDate = document.getElementById('rdo-filter-date')?.value || '';
    const filterTurno = document.getElementById('rdo-filter-turno')?.value || '';

    let records = StorageService.getRecords();

    // ISOLATION: Non-admin users ONLY see their own RDOs
    if (session && session.role !== 'Admin') {
      records = records.filter(r => {
        return r.userId === session.id ||
               r.createdBy === session.email ||
               (!r.userId && r.encarregado && r.encarregado.toLowerCase() === session.name.toLowerCase());
      });
    }

    // Filtering
    records = records.filter(r => {
      const matchQuery = !query || 
        (r.numero && r.numero.toLowerCase().includes(query)) ||
        (r.contrato && r.contrato.toLowerCase().includes(query)) ||
        (r.encarregado && r.encarregado.toLowerCase().includes(query)) ||
        (r.contratada && r.contratada.toLowerCase().includes(query));

      const matchDate = !filterDate || r.data === filterDate;
      const matchTurno = !filterTurno || r.turno === filterTurno;

      return matchQuery && matchDate && matchTurno;
    });

    if (records.length === 0) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    tbody.innerHTML = records.map(r => {
      let formattedDate = '-';
      if (r.data) {
        if (r.data.includes('T')) {
          const [dPart, tPart] = r.data.split('T');
          const [y, m, d] = dPart.split('-');
          formattedDate = `${d}/${m}/${y} ${tPart.slice(0, 5)}`;
        } else {
          formattedDate = r.data.split('-').reverse().join('/');
        }
      }
      const turnoClass = r.turno === 'Noturno' ? 'badge-noturno' : 'badge-diurno';
      let creatorBadge = '';
      if (session && session.role === 'Admin' && r.createdByName && r.createdByName !== r.encarregado) {
        creatorBadge = `<div style="font-size:0.68rem; color:var(--slate-400); white-space:nowrap;">por: ${this.escapeHtml(r.createdByName)}</div>`;
      }

      const realHH = (r.workers && Array.isArray(r.workers) && r.workers.length > 0)
        ? r.workers.reduce((sum, w) => {
            let rowSum = 0;
            if (w.activities) {
              for (const act of ACTIVITIES) {
                rowSum += parseFloat(w.activities[act]) || 0;
              }
            }
            return sum + rowSum;
          }, 0)
        : (parseFloat(r.totalHH) || 0);
      const displayHH = Number.isInteger(realHH) ? realHH.toString() : realHH.toFixed(1);

      let realHE = 0;
      if (r.workers && Array.isArray(r.workers) && r.workers.length > 0) {
        r.workers.forEach(w => {
          let rowSum = 0;
          if (w.activities) {
            for (const act of ACTIVITIES) {
              rowSum += parseFloat(w.activities[act]) || 0;
            }
          }
          if (rowSum > 8) {
            realHE += (rowSum - 8);
          }
        });
      } else if (r.totalHE !== undefined && r.totalHE !== null) {
        realHE = parseFloat(r.totalHE) || 0;
      }
      const displayHE = Number.isInteger(realHE) ? realHE.toString() : realHE.toFixed(1);
      const heCellHtml = realHE > 0
        ? `<span class="badge-he-prevista">+${displayHE} HE</span>`
        : `<span class="badge-he-zero">0 HE</span>`;

      const info = this.getRDOExpiryInfo(r);

      // Registros / Responsáveis (Planejamento Executante, Engenheiro de Produção Executante, Fiscalização CMPC)
      const planejaNome = (r.sigPlanejamento || '').trim();
      const planejaHasSig = !!(r.sigImgPlanejamento);
      const planejaCell = planejaNome
        ? `<div style="font-weight:600; color:var(--slate-800); white-space:nowrap;" title="${this.escapeHtml(planejaNome)}">${this.escapeHtml(planejaNome)} ${planejaHasSig ? '<span title="Assinatura Digital anexada" style="font-size:0.75rem;">✍️</span>' : ''}</div>`
        : `<span style="color:var(--slate-400); font-size:0.8rem;">-</span>`;

      const engNome = (r.sigEngenheiro || '').trim();
      const engHasSig = !!(r.sigImgEngenheiro);
      const engCell = engNome
        ? `<div style="font-weight:600; color:var(--slate-800); white-space:nowrap;" title="${this.escapeHtml(engNome)}">${this.escapeHtml(engNome)} ${engHasSig ? '<span title="Assinatura Digital anexada" style="font-size:0.75rem;">✍️</span>' : ''}</div>`
        : `<span style="color:var(--slate-400); font-size:0.8rem;">-</span>`;

      const fiscalNome = (info.approvedBy || r.sigFiscalizacao || '').trim();
      const fiscalHasSig = !!(r.sigImgFiscalizacao || info.isApproved);
      const fiscalCell = fiscalNome
        ? `<div style="font-weight:600; color:var(--slate-800); white-space:nowrap;" title="${this.escapeHtml(fiscalNome)}">${this.escapeHtml(fiscalNome)} ${fiscalHasSig ? '<span title="Assinatura / Visto anexado" style="font-size:0.75rem;">✍️</span>' : ''}</div>`
        : `<span style="color:var(--slate-400); font-size:0.8rem;">-</span>`;
      let statusBadge = '';
      if (info.isApproved) {
        const approvedName = info.approvedBy || r.sigFiscalizacao || 'Fiscalização';
        statusBadge = `
          <div>
            <span class="badge-status badge-status-approved" title="Aprovado por: ${this.escapeHtml(approvedName)}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              APROVADO
            </span>
            <div class="rdo-subtext" title="${this.escapeHtml(approvedName)}">✍️ ${this.escapeHtml(approvedName)}</div>
          </div>
        `;
      } else if (info.isRejected) {
        statusBadge = `
          <div>
            <span class="badge-status badge-status-rejected" title="${this.escapeHtml(info.approvalNotes || 'Reprovado')}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              REPROVADO
            </span>
            ${info.approvalNotes ? `<div class="rdo-subtext" title="${this.escapeHtml(info.approvalNotes)}">${this.escapeHtml(info.approvalNotes)}</div>` : ''}
          </div>
        `;
      } else if (info.isSent) {
        statusBadge = `
          <div>
            <span class="badge-status badge-status-pending-approval" title="Enviado para: ${this.escapeHtml(info.sentTo)} - Aguardando aprovação">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              AGUARDANDO APROVAÇÃO
            </span>
            ${info.sentTo ? `<div class="rdo-subtext" title="${this.escapeHtml(info.sentTo)}">✉️ ${this.escapeHtml(info.sentTo)}</div>` : ''}
          </div>
        `;
      } else if (info.isExpired) {
        statusBadge = `
          <span class="badge-status badge-status-expired" title="Prazo de 24 horas encerrado sem envio">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Bloqueado (+24h)
          </span>
        `;
      } else {
        statusBadge = `
          <span class="badge-status badge-status-countdown" title="Contador regressivo para expiração de 24h">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Expira em ${info.hours}h ${info.minutes}m
          </span>
        `;
      }

      const canApprove = session && (session.role === 'Admin' || session.role === 'Engenheiro');
      let approveBtn = '';
      if (canApprove) {
        if (info.isApproved) {
          approveBtn = `
            <button class="btn btn-outline btn-xs" style="color:#047857; border-color:#a7f3d0; background:#ecfdf5;" onclick="app.openApproveModal('${r.id}')" title="Aprovado pela Fiscalização - Clique para ver/alterar">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Aprovado</span>
            </button>
          `;
        } else {
          approveBtn = `
            <button class="btn btn-primary btn-xs btn-approve-quick" onclick="app.openApproveModal('${r.id}')" title="Avaliar e Aprovar RDO">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Aprovar</span>
            </button>
          `;
        }
      }

      const sendBtn = info.isSent
        ? `<button class="btn btn-outline btn-xs" style="color: #047857; border-color: #a7f3d0; background: #ecfdf5;" onclick="app.openSendModal('${r.id}')" title="Reenviar RDO por E-mail">
             <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
             <span>Reenviar</span>
           </button>`
        : `<button class="btn btn-outline btn-xs" style="color: #065f46; border-color: #a7f3d0; background: #ecfdf5;" onclick="app.openSendModal('${r.id}')" title="Enviar RDO por E-mail">
             <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
             <span>Enviar</span>
           </button>`;

      return `
        <tr>
          <td><strong style="color: var(--primary-800);">${this.escapeHtml(r.numero || '-')}</strong></td>
          <td><span style="color: var(--slate-800); font-weight:600; white-space:nowrap;">${formattedDate}</span></td>
          <td>${statusBadge}</td>
          <td><span class="badge-turno ${turnoClass}">${this.escapeHtml(r.turno || 'Diurno')}</span></td>
          <td><span style="font-weight:600; color:var(--slate-700);">${this.escapeHtml(r.contrato || '-')}</span></td>
          <td>
            <div style="font-weight:600; color:var(--slate-800); white-space:nowrap;">${this.escapeHtml(r.encarregado || '-')}</div>
            ${creatorBadge}
          </td>
          <td>${planejaCell}</td>
          <td>${engCell}</td>
          <td>${fiscalCell}</td>
          <td><span class="badge-hours">${displayHH} HH</span></td>
          <td>${heCellHtml}</td>
          <td>
            <div class="actions-cell">
              <div class="actions-row">
                ${approveBtn}
                ${sendBtn}
              </div>
              <div class="actions-row">
                <button class="btn btn-outline btn-xs" onclick="app.editRDO('${r.id}')" title="Editar RDO">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  <span>Editar</span>
                </button>
                <button class="btn btn-outline btn-xs btn-duplicate" onclick="app.duplicateRDO('${r.id}')" title="Duplicar RDO (mantém equipe e dados base, limpando fotos, comentários e assinaturas)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  <span>Duplicar</span>
                </button>
                <button class="btn btn-outline btn-xs" onclick="app.quickPrintRDO('${r.id}')" title="Imprimir / PDF">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  <span>Imprimir</span>
                </button>
                <button class="btn btn-ghost btn-xs btn-icon" style="color: #ef4444;" onclick="app.deleteRDO('${r.id}')" title="Excluir RDO">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // APPROVAL MODAL HANDLERS
  openApproveModal(rdoId) {
    const rdo = StorageService.getRecordById(rdoId);
    if (!rdo) {
      this.showToast('RDO não encontrado.', 'error');
      return;
    }

    const session = StorageService.getSession();
    const modal = document.getElementById('modal-approve-rdo');
    const targetInput = document.getElementById('approve-rdo-target-id');
    const summaryBox = document.getElementById('approve-rdo-summary-box');
    const fiscalNameInput = document.getElementById('approve-fiscal-name');
    const notesInput = document.getElementById('approve-notes');

    if (targetInput) targetInput.value = rdo.id;

    if (summaryBox) {
      let formattedDate = '-';
      if (rdo.data) {
        if (rdo.data.includes('T')) {
          const [dPart, tPart] = rdo.data.split('T');
          const [y, m, d] = dPart.split('-');
          formattedDate = `${d}/${m}/${y} ${tPart.slice(0, 5)}`;
        } else {
          formattedDate = rdo.data.split('-').reverse().join('/');
        }
      }
      summaryBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div><strong style="color:var(--primary-800); font-size:1.05rem;">RDO Nº: ${this.escapeHtml(rdo.numero || 'S/N')}</strong></div>
          <span style="font-size:0.8rem; background:#e0e7ff; color:#3730a3; padding:3px 10px; border-radius:4px; font-weight:700;">Contrato: ${this.escapeHtml(rdo.contrato || '-')}</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.84rem; color:var(--slate-700);">
          <div>📅 <strong>Data:</strong> ${formattedDate}</div>
          <div>👤 <strong>Emitido por:</strong> ${this.escapeHtml(rdo.createdByName || rdo.encarregado || 'Encarregado')}</div>
          <div>👥 <strong>Total Efetivo:</strong> ${this.escapeHtml(rdo.totalHH || '0')} HH</div>
          <div>🏢 <strong>Contratada:</strong> ${this.escapeHtml(rdo.contratada || '-')}</div>
        </div>
      `;
    }

    const currentDecision = (rdo.approvalStatus === 'reprovado') ? 'reprovado' : 'aprovado';
    const radioBtn = document.querySelector(`input[name="approval_decision"][value="${currentDecision}"]`);
    if (radioBtn) radioBtn.checked = true;
    this.onApprovalDecisionChange(currentDecision);

    if (fiscalNameInput) {
      fiscalNameInput.value = rdo.approvedBy || rdo.sigFiscalizacao || (session ? `${session.name} (${session.role})` : '');
    }

    if (notesInput) {
      notesInput.value = rdo.approvalNotes || '';
    }

    if (modal) modal.classList.remove('hidden');
  },

  closeApproveModal(event = null) {
    if (event && event.target && event.target.id !== 'modal-approve-rdo') return;
    const modal = document.getElementById('modal-approve-rdo');
    if (modal) modal.classList.add('hidden');
  },

  onApprovalDecisionChange(val) {
    const labelAprovado = document.getElementById('label-decision-aprovado');
    const labelReprovado = document.getElementById('label-decision-reprovado');
    const saveBtn = document.getElementById('btn-save-approval');

    if (val === 'aprovado') {
      if (labelAprovado) {
        labelAprovado.style.borderColor = '#10b981';
        labelAprovado.style.background = '#ecfdf5';
        labelAprovado.style.color = '#065f46';
      }
      if (labelReprovado) {
        labelReprovado.style.borderColor = '#cbd5e1';
        labelReprovado.style.background = '#ffffff';
        labelReprovado.style.color = '#64748b';
      }
      if (saveBtn) {
        saveBtn.style.background = '#2563eb';
        saveBtn.style.borderColor = '#2563eb';
      }
    } else {
      if (labelReprovado) {
        labelReprovado.style.borderColor = '#ef4444';
        labelReprovado.style.background = '#fef2f2';
        labelReprovado.style.color = '#991b1b';
      }
      if (labelAprovado) {
        labelAprovado.style.borderColor = '#cbd5e1';
        labelAprovado.style.background = '#ffffff';
        labelAprovado.style.color = '#64748b';
      }
      if (saveBtn) {
        saveBtn.style.background = '#dc2626';
        saveBtn.style.borderColor = '#dc2626';
      }
    }
  },

  handleSaveApproval(event) {
    if (event) event.preventDefault();
    const rdoId = document.getElementById('approve-rdo-target-id')?.value;
    if (!rdoId) return;

    const decision = document.querySelector('input[name="approval_decision"]:checked')?.value || 'aprovado';
    const fiscalName = document.getElementById('approve-fiscal-name')?.value.trim();
    const notes = document.getElementById('approve-notes')?.value.trim();
    const session = StorageService.getSession();

    if (!fiscalName) {
      this.showToast('Por favor, informe o nome / identificação do fiscalizador.', 'warning');
      return;
    }

    const updated = StorageService.markRecordApproval(rdoId, {
      status: decision,
      approvedBy: fiscalName,
      approvedByEmail: session ? session.email : '',
      approvedByRole: session ? session.role : '',
      notes: notes,
      sigFiscalizacao: fiscalName
    });

    this.closeApproveModal();
    this.renderRDOList();

    if (this.currentRDOId === rdoId && updated) {
      this.renderRDOFormStatusBanner(updated);
      const sigFisc = document.getElementById('rdo-sig-fiscalizacao');
      if (sigFisc) sigFisc.value = updated.sigFiscalizacao || '';
    }

    if (decision === 'aprovado') {
      this.showToast(`✅ RDO ${updated ? updated.numero : ''} APROVADO com sucesso pela Fiscalização!`, 'success');
    } else {
      this.showToast(`❌ RDO ${updated ? updated.numero : ''} marcado como REPROVADO com ressalvas.`, 'warning');
    }
  },

  // SEND RDO MODAL HANDLERS
  openSendModalFromEditor() {
    if (!this.validateWorkerHoursLimit()) {
      return;
    }
    if (!this.currentRDOId) {
      this.showToast('Por favor, clique em "Salvar RDO" antes de realizar o envio.', 'warning');
      return;
    }
    this.openSendModal(this.currentRDOId);
  },

  openSendModal(rdoId) {
    const rdo = StorageService.getRecordById(rdoId);
    if (!rdo) {
      this.showToast('RDO não encontrado.', 'error');
      return;
    }

    const modal = document.getElementById('modal-send-rdo');
    const targetInput = document.getElementById('send-rdo-target-id');
    const emailInput = document.getElementById('send-rdo-email');
    const obsInput = document.getElementById('send-rdo-obs');
    const summaryBox = document.getElementById('send-rdo-summary-box');

    if (targetInput) targetInput.value = rdo.id;
    if (emailInput) emailInput.value = rdo.sentTo || '';
    const currentScreenObs = document.getElementById('rdo-obs-adicional')?.value.trim();
    if (obsInput) obsInput.value = currentScreenObs || rdo.sendObs || rdo.obsAdicional || '';

    let formattedDate = '-';
    if (rdo.data) {
      formattedDate = rdo.data.includes('T') ? rdo.data.replace('T', ' ') : rdo.data;
    }

    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <strong>RDO N.º: ${this.escapeHtml(rdo.numero || '-')}</strong>
          <span>Data: <strong>${this.escapeHtml(formattedDate)}</strong></span>
        </div>
        <div style="display:flex; justify-content:space-between; color: #15803d; font-size:0.82rem;">
          <span>Encarregado: ${this.escapeHtml(rdo.encarregado || '-')}</span>
          <span>Total: <strong>${rdo.totalHH || 0} HH</strong></span>
        </div>
      `;
    }

    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => emailInput && emailInput.focus(), 100);
    }
  },

  closeSendModal(event = null) {
    if (event && event.target && event.target !== event.currentTarget) return;
    const modal = document.getElementById('modal-send-rdo');
    if (modal) modal.classList.add('hidden');
  },

  // BREVO EMAIL SERVICE INTEGRATION
  BREVO_CONFIG: {
    apiKey: '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',
    senderName: 'Engenharia CMPC - SGQ',
    senderEmail: 'sistemasengenharia@cmpcrs.com.br',
    apiUrl: 'https://api.brevo.com/v3/smtp/email'
  },

  generateRDOEmailHtml(rdo, obs = '') {
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

    let workersRows = '';
    if (rdo.workers && Array.isArray(rdo.workers) && rdo.workers.length > 0) {
      workersRows = rdo.workers.map(w => {
        let totalW = 0;
        if (w.activities) {
          for (const act of ACTIVITIES) {
            totalW += parseFloat(w.activities[act]) || 0;
          }
        }
        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${this.escapeHtml(w.matricula || '-')}</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${this.escapeHtml(w.funcao || '-')}</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${this.escapeHtml(w.nome || '-')}</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #047857; text-align: right; font-weight: 700;">${totalW} h</td>
          </tr>
        `;
      }).join('');
    } else {
      workersRows = `<tr><td colspan="4" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 13px;">Nenhum colaborador listado.</td></tr>`;
    }

    let activitiesRows = '';
    ACTIVITIES.forEach(letter => {
      const desc = (rdo.activitiesDescriptions && rdo.activitiesDescriptions[letter]) || '';
      const sig = (rdo.activitiesSignatures && rdo.activitiesSignatures[letter]) || '';
      if (desc) {
        activitiesRows += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-weight: 700; color: #065f46; width: 40px; text-align: center;">${letter}</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${this.escapeHtml(desc)}</td>
            <td style="padding: 8px 12px; font-size: 12px; color: #64748b; font-style: italic;">${this.escapeHtml(sig || '-')}</td>
          </tr>
        `;
      }
    });

    if (!activitiesRows) {
      activitiesRows = `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 13px;">Nenhuma descrição de atividade preenchida.</td></tr>`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
          .badge-num { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-weight: 700; margin-top: 10px; font-size: 14px; }
          .content { padding: 24px; }
          .grid-info { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
          .grid-info td { padding: 10px 14px; font-size: 13px; vertical-align: top; }
          .label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
          .val { color: #0f172a; font-weight: 600; font-size: 14px; }
          .section-title { font-size: 14px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px 0; border-bottom: 2px solid #a7f3d0; padding-bottom: 4px; }
          .table-data { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .table-data th { background: #f1f5f9; padding: 8px 12px; font-size: 12px; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .obs-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 13px; color: #1e3a8a; }
          .comentarios-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #334155; margin-bottom: 20px; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
          .btn-online { display: inline-block; background: #059669; color: #ffffff !important; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sistema de Gestão da Qualidade - ENGENHARIA CMPC</h1>
            <p>Relatório Diário de Obra (RDO) Oficial</p>
            <div class="badge-num">RDO N.º: ${this.escapeHtml(rdo.numero || '-')}</div>
          </div>
          <div class="content">
            ${obs ? `<div class="obs-box"><strong>Observação do Envio:</strong><br>${this.escapeHtml(obs)}</div>` : ''}

            <table class="grid-info">
              <tr>
                <td style="width: 50%; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                  <div class="label">Data / Hora</div>
                  <div class="val">${formattedDate}</div>
                </td>
                <td style="width: 50%; border-bottom: 1px solid #e2e8f0;">
                  <div class="label">Dia / Turno / Condição Climática</div>
                  <div class="val">${this.escapeHtml(rdo.diaSemana || '-')} • ${this.escapeHtml(rdo.turno || 'Diurno')} • ${this.escapeHtml(rdo.clima || 'Bom / Ensolarado')}</div>
                </td>
              </tr>
              <tr>
                <td style="border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                  <div class="label">Contrato</div>
                  <div class="val">${this.escapeHtml(rdo.contrato || '-')}</div>
                </td>
                <td style="border-bottom: 1px solid #e2e8f0;">
                  <div class="label">Encarregado Responsável</div>
                  <div class="val">${this.escapeHtml(rdo.encarregado || '-')}</div>
                </td>
              </tr>
              <tr>
                <td style="border-right: 1px solid #e2e8f0;">
                  <div class="label">Contratante / Contratada</div>
                  <div class="val">${this.escapeHtml(rdo.contratante || '-')} / ${this.escapeHtml(rdo.contratada || '-')}</div>
                </td>
                <td>
                  <div class="label">Total Horas Homem (HH)</div>
                  <div class="val" style="color: #047857; font-size: 16px;">${rdo.totalHH || 0} HH</div>
                </td>
              </tr>
            </table>

            <div class="section-title">Efetivo de Obra e Apropriação de Horas</div>
            <table class="table-data">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Função</th>
                  <th>Colaborador</th>
                  <th style="text-align: right;">Total HH</th>
                </tr>
              </thead>
              <tbody>
                ${workersRows}
              </tbody>
            </table>

            <div class="section-title">Descrição das Atividades Executadas</div>
            <table class="table-data">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">Ativ.</th>
                  <th>Descrição</th>
                  <th style="width: 130px;">Assinatura / Visto</th>
                </tr>
              </thead>
              <tbody>
                ${activitiesRows}
              </tbody>
            </table>

            ${rdo.comentarios ? `
              <div class="section-title">Comentários e Ocorrências do Dia</div>
              <div class="comentarios-box">${this.escapeHtml(rdo.comentarios)}</div>
            ` : ''}

            ${(rdo.equipments && Array.isArray(rdo.equipments) && rdo.equipments.length > 0) ? `
              <div class="section-title">Equipamentos Utilizados</div>
              <table class="table-data">
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th style="width: 80px; text-align: center;">QT</th>
                  </tr>
                </thead>
                <tbody>
                  ${rdo.equipments.map(eq => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${this.escapeHtml(eq.nome || '-')}</td>
                      <td style="padding: 8px 12px; font-size: 13px; color: #047857; font-weight: 700; text-align: center;">${this.escapeHtml(String(eq.qt ?? '-'))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0 10px 0;">
              <div style="font-weight: 700; color: #166534; font-size: 14px; margin-bottom: 4px;">
                📋 Vistoria & Aprovação da Fiscalização
              </div>
              <div style="font-size: 13px; color: #15803d; margin-bottom: 12px;">
                Acesse o sistema online para validar as atividades e registrar seu visto de <strong>APROVAÇÃO (CHECK)</strong>:
              </div>
              <a href="https://rdocmpc.netlify.app" class="btn-online" target="_blank" style="display: inline-block; background: #059669; color: #ffffff !important; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px;">
                Acessar Sistema para Aprovar RDO
              </a>
            </div>
          </div>
          <div class="footer">
            Este relatório foi gerado e confirmado eletronicamente via Sistema SGQ Engenharia CMPC.<br>
            Data de envio: ${new Date().toLocaleString('pt-BR')} • Notificação automática do Sistema de RDO.
          </div>
        </div>
      </body>
      </html>
    `;
  },

  async sendEmailViaBrevo(rdo, recipientEmailString, obs = '') {
    const emailList = recipientEmailString
      .split(/[,;]/)
      .map(e => e.trim())
      .filter(e => e.length > 0 && e.includes('@'));

    if (emailList.length === 0) {
      throw new Error('Nenhum endereço de e-mail válido foi informado.');
    }

    const cfg = StorageService.getBrevoConfig();
    const apiKey = (cfg && cfg.apiKey) ? cfg.apiKey.trim() : '';
    const senderEmail = (cfg && cfg.senderEmail) ? cfg.senderEmail.trim() : 'sistemasengenharia@cmpcrs.com.br';
    const senderName = (cfg && cfg.senderName) ? cfg.senderName.trim() : 'Engenharia CMPC - SGQ';

    if (!apiKey) {
      throw new Error('Chave de API da Brevo não configurada. Configure no Painel Admin.');
    }

    if (apiKey.startsWith('xsmtpsib-')) {
      throw new Error('Chave SMTP detectada (xsmtpsib-). Para envio direto por API, gere a "Chave de API" (xkeysib-) no Brevo em: SMTP & API > Chaves de API.');
    }

    const to = emailList.map(email => ({ email }));
    const htmlContent = this.generateRDOEmailHtml(rdo, obs);

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: to,
      subject: `[RDO CMPC] Relatório Diário de Obra Nº ${rdo.numero || '-'} - ${rdo.contrato || ''}`,
      htmlContent: htmlContent
    };

    const response = await fetch(this.BREVO_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || data.code || `Erro HTTP ${response.status}`;
      throw new Error(`Brevo API: ${errorMsg}`);
    }

    return { success: true, messageId: data.messageId };
  },

  async handleConfirmSend(event) {
    if (event) event.preventDefault();
    const rdoId = document.getElementById('send-rdo-target-id')?.value;
    const email = document.getElementById('send-rdo-email')?.value.trim();
    const obs = document.getElementById('send-rdo-obs')?.value.trim();
    const submitBtn = document.getElementById('btn-confirm-send-rdo');
    const submitLabel = document.getElementById('btn-confirm-send-label');

    if (!rdoId || !email) {
      this.showToast('Informe ao menos um e-mail de destino válido.', 'warning');
      return;
    }

    const rdo = StorageService.getRecordById(rdoId);
    if (!rdo) {
      this.showToast('RDO não encontrado.', 'error');
      return;
    }

    // Loading State
    if (submitBtn) submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Enviando via Brevo...';

    try {
      // 1. Send via Brevo REST API
      await this.sendEmailViaBrevo(rdo, email, obs);

      // 2. Mark as sent in Storage & Firestore
      const updated = StorageService.markRecordAsSent(rdoId, email, obs);

      this.closeSendModal();
      this.showToast(`✅ RDO ${updated ? updated.numero : ''} enviado com sucesso via Brevo para ${email}!`, 'success');

      // Update Form/Editor view if current
      if (this.currentRDOId === rdoId) {
        const obsAdicionalEl = document.getElementById('rdo-obs-adicional');
        if (obsAdicionalEl) obsAdicionalEl.value = obs;
        const isLocked = this.isRDOLocked(updated);
        const watermark = document.getElementById('rdo-lock-watermark');
        if (watermark) watermark.classList.toggle('hidden', !isLocked);
        this.renderRDOFormStatusBanner(updated);
      }

      // Refresh list view
      this.filterRDOs();
    } catch (err) {
      console.error('Erro no envio via Brevo:', err);
      const updated = StorageService.markRecordAsSent(rdoId, email, obs);
      this.closeSendModal();
      this.showToast(`⚠️ RDO confirmado, mas Brevo retornou: ${err.message}`, 'warning');

      if (this.currentRDOId === rdoId) {
        this.renderRDOFormStatusBanner(updated);
      }
      this.filterRDOs();
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitLabel) submitLabel.textContent = 'Confirmar e Enviar';
    }
  },

  timerInterval: null,

  startLiveTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const currentTab = document.querySelector('.tab-pane:not(.hidden)');
      if (currentTab && currentTab.id === 'tab-list') {
        this.filterRDOs();
      } else if (currentTab && currentTab.id === 'tab-form' && this.currentRDOId) {
        const rdo = StorageService.getRecordById(this.currentRDOId);
        if (rdo) {
          const isLocked = this.isRDOLocked(rdo);
          const watermark = document.getElementById('rdo-lock-watermark');
          if (watermark) watermark.classList.toggle('hidden', !isLocked);
          this.renderRDOFormStatusBanner(rdo);
        }
      }
    }, 15000); // Atualiza a cada 15 segundos
  },

  quickPrintRDO(rdoId) {
    this.editRDO(rdoId);
    setTimeout(() => {
      window.print();
    }, 250);
  },

  filterRDOs() {
    this.renderRDOList();
  },

  // HELPERS
  handleDateChange(e) {
    const val = e.target.value;
    if (val) {
      const dayName = this.getDayOfWeekName(val);
      document.getElementById('rdo-dia-semana').value = dayName;
    }
  },

  getDayOfWeekName(dateString) {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '';
    const date = new Date(year, month - 1, day);
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[date.getDay()] || '';
  },

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
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${this.escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer; color:inherit; font-size:1.2rem; line-height:1;">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  },

  // EXPORT & IMPORT BACKUPS
  exportDataJSON() {
    const dataStr = StorageService.exportBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_rdo_cmpc_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Backup JSON exportado com sucesso!', 'success');
  },

  importDataJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const success = StorageService.importBackup(content);
      if (success) {
        this.showToast('Backup restaurado com sucesso!', 'success');
        this.renderRDOList();
        admin.renderUsers();
        this.loadCompanyLogo();
      } else {
        this.showToast('Falha ao restaurar backup. Verifique o arquivo JSON.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
