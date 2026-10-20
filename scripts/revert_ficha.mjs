import fs from 'fs';

const filePath = 'C:/Projetos/Mourato.associados/src/components/FichaCadastralStandalone.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Revert header imports and component declaration back to original:
const originalTop = `import React, { useState, useEffect } from 'react';
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

export const FichaCadastralStandalone = ({ isFullPage = false, onClose = null }) => {
  const [anexos, setAnexos] = useState([]); // [{ id, tipo: 'quod' | 'bacen' | 'serasa' | 'outro', nome, tamanho, base64 }]
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [copiedProtocolo, setCopiedProtocolo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

`;

const markerListener = '  // Escuta o evento oficial emitido pela Ficha ao concluir a submissão no iframe';
const listenerIndex = content.indexOf(markerListener);
if (listenerIndex !== -1) {
  content = originalTop + content.substring(listenerIndex);
}

// 2. Revert the body back to the iframe and single clean terminal
const originalTerminal = `            {/* TERMINAL PRINCIPAL: IFRAME DA ESTEIRA (OPÇÃO RECOMENDADA) */}
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
                src={TEIA_IFRAME_URL}
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
            </div>`;

const elseMarker = '/* TERMINAL ÚNICO DE CADASTRO (OPÇÃO A - RECOMENDADO / PLUG & PLAY)  */';
const elseIndex = content.indexOf(elseMarker);
if (elseIndex !== -1) {
  const divMarker = "<div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>";
  const divIndex = content.indexOf(divMarker, elseIndex);
  const endDivMarker = "\n          </div>\n        )}\n      </div>";
  const endDivIndex = content.indexOf(endDivMarker, divIndex);
  if (divIndex !== -1 && endDivIndex !== -1) {
    const prefix = content.substring(0, divIndex + divMarker.length);
    const suffix = content.substring(endDivIndex);
    content = prefix + '\n\n' + originalTerminal + suffix;
  }
}

// 3. And also remove the buttons [Copiar Link Direto] [Enviar no WhatsApp] from the top header if the user doesn't want them:
// User screenshot 2: [Copiar Link Direto] [Enviar no WhatsApp]
// "não pedi para criar essa area aqui a plailha é para o cliete final deve ter penas ouqe for direcionado para o cliente final"
// Let's remove the sharing buttons from the header:
const shareMarkerStart = '{/* Compartilhamento Direto para o Cliente */}';
const shareMarkerEnd = '{onClose && (';
const shareStartIndex = content.indexOf(shareMarkerStart);
const shareEndIndex = content.indexOf(shareMarkerEnd);
if (shareStartIndex !== -1 && shareEndIndex !== -1) {
  content = content.substring(0, shareStartIndex) + content.substring(shareEndIndex);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Restored FichaCadastralStandalone.jsx! Total lines:', content.split('\n').length);
