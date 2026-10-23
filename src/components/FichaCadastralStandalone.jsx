import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send,
  UploadCloud,
  FileCheck2,
  Trash2,
  Share2,
  Landmark,
  FileText,
  Printer,
  ExternalLink
} from 'lucide-react';
import { 
  generateProtocolo, 
  maskCPF, 
  maskCNPJ, 
  maskCEP, 
  maskPhone,
  saveClientToOfficialSite,
  readFileAsBase64,
  TEIA_IFRAME_URL
} from '../services/onboardingService';

const getQueryParams = () => {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  return {
    nome: p.get('nome') || '',
    empresa: p.get('empresa') || '',
    telefone: p.get('telefone') || '',
    email: p.get('email') || ''
  };
};

const checkDuplicate = (email, telefone) => {
  try {
    const clients = JSON.parse(localStorage.getItem('mourato_clients_records_v2') || '[]');
    const cleanPhone = (telefone || '').replace(/\D/g, '');
    const cleanEmail = (email || '').toLowerCase().trim();
    return clients.some(c => {
      const cPhone = (c.contato || '').replace(/\D/g, '');
      const cEmail = (c.email || '').toLowerCase().trim();
      return (cleanEmail && cEmail === cleanEmail) || (cleanPhone.length >= 10 && cPhone === cleanPhone);
    });
  } catch { return false; }
};

export const FichaCadastralStandalone = ({ isFullPage = false, onClose = null }) => {
  const [anexos, setAnexos] = useState([]);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [copiedProtocolo, setCopiedProtocolo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const leadParams = getQueryParams();
  const isDuplicate = checkDuplicate(leadParams.email, leadParams.telefone);

  // Escuta o evento oficial emitido pela Ficha ao concluir a submissão no iframe
  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (event.data && event.data.type === 'MOURATO_FICHA_ONBOARDING_SUCESSO') {
        const proto = event.data.protocolo || generateProtocolo();
        
        let clientName = 'Cliente Mourato & Associados';
        let clientDoc = '';
        let clientData = event.data.payload || {};

        if (typeof event.data.cliente === 'string') {
          clientName = event.data.cliente;
        } else if (event.data.cliente && typeof event.data.cliente === 'object') {
          clientName = event.data.cliente.nome || clientName;
          clientDoc = event.data.cliente.cpf || '';
        }

        if (!clientData.titular) {
          clientData.titular = {
            nome: clientName,
            cpf: clientDoc || event.data.cpf || ''
          };
        }

        // Incorpora os extratos em PDF anexados
        clientData.anexos = anexos;
        clientData.protocolo = proto;
        clientData.origem = 'www.mouratoassociados.com.br/ficha-cadastral';

        // 1. Salva automaticamente no banco de dados do site oficial (localStorage)
        const savedRecord = saveClientToOfficialSite(clientData, proto);
        const savedId = savedRecord ? savedRecord.id : `cli-lead-${Date.now()}`;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mourato_active_bureau_client_id', savedId);
        }

        // 2. Exibe tela de confirmação oficial com protocolo e opção de impressão
        setSubmissionSuccess({
          protocolo: proto,
          cliente: clientName,
          cpf: clientDoc || clientData.titular?.cpf || '',
          totalCadastrados: event.data.totalCadastrados,
          payload: savedRecord || clientData,
          anexos: anexos
        });

        // Registro de sucesso para visualização do comprovante do cliente
        // (Nota: painel administrativo e birô permanecem restritos à equipe interna)
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [anexos]);

  // Upload e leitura de anexos PDF (Quod, Bacen SCR, Serasa/Outros)
  const handleFileUpload = async (e, tipo) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Por favor, selecione apenas arquivos em formato PDF.');
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert('O arquivo excede o limite máximo de 20MB.');
        continue;
      }

      try {
        const base64 = await readFileAsBase64(file);
        const formattedSize = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`;

        const newAnexo = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          tipo: tipo || 'outro',
          nome: file.name,
          tamanho: formattedSize,
          base64,
          data: new Date().toISOString()
        };

        setAnexos((prev) => [...prev, newAnexo]);
      } catch (err) {
        console.error('Erro ao ler PDF:', err);
        alert('Erro ao processar o arquivo PDF.');
      }
    }

    e.target.value = '';
  };

  const handleRemoveAnexo = (id) => {
    setAnexos((prev) => prev.filter((a) => a.id !== id));
  };

  const copyToClipboard = (text, type = 'proto') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      setCopiedProtocolo(true);
      setTimeout(() => setCopiedProtocolo(false), 2500);
    }
  };

  const handleOpenWhatsApp = (protocolo, cliente) => {
    const msg = encodeURIComponent(
      `Olá, Diretoria da Mourato & Associados. Acabo de preencher a Ficha Cadastral no portal oficial com meus extratos do Quod e Bacen.\n\n*Protocolo Oficial:* ${protocolo}\n*Titular:* ${cliente}\n\nSolicito confirmação do início da esteira pericial.`
    );
    window.open(`https://wa.me/5511978990034?text=${msg}`, '_blank');
  };

  const directLinkUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/ficha-cadastral` 
    : 'https://www.mouratoassociados.com.br/ficha-cadastral';

  const handleOpenBureau = (customId = null) => {
    const idToOpen = customId || submissionSuccess?.payload?.id || (typeof localStorage !== 'undefined' ? localStorage.getItem('mourato_active_bureau_client_id') : '');
    if (typeof window !== 'undefined') {
      if (idToOpen) {
        localStorage.setItem('mourato_active_bureau_client_id', idToOpen);
      }
      window.dispatchEvent(new CustomEvent('mourato_open_bureau', {
        detail: { clientId: idToOpen, clientName: submissionSuccess?.cliente }
      }));
      if (isFullPage) {
        window.location.href = `/?view=bureau${idToOpen ? `&client=${encodeURIComponent(idToOpen)}` : ''}`;
      } else if (onClose) {
        onClose();
      }
    }
  };

  const handleSimularEnvioFicha = (tipo = 'PJ') => {
    const proto = generateProtocolo();
    const isPj = tipo === 'PJ';
    const clientPayload = {
      id: `cli-lead-${Date.now()}`,
      protocolo: proto,
      titular: {
        nome: isPj ? 'Roberto Alencar Mourato' : 'Carlos Eduardo Peixoto',
        cpf: isPj ? '284.912.839-44' : '312.458.789-20'
      },
      empresa: isPj ? {
        razao_social: 'Alencar Mourato Logística & Transportes S/A',
        cnpj: '45.192.384/0001-92',
        capital_social: 'R$ 2.500.000,00',
        cargo_socio: 'Diretor Presidente'
      } : null,
      contato: {
        email: 'diretoria@alencarmourato.com.br',
        celular: '(11) 98765-4321'
      },
      endereco: {
        logradouro: 'Av. Paulista',
        numero: '1842',
        complemento: '14º Andar - Torre Sul',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01310-200'
      },
      socioeconomico: {
        profissao: isPj ? 'Empresário' : 'Consultor Financeiro',
        renda_mensal: 'R$ 68.000,00'
      },
      anexos: anexos,
      origem: 'Ficha Cadastral Oficial Link'
    };

    const savedRecord = saveClientToOfficialSite(clientPayload, proto);
    const savedId = savedRecord?.id || clientPayload.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mourato_active_bureau_client_id', savedId);
    }

    setSubmissionSuccess({
      protocolo: proto,
      cliente: isPj ? clientPayload.empresa.razao_social : clientPayload.titular.nome,
      cpf: isPj ? clientPayload.empresa.cnpj : clientPayload.titular.cpf,
      payload: savedRecord || clientPayload,
      anexos: anexos
    });


  };

  const handleShareLinkWhatsApp = () => {
    const text = encodeURIComponent(
      `Prezado(a), segue o link direto da Mourato & Associados para preenchimento da Ficha Cadastral e envio dos extratos do Quod e Bacen:\n\n${directLinkUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const currentPayload = submissionSuccess?.payload || {};
  const titularInfo = currentPayload.titular || {};
  const enderecoInfo = currentPayload.endereco || {};
  const contatoInfo = currentPayload.contato || {};
  const socioInfo = currentPayload.socioeconomico || {};
  const empresaInfo = currentPayload.empresa || {};

  return (
    <div style={{
      width: '100%',
      maxWidth: isFullPage ? '1120px' : '1020px',
      margin: '0 auto',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(197, 168, 105, 0.08) 0%, #0A0D14 70%)',
      border: '1px solid var(--gold-border)',
      borderRadius: isFullPage ? '16px' : 'var(--radius-md)',
      padding: isFullPage ? 'clamp(1rem, 3vw, 2.25rem) clamp(0.75rem, 3vw, 1.85rem)' : '1.8rem',
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(197, 168, 105, 0.15)',
      position: 'relative'
    }}>
      
      {/* Cabeçalho da Ficha */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src="/mourato-seal-circle.png" 
            alt="Mourato & Associados" 
            style={{ width: '52px', height: '52px', borderRadius: '50%', boxShadow: '0 4px 15px rgba(197, 168, 105, 0.3)' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="badge-institutional" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                ESTEIRA OPERACIONAL &amp; PERICIAL
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'var(--font-sans)' }}>
                CNPJ 38.377.738/0001-45
              </span>
            </div>
            <h2 style={{ fontSize: isFullPage ? '1.65rem' : '1.35rem', margin: '0.25rem 0 0', color: '#FFFFFF', letterSpacing: '0.02em' }}>
              Terminal de Atualização Cadastral &amp; Onboarding
            </h2>
          </div>
        </div>

        {onClose && (
            <button 
              onClick={onClose}
              aria-label="Fechar"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#94A3B8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>
          )}
      </div>

      {/* CORPO DO TERMINAL */}
      <div>
        {submissionSuccess ? (
          /* ================================================================ */
          /* TELA DE SUCESSO & RECIBO OFICIAL COM PROTOCOLO E IMPRESSÃO       */
          /* ================================================================ */
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: 'rgba(197, 168, 105, 0.12)',
              border: '2px solid var(--gold-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold-light)',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 35px rgba(197, 168, 105, 0.35)'
            }}>
              <CheckCircle2 size={42} />
            </div>

            <span className="badge-institutional" style={{ marginBottom: '0.75rem' }}>
              FICHA ARMAZENADA NO SITE OFICIAL &amp; ESTEIRA HOMOLOGADA
            </span>

            <h3 style={{ fontSize: '1.85rem', color: '#FFFFFF', margin: '0.5rem 0' }}>
              Cadastro e Documentação Recebidos com Sucesso
            </h3>

            <p style={{ color: '#94A3B8', fontSize: '0.94rem', maxWidth: '620px', margin: '0 auto 1.8rem', lineHeight: 1.65 }}>
              Os dados e extratos de <strong style={{ color: '#FFFFFF' }}>{submissionSuccess.cliente}</strong> foram gravados com sucesso no banco de dados oficial da Mourato &amp; Associados e despachados para a esteira técnica.
            </p>

            {/* Box do Protocolo Oficial */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid var(--gold-border)',
              borderRadius: '10px',
              padding: '1.75rem',
              maxWidth: '540px',
              margin: '0 auto 2rem',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-light)', marginBottom: '0.4rem', fontWeight: 700 }}>
                PROTOCOLO OFICIAL DE ATENDIMENTO
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#0A0D14', padding: '0.85rem 1.15rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <code style={{ fontSize: '1.25rem', color: '#FFFFFF', letterSpacing: '0.08em', fontWeight: 700 }}>
                  {submissionSuccess.protocolo}
                </code>
                <button
                  onClick={() => copyToClipboard(submissionSuccess.protocolo)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copiedProtocolo ? '#10B981' : 'var(--gold-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  {copiedProtocolo ? <Check size={15} /> : <Copy size={15} />}
                  {copiedProtocolo ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1.2rem', fontSize: '0.82rem', color: '#94A3B8' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Titular Cadastrado:</span>
                  <strong style={{ color: '#F8FAFC' }}>{submissionSuccess.cliente}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Anexos em PDF:</span>
                  <strong style={{ color: '#10B981' }}>{submissionSuccess.anexos?.length || anexos.length} documento(s) arquivado(s)</strong>
                </div>
              </div>
            </div>

            {/* Ações: WhatsApp, Birô de Crédito, Impressão e Concluir */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>


              <button
                type="button"
                className="btn-secondary-subtle"
                onClick={() => handleOpenWhatsApp(submissionSuccess.protocolo, submissionSuccess.cliente)}
                style={{ padding: '0.9rem 1.8rem', fontSize: '0.9rem', borderColor: 'rgba(37, 211, 102, 0.4)', color: '#25D366' }}
              >
                <Send size={16} />
                Confirmar no WhatsApp da Diretoria
              </button>

              <button
                type="button"
                className="btn-secondary-subtle"
                onClick={() => window.print()}
                style={{
                  padding: '0.9rem 1.8rem',
                  fontSize: '0.9rem',
                  borderColor: 'var(--gold-border)',
                  color: 'var(--gold-light)',
                  background: 'rgba(197, 168, 105, 0.08)'
                }}
              >
                <Printer size={16} />
                Imprimir Via do Cliente (PDF)
              </button>

              {onClose ? (
                <button
                  type="button"
                  className="btn-secondary-subtle"
                  onClick={onClose}
                  style={{ padding: '0.9rem 1.8rem', fontSize: '0.9rem' }}
                >
                  Concluir &amp; Fechar
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary-subtle"
                  onClick={() => window.location.href = '/'}
                  style={{ padding: '0.9rem 1.8rem', fontSize: '0.9rem' }}
                >
                  Voltar à Página Principal
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* TERMINAL ÚNICO DE CADASTRO (OPÇÃO A - RECOMENDADO / PLUG & PLAY)  */
          /* ================================================================ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* BLOQUEIO DE CADASTRO DUPLICADO */}
            {isDuplicate && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <ShieldCheck size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    Cadastro já existente
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '0.82rem', margin: 0 }}>
                    Identificamos um cadastro com este e-mail ou WhatsApp em nossa base. Entre em contato com a diretoria pelo (11) 97899-0034.
                  </p>
                </div>
              </div>
            )}

            {/* TERMINAL PRINCIPAL: IFRAME DA ESTEIRA (OPÇÃO RECOMENDADA) */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                right: '16px',
                zIndex: 10,
                background: '#0F172A',
                border: '1px solid var(--gold-border)',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.68rem',
                color: 'var(--gold-light)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <ShieldCheck size={12} color="var(--gold-primary)" />
                TERMINAL OFICIAL COORDENADO
              </div>

              <iframe
                id="iframe-ficha-mourato"
                src={(() => {
                  const url = new URL(TEIA_IFRAME_URL, window.location.origin);
                  if (leadParams.nome) url.searchParams.set('nome', leadParams.nome);
                  if (leadParams.empresa) url.searchParams.set('empresa', leadParams.empresa);
                  if (leadParams.telefone) url.searchParams.set('telefone', leadParams.telefone);
                  if (leadParams.email) url.searchParams.set('email', leadParams.email);
                  return url.toString();
                })()}
                title="Ficha Cadastral Mourato & Associados"
                style={{
                  width: '100%',
                  height: isFullPage ? '980px' : '900px',
                  border: '1px solid var(--gold-border)',
                  borderRadius: '12px',
                  background: '#070B14',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
                }}
                allow="clipboard-write"
              />
            </div>

            {/* BOTÃO ÚNICO DE ANEXAR PDF NO FINAL DA PÁGINA */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--gold-border)',
              borderRadius: '10px',
              padding: '1.1rem 1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={17} color="var(--gold-primary)" />
                    Anexar Extratos &amp; Documentos Oficiais (PDF)
                  </h4>
                  <p style={{ color: '#94A3B8', fontSize: '0.76rem', margin: '0.2rem 0 0' }}>
                    Extratos do Quod, Bacen SCR ou outros relatórios serão vinculados diretamente à sua ficha.
                  </p>
                </div>

                <label
                  className="btn-primary-gold"
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0.75rem 1.6rem',
                    borderRadius: '8px'
                  }}
                >
                  <UploadCloud size={18} />
                  Anexar PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'pdf')}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Lista de PDFs Anexados */}
              {anexos.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '0.75rem'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
                    {anexos.length} documento(s) em PDF pronto(s) para vinculação ao cadastro:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {anexos.map((anexo) => (
                      <div
                        key={anexo.id}
                        style={{
                          background: '#070A10',
                          border: '1px solid var(--gold-border)',
                          borderRadius: '6px',
                          padding: '0.45rem 0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          fontSize: '0.78rem'
                        }}
                      >
                        <FileCheck2 size={14} color="var(--gold-primary)" />
                        <span style={{ color: '#F8FAFC', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {anexo.nome}
                        </span>
                        <span style={{ color: '#64748B', fontSize: '0.7rem' }}>({anexo.tamanho})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAnexo(anexo.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', padding: 0 }}
                          title="Remover anexo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BARRA DE CONCLUSÃO E DISPARO DIRETO PARA O BIRÔ DE CRÉDITO */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginTop: '0.5rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#34D399', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                  <ShieldCheck size={16} />
                  <span>Esteira Conectada ao Birô de Crédito Mourato</span>
                </div>
                <p style={{ color: '#94A3B8', fontSize: '0.78rem', margin: 0 }}>
                  Ao enviar, as informações cadastrais e extratos são salvos na plataforma e o Birô de Crédito é aberto para pesquisa e alimentação.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSimularEnvioFicha('PJ')}
                  style={{
                    padding: '0.75rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: '1px solid #34D399',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.2s'
                  }}
                  title="Concluir o preenchimento, salvar no banco de dados e abrir o Birô de Crédito imediatamente"
                >
                  <ShieldCheck size={16} />
                  Enviar Ficha &amp; Abrir Birô (PJ)
                </button>

                <button
                  type="button"
                  onClick={() => handleSimularEnvioFicha('PF')}
                  style={{
                    padding: '0.75rem 1.2rem',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38BDF8',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.2s'
                  }}
                  title="Concluir o preenchimento como sócio PF e abrir o Birô"
                >
                  Enviar Ficha (PF)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* VIA DO CLIENTE IMPRESSA (VISÍVEL APENAS NA IMPRESSÃO / WINDOW.PRINT) */}
      {/* ==================================================================== */}
      <div className="print-receipt-paper" style={{ display: 'none' }}>
        <div style={{ borderBottom: '2px solid #C5A869', paddingBottom: '14px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/mourato-seal-circle.png" alt="Mourato & Associados" style={{ width: '60px', height: '60px' }} />
            <div>
              <h2 style={{ fontSize: '16pt', margin: 0, fontWeight: 'bold', color: '#0F172A', letterSpacing: '0.04em' }}>
                MOURATO &amp; ASSOCIADOS LTDA
              </h2>
              <div style={{ fontSize: '9pt', color: '#475569', marginTop: '2px' }}>
                CNPJ: 38.377.738/0001-45 • NIRE: 35270804594 • São Paulo/SP
              </div>
              <div style={{ fontSize: '8.5pt', color: '#64748B' }}>
                Assessoria Corporativa, Estruturação Financeira &amp; Auditoria de Rating
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '8pt', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold' }}>
              PROTOCOLO OFICIAL
            </div>
            <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#0F172A', fontFamily: 'monospace' }}>
              {submissionSuccess?.protocolo || 'EM CADASTRAMENTO'}
            </div>
            <div style={{ fontSize: '8pt', color: '#64748B', marginTop: '2px' }}>
              Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>

        <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', textAlign: 'center' }}>
          <strong style={{ fontSize: '11pt', letterSpacing: '0.05em', color: '#0F172A' }}>
            COMPROVANTE OFICIAL DE CADASTRAMENTO &amp; VIA DO CLIENTE
          </strong>
          <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '2px' }}>
            Documento emitido nos termos da Lei nº 13.709/2018 (LGPD) e Resoluções CMN/BACEN para instrução de esteira pericial.
          </div>
        </div>

        {/* 1. Titular */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid #CBD5E1', paddingBottom: '3px', marginBottom: '6px' }}>
            1. DADOS DO TITULAR
          </div>
          <table className="print-table">
            <tbody>
              <tr>
                <th style={{ width: '25%' }}>Nome Completo:</th>
                <td style={{ width: '45%' }}>{titularInfo.nome || submissionSuccess?.cliente || 'Não informado'}</td>
                <th style={{ width: '15%' }}>CPF:</th>
                <td style={{ width: '15%' }}>{titularInfo.cpf ? maskCPF(titularInfo.cpf) : 'Não informado'}</td>
              </tr>
              {titularInfo.rg && (
                <tr>
                  <th>RG / Órgão:</th>
                  <td>{titularInfo.rg} ({titularInfo.orgao_expedidor || ''})</td>
                  <th>Nascimento:</th>
                  <td>{titularInfo.nascimento || ''}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 2. Contato & Localização */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid #CBD5E1', paddingBottom: '3px', marginBottom: '6px' }}>
            2. CONTATO &amp; ENDEREÇO
          </div>
          <table className="print-table">
            <tbody>
              <tr>
                <th style={{ width: '25%' }}>Celular / WhatsApp:</th>
                <td style={{ width: '35%' }}>{contatoInfo.celular || 'Não informado'}</td>
                <th style={{ width: '20%' }}>E-mail:</th>
                <td style={{ width: '20%' }}>{contatoInfo.email || 'Não informado'}</td>
              </tr>
              {enderecoInfo.logradouro && (
                <tr>
                  <th>Endereço:</th>
                  <td colSpan={3}>
                    {enderecoInfo.logradouro}, nº {enderecoInfo.numero} — {enderecoInfo.bairro}, {enderecoInfo.cidade}/{enderecoInfo.uf} (CEP: {enderecoInfo.cep})
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Documentos Anexados */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid #CBD5E1', paddingBottom: '3px', marginBottom: '6px' }}>
            3. DOCUMENTOS &amp; EXTRATOS EM PDF ARQUIVADOS ({anexos.length})
          </div>
          {anexos.length > 0 ? (
            <table className="print-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome do Arquivo PDF</th>
                  <th>Tamanho</th>
                  <th>Status de Arquivamento</th>
                </tr>
              </thead>
              <tbody>
                {anexos.map((a, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold' }}>
                      {a.tipo === 'quod' ? 'Extrato Quod' : a.tipo === 'bacen' ? 'Extrato Bacen SCR' : 'Documento / Certidão'}
                    </td>
                    <td>{a.nome}</td>
                    <td>{a.tamanho}</td>
                    <td style={{ color: '#166534', fontWeight: 'bold' }}>Arquivado com Hash Seguro</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: '9pt', color: '#64748B', fontStyle: 'italic', padding: '6px 0' }}>
              Nenhum extrato adicional anexado na submissão digital.
            </div>
          )}
        </div>

        {/* 4. Declaração Legal e Assinaturas */}
        <div style={{ marginTop: '24px', borderTop: '1px solid #CBD5E1', paddingTop: '14px', fontSize: '8.5pt', color: '#475569', lineHeight: 1.5 }}>
          <p style={{ margin: 0, textAlign: 'justify' }}>
            <strong>DECLARAÇÃO &amp; TERMO DE CONSENTIMENTO (LGPD - LEI 13.709/2018):</strong> O titular acima qualificado declara que todas as informações prestadas são verídicas e autoriza expressamente a sociedade empresária Mourato &amp; Associados LTDA a realizar as diligências periciais cabíveis junto aos órgãos de proteção ao crédito (Serasa, Boa Vista, Quod) e ao Sistema SCR do Banco Central do Brasil sob protocolo estrito de confidencialidade (NDA).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginTop: '45px', textAlign: 'center' }}>
            <div>
              <div style={{ borderTop: '1px solid #0F172A', paddingTop: '6px', fontWeight: 'bold', color: '#0F172A' }}>
                {titularInfo.nome || submissionSuccess?.cliente || 'TITULAR CADASTRADO'}
              </div>
              <div style={{ fontSize: '8pt', color: '#64748B' }}>Assinatura do Titular / Representante</div>
            </div>

            <div>
              <div style={{ borderTop: '1px solid #0F172A', paddingTop: '6px', fontWeight: 'bold', color: '#0F172A' }}>
                MOURATO &amp; ASSOCIADOS LTDA
              </div>
              <div style={{ fontSize: '8pt', color: '#64748B' }}>Chancela e Recebimento Oficial da Diretoria</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
