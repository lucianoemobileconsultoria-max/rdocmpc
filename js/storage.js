/**
 * Storage & Cloud Layer for RDO Engenharia CMPC
 * Powered by Google Cloud Firebase Firestore + Offline LocalStorage Sync
 */

// Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrrLvd8M1QPym5PGbSaNKcEHDNDQhylow",
  authDomain: "rdocmpc.firebaseapp.com",
  projectId: "rdocmpc",
  storageBucket: "rdocmpc.firebasestorage.app",
  messagingSenderId: "746846155028",
  appId: "1:746846155028:web:f4dcc5acedb2d98795d201"
};

const STORAGE_KEYS = {
  USERS: 'cmpc_rdo_users',
  SESSION: 'cmpc_rdo_session',
  RECORDS: 'cmpc_rdo_records',
  LOGO: 'cmpc_rdo_logo',
};

// Initialize Firebase Cloud Service
let db = null;
let isFirebaseConnected = false;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    isFirebaseConnected = true;
    console.log('☁️ Firebase Firestore inicializado com sucesso para o projeto:', firebaseConfig.projectId);
  }
} catch (err) {
  console.warn('⚠️ Firebase não carregado em modo offline:', err);
}

const StorageService = {
  // Initialize Cloud Sync and Local Defaults
  init() {
    this.initLocalDefaults();
    this.initPresenceSync();

    if (db) {
      this.initFirestoreSync();
    }
  },

  initLocalDefaults() {
    let users = this.getUsers();
    let masterAdmin = users.find(u => u.email.toLowerCase() === 'engelmobile2020@gmail.com');

    if (!masterAdmin) {
      const defaultUsers = [
        {
          id: 'user-admin-master',
          name: 'Administrador Master',
          email: 'engelmobile2020@gmail.com',
          password: '789512',
          role: 'Admin',
          createdAt: new Date().toISOString()
        },
        ...users
      ];
      this.saveUsersLocal(defaultUsers);
    } else {
      masterAdmin.password = '789512';
      masterAdmin.role = 'Admin';
      this.saveUsersLocal(users);
    }

    if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
      const initialRDO = {
        id: 'rdo-default-001',
        numero: '0001/' + new Date().getFullYear(),
        data: new Date().toISOString().split('T')[0] + 'T07:30',
        diaSemana: 'Segunda-feira',
        turno: 'Diurno',
        contrato: 'CTR-2026/045',
        contratante: 'CMPC CELULOSE RIOGRANDENSE',
        contratada: 'ENG CMPC SERVIÇOS',
        encarregado: 'Jorge Renato',
        workers: [
          {
            matricula: '253',
            funcao: 'Maçariqueiro',
            nome: 'Jorge Renato',
            activities: { A: 4, B: 4, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 }
          },
          {
            matricula: '254',
            funcao: 'Soldador TIG',
            nome: 'Marcos Vinícius',
            activities: { A: 8, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 }
          },
          {
            matricula: '258',
            funcao: 'Ajudante Geral',
            nome: 'Antonio Carlos',
            activities: { A: 4, B: 4, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 }
          }
        ],
        totalHH: 24,
        activitiesDescriptions: {
          A: 'Corte e preparação de chanfros em tubulação de processo',
          B: 'Montagem e alinhamento de suportes metálicos',
          C: '', D: '', E: '', F: '', G: '', H: '', I: '', J: ''
        },
        activitiesSignatures: {
          A: 'Jorge R.',
          B: 'Jorge R.',
          C: '', D: '', E: '', F: '', G: '', H: '', I: '', J: ''
        },
        comentarios: 'Condições climáticas favoráveis (Ensolarado, 24°C). Não houve acidentes de trabalho. DDS realizado no início do turno abordando segurança em trabalhos a quente.',
        photos: [],
        sigPlanejamento: 'Eng. Planejamento',
        sigEngenheiro: 'Eng. Produção CREA 123456/RS',
        sigFiscalizacao: 'Fiscal CMPC Matr. 8890',
        userId: 'user-admin-master',
        createdBy: 'engelmobile2020@gmail.com',
        createdByName: 'Administrador Master',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.saveRecordsLocal([initialRDO]);
    }
  },

  // FIRESTORE REAL-TIME SYNC
  initFirestoreSync() {
    if (!db) return;

    // 1. Sync Users from Firestore
    try {
      db.collection('users').onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const cloudUsers = [];
          snapshot.forEach(doc => {
            cloudUsers.push({ id: doc.id, ...doc.data() });
          });
          if (cloudUsers.length > 0) {
            this.saveUsersLocal(cloudUsers);
            if (typeof admin !== 'undefined' && admin.renderUsers) {
              admin.renderUsers();
            }
          }
        } else {
          // Seed Master Admin to Cloud
          const localUsers = this.getUsers();
          localUsers.forEach(u => {
            db.collection('users').doc(u.id).set(u, { merge: true });
          });
        }
      }, (err) => {
        console.warn('Firestore Users Listener:', err);
      });
    } catch (e) {
      console.warn('Erro ao escutar usuários do Firestore:', e);
    }

    // 2. Sync RDOs from Firestore
    try {
      db.collection('rdos').onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const cloudRDOs = [];
          snapshot.forEach(doc => {
            cloudRDOs.push({ id: doc.id, ...doc.data() });
          });
          if (cloudRDOs.length > 0) {
            this.saveRecordsLocal(cloudRDOs);
            if (typeof app !== 'undefined' && app.renderRDOList) {
              app.renderRDOList();
            }
          }
        } else {
          // Upload local RDOs to cloud
          const localRDOs = this.getRecords();
          localRDOs.forEach(r => {
            db.collection('rdos').doc(r.id).set(r, { merge: true });
          });
        }
      }, (err) => {
        console.warn('Firestore RDOs Listener:', err);
      });
    } catch (e) {
      console.warn('Erro ao escutar RDOs do Firestore:', e);
    }

    // 3. Sync Brevo Global Settings
    try {
      db.collection('settings').doc('brevo').onSnapshot((doc) => {
        if (doc && doc.exists) {
          const data = doc.data();
          if (data.apiKey) localStorage.setItem('cmpc_brevo_key', data.apiKey.trim());
          if (data.senderEmail) localStorage.setItem('cmpc_brevo_sender', data.senderEmail.trim());
          if (data.senderName) localStorage.setItem('cmpc_brevo_sender_name', data.senderName.trim());
        }
      }, (err) => {
        console.warn('Firestore Settings Listener:', err);
      });
    } catch (e) {
      console.warn('Erro ao escutar configurações do Firestore:', e);
    }

    // 4. Sync Active Presence
    this.initPresenceSync();
  },

  // REAL-TIME PRESENCE & CONNECTED USERS
  initPresenceSync() {
    let currentSessionId = sessionStorage.getItem('cmpc_rdo_sess_id');
    if (!currentSessionId) {
      currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      sessionStorage.setItem('cmpc_rdo_sess_id', currentSessionId);
    }
    this.currentSessionId = currentSessionId;

    if (!db) {
      this.updateConnectedUsersDisplay(1);
      return;
    }

    try {
      db.collection('presence').onSnapshot((snapshot) => {
        const now = Date.now();
        const activeUsers = [];
        let count = 0;

        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            // Active within last 90s
            if (data && data.lastSeen && (now - data.lastSeen < 90000)) {
              count++;
              activeUsers.push(data.userName || data.email || 'Usuário');
            }
          });
        }

        const finalCount = Math.max(count, 1);
        this.updateConnectedUsersDisplay(finalCount, activeUsers);
      }, (err) => {
        console.warn('Firestore Presence Listener:', err);
        this.updateConnectedUsersDisplay(1);
      });
    } catch (e) {
      console.warn('Erro ao escutar presença Firestore:', e);
      this.updateConnectedUsersDisplay(1);
    }

    // Send immediate heartbeat & interval every 30s
    this.sendPresenceHeartbeat();
    if (this._presenceInterval) clearInterval(this._presenceInterval);
    this._presenceInterval = setInterval(() => {
      this.sendPresenceHeartbeat();
    }, 30000);

    // Clean presence on page close/unload
    window.addEventListener('beforeunload', () => {
      this.removePresence();
    });
  },

  sendPresenceHeartbeat() {
    if (!db || !this.currentSessionId) return;
    const session = this.getSession();
    const presenceData = {
      sessionId: this.currentSessionId,
      userId: session ? session.id : 'user-online',
      userName: session ? session.name : 'Conectado',
      email: session ? session.email : 'online',
      role: session ? session.role : 'Usuário',
      lastSeen: Date.now()
    };
    db.collection('presence').doc(this.currentSessionId).set(presenceData, { merge: true })
      .catch(err => console.warn('Presence heartbeat error:', err));
  },

  removePresence() {
    if (db && this.currentSessionId) {
      try {
        db.collection('presence').doc(this.currentSessionId).delete().catch(() => {});
      } catch (e) {}
    }
  },

  updateConnectedUsersDisplay(count, usersList = []) {
    const el = document.getElementById('connected-users-text');
    const badgeEl = document.getElementById('cloud-users-count');
    if (el) {
      el.textContent = count === 1 ? '1 conectado' : `${count} conectados`;
    }
    if (badgeEl && usersList.length > 0) {
      const uniqueNames = [...new Set(usersList)];
      badgeEl.title = `Usuários online agora (${count}): ${uniqueNames.join(', ')}`;
    }
  },

  // USERS MANAGEMENT
  getUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  saveUsersLocal(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  saveUsers(users) {
    this.saveUsersLocal(users);
    if (db) {
      users.forEach(u => {
        db.collection('users').doc(u.id).set(u, { merge: true }).catch(err => console.warn('Cloud user save:', err));
      });
    }
  },
  addUser(user) {
    const users = this.getUsers();
    user.id = 'user-' + Date.now();
    user.createdAt = new Date().toISOString();
    users.push(user);
    this.saveUsers(users);

    if (db) {
      db.collection('users').doc(user.id).set(user, { merge: true })
        .catch(err => console.warn('Cloud addUser error:', err));
    }
    return user;
  },
  updateUser(id, updatedData) {
    let users = this.getUsers();
    let updatedUser = null;
    users = users.map(u => {
      if (u.id === id) {
        updatedUser = { ...u, ...updatedData, updatedAt: new Date().toISOString() };
        return updatedUser;
      }
      return u;
    });
    this.saveUsersLocal(users);

    if (db && updatedUser) {
      db.collection('users').doc(id).set(updatedUser, { merge: true })
        .catch(err => console.warn('Cloud updateUser error:', err));
    }
  },
  deleteUser(id) {
    let users = this.getUsers();
    users = users.filter(u => u.id !== id);
    this.saveUsersLocal(users);

    if (db) {
      db.collection('users').doc(id).delete()
        .catch(err => console.warn('Cloud deleteUser error:', err));
    }
  },

  // AUTH SESSION
  getSession() {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },
  setSession(user) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  // RDO RECORDS
  calculateRecordHH(record) {
    if (!record || !record.workers || !Array.isArray(record.workers)) {
      return parseFloat(record?.totalHH) || 0;
    }
    return record.workers.reduce((total, w) => {
      let rowHours = 0;
      if (w.activities) {
        for (const act of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
          rowHours += parseFloat(w.activities[act]) || 0;
        }
      }
      return total + rowHours;
    }, 0);
  },

  getRecords() {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!data) return [];
    try {
      const records = JSON.parse(data);
      return records.map(r => {
        if (r.workers && Array.isArray(r.workers) && r.workers.length > 0) {
          r.totalHH = this.calculateRecordHH(r);
        }
        return r;
      });
    } catch (e) {
      return [];
    }
  },
  getRecordById(id) {
    const records = this.getRecords();
    return records.find(r => r.id === id) || null;
  },
  saveRecordsLocal(records) {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  },
  saveRecords(records) {
    this.saveRecordsLocal(records);
    if (db) {
      records.forEach(r => {
        db.collection('rdos').doc(r.id).set(r, { merge: true }).catch(err => console.warn('Cloud saveRecords:', err));
      });
    }
  },
  saveRecord(rdoData) {
    const records = this.getRecords();
    let recordToSave = null;

    if (rdoData.id) {
      const idx = records.findIndex(r => r.id === rdoData.id);
      const existing = idx >= 0 ? records[idx] : null;
      recordToSave = {
        ...existing,
        ...rdoData,
        createdAt: rdoData.createdAt || (existing && existing.createdAt) || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (idx >= 0) {
        records[idx] = recordToSave;
      } else {
        records.push(recordToSave);
      }
    } else {
      rdoData.id = 'rdo-' + Date.now();
      rdoData.createdAt = new Date().toISOString();
      rdoData.updatedAt = new Date().toISOString();
      rdoData.sent = false;
      rdoData.status = 'pendente';
      recordToSave = rdoData;
      records.unshift(recordToSave);
    }

    this.saveRecordsLocal(records);

    // Sync to Firestore Cloud immediately
    if (db && recordToSave) {
      db.collection('rdos').doc(recordToSave.id).set(recordToSave, { merge: true })
        .then(() => console.log('☁️ RDO salvo na nuvem Firebase com sucesso:', recordToSave.numero))
        .catch(err => console.warn('Cloud saveRecord error:', err));
    }

    return recordToSave;
  },

  markRecordAsSent(id, email, obs = '') {
    const records = this.getRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx < 0) return null;

    const updated = {
      ...records[idx],
      sent: true,
      status: 'enviado',
      sentAt: new Date().toISOString(),
      sentTo: email,
      sendObs: obs,
      updatedAt: new Date().toISOString()
    };

    records[idx] = updated;
    this.saveRecordsLocal(records);

    if (db) {
      db.collection('rdos').doc(id).set(updated, { merge: true })
        .then(() => console.log('☁️ RDO marcado como enviado no Firebase:', id))
        .catch(err => console.warn('Cloud markRecordAsSent error:', err));
    }

    return updated;
  },

  markRecordApproval(id, approvalData) {
    const records = this.getRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx < 0) return null;

    const current = records[idx];
    const isApproved = approvalData.status === 'aprovado';
    const isRejected = approvalData.status === 'reprovado';
    
    const updated = {
      ...current,
      approved: isApproved,
      approvalStatus: approvalData.status || (isApproved ? 'aprovado' : 'pendente'),
      approvedBy: approvalData.approvedBy || '',
      approvedByEmail: approvalData.approvedByEmail || '',
      approvedByRole: approvalData.approvedByRole || '',
      approvedAt: new Date().toISOString(),
      approvalNotes: approvalData.notes || '',
      sigFiscalizacao: approvalData.sigFiscalizacao || current.sigFiscalizacao || approvalData.approvedBy || '',
      updatedAt: new Date().toISOString()
    };

    records[idx] = updated;
    this.saveRecordsLocal(records);

    if (db) {
      db.collection('rdos').doc(id).set(updated, { merge: true })
        .then(() => console.log('☁️ RDO aprovação salva no Firebase com sucesso:', id))
        .catch(err => console.warn('Cloud markRecordApproval error:', err));
    }

    return updated;
  },

  deleteRecord(id) {
    let records = this.getRecords();
    records = records.filter(r => r.id !== id);
    this.saveRecordsLocal(records);

    if (db) {
      db.collection('rdos').doc(id).delete()
        .then(() => console.log('☁️ RDO excluído da nuvem Firebase:', id))
        .catch(err => console.warn('Cloud deleteRecord error:', err));
    }
  },

  // LOGO (Per User & Global Fallback)
  getUserLogo(userId = null) {
    if (userId) {
      const userLogo = localStorage.getItem(`cmpc_rdo_logo_${userId}`);
      if (userLogo) return userLogo;
      const users = this.getUsers();
      const u = users.find(x => x.id === userId);
      if (u && u.logo) return u.logo;
    }
    return localStorage.getItem(STORAGE_KEYS.LOGO) || '';
  },
  setUserLogo(userId, base64Logo) {
    if (userId) {
      localStorage.setItem(`cmpc_rdo_logo_${userId}`, base64Logo);
      this.updateUser(userId, { logo: base64Logo });
    }
    localStorage.setItem(STORAGE_KEYS.LOGO, base64Logo);
  },
  removeUserLogo(userId) {
    if (userId) {
      localStorage.removeItem(`cmpc_rdo_logo_${userId}`);
      this.updateUser(userId, { logo: '' });
    }
  },

  // BREVO API CONFIGURATION PERSISTENCE
  getBrevoConfig() {
    const savedKey = localStorage.getItem('cmpc_brevo_key') || '';
    const savedSender = localStorage.getItem('cmpc_brevo_sender') || 'sistemasengenharia@cmpcrs.com.br';
    const savedName = localStorage.getItem('cmpc_brevo_sender_name') || 'Engenharia CMPC - SGQ';
    return {
      apiKey: savedKey || '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',
      senderEmail: savedSender,
      senderName: savedName
    };
  },
  saveBrevoConfig(apiKey, senderEmail, senderName) {
    if (apiKey) localStorage.setItem('cmpc_brevo_key', apiKey.trim());
    if (senderEmail) localStorage.setItem('cmpc_brevo_sender', senderEmail.trim());
    if (senderName) localStorage.setItem('cmpc_brevo_sender_name', senderName.trim());

    if (db) {
      db.collection('settings').doc('brevo').set({
        apiKey: apiKey ? apiKey.trim() : '',
        senderEmail: senderEmail ? senderEmail.trim() : '',
        senderName: senderName ? senderName.trim() : '',
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Cloud saveBrevoConfig:', err));
    }
  },

  // EXPORT / IMPORT
  exportBackup() {
    return JSON.stringify({
      version: '2.0',
      cloudProvider: 'Firebase Firestore',
      projectId: firebaseConfig.projectId,
      exportedAt: new Date().toISOString(),
      users: this.getUsers(),
      records: this.getRecords()
    }, null, 2);
  },
  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.users && Array.isArray(data.users)) this.saveUsers(data.users);
      if (data.records && Array.isArray(data.records)) this.saveRecords(data.records);
      return true;
    } catch (err) {
      console.error('Erro ao importar backup:', err);
      return false;
    }
  }
};

// Initialize on script load
StorageService.init();
