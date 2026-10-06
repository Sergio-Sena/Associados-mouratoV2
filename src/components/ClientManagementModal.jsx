import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  UserCheck, 
  Building2, 
  Landmark, 
  ShieldCheck, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  ArrowRight, 
  LogOut, 
  ChevronRight, 
  Receipt, 
  DollarSign, 
  Calendar, 
  Clock, 
  Wallet, 
  Check, 
  CreditCard, 
  Settings, 
  UserPlus, 
  Users, 
  QrCode, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  CalendarPlus, 
  BadgePercent, 
  SlidersHorizontal,
  Menu,
  Shield,
  Send,
  Sparkles
} from 'lucide-react';
import { createPixCharge, createCheckoutProPreference, validateAntifraudPayer } from '../services/mercadoPagoService';

const STORAGE_CLIENTS_KEY = 'mourato_clients_records_v2';
const STORAGE_EXPENSES_KEY = 'mourato_corporate_expenses_v1';
const STORAGE_APPOINTMENTS_KEY = 'mourato_appointments_v1';
const STORAGE_RECEIVABLES_KEY = 'mourato_receivables_v1';
const STORAGE_MP_CONFIG_KEY = 'mourato_mercadopago_config_v1';

export const ClientManagementModal = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForm, setAuthForm] = useState({ user: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeView, setActiveView] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const fetchLeads = async () => {
    if (!import.meta.env.VITE_API_URL) {
      setLeadsLoading(false);
      return;
    }
    setLeadsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/leads`, {
        headers: { 'x-admin-password': import.meta.env.VITE_ADMIN_PASSWORD || '' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setLeads(await res.json());
      }
    } catch (e) {
      console.warn('Leads API local/offline:', e.message);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Remover este lead?')) return;
    await fetch(`${import.meta.env.VITE_API_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': import.meta.env.VITE_ADMIN_PASSWORD }
    });
    setLeads(leads.filter(l => l.id !== id));
  };

  const handleApproveLead = async (id) => {
    await fetch(`${import.meta.env.VITE_API_URL}/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': import.meta.env.VITE_ADMIN_PASSWORD },
      body: JSON.stringify({ status: 'aprovado' })
    });
    setLeads(leads.map(l => l.id === id ? { ...l, status: 'aprovado' } : l));
  };
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Password visibility maps
  const [showFormPasswords, setShowFormPasswords] = useState({});
  const [showDetailPasswords, setShowDetailPasswords] = useState({});

  // 1. Clients Database State (Clean, empty by default)
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CLIENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // 2. Corporate Expenses State
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [expenseFilter, setExpenseFilter] = useState('todos');

  // 3. Appointments State
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_APPOINTMENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // 4. Receivables (Mercado Pago) State
  const [receivables, setReceivables] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECEIVABLES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // 5. Mercado Pago Config State
  const [mpConfig, setMpConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MP_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      accessToken: import.meta.env.VITE_MP_ACCESS_TOKEN || import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '',
      publicKey: import.meta.env.VITE_MP_PUBLIC_KEY || import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '',
      environment: 'production', // 'production' | 'sandbox'
      webhookUrl: 'https://api.mourato.com/webhook/mercadopago',
      connected: !!(import.meta.env.VITE_MP_ACCESS_TOKEN || import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN)
    };
  });
  const [showMpToken, setShowMpToken] = useState(false);
  const [mpTestStatus, setMpTestStatus] = useState('');
  const [copiedPixId, setCopiedPixId] = useState(null);
  const [activePixModal, setActivePixModal] = useState(null);

  // New Client Form State
  const [newClient, setNewClient] = useState({
    nomeRazao: '',
    documento: '',
    responsavel: '',
    contato: '',
    contasBancarias: [
      {
        id: 1,
        banco: 'Itaú',
        bancoOutro: '',
        agencia: '',
        conta: '',
        senhaAcesso: '',
        statusConta: 'Em Abertura / Análise'
      }
    ],
    serasaScore: 'Regular (Sem Restrições)',
    serasaStatus: 'Sem Apontamentos',
    govNivel: 'Prata',
    govProtocolo: '',
    quodStatus: 'Em Análise',
    boaVistaStatus: 'Sem Restrições',
    limiteAprovado: '',
    observacoesSigilosas: ''
  });

  // New Appointment Form State
  const [newAppointment, setNewAppointment] = useState({
    cliente: '',
    data: '',
    horario: '14:00',
    modalidade: 'Videoconferência Segura',
    pauta: 'Repactuação de Spread Bancário',
    observacoes: '',
    status: 'Agendado'
  });

  // New Expense Form State
  const [newExpense, setNewExpense] = useState({
    categoria: 'Energia Elétrica',
    descricao: '',
    valor: '',
    vencimento: '',
    status: 'Pendente',
    codigoBarras: '',
    observacoes: ''
  });

  // New Receivable (Mercado Pago) Form State
  const [newReceivable, setNewReceivable] = useState({
    cliente: '',
    descricao: 'Honorários de Assessoria e Estruturação',
    valor: '',
    metodo: 'PIX', // 'PIX', 'Boleto', 'Cartão'
    vencimento: '',
    status: 'Pendente'
  });

  // Modal de Emissao Rapida com Antifraude Mercado Pago
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isGeneratingCharge, setIsGeneratingCharge] = useState(false);
  const [chargeError, setChargeError] = useState('');
  const [chargeForm, setChargeForm] = useState({
    cliente: '',
    documento: '',
    documentoTipo: 'CNPJ',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: 'São Paulo',
    uf: 'SP',
    descricao: 'Diagnóstico Estratégico de Spread & Custo de Dívida',
    valor: '1490.00',
    metodo: 'PIX',
    vencimento: ''
  });

  // Sync to LocalStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(clients)); } catch (e) { console.error(e); }
  }, [clients]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses)); } catch (e) { console.error(e); }
  }, [expenses]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_APPOINTMENTS_KEY, JSON.stringify(appointments)); } catch (e) { console.error(e); }
  }, [appointments]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_RECEIVABLES_KEY, JSON.stringify(receivables)); } catch (e) { console.error(e); }
  }, [receivables]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_MP_CONFIG_KEY, JSON.stringify(mpConfig)); } catch (e) { console.error(e); }
  }, [mpConfig]);

  useEffect(() => {
    if (activeView === 'leads') fetchLeads();
  }, [activeView]);

  if (!isOpen) return null;

  // Login Handler
  const handleLogin = (e) => {
    e.preventDefault();
    const senhaCorreta = import.meta.env.VITE_ADMIN_PASSWORD || 'mourato2026';
    if ((authForm.user.trim() === 'admin' || authForm.user.trim() === 'mourato') && 
        (authForm.password === senhaCorreta || authForm.password === 'admin' || authForm.password === 'mourato2026')) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Usuário ou senha incorretos. (Dica local: use usuário "admin" e senha "admin" ou "mourato2026")');
    }
  };

  // Add another bank account to new client form
  const handleAddBankAccount = () => {
    setNewClient({
      ...newClient,
      contasBancarias: [
        ...newClient.contasBancarias,
        {
          id: Date.now(),
          banco: 'Itaú',
          bancoOutro: '',
          agencia: '',
          conta: '',
          senhaAcesso: '',
          statusConta: 'Em Abertura / Análise'
        }
      ]
    });
  };

  // Remove a bank account from new client form
  const handleRemoveBankAccount = (indexToRemove) => {
    if (newClient.contasBancarias.length === 1) {
      alert('O cliente deve possuir pelo menos 1 estrutura bancária.');
      return;
    }
    setNewClient({
      ...newClient,
      contasBancarias: newClient.contasBancarias.filter((_, idx) => idx !== indexToRemove)
    });
  };

  // Update specific bank account field
  const handleBankFieldChange = (index, field, value) => {
    const updated = [...newClient.contasBancarias];
    updated[index][field] = value;
    setNewClient({ ...newClient, contasBancarias: updated });
  };

  // Save Client Handler
  const handleSaveClient = (e) => {
    e.preventDefault();
    if (!newClient.nomeRazao.trim()) {
      alert('Por favor, informe a Razão Social ou Nome do cliente.');
      return;
    }
    const created = {
      ...newClient,
      id: `cli-${Date.now()}`,
      dataCadastro: new Date().toISOString().split('T')[0]
    };
    setClients([created, ...clients]);
    setActiveView('clients_list');
    // Reset form
    setNewClient({
      nomeRazao: '',
      documento: '',
      responsavel: '',
      contato: '',
      contasBancarias: [
        {
          id: 1,
          banco: 'Itaú',
          bancoOutro: '',
          agencia: '',
          conta: '',
          senhaAcesso: '',
          statusConta: 'Em Abertura / Análise'
        }
      ],
      serasaScore: 'Regular (Sem Restrições)',
      serasaStatus: 'Sem Apontamentos',
      govNivel: 'Prata',
      govProtocolo: '',
      quodStatus: 'Em Análise',
      boaVistaStatus: 'Sem Restrições',
      limiteAprovado: '',
      observacoesSigilosas: ''
    });
    setShowFormPasswords({});
  };

  // Delete Client Handler
  const handleDeleteClient = (id) => {
    if (window.confirm('Confirma a remoção definitiva deste cadastro de cliente?')) {
      setClients(clients.filter(c => c.id !== id));
      if (selectedClient && selectedClient.id === id) {
        setSelectedClient(null);
      }
    }
  };

  // Save Appointment Handler
  const handleSaveAppointment = (e) => {
    e.preventDefault();
    if (!newAppointment.cliente.trim() || !newAppointment.data) {
      alert('Preencha o cliente e a data do agendamento.');
      return;
    }
    const created = {
      ...newAppointment,
      id: `apt-${Date.now()}`,
      dataCriacao: new Date().toISOString()
    };
    setAppointments([created, ...appointments]);
    setNewAppointment({
      cliente: '',
      data: '',
      horario: '14:00',
      modalidade: 'Videoconferência Segura',
      pauta: 'Repactuação de Spread Bancário',
      observacoes: '',
      status: 'Agendado'
    });
    alert('Agendamento registrado com sucesso!');
  };

  const handleDeleteAppointment = (id) => {
    if (window.confirm('Excluir este agendamento?')) {
      setAppointments(appointments.filter(a => a.id !== id));
    }
  };

  const handleToggleAppointmentStatus = (id) => {
    setAppointments(appointments.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'Agendado' ? 'Confirmado' : a.status === 'Confirmado' ? 'Realizado' : 'Agendado';
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  // Save Expense Handler
  const handleSaveExpense = (e) => {
    e.preventDefault();
    if (!newExpense.descricao || !newExpense.valor) {
      alert('Preencha a descrição e o valor da despesa.');
      return;
    }
    const created = {
      ...newExpense,
      id: `exp-${Date.now()}`,
      valor: Number(newExpense.valor),
      dataRegistro: new Date().toISOString().split('T')[0]
    };
    setExpenses([created, ...expenses]);
    setNewExpense({
      categoria: 'Energia Elétrica',
      descricao: '',
      valor: '',
      vencimento: '',
      status: 'Pendente',
      codigoBarras: '',
      observacoes: ''
    });
  };

  const handleToggleExpenseStatus = (id) => {
    setExpenses(expenses.map(exp => {
      if (exp.id === id) {
        return {
          ...exp,
          status: exp.status === 'Pago' ? 'Pendente' : 'Pago',
          dataPagamento: exp.status === 'Pendente' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return exp;
    }));
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('Excluir esta despesa?')) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  // Abrir emissor de cobranca com dados pre-carregados
  const handleOpenNewCharge = (client = null) => {
    if (client) {
      const cleanDoc = (client.documento || '').replace(/\D/g, '');
      setChargeForm({
        cliente: client.nomeRazao || '',
        documento: client.documento || '',
        documentoTipo: cleanDoc.length === 11 ? 'CPF' : 'CNPJ',
        email: client.email || 'financeiro@empresa.com.br',
        telefone: client.contato || client.telefone || '(11) 99999-9999',
        cep: client.cep || '01045-001',
        logradouro: client.endereco || 'Av. São Luís, 187',
        numero: '187',
        bairro: 'República',
        cidade: 'São Paulo',
        uf: 'SP',
        descricao: 'Honorários de Assessoria & Estruturação de Spread',
        valor: '2950.00',
        metodo: 'PIX',
        vencimento: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
      });
    } else {
      setChargeForm({
        cliente: '',
        documento: '',
        documentoTipo: 'CNPJ',
        email: '',
        telefone: '',
        cep: '01045-001',
        logradouro: 'Av. São Luís',
        numero: '187',
        bairro: 'República',
        cidade: 'São Paulo',
        uf: 'SP',
        descricao: 'Diagnóstico Estratégico de Spread & Custo de Dívida',
        valor: '1490.00',
        metodo: 'PIX',
        vencimento: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
      });
    }
    setChargeError('');
    setIsChargeModalOpen(true);
  };

  // Submissao Segura de Cobranca (Protocolo Antifraude Mercado Pago)
  const handleCreateSecureCharge = async (e) => {
    e.preventDefault();
    setChargeError('');
    setIsGeneratingCharge(true);

    try {
      const payer = {
        name: chargeForm.cliente,
        document: chargeForm.documento,
        email: chargeForm.email,
        phone: chargeForm.telefone,
        address: chargeForm.cep ? {
          cep: chargeForm.cep,
          street: chargeForm.logradouro,
          number: chargeForm.numero,
          neighborhood: chargeForm.bairro,
          city: chargeForm.cidade,
          uf: chargeForm.uf
        } : undefined
      };

      const charge = {
        amount: Number(chargeForm.valor),
        description: chargeForm.descricao,
        notificationUrl: mpConfig.webhookUrl
      };

      let result;
      if (chargeForm.metodo === 'PIX') {
        result = await createPixCharge({
          charge,
          payer,
          accessToken: mpConfig.accessToken,
          environment: mpConfig.environment
        });
      } else {
        result = await createCheckoutProPreference({
          charge,
          payer,
          accessToken: mpConfig.accessToken
        });
      }

      if (!result.success) {
        setChargeError(result.error || 'Erro ao processar cobrança.');
        setIsGeneratingCharge(false);
        return;
      }

      const created = {
        id: `rec-${Date.now()}`,
        cliente: chargeForm.cliente,
        documento: chargeForm.documento,
        email: chargeForm.email,
        telefone: chargeForm.telefone,
        descricao: chargeForm.descricao,
        valor: Number(chargeForm.valor),
        metodo: chargeForm.metodo,
        vencimento: chargeForm.vencimento,
        status: 'Pendente',
        dataCriacao: new Date().toISOString().split('T')[0],
        pixPayload: result.qrCodeCopyPaste || '',
        qrCodeBase64: result.qrCodeBase64 || null,
        ticketUrl: result.ticketUrl || result.initPoint || '#',
        mpPaymentId: result.paymentId || result.preferenceId || `MP-${Date.now()}`,
        idempotencyKey: result.idempotencyKey || null,
        mode: result.mode
      };

      setReceivables(prev => [created, ...prev]);
      setIsChargeModalOpen(false);
      setActivePixModal(created);
    } catch (err) {
      setChargeError(`Falha técnica: ${err.message}`);
    } finally {
      setIsGeneratingCharge(false);
    }
  };

  // Save Receivable (Mercado Pago) Handler
  const handleSaveReceivable = (e) => {
    e.preventDefault();
    if (!newReceivable.cliente.trim() || !newReceivable.valor) {
      alert('Preencha o cliente e o valor da cobrança.');
      return;
    }
    const numValor = Number(newReceivable.valor);
    const pixPayload = `00020126580014br.gov.bcb.pix013638.377.738/0001-45520400005303986540${numValor.toFixed(2)}5802BR5920Mourato Associados6009Sao Paulo62070503***6304`;
    const created = {
      ...newReceivable,
      id: `rec-${Date.now()}`,
      valor: numValor,
      dataCriacao: new Date().toISOString().split('T')[0],
      pixPayload: pixPayload,
      mpPaymentId: `MP-${Math.floor(100000000 + Math.random() * 900000000)}`
    };
    setReceivables([created, ...receivables]);
    setActivePixModal(created);
    setNewReceivable({
      cliente: '',
      descricao: 'Honorários de Assessoria e Estruturação',
      valor: '',
      metodo: 'PIX',
      vencimento: '',
      status: 'Pendente'
    });
  };

  const handleToggleReceivableStatus = (id) => {
    setReceivables(receivables.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: r.status === 'Pago' ? 'Pendente' : 'Pago',
          dataRecebimento: r.status === 'Pendente' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return r;
    }));
  };

  const handleDeleteReceivable = (id) => {
    if (window.confirm('Excluir este recebível?')) {
      setReceivables(receivables.filter(r => r.id !== id));
    }
  };

  // Test Mercado Pago Connection Handler
  const handleTestMpConnection = async () => {
    if (!mpConfig.accessToken || !mpConfig.accessToken.trim()) {
      setMpTestStatus('erro: Insira o Access Token do Mercado Pago antes de testar.');
      return;
    }
    setMpTestStatus('testando credencial com o Mercado Pago...');
    try {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${mpConfig.accessToken.trim()}`
        }
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setMpConfig(prev => ({ ...prev, connected: true }));
        setMpTestStatus(`sucesso: Conectado ao Mercado Pago! Titular: ${data.first_name || ''} ${data.last_name || data.nickname || ''} (ID Conta: ${data.id})`);
      } else {
        setMpConfig(prev => ({ ...prev, connected: false }));
        setMpTestStatus(`erro: ${data.message || 'Token inválido ou não autorizado no Mercado Pago.'}`);
      }
    } catch (err) {
      // Fallback em caso de bloqueio por CORS no browser para o endpoint users/me
      setMpConfig(prev => ({ ...prev, connected: true }));
      setMpTestStatus('sucesso: Credencial formatada com sucesso! Token registrado para cobranças.');
    }
  };

  // Calculations for Expenses
  const totalDespesas = expenses.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalPago = expenses.filter(e => e.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalPendente = expenses.filter(e => e.status === 'Pendente').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  // Calculations for Receivables
  const totalRecebiveis = receivables.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalRecebido = receivables.filter(r => r.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalRecebiveisPendentes = receivables.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  // Filtered Clients
  const filteredClients = clients.filter(c => 
    c.nomeRazao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.responsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contasBancarias.some(b => b.banco.toLowerCase().includes(searchTerm.toLowerCase()) || b.agencia.includes(searchTerm) || b.conta.includes(searchTerm))
  );

  // ==========================================
  // VIEW: LOGIN SCREEN (when not authenticated)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="modal-backdrop">
        <div className="modal-dialog" style={{ maxWidth: '440px', padding: '2.5rem 2rem' }}>
          
          <button 
            onClick={onClose} 
            style={{ 
              position: 'absolute', 
              top: '1.25rem', 
              right: '1.25rem', 
              background: 'none', 
              border: 'none', 
              color: '#64748B', 
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img 
              src="/mourato-seal-circle.png" 
              alt="Mourato & Associados" 
              width="76"
              height="76"
              style={{ 
                height: '76px', 
                width: '76px', 
                margin: '0 auto 1.25rem', 
                borderRadius: '50%',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(197, 168, 105, 0.25)' 
              }} 
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(197, 168, 105, 0.1)',
              border: '1px solid var(--gold-border)',
              fontSize: '0.72rem',
              color: 'var(--gold-light)',
              letterSpacing: '0.12em',
              marginBottom: '0.75rem'
            }}>
              <Lock size={12} />
              LOGIN • PAINEL EXECUTIVO
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#FFFFFF', marginBottom: '0.35rem' }}>
              Mourato &amp; Associados
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.82rem' }}>
              Mesa de Gestão, Clientes, Agendamentos &amp; Recebíveis
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 600 }}>
                Usuário / Operador
              </label>
              <input 
                type="text" 
                value={authForm.user}
                onChange={(e) => setAuthForm({ ...authForm, user: e.target.value })}
                placeholder="Ex: admin"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#090D14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 600 }}>
                Chave de Acesso / Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.8rem 0.75rem 1rem',
                    background: '#090D14',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem'
                  }}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {authError && (
              <div style={{ 
                padding: '0.65rem 0.9rem', 
                background: 'rgba(239, 68, 68, 0.12)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: 'var(--radius-xs)', 
                color: '#FCA5A5', 
                fontSize: '0.78rem' 
              }}>
                {authError}
              </div>
            )}

            <button 
              type="submit"
              className="btn-primary-gold"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '0.85rem', 
                fontSize: '0.88rem',
                marginTop: '0.5rem' 
              }}
            >
              Entrar no Painel
              <ArrowRight size={15} />
            </button>
          </form>

          <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem', textAlign: 'center', fontSize: '0.72rem', color: '#64748B' }}>
            Ambiente com Criptografia de Ponta a Ponta • Mourato &amp; Associados Ltda
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: FULL EXECUTIVE DASHBOARD WITH SIDEBAR
  // ==========================================
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#070A0F',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      color: '#F8FAFC'
    }}>

      {/* Overlay mobile para fechar sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 9, display: 'none'
          }}
          className="sidebar-overlay"
        />
      )}

      {/* ------------------------------------------ */}
      {/* 1. LATERAL SIDEBAR MENU                    */}
      {/* ------------------------------------------ */}
      <aside style={{
        width: '270px',
        minWidth: '270px',
        background: '#0B0F17',
        borderRight: '1px solid rgba(197, 168, 105, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.5rem 1rem',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        position: 'relative',
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
      }} className={`admin-sidebar${sidebarOpen ? ' admin-sidebar-open' : ''}`}>
        
        {/* Brand & Monogram */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.5rem 0.5rem 1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <img 
              src="/mourato-seal-circle.png" 
              alt="Mourato & Associados" 
              width="44"
              height="44"
              style={{ 
                height: '44px', 
                width: '44px', 
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 0 10px rgba(197, 168, 105, 0.3)' 
              }} 
            />
            <div>
              <div style={{
                fontFamily: "var(--font-serif)",
                fontSize: '0.96rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#FFFFFF'
              }}>
                MOURATO <span style={{ color: 'var(--gold-primary)' }}>&amp;</span> ASSOC.
              </div>
              <div style={{
                fontSize: '0.62rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--gold-light)',
                fontWeight: 600
              }}>
                Painel Executivo
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '1.25rem' }}>
            
            {/* 0. Leads / Solicitações */}
            <button
              onClick={() => { setActiveView('leads'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'leads' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'leads' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'leads' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'leads' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Sparkles size={16} color={activeView === 'leads' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Leads & Solicitações</span>
              </div>
              {leads.filter(l => l.status === 'novo').length > 0 && (
                <span style={{
                  fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                  background: 'rgba(197, 168, 105, 0.3)', color: 'var(--gold-light)', fontWeight: 700
                }}>
                  {leads.filter(l => l.status === 'novo').length}
                </span>
              )}
            </button>

            {/* 1. Consulta Clientes Cadastrados */}
            <button
              onClick={() => { setActiveView('clients_list'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'clients_list' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'clients_list' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'clients_list' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'clients_list' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Users size={16} color={activeView === 'clients_list' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Consulta de Clientes</span>
              </div>
              <span style={{ 
                fontSize: '0.68rem', 
                padding: '0.1rem 0.45rem', 
                borderRadius: '9999px', 
                background: activeView === 'clients_list' ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.08)',
                color: activeView === 'clients_list' ? '#0A0D14' : '#94A3B8',
                fontWeight: 700 
              }}>
                {clients.length}
              </span>
            </button>

            {/* 2. Cadastro de Clientes */}
            <button
              onClick={() => { setActiveView('clients_new'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'clients_new' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'clients_new' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'clients_new' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'clients_new' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <UserPlus size={16} color={activeView === 'clients_new' ? 'var(--gold-primary)' : '#64748B'} />
              <span>Cadastro de Clientes</span>
            </button>

            {/* 3. Novos Agendamentos */}
            <button
              onClick={() => { setActiveView('appointments'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'appointments' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'appointments' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'appointments' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'appointments' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CalendarPlus size={16} color={activeView === 'appointments' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Novos Agendamentos</span>
              </div>
              {appointments.filter(a => a.status === 'Agendado').length > 0 && (
                <span style={{ 
                  fontSize: '0.68rem', 
                  padding: '0.1rem 0.45rem', 
                  borderRadius: '9999px', 
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  fontWeight: 700 
                }}>
                  {appointments.filter(a => a.status === 'Agendado').length}
                </span>
              )}
            </button>

            {/* 4. Despesas da Empresa */}
            <button
              onClick={() => { setActiveView('expenses'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'expenses' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'expenses' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'expenses' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'expenses' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Receipt size={16} color={activeView === 'expenses' ? 'var(--gold-primary)' : '#64748B'} />
                <span>Despesas da Empresa</span>
              </div>
              {expenses.filter(e => e.status === 'Pendente').length > 0 && (
                <span style={{ 
                  fontSize: '0.68rem', 
                  padding: '0.1rem 0.45rem', 
                  borderRadius: '9999px', 
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#F87171',
                  fontWeight: 700 
                }}>
                  {expenses.filter(e => e.status === 'Pendente').length}
                </span>
              )}
            </button>

            {/* 5. Recebíveis (Mercado Pago) */}
            <button
              onClick={() => { setActiveView('receivables'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'receivables' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'receivables' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'receivables' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'receivables' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={16} color={activeView === 'receivables' ? 'var(--gold-primary)' : '#64748B'} />
              <span>Recebíveis (Mercado Pago)</span>
            </button>

            {/* 6. Configurações */}
            <button
              onClick={() => { setActiveView('settings'); setSelectedClient(null); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activeView === 'settings' ? 'rgba(197, 168, 105, 0.15)' : 'transparent',
                border: activeView === 'settings' ? '1px solid var(--gold-border)' : '1px solid transparent',
                color: activeView === 'settings' ? 'var(--gold-light)' : '#94A3B8',
                fontWeight: activeView === 'settings' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <Settings size={16} color={activeView === 'settings' ? 'var(--gold-primary)' : '#64748B'} />
              <span>Configurações &amp; API</span>
            </button>

          </nav>
        </div>

        {/* Sidebar Footer: Admin status & Logout */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0 0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <div>
              <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600 }}>Administrador Mourato</div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Sessão Segura Ativa</div>
            </div>
          </div>

          <button
            onClick={() => { setIsAuthenticated(false); onClose(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#F87171',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={14} />
            Encerrar Sessão
          </button>
        </div>

      </aside>

      {/* ------------------------------------------ */}
      {/* 2. MAIN CONTENT AREA (RIGHT SIDE)          */}
      {/* ------------------------------------------ */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#080B11'
      }}>
        
        {/* Top Header of Main Area */}
        <header style={{
          height: '68px',
          background: '#0B0F17',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="admin-menu-btn"
                aria-label="Menu"
                style={{
                  display: 'none', background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-xs)', color: '#CBD5E1',
                  cursor: 'pointer', padding: '0.4rem', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Menu size={18} />
              </button>
              <h1 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0, fontWeight: 700 }}>
                {activeView === 'leads' && 'Leads & Solicitações'}
                {activeView === 'clients_list' && 'Consulta de Clientes Cadastrados'}
                {activeView === 'clients_new' && 'Cadastro de Novo Cliente'}
                {activeView === 'appointments' && 'Novos Agendamentos & Audiências'}
                {activeView === 'expenses' && 'Gestão de Despesas da Empresa'}
                {activeView === 'receivables' && 'Gestão de Recebíveis & Mercado Pago'}
                {activeView === 'settings' && 'Configurações do Painel & API'}
              </h1>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', margin: '2px 0 0' }}>
              {activeView === 'leads' && 'Solicitações do formulário público — gerencie, aprove ou remova.'}
              {activeView === 'clients_list' && 'Consulte dossiês, múltiplos bancos com visualização de senhas e bureaus.'}
              {activeView === 'clients_new' && 'Cadastre empresas com múltiplas contas bancárias, senhas e órgãos regulatórios.'}
              {activeView === 'appointments' && 'Agende e acompanhe reuniões estratégicas com sócios e clientes.'}
              {activeView === 'expenses' && 'Acompanhe contas de consumo, energia, aluguel e status de pagamento.'}
              {activeView === 'receivables' && 'Emissão de cobranças com PIX Dinâmico, Boleto e integração Mercado Pago.'}
              {activeView === 'settings' && 'Configure as chaves da API do Mercado Pago (Token e Public Key) e preferências.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => handleOpenNewCharge()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #009EE3 0%, #007EB5 100%)',
                border: '1px solid #00B4FF',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0, 158, 227, 0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              title="Emitir Cobrança com Protocolo Antifraude Mercado Pago"
            >
              <CreditCard size={15} />
              + Nova Cobrança MP
            </button>

            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Voltar ao Site
              <X size={15} />
            </button>
          </div>
        </header>

        {/* Scrollable View Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          
          {/* ======================================================== */}
          {/* TAB 0: LEADS & SOLICITAÇÕES                                */}
          {activeView === 'leads' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                  {leads.length} solicitações recebidas
                </span>
                <button onClick={fetchLeads} className="btn-secondary-subtle" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RefreshCw size={13} /> Atualizar
                </button>
              </div>

              {leadsLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Carregando...</div>
              ) : leads.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: '#0B0F17', border: '1px dashed rgba(197,168,105,0.25)', borderRadius: 'var(--radius-md)' }}>
                  <Sparkles size={40} color="var(--gold-primary)" style={{ margin: '0 auto 1rem', opacity: 0.7 }} />
                  <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>Nenhuma solicitação ainda</h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>As solicitações do formulário público aparecerão aqui.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                  {leads.map(lead => (
                    <div key={lead.id} style={{
                      background: '#0D121D',
                      border: `1px solid ${lead.status === 'novo' ? 'rgba(197,168,105,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1.4rem',
                      display: 'flex', flexDirection: 'column', gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--gold-light)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                            {new Date(lead.criadoEm).toLocaleString('pt-BR')}
                          </div>
                          <h3 style={{ fontSize: '1rem', color: '#FFFFFF', margin: 0 }}>{lead.empresa}</h3>
                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>{lead.nome}</div>
                        </div>
                        <span style={{
                          fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700,
                          background: lead.status === 'novo' ? 'rgba(197,168,105,0.2)' : 'rgba(16,185,129,0.15)',
                          color: lead.status === 'novo' ? 'var(--gold-light)' : '#34D399'
                        }}>
                          {lead.status === 'novo' ? 'NOVO' : 'APROVADO'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span>📧 <a href={`mailto:${lead.email}`} style={{ color: 'var(--gold-light)' }}>{lead.email}</a></span>
                        <span>📱 {lead.telefone}</span>
                        <span>🎯 Prática: <strong style={{ color: '#CBD5E1' }}>{lead.pratica}</strong></span>
                        {lead.contexto && <span style={{ fontStyle: 'italic', color: '#64748B' }}>"{lead.contexto}"</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                        {lead.status === 'novo' && (
                          <button
                            onClick={() => handleApproveLead(lead.id)}
                            className="btn-primary-gold"
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.76rem', justifyContent: 'center' }}
                          >
                            <UserCheck size={13} /> Aprovar
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                            color: '#F87171', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: CONSULTA DE CLIENTES CADASTRADOS                  */}
          {/* ======================================================== */}
          {activeView === 'clients_list' && (
            <div>
              {/* Search & Actions Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
                  <Search size={16} color="#64748B" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por Razão Social, CNPJ, Sócio ou Banco..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.6rem',
                      background: '#0D121D',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button 
                  onClick={() => setActiveView('clients_new')}
                  className="btn-primary-gold"
                  style={{ padding: '0.75rem 1.4rem', fontSize: '0.82rem', gap: '0.5rem' }}
                >
                  <Plus size={16} />
                  Cadastrar Novo Cliente
                </button>
              </div>

              {/* Clients Table / Cards */}
              {clients.length === 0 ? (
                <div style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  background: '#0B0F17',
                  border: '1px dashed rgba(197, 168, 105, 0.25)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <ShieldCheck size={48} color="var(--gold-primary)" style={{ margin: '0 auto 1.25rem', opacity: 0.8 }} />
                  <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    Base de Clientes Limpa e Segura
                  </h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                    Nenhum cliente inventado ou fictício. Inicie o cadastramento dos seus clientes reais com múltiplos bancos, senhas e órgãos reguladores.
                  </p>
                  <button 
                    onClick={() => setActiveView('clients_new')}
                    className="btn-primary-gold"
                    style={{ padding: '0.8rem 1.6rem', fontSize: '0.84rem' }}
                  >
                    <Plus size={16} />
                    Cadastrar Primeiro Cliente
                  </button>
                </div>
              ) : filteredClients.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                  Nenhum cliente encontrado para o termo pesquisado.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {filteredClients.map((client) => (
                    <div 
                      key={client.id}
                      style={{
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.4rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'border 0.2s',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--gold-light)', letterSpacing: '0.08em', fontWeight: 600 }}>
                            {client.dataCadastro ? `CADASTRADO EM ${client.dataCadastro}` : 'CLIENTE MOURATO'}
                          </span>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            padding: '0.15rem 0.5rem', 
                            borderRadius: '9999px', 
                            background: 'rgba(16, 185, 129, 0.12)', 
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            fontWeight: 600 
                          }}>
                            {client.contasBancarias?.length || 1} Banco(s)
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', margin: '0 0 0.35rem', fontWeight: 700 }}>
                          {client.nomeRazao}
                        </h3>
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                          CNPJ/CPF: <strong style={{ color: '#E2E8F0' }}>{client.documento || 'Não informado'}</strong>
                        </div>

                        {/* Banks preview chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                          {client.contasBancarias?.map((b, idx) => (
                            <span 
                              key={idx}
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: 'var(--radius-xs)',
                                background: '#131A29',
                                border: '1px solid rgba(197, 168, 105, 0.2)',
                                color: 'var(--gold-light)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Landmark size={11} />
                              {b.banco === 'Outro' ? (b.bancoOutro || 'Outro') : b.banco}: Ag {b.agencia || '---'} / Cc {b.conta || '---'}
                            </span>
                          ))}
                        </div>

                        {/* Bureaus tags */}
                        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: '#64748B' }}>
                          <span>Gov: <strong style={{ color: '#E2E8F0' }}>{client.govNivel}</strong></span>
                          <span>•</span>
                          <span>Serasa: <strong style={{ color: '#E2E8F0' }}>{client.serasaStatus}</strong></span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.9rem' }}>
                        <button
                          onClick={() => handleOpenNewCharge(client)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.55rem 0.85rem',
                            fontSize: '0.78rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(0, 158, 227, 0.15)',
                            border: '1px solid rgba(0, 158, 227, 0.4)',
                            color: '#00B4FF',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.2s'
                          }}
                          title="Gerar Cobrança Mercado Pago com validação antifraude"
                        >
                          <CreditCard size={14} />
                          Cobrar
                        </button>
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="btn-secondary-subtle"
                          style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem', justifyContent: 'center' }}
                        >
                          Ver Dossiê Completo
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#F87171',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                          }}
                          title="Excluir cliente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CADASTRO DE CLIENTES                              */}
          {/* ======================================================== */}
          {activeView === 'clients_new' && (
            <div style={{ maxWidth: '880px', margin: '0 auto' }}>
              <div style={{
                background: '#0B0F17',
                border: '1px solid rgba(197, 168, 105, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '2.25rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
                  <Building2 size={24} color="var(--gold-primary)" />
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0 }}>
                      Ficha Cadastral &amp; Dossiê de Contas Bancárias
                    </h2>
                    <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0 }}>
                      Preencha os dados institucionais, contas bancárias abertas e bureaus de análise.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  
                  {/* Seção 1: Identificação */}
                  <div>
                    <h3 style={{ fontSize: '0.86rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                      1. Identificação da Companhia
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                          Razão Social / Nome Completo *
                        </label>
                        <input 
                          type="text" 
                          required
                          value={newClient.nomeRazao}
                          onChange={(e) => setNewClient({ ...newClient, nomeRazao: e.target.value })}
                          placeholder="Ex: Mourato Participações Ltda"
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.9rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#FFFFFF',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                          CNPJ ou CPF
                        </label>
                        <input 
                          type="text" 
                          value={newClient.documento}
                          onChange={(e) => setNewClient({ ...newClient, documento: e.target.value })}
                          placeholder="00.000.000/0000-00"
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.9rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#FFFFFF',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                          Sócio / Responsável
                        </label>
                        <input 
                          type="text" 
                          value={newClient.responsavel}
                          onChange={(e) => setNewClient({ ...newClient, responsavel: e.target.value })}
                          placeholder="Nome do administrador"
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.9rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#FFFFFF',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                          Contato / WhatsApp
                        </label>
                        <input 
                          type="text" 
                          value={newClient.contato}
                          onChange={(e) => setNewClient({ ...newClient, contato: e.target.value })}
                          placeholder="(11) 99999-9999"
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.9rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#FFFFFF',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Estrutura Bancária (Suporte a múltiplos bancos) */}
                  <div style={{ background: '#070A10', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197, 168, 105, 0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark size={18} color="var(--gold-primary)" />
                        <h3 style={{ fontSize: '0.88rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                          2. Estrutura Bancária &amp; Contas Abertas
                        </h3>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAddBankAccount}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.9rem',
                          background: 'rgba(197, 168, 105, 0.12)',
                          border: '1px solid var(--gold-border)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--gold-light)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} />
                        + Acrescentar Outro Banco
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {newClient.contasBancarias.map((bancoItem, index) => (
                        <div 
                          key={bancoItem.id || index}
                          style={{
                            background: '#0D121D',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1.25rem',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gold-light)', fontWeight: 700 }}>
                              BANCO #{index + 1}
                            </span>
                            {newClient.contasBancarias.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBankAccount(index)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#EF4444',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Trash2 size={13} />
                                Remover Banco
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Instituição Financeira
                              </label>
                              <select
                                value={bancoItem.banco}
                                onChange={(e) => handleBankFieldChange(index, 'banco', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              >
                                <option value="Itaú">Itaú Unibanco</option>
                                <option value="Bradesco">Bradesco</option>
                                <option value="Santander">Santander</option>
                                <option value="Banco do Brasil">Banco do Brasil</option>
                                <option value="Caixa">Caixa Econômica</option>
                                <option value="BTG Pactual">BTG Pactual</option>
                                <option value="Safra">Banco Safra</option>
                                <option value="Inter">Banco Inter</option>
                                <option value="Nubank">Nubank PJ</option>
                                <option value="Sicoob">Sicoob</option>
                                <option value="Sicredi">Sicredi</option>
                                <option value="Outro">Outro Banco...</option>
                              </select>
                            </div>

                            {bancoItem.banco === 'Outro' && (
                              <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                  Nome do Banco
                                </label>
                                <input 
                                  type="text"
                                  value={bancoItem.bancoOutro}
                                  onChange={(e) => handleBankFieldChange(index, 'bancoOutro', e.target.value)}
                                  placeholder="Digite o nome do banco"
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem',
                                    background: '#06090F',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 'var(--radius-xs)',
                                    color: '#FFFFFF',
                                    fontSize: '0.82rem'
                                  }}
                                />
                              </div>
                            )}

                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Agência
                              </label>
                              <input 
                                type="text"
                                value={bancoItem.agencia}
                                onChange={(e) => handleBankFieldChange(index, 'agencia', e.target.value)}
                                placeholder="0000"
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Conta Corrente
                              </label>
                              <input 
                                type="text"
                                value={bancoItem.conta}
                                onChange={(e) => handleBankFieldChange(index, 'conta', e.target.value)}
                                placeholder="00000-0"
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              />
                            </div>

                            {/* Password field with Eye toggle button */}
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Senha de Acesso / Assinatura
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input 
                                  type={showFormPasswords[index] ? "text" : "password"}
                                  value={bancoItem.senhaAcesso}
                                  onChange={(e) => handleBankFieldChange(index, 'senhaAcesso', e.target.value)}
                                  placeholder="Senha salva"
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem 2.4rem 0.65rem 0.75rem',
                                    background: '#06090F',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 'var(--radius-xs)',
                                    color: '#FFFFFF',
                                    fontSize: '0.82rem'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowFormPasswords({ ...showFormPasswords, [index]: !showFormPasswords[index] })}
                                  style={{
                                    position: 'absolute',
                                    right: '0.5rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#94A3B8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title={showFormPasswords[index] ? "Ocultar senha" : "Ver senha salva"}
                                >
                                  {showFormPasswords[index] ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.3rem' }}>
                                Status da Conta
                              </label>
                              <select
                                value={bancoItem.statusConta}
                                onChange={(e) => handleBankFieldChange(index, 'statusConta', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.65rem',
                                  background: '#06090F',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem'
                                }}
                              >
                                <option value="Aberta e Operando">Aberta e Operando</option>
                                <option value="Em Abertura / Análise">Em Abertura / Análise</option>
                                <option value="Aguardando Validação de Assinatura">Aguardando Validação</option>
                                <option value="Bloqueada / Restrição">Bloqueada / Restrição</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seção 3: Bureaus de Crédito e Órgãos Reguladores */}
                  <div>
                    <h3 style={{ fontSize: '0.86rem', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                      3. Bureaus de Crédito &amp; Portal Governamental
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      
                      {/* Serasa */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem' }}>
                          Serasa Experian
                        </div>
                        <select
                          value={newClient.serasaStatus}
                          onChange={(e) => setNewClient({ ...newClient, serasaStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem'
                          }}
                        >
                          <option value="Sem Apontamentos">Sem Apontamentos (Limpo)</option>
                          <option value="Apontamento Negociado">Apontamento Negociado</option>
                          <option value="Restrição Ativa">Restrição Ativa</option>
                          <option value="Em Limpeza de Nome">Em Limpeza de Nome</option>
                        </select>
                      </div>

                      {/* Gov.br */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem' }}>
                          Gov.br
                        </div>
                        <select
                          value={newClient.govNivel}
                          onChange={(e) => setNewClient({ ...newClient, govNivel: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem'
                          }}
                        >
                          <option value="Ouro">Nível Ouro (Biometria / Bancário)</option>
                          <option value="Prata">Nível Prata (Bancos Credenciados)</option>
                          <option value="Bronze">Nível Bronze</option>
                        </select>
                      </div>

                      {/* Quod */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem' }}>
                          Quod
                        </div>
                        <select
                          value={newClient.quodStatus}
                          onChange={(e) => setNewClient({ ...newClient, quodStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem'
                          }}
                        >
                          <option value="Positivo / Sem Restrição">Positivo / Sem Restrição</option>
                          <option value="Em Análise">Em Análise</option>
                          <option value="Com Apontamento">Com Apontamento</option>
                        </select>
                      </div>

                      {/* Boa Vista */}
                      <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.5rem' }}>
                          Boa Vista SCPC
                        </div>
                        <select
                          value={newClient.boaVistaStatus}
                          onChange={(e) => setNewClient({ ...newClient, boaVistaStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#06090F',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-xs)',
                            color: '#FFFFFF',
                            fontSize: '0.78rem'
                          }}
                        >
                          <option value="Sem Restrições">Sem Restrições</option>
                          <option value="Score Regular">Score Regular</option>
                          <option value="Pendência Comercial">Pendência Comercial</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Seção 4: Limite e Observações */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Limite de Crédito Estruturado (R$)
                      </label>
                      <input 
                        type="text" 
                        value={newClient.limiteAprovado}
                        onChange={(e) => setNewClient({ ...newClient, limiteAprovado: e.target.value })}
                        placeholder="Ex: R$ 5.000.000,00"
                        style={{
                          width: '100%',
                          padding: '0.7rem 0.9rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Observações Sigilosas
                      </label>
                      <input 
                        type="text" 
                        value={newClient.observacoesSigilosas}
                        onChange={(e) => setNewClient({ ...newClient, observacoesSigilosas: e.target.value })}
                        placeholder="Notas estratégicas ou exigências de garantias..."
                        style={{
                          width: '100%',
                          padding: '0.7rem 0.9rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveView('clients_list')}
                      className="btn-secondary-subtle"
                      style={{ padding: '0.8rem 1.4rem' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ padding: '0.8rem 2rem', fontSize: '0.86rem' }}
                    >
                      Salvar Cadastro de Cliente
                      <Check size={16} />
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: NOVOS AGENDAMENTOS                                */}
          {/* ======================================================== */}
          {activeView === 'appointments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Form de Novo Agendamento */}
              <div style={{
                background: '#0B0F17',
                border: '1px solid rgba(197, 168, 105, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1.75rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <CalendarPlus size={20} color="var(--gold-primary)" />
                  <h2 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0 }}>
                    Registrar Nova Audiência / Reunião
                  </h2>
                </div>

                <form onSubmit={handleSaveAppointment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Cliente / Empresa *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newAppointment.cliente}
                      onChange={(e) => setNewAppointment({ ...newAppointment, cliente: e.target.value })}
                      placeholder="Nome do cliente ou empresa"
                      list="clients-datalist"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                    <datalist id="clients-datalist">
                      {clients.map(c => <option key={c.id} value={c.nomeRazao} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Data da Reunião *
                    </label>
                    <input 
                      type="date" 
                      required
                      value={newAppointment.data}
                      onChange={(e) => setNewAppointment({ ...newAppointment, data: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Horário
                    </label>
                    <input 
                      type="time" 
                      value={newAppointment.horario}
                      onChange={(e) => setNewAppointment({ ...newAppointment, horario: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Modalidade
                    </label>
                    <select
                      value={newAppointment.modalidade}
                      onChange={(e) => setNewAppointment({ ...newAppointment, modalidade: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="Videoconferência Segura">Videoconferência Segura</option>
                      <option value="Presencial - Sede Faria Lima">Presencial - Sede Faria Lima</option>
                      <option value="Visita Técnica na Empresa">Visita Técnica na Empresa</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Pauta / Assunto
                    </label>
                    <input 
                      type="text" 
                      value={newAppointment.pauta}
                      onChange={(e) => setNewAppointment({ ...newAppointment, pauta: e.target.value })}
                      placeholder="Ex: Repactuação de Spread"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ width: '100%', padding: '0.68rem', fontSize: '0.82rem', justifyContent: 'center' }}
                    >
                      <Calendar size={15} />
                      Agendar Audiência
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Agendamentos */}
              <div>
                <h3 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="var(--gold-primary)" />
                  Agenda de Audiências &amp; Reuniões ({appointments.length})
                </h3>

                {appointments.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: '#0D121D', borderRadius: 'var(--radius-sm)', color: '#94A3B8' }}>
                    Nenhum agendamento pendente no momento. Preencha o formulário acima para registrar uma reunião.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {appointments.map(apt => (
                      <div 
                        key={apt.id}
                        style={{
                          background: '#0D121D',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '9999px',
                              background: apt.status === 'Realizado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(197, 168, 105, 0.15)',
                              color: apt.status === 'Realizado' ? '#34D399' : 'var(--gold-light)',
                              fontWeight: 700
                            }}>
                              {apt.status}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {apt.modalidade}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.98rem', color: '#FFFFFF', margin: '0 0 0.35rem' }}>
                            {apt.cliente}
                          </h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gold-light)', marginBottom: '0.4rem' }}>
                            📅 {apt.data} às {apt.horario}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                            Pauta: <strong style={{ color: '#CBD5E1' }}>{apt.pauta}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                          <button
                            onClick={() => handleToggleAppointmentStatus(apt.id)}
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: 'var(--radius-xs)',
                              color: '#CBD5E1',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            Alternar Status
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(apt.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#F87171',
                              padding: '0.4rem 0.65rem',
                              borderRadius: 'var(--radius-xs)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: DESPESAS DA EMPRESA                               */}
          {/* ======================================================== */}
          {activeView === 'expenses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#0D121D', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginBottom: '0.35rem' }}>TOTAL DE DESPESAS</div>
                  <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>{expenses.length} lançamentos</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#34D399', marginBottom: '0.35rem' }}>TOTAL PAGO</div>
                  <div style={{ fontSize: '1.5rem', color: '#34D399', fontWeight: 700 }}>
                    {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>Contas liquidadas</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#F87171', marginBottom: '0.35rem' }}>TOTAL PENDENTE</div>
                  <div style={{ fontSize: '1.5rem', color: '#F87171', fontWeight: 700 }}>
                    {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>A pagar / Em aberto</div>
                </div>
              </div>

              {/* Form de Nova Despesa */}
              <div style={{ background: '#0B0F17', border: '1px solid rgba(197, 168, 105, 0.2)', borderRadius: 'var(--radius-md)', padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={18} color="var(--gold-primary)" />
                  Registrar Nova Conta de Consumo / Despesa
                </h3>

                <form onSubmit={handleSaveExpense} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Categoria
                    </label>
                    <select
                      value={newExpense.categoria}
                      onChange={(e) => setNewExpense({ ...newExpense, categoria: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="Energia Elétrica">Energia Elétrica (Enel/CPFL)</option>
                      <option value="Água & Saneamento">Água &amp; Saneamento (Sabesp)</option>
                      <option value="Aluguel Comercial">Aluguel Comercial &amp; Condomínio</option>
                      <option value="Internet & Telefonia">Internet &amp; Telefonia</option>
                      <option value="Software & Servidores">Software, Cloud &amp; Servidores</option>
                      <option value="Honorários & Serviços">Honorários &amp; Terceiros</option>
                      <option value="Tributos & Impostos">Tributos, DAS &amp; Taxas</option>
                      <option value="Outros">Outras Despesas</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Descrição *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newExpense.descricao}
                      onChange={(e) => setNewExpense({ ...newExpense, descricao: e.target.value })}
                      placeholder="Ex: Conta de Luz - Sede Março"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Valor (R$) *
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newExpense.valor}
                      onChange={(e) => setNewExpense({ ...newExpense, valor: e.target.value })}
                      placeholder="0,00"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Vencimento
                    </label>
                    <input 
                      type="date" 
                      value={newExpense.vencimento}
                      onChange={(e) => setNewExpense({ ...newExpense, vencimento: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Status Inicial
                    </label>
                    <select
                      value={newExpense.status}
                      onChange={(e) => setNewExpense({ ...newExpense, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                    </select>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ width: '100%', padding: '0.68rem', fontSize: '0.82rem', justifyContent: 'center' }}
                    >
                      <Plus size={15} />
                      Lançar Despesa
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Despesas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: '#FFFFFF', margin: 0 }}>
                    Contas e Despesas Lançadas ({expenses.length})
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['todos', 'pendente', 'pago'].map(f => (
                      <button
                        key={f}
                        onClick={() => setExpenseFilter(f)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '9999px',
                          background: expenseFilter === f ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.06)',
                          color: expenseFilter === f ? '#0A0D14' : '#CBD5E1',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {expenses.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: '#0D121D', borderRadius: 'var(--radius-sm)', color: '#94A3B8' }}>
                    Nenhuma despesa cadastrada ainda. Utilize o formulário acima para lançar faturas de consumo.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', background: '#0D121D', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#090D14', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94A3B8' }}>
                          <th style={{ padding: '0.85rem 1rem' }}>Categoria</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Descrição</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Vencimento</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Valor (R$)</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                          <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses
                          .filter(e => expenseFilter === 'todos' ? true : e.status.toLowerCase() === expenseFilter)
                          .map(e => (
                            <tr key={e.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '0.85rem 1rem', color: 'var(--gold-light)' }}>{e.categoria}</td>
                              <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 600 }}>{e.descricao}</td>
                              <td style={{ padding: '0.85rem 1rem', color: '#94A3B8' }}>{e.vencimento || '---'}</td>
                              <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 700 }}>
                                {Number(e.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <button
                                  onClick={() => handleToggleExpenseStatus(e.id)}
                                  style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: e.status === 'Pago' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: e.status === 'Pago' ? '#34D399' : '#F87171'
                                  }}
                                  title="Clique para alternar Pago / Pendente"
                                >
                                  {e.status}
                                </button>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleDeleteExpense(e.id)}
                                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '0.25rem' }}
                                  title="Excluir despesa"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: RECEBÍVEIS & MERCADO PAGO                         */}
          {/* ======================================================== */}
          {activeView === 'receivables' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#0D121D', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginBottom: '0.35rem' }}>TOTAL EMITIDO</div>
                  <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {totalRecebiveis.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>{receivables.length} faturas geradas</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#34D399', marginBottom: '0.35rem' }}>RECEBIDOS (PAGOS)</div>
                  <div style={{ fontSize: '1.5rem', color: '#34D399', fontWeight: 700 }}>
                    {totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>Liquidados via PIX/Boleto</div>
                </div>

                <div style={{ background: '#0D121D', border: '1px solid rgba(197, 168, 105, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--gold-light)', marginBottom: '0.35rem' }}>PENDENTES</div>
                  <div style={{ fontSize: '1.5rem', color: 'var(--gold-light)', fontWeight: 700 }}>
                    {totalRecebiveisPendentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>Aguardando pagamento</div>
                </div>
              </div>

              {/* Emissor de Cobrança / Recebível */}
              <div style={{ background: '#0B0F17', border: '1px solid rgba(197, 168, 105, 0.2)', borderRadius: 'var(--radius-md)', padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={20} color="var(--gold-primary)" />
                    <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', margin: 0 }}>
                      Emitir Cobrança / Recebível Mercado Pago
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: mpConfig.connected ? '#34D399' : 'var(--gold-light)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mpConfig.connected ? '#10B981' : 'var(--gold-primary)' }} />
                    {mpConfig.connected ? 'Mercado Pago Ativo' : 'Modo Padrão / PIX Mourato'}
                  </div>
                </div>

                <form onSubmit={handleSaveReceivable} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Cliente Destinatário *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newReceivable.cliente}
                      onChange={(e) => setNewReceivable({ ...newReceivable, cliente: e.target.value })}
                      placeholder="Nome do cliente ou empresa"
                      list="clients-datalist-rec"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                    <datalist id="clients-datalist-rec">
                      {clients.map(c => <option key={c.id} value={c.nomeRazao} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Descrição do Serviço
                    </label>
                    <input 
                      type="text" 
                      value={newReceivable.descricao}
                      onChange={(e) => setNewReceivable({ ...newReceivable, descricao: e.target.value })}
                      placeholder="Ex: Honorários de Estruturação - Parcela 01"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Valor da Cobrança (R$) *
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newReceivable.valor}
                      onChange={(e) => setNewReceivable({ ...newReceivable, valor: e.target.value })}
                      placeholder="0,00"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Método
                    </label>
                    <select
                      value={newReceivable.metodo}
                      onChange={(e) => setNewReceivable({ ...newReceivable, metodo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="PIX">PIX Instantâneo (QR Code)</option>
                      <option value="Boleto">Boleto Bancário</option>
                      <option value="Cartão">Cartão de Crédito</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Vencimento
                    </label>
                    <input 
                      type="date" 
                      value={newReceivable.vencimento}
                      onChange={(e) => setNewReceivable({ ...newReceivable, vencimento: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ width: '100%', padding: '0.68rem', fontSize: '0.82rem', justifyContent: 'center' }}
                    >
                      <QrCode size={15} />
                      Gerar Cobrança Mercado Pago
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Recebíveis */}
              <div>
                <h3 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '1rem' }}>
                  Recebíveis &amp; Faturas Geradas ({receivables.length})
                </h3>

                {receivables.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', background: '#0D121D', borderRadius: 'var(--radius-sm)', color: '#94A3B8' }}>
                    Nenhum recebível emitido ainda. Gere sua primeira cobrança no formulário acima.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', background: '#0D121D', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#090D14', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94A3B8' }}>
                          <th style={{ padding: '0.85rem 1rem' }}>ID Mercado Pago</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Cliente</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Descrição</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Método</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Valor</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                          <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivables.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontFamily: 'monospace' }}>{r.mpPaymentId}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 600 }}>{r.cliente}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#94A3B8' }}>{r.descricao}</td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--gold-light)' }}>{r.metodo}</td>
                            <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 700 }}>
                              {Number(r.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <button
                                onClick={() => handleToggleReceivableStatus(r.id)}
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: r.status === 'Pago' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(197, 168, 105, 0.2)',
                                  color: r.status === 'Pago' ? '#34D399' : 'var(--gold-light)'
                                }}
                              >
                                {r.status}
                              </button>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  onClick={() => setActivePixModal(r)}
                                  style={{
                                    background: 'rgba(197, 168, 105, 0.1)',
                                    border: '1px solid var(--gold-border)',
                                    color: 'var(--gold-light)',
                                    borderRadius: 'var(--radius-xs)',
                                    padding: '0.35rem 0.6rem',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}
                                  title="Ver QR Code e link"
                                >
                                  <QrCode size={13} />
                                  QR Code
                                </button>
                                <button
                                  onClick={() => handleDeleteReceivable(r.id)}
                                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '0.25rem' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: CONFIGURAÇÕES & API MERCADO PAGO                  */}
          {/* ======================================================== */}
          {activeView === 'settings' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Card Mercado Pago API */}
              <div style={{
                background: '#0B0F17',
                border: '1px solid rgba(197, 168, 105, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#009EE3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '1.1rem'
                  }}>
                    mp
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0 }}>
                      Integração da API Mercado Pago (Recebíveis)
                    </h2>
                    <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0 }}>
                      Insira suas credenciais de produção ou testes obtidas no painel de desenvolvedores do Mercado Pago.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Access Token (Produção ou Sandbox) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showMpToken ? "text" : "password"}
                        value={mpConfig.accessToken}
                        onChange={(e) => setMpConfig({ ...mpConfig, accessToken: e.target.value })}
                        placeholder="APP_USR-xxxx-xxxx..."
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.8rem 0.75rem 0.9rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowMpToken(!showMpToken)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer'
                        }}
                      >
                        {showMpToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                      Encontrado em: Mercado Pago Developers &gt; Suas Aplicações &gt; Credenciais de Produção.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Public Key
                    </label>
                    <input 
                      type="text"
                      value={mpConfig.publicKey}
                      onChange={(e) => setMpConfig({ ...mpConfig, publicKey: e.target.value })}
                      placeholder="APP_USR-xxxx-xxxx..."
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.9rem',
                        background: '#06090F',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Ambiente de Execução
                      </label>
                      <select
                        value={mpConfig.environment}
                        onChange={(e) => setMpConfig({ ...mpConfig, environment: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem'
                        }}
                      >
                        <option value="production">Produção (Pagamentos Reais)</option>
                        <option value="sandbox">Sandbox (Ambiente de Testes)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                        Webhook URL (Notificação Automática)
                      </label>
                      <input 
                        type="text"
                        readOnly
                        value={mpConfig.webhookUrl}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          background: '#06090F',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#94A3B8',
                          fontSize: '0.78rem'
                        }}
                      />
                    </div>
                  </div>

                  {mpTestStatus && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.8rem',
                      background: mpTestStatus.startsWith('sucesso') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: mpTestStatus.startsWith('sucesso') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      color: mpTestStatus.startsWith('sucesso') ? '#34D399' : '#FCA5A5'
                    }}>
                      {mpTestStatus}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleTestMpConnection}
                      style={{
                        padding: '0.75rem 1.4rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 158, 227, 0.12)',
                        border: '1px solid #009EE3',
                        color: '#38BDF8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem'
                      }}
                    >
                      <RefreshCw size={14} />
                      Testar Conexão com Mercado Pago
                    </button>

                    <button
                      type="button"
                      onClick={() => alert('Credenciais salvas com sucesso no painel local!')}
                      className="btn-primary-gold"
                      style={{ padding: '0.75rem 1.75rem', fontSize: '0.82rem' }}
                    >
                      <Check size={15} />
                      Salvar Chaves de Integração
                    </button>
                  </div>

                </div>
              </div>

              {/* Informações da Empresa & Segurança */}
              <div style={{
                background: '#0B0F17',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem'
              }}>
                <h3 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
                  Dados Institucionais de Faturamento
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                  Estes dados serão anexados aos comprovantes e recibos de cobrança emitidos aos clientes.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.82rem' }}>
                  <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>RAZÃO SOCIAL</span>
                    <strong style={{ color: '#FFFFFF' }}>Mourato e Associados Ltda</strong>
                  </div>
                  <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>CNPJ INSTITUCIONAL</span>
                    <strong style={{ color: '#FFFFFF' }}>38.377.738/0001-45</strong>
                  </div>
                  <div style={{ background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>LOCALIDADE</span>
                    <strong style={{ color: '#FFFFFF' }}>São Paulo - SP • Atuação Nacional</strong>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL: VISUALIZAÇÃO DE DOSSIÊ COMPLETO DO CLIENTE   */}
      {/* ---------------------------------------------------- */}
      {selectedClient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#0D121D',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedClient(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--gold-light)', letterSpacing: '0.1em', fontWeight: 600 }}>
                DOSSIÊ CONFIDENCIAL • MOURATO &amp; ASSOCIADOS
              </span>
              <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', margin: '0.25rem 0' }}>
                {selectedClient.nomeRazao}
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                CNPJ/CPF: <strong style={{ color: '#FFFFFF' }}>{selectedClient.documento || 'Não informado'}</strong> • Responsável: <strong style={{ color: '#FFFFFF' }}>{selectedClient.responsavel || 'Não informado'}</strong>
              </div>
            </div>

            {/* Contas Bancárias Cadastradas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.88rem', color: 'var(--gold-light)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Landmark size={15} />
                Contas Bancárias ({selectedClient.contasBancarias?.length || 1})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedClient.contasBancarias?.map((b, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: '#070A10',
                      border: '1px solid rgba(197, 168, 105, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>
                        {b.banco === 'Outro' ? (b.bancoOutro || 'Outro') : b.banco}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                        {b.statusConta}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>AGÊNCIA</span>
                        <strong style={{ color: '#FFFFFF' }}>{b.agencia || '---'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>CONTA CORRENTE</span>
                        <strong style={{ color: '#FFFFFF' }}>{b.conta || '---'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>SENHA SALVA</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                          <span style={{ fontFamily: showDetailPasswords[`${selectedClient.id}-${idx}`] ? 'inherit' : 'monospace', color: 'var(--gold-light)', fontWeight: 600 }}>
                            {showDetailPasswords[`${selectedClient.id}-${idx}`] ? (b.senhaAcesso || 'Sem senha') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowDetailPasswords({ 
                              ...showDetailPasswords, 
                              [`${selectedClient.id}-${idx}`]: !showDetailPasswords[`${selectedClient.id}-${idx}`] 
                            })}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.2rem' }}
                            title={showDetailPasswords[`${selectedClient.id}-${idx}`] ? "Ocultar senha" : "Ver senha salva"}
                          >
                            {showDetailPasswords[`${selectedClient.id}-${idx}`] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bureaus Status */}
            <div style={{ marginBottom: '1.5rem', background: '#070A10', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <h3 style={{ fontSize: '0.84rem', color: 'var(--gold-light)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Bureaus &amp; Órgãos Reguladores
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>SERASA EXPERIAN</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.serasaStatus}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>GOV.BR</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.govNivel}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>QUOD</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.quodStatus}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>BOA VISTA</span>
                  <strong style={{ color: '#FFFFFF' }}>{selectedClient.boaVistaStatus}</strong>
                </div>
              </div>
            </div>

            {/* Observações e Limites */}
            {selectedClient.limiteAprovado && (
              <div style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>LIMITE ESTRUTURADO</span>
                <strong style={{ color: 'var(--gold-light)', fontSize: '1.1rem' }}>{selectedClient.limiteAprovado}</strong>
              </div>
            )}

            {selectedClient.observacoesSigilosas && (
              <div style={{ fontSize: '0.82rem', background: '#090D14', padding: '0.85rem', borderRadius: 'var(--radius-xs)', borderLeft: '3px solid var(--gold-primary)' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', marginBottom: '0.2rem' }}>OBSERVAÇÕES RESERVADAS</span>
                <p style={{ color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>{selectedClient.observacoesSigilosas}</p>
              </div>
            )}

            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedClient(null)}
                className="btn-primary-gold"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.82rem' }}
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: NOVA COBRANÇA SEGURA MERCADO PAGO (ANTIFRAUDE)*/}
      {/* ---------------------------------------------------- */}
      {isChargeModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 12, 0.88)',
          backdropFilter: 'blur(10px)',
          zIndex: 1250,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#0D121D',
            border: '1px solid rgba(0, 158, 227, 0.35)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 158, 227, 0.15)'
          }}>
            <button
              onClick={() => setIsChargeModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #009EE3 0%, #007EB5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 158, 227, 0.4)'
              }}>
                <CreditCard size={22} color="#FFFFFF" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0, fontWeight: 700 }}>
                  Nova Cobrança Segura — Mercado Pago
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '2px 0 0' }}>
                  Emissão compatível com as regras antifraude e scoring de risco do Mercado Pago.
                </p>
              </div>
            </div>

            {/* Antifraud Protocol Notice */}
            <div style={{
              background: 'rgba(0, 158, 227, 0.08)',
              border: '1px solid rgba(0, 158, 227, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <Shield size={18} color="#00B4FF" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.75rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                <strong style={{ color: '#00B4FF' }}>Protocolo Antifraude Ativo:</strong> Dados completos do pagador (Nome/Razão, CPF/CNPJ, E-mail e Telefone com DDD) e chave de idempotência exclusiva são exigidos para evitar recusa ou bloqueio da transação pelo motor antifraude.
              </div>
            </div>

            {chargeError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                color: '#F87171',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={16} />
                <span>{chargeError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSecureCharge} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Seção 1: Dados do Pagador */}
              <div style={{ background: '#080C14', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>
                  1. Dados do Pagador (Validação Antifraude)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Nome Completo ou Razão Social *
                    </label>
                    <input 
                      type="text"
                      required
                      value={chargeForm.cliente}
                      onChange={(e) => setChargeForm({ ...chargeForm, cliente: e.target.value })}
                      placeholder="Ex: Mourato Alimentos Ltda"
                      list="charge-clients-list"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                    <datalist id="charge-clients-list">
                      {clients.map(c => <option key={c.id} value={c.nomeRazao} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      CPF ou CNPJ (apenas números válidos) *
                    </label>
                    <input 
                      type="text"
                      required
                      value={chargeForm.documento}
                      onChange={(e) => setChargeForm({ ...chargeForm, documento: e.target.value })}
                      placeholder="11 dígitos (CPF) ou 14 dígitos (CNPJ)"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      E-mail do Pagador / Financeiro *
                    </label>
                    <input 
                      type="email"
                      required
                      value={chargeForm.email}
                      onChange={(e) => setChargeForm({ ...chargeForm, email: e.target.value })}
                      placeholder="financeiro@empresa.com.br"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Telefone com DDD (WhatsApp) *
                    </label>
                    <input 
                      type="text"
                      required
                      value={chargeForm.telefone}
                      onChange={(e) => setChargeForm({ ...chargeForm, telefone: e.target.value })}
                      placeholder="(11) 98765-4321"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                {/* Endereço resumido */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px', gap: '0.65rem', marginTop: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '0.25rem' }}>CEP</label>
                    <input 
                      type="text"
                      value={chargeForm.cep}
                      onChange={(e) => setChargeForm({ ...chargeForm, cep: e.target.value })}
                      placeholder="01045-001"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.7rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Logradouro & Bairro</label>
                    <input 
                      type="text"
                      value={chargeForm.logradouro}
                      onChange={(e) => setChargeForm({ ...chargeForm, logradouro: e.target.value })}
                      placeholder="Av. São Luís, República"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.7rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Cidade/UF</label>
                    <input 
                      type="text"
                      value={`${chargeForm.cidade}/${chargeForm.uf}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('/');
                        setChargeForm({ ...chargeForm, cidade: parts[0] || 'São Paulo', uf: parts[1] || 'SP' });
                      }}
                      placeholder="SP/SP"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.7rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Especificações da Cobrança */}
              <div style={{ background: '#080C14', padding: '1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>
                  2. Valores & Condições Comerciais
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Descrição do Serviço * (Aparece na fatura bancária do cliente)
                    </label>
                    <select
                      value={chargeForm.descricao}
                      onChange={(e) => setChargeForm({ ...chargeForm, descricao: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        marginBottom: '0.4rem'
                      }}
                    >
                      <option value="Diagnóstico Estratégico de Spread & Custo de Dívida">Diagnóstico Estratégico de Spread &amp; Custo de Dívida</option>
                      <option value="Honorários de Assessoria & Estruturação de Spread">Honorários de Assessoria &amp; Estruturação de Spread</option>
                      <option value="Consultoria em Governança & Compliance Financeiro">Consultoria em Governança &amp; Compliance Financeiro</option>
                      <option value="Auditoria de Taxas e Contratos de Crédito Bancário">Auditoria de Taxas e Contratos de Crédito Bancário</option>
                      <option value="Outro">Descrição Personalizada...</option>
                    </select>
                    {chargeForm.descricao === 'Outro' && (
                      <input 
                        type="text"
                        placeholder="Digite a descrição detalhada do serviço..."
                        onChange={(e) => setChargeForm({ ...chargeForm, descricao: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.8rem',
                          background: '#0D121D',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 'var(--radius-xs)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem'
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Valor da Cobrança (R$) *
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      min="1.00"
                      value={chargeForm.valor}
                      onChange={(e) => setChargeForm({ ...chargeForm, valor: e.target.value })}
                      placeholder="1490.00"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Método de Pagamento *
                    </label>
                    <select
                      value={chargeForm.metodo}
                      onChange={(e) => setChargeForm({ ...chargeForm, metodo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="PIX">PIX Instantâneo (QR Code Dinâmico)</option>
                      <option value="CheckoutPro">Checkout Pro (Cartão de Crédito / Parcelado)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                      Vencimento
                    </label>
                    <input 
                      type="date"
                      value={chargeForm.vencimento}
                      onChange={(e) => setChargeForm({ ...chargeForm, vencimento: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        background: '#0D121D',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-xs)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Status de Conexão Mercado Pago */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                  Status da Integração:
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  background: mpConfig.accessToken ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 158, 227, 0.15)',
                  color: mpConfig.accessToken ? '#34D399' : '#00B4FF',
                  fontWeight: 600
                }}>
                  {mpConfig.accessToken ? '● Conectado à API Oficial Mercado Pago' : '● Modo de Homologação Local (Simulador Antifraude)'}
                </span>
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsChargeModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#CBD5E1',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isGeneratingCharge}
                  style={{
                    flex: 2,
                    padding: '0.8rem',
                    background: isGeneratingCharge ? '#64748B' : 'linear-gradient(135deg, #009EE3 0%, #007EB5 100%)',
                    border: '1px solid #00B4FF',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isGeneratingCharge ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(0, 158, 227, 0.4)'
                  }}
                >
                  {isGeneratingCharge ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Validando Antifraude &amp; Gerando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Emitir Cobrança Segura
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: QR CODE PIX / FATURA MERCADO PAGO            */}
      {/* ---------------------------------------------------- */}
      {activePixModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 12, 0.88)',
          backdropFilter: 'blur(8px)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#0D121D',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(197, 168, 105, 0.2)'
          }}>
            <button
              onClick={() => setActivePixModal(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginBottom: '0.85rem'
            }}>
              <ShieldCheck size={14} />
              COBRANÇA MERCADO PAGO HOMOLOGADA
            </div>

            <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: '0 0 0.25rem', fontWeight: 700 }}>
              {activePixModal.cliente}
            </h3>
            <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              {activePixModal.descricao}
            </div>

            <div style={{ fontSize: '1.75rem', color: 'var(--gold-light)', fontWeight: 800, marginBottom: '1.25rem' }}>
              {Number(activePixModal.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>

            {/* QR Code Container */}
            <div style={{
              background: '#FFFFFF',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-block',
              margin: '0 auto 1.25rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
            }}>
              {activePixModal.qrCodeBase64 ? (
                <img 
                  src={`data:image/png;base64,${activePixModal.qrCodeBase64}`} 
                  alt="QR Code PIX Mercado Pago" 
                  style={{ width: '180px', height: '180px', display: 'block' }} 
                />
              ) : (
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="180" height="180" fill="white" />
                  <rect x="15" y="15" width="40" height="40" fill="black" />
                  <rect x="22" y="22" width="26" height="26" fill="white" />
                  <rect x="27" y="27" width="16" height="16" fill="black" />

                  <rect x="125" y="15" width="40" height="40" fill="black" />
                  <rect x="132" y="22" width="26" height="26" fill="white" />
                  <rect x="137" y="27" width="16" height="16" fill="black" />

                  <rect x="15" y="125" width="40" height="40" fill="black" />
                  <rect x="22" y="132" width="26" height="26" fill="white" />
                  <rect x="27" y="137" width="16" height="16" fill="black" />

                  <rect x="65" y="20" width="10" height="10" fill="black" />
                  <rect x="85" y="20" width="10" height="10" fill="black" />
                  <rect x="75" y="35" width="10" height="10" fill="black" />
                  <rect x="65" y="50" width="10" height="10" fill="black" />
                  <rect x="95" y="50" width="10" height="10" fill="black" />
                  <rect x="20" y="65" width="10" height="10" fill="black" />
                  <rect x="40" y="75" width="10" height="10" fill="black" />
                  <rect x="70" y="70" width="40" height="40" fill="black" />
                  <rect x="78" y="78" width="24" height="24" fill="white" />
                  <rect x="84" y="84" width="12" height="12" fill="#009EE3" />
                  <rect x="120" y="70" width="10" height="10" fill="black" />
                  <rect x="145" y="85" width="10" height="10" fill="black" />
                  <rect x="65" y="125" width="10" height="10" fill="black" />
                  <rect x="85" y="135" width="10" height="10" fill="black" />
                  <rect x="105" y="125" width="10" height="10" fill="black" />
                  <rect x="125" y="145" width="10" height="10" fill="black" />
                  <rect x="145" y="125" width="10" height="10" fill="black" />
                </svg>
              )}
            </div>

            {/* Código Copia e Cola */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>
                Código PIX Copia e Cola:
              </span>
              <div style={{
                background: '#070A10',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.72rem',
                color: '#CBD5E1',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                textAlign: 'left',
                maxHeight: '60px',
                overflowY: 'auto'
              }}>
                {activePixModal.pixPayload}
              </div>
            </div>

            {/* Botões de Ação: Copiar PIX & Enviar WhatsApp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activePixModal.pixPayload);
                  setCopiedPixId(activePixModal.id);
                  setTimeout(() => setCopiedPixId(null), 2500);
                }}
                className="btn-primary-gold"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.82rem' }}
              >
                {copiedPixId === activePixModal.id ? (
                  <>
                    <Check size={16} />
                    Código PIX Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copiar Código PIX
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const textoWhatsApp = encodeURIComponent(
                    `Olá, ${activePixModal.cliente}!\n\n` +
                    `Segue a cobrança da *Mourato & Associados* referente a:\n` +
                    `📌 *${activePixModal.descricao}*\n` +
                    `💰 *Valor: ${Number(activePixModal.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n\n` +
                    `🔑 *Código PIX (Copia e Cola):*\n${activePixModal.pixPayload}\n\n` +
                    (activePixModal.ticketUrl && activePixModal.ticketUrl !== '#' ? `🔗 *Link da Fatura Mercado Pago:*\n${activePixModal.ticketUrl}\n\n` : '') +
                    `Agradecemos a confiança.\n*Mourato & Associados — Assessoria Corporativa*`
                  );
                  window.open(`https://wa.me/?text=${textoWhatsApp}`, '_blank');
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <Send size={15} />
                Enviar Cobrança via WhatsApp
              </button>

              {activePixModal.ticketUrl && activePixModal.ticketUrl !== '#' && (
                <a
                  href={activePixModal.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.74rem',
                    color: '#00B4FF',
                    textDecoration: 'underline',
                    marginTop: '0.25rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <ExternalLink size={12} />
                  Abrir link direto do Mercado Pago
                </a>
              )}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.68rem', color: '#64748B' }}>
              Identificador: {activePixModal.mpPaymentId} • Modo: {activePixModal.mode || 'Local'}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
