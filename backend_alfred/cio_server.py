"""
ALFRED — EXECUTIVO CENTRAL COM 100% DE AUTORIDADE
Servidor Dedicado e Painel de Controle de Auditoria Pericial & Execução
Porta: 9000
"""

import os
import sys
import shutil
import webbrowser
import threading
import time
from typing import Dict, Any, List, Optional
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

AVATAR_PATH = os.path.join(BASE_DIR, "cio_avatar.jpg")
if not os.path.exists(AVATAR_PATH):
    AVATAR_PATH = r"C:\Projetos\Flix\app\static\cio_avatar.jpg"

from cio_dual_engine import cio_engine
from alfred_actions import execute_alfred_order
from pdf_audit_engine import pdf_auditor
from mica_radar import mica_radar
from alfred_pdf_generator import mourato_pdf_gen
from pipeline_engine import pipeline_engine
from mica_agent import mica_agent
from questao_investigador import questao_investigador
from alfred_auditor import alfred_auditor

# Import search from Teia
try:
    sys.path.insert(0, r"C:\Projetos\Flix")
    from app.cio_brain import search_teia_entities, audit_entity_data
except Exception:
    def search_teia_entities(q): return []
    def audit_entity_data(e, s): return []

app = FastAPI(title="ALFRED SERVER", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str
    prefer_mode: Optional[str] = "auto"

class SearchRequest(BaseModel):
    query: str

class DossierRequest(BaseModel):
    client_name: str
    doc_id: str
    tipo: str = "PJ"

class PipelineProcessRequest(BaseModel):
    cnpj: str
    telefone: Optional[str] = ""
    email: Optional[str] = ""
    nome_contato: Optional[str] = ""
    simular_consentimento_imediato: Optional[bool] = True

class PipelineConsentRequest(BaseModel):
    protocolo: str
    resposta: str

class PipelineDecideRequest(BaseModel):
    protocolo: str
    decisao: str

class PipelineOnboardingRequest(BaseModel):
    protocolo: str
    confirmacao: Optional[bool] = True

@app.get("/favicon.ico")
@app.get("/avatar")
def get_avatar():
    if os.path.exists(AVATAR_PATH):
        return FileResponse(AVATAR_PATH, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Avatar not found")

@app.post("/api/ask")
def api_ask(req: PromptRequest):
    # 1. Checa se é uma ordem direta para o Alfred executar com autoridade
    action_res = execute_alfred_order(req.prompt)
    if action_res["executed"]:
        return {
            "success": True,
            "engine": "ALFRED (Execução Direta com 100% de Autoridade)",
            "response": action_res["msg"]
        }
        
    res = cio_engine.ask(req.prompt, req.prefer_mode)
    return {"success": True, **res}

@app.post("/api/search")
def api_search(req: SearchRequest):
    results = search_teia_entities(req.query)
    return {"success": True, "count": len(results), "results": results}

@app.post("/api/audit-pdf")
async def api_audit_pdf(file: UploadFile = File(...)):
    """Recebe qualquer arquivo PDF e roda auditoria pericial automatizada"""
    try:
        temp_path = os.path.join(UPLOADS_DIR, file.filename)
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        report = pdf_auditor.audit_pdf(temp_path)
        return report
    except Exception as e:
        return {"success": False, "error": f"Erro interno no processamento do arquivo: {str(e)}"}

@app.get("/api/mica/radar")
def api_mica_radar():
    """Retorna o radar de certidões e prazos da Secretária Mica"""
    return mica_radar.scan_all_clients()

# --- ESTEIRA DE CRÉDITO 3 AGENTES (MICA, QUESTÃO, ALFRED) & DECISÃO MOURATO ---

@app.post("/api/pipeline/process")
def api_pipeline_process(req: PipelineProcessRequest):
    """Dispara a esteira autônoma completa dos 3 agentes para um CNPJ"""
    res = pipeline_engine.processar_fluxo_completo(
        cnpj=req.cnpj,
        telefone=req.telefone,
        email=req.email,
        nome_contato=req.nome_contato,
        simular_consentimento_imediato=req.simular_consentimento_imediato
    )
    return res

@app.get("/api/pipeline/leads")
def api_pipeline_leads():
    """Lista todos os protocolos e leads no pipeline da esteira"""
    pipeline = mica_agent._carregar_pipeline()
    return {"success": True, "count": len(pipeline), "leads": list(pipeline.values())}

@app.get("/api/pipeline/lead/{protocolo}")
def api_pipeline_lead_detail(protocolo: str):
    """Retorna os detalhes completos, dossiê e status de um protocolo"""
    pipeline = mica_agent._carregar_pipeline()
    lead = pipeline.get(protocolo)
    if not lead:
        raise HTTPException(status_code=404, detail="Protocolo não encontrado")
    return {"success": True, "lead": lead}

@app.post("/api/pipeline/consent")
def api_pipeline_consent(req: PipelineConsentRequest):
    """Mica processa a resposta de consentimento do cliente (Sim ou Não)"""
    res = mica_agent.processar_resposta_consentimento(req.protocolo, req.resposta)
    if res.get("acionar_questao"):
        # Executa a esteira a partir da investigação do Questão
        pipeline = mica_agent._carregar_pipeline()
        lead = pipeline.get(req.protocolo, {})
        cnpj = lead.get("cnpj", "")
        dossie = questao_investigador.investigar_75_porcento_pj(cnpj, req.protocolo)
        auditoria = alfred_auditor.auditar_dossie_questao(dossie)
        pdf_res = alfred_auditor.gerar_pasta_e_pdf_oficial(auditoria)
        briefing = alfred_auditor.formatar_mensagem_whatsapp_mourato(auditoria)
        lead["dossie_questao"] = dossie
        lead["auditoria_alfred"] = auditoria
        lead["status_etapa"] = "AGUARDANDO_DECISAO_MOURATO"
        lead["pasta_cliente"] = pdf_res["folder_path"]
        lead["dossie_pdf"] = pdf_res["dossie_pdf"]
        lead["ficha_pdf"] = pdf_res["ficha_pdf"]
        pipeline[req.protocolo] = lead
        mica_agent._salvar_pipeline(pipeline)
        return {**res, "auditoria": auditoria, "briefing_mourato": briefing, "arquivos": pdf_res}
    return res

@app.post("/api/pipeline/decide")
def api_pipeline_decide(req: PipelineDecideRequest):
    """Registra o comando soberano do Chefe Mourato ([PROSSEGUIR] ou [NEGAR])"""
    res = mica_agent.registrar_decisao_mourato(req.protocolo, req.decisao)
    return res

@app.post("/api/pipeline/onboarding-step")
def api_pipeline_onboarding_step(req: PipelineOnboardingRequest):
    """Mica avança os birôs obrigatórios sequencialmente (Serasa -> Boa Vista -> Quod -> Planilha)"""
    res = mica_agent.avancar_onboarding_biros(req.protocolo, confirmacao_cliente=req.confirmacao)
    return res

@app.get("/api/pipeline/download-pdf/{protocolo}")
def api_pipeline_download_pdf(protocolo: str, tipo: str = "dossie"):
    """Download do PDF Oficial com Marca d'Água 5.5% gerado para o protocolo"""
    pipeline = mica_agent._carregar_pipeline()
    lead = pipeline.get(protocolo)
    if not lead:
        raise HTTPException(status_code=404, detail="Protocolo não encontrado")
    
    fpath = lead.get("dossie_pdf") if tipo == "dossie" else lead.get("ficha_pdf")
    if fpath and os.path.exists(fpath):
        return FileResponse(fpath, media_type="application/pdf", filename=os.path.basename(fpath))
    raise HTTPException(status_code=404, detail="Arquivo PDF pericial não localizado no disco")

@app.post("/api/generate-dossier")
def api_generate_dossier(req: DossierRequest):
    """Gera Dossiê no Padrão Mourato com Brasão e Marca d'Água 5.5%"""
    clean_id = req.doc_id.replace(".", "").replace("-", "").replace("/", "")
    if req.tipo.upper() == "PJ":
        target_dir = os.path.join(r"C:\Teia de arranha\ClientesPJ", f"{req.client_name.upper().replace(' ', '_')}_{clean_id}")
    else:
        target_dir = os.path.join(r"C:\Teia de arranha\ClientesPF", f"{req.client_name.upper().replace(' ', '_')}_{clean_id}")
    
    os.makedirs(target_dir, exist_ok=True)
    pdf_out = os.path.join(target_dir, "FICHA_CADASTRAL_E_SENHAS.pdf")

    entity_data = {
        "tipo": req.tipo.upper(),
        "nome": req.client_name,
        "identificador": req.doc_id,
        "cnpj": req.doc_id if req.tipo.upper() == "PJ" else "",
        "cpf": req.doc_id if req.tipo.upper() == "PF" else "",
        "situacao_cadastral": "ATIVA",
        "data_abertura": "0",
        "capital_social": "0,00"
    }

    res = mourato_pdf_gen.generate_dossier_pdf(entity_data, pdf_out)
    return res

@app.get("/api/view-pdf/{filename}")
def api_view_pdf(filename: str):
    fpath = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(fpath):
        return FileResponse(fpath, media_type="application/pdf")
    raise HTTPException(status_code=404, detail="PDF não encontrado")

@app.get("/", response_class=HTMLResponse)
def index():
    return """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>ALFRED — Central Executiva & Holograma 3D</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, system-ui, sans-serif; }
    body { background: #080C14; color: #F8FAFC; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { background: #0D1322; border-bottom: 1.5px solid rgba(197,168,105,0.35); padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .brand { display: flex; align-items: center; gap: 14px; }
    .avatar-wrap { position: relative; width: 48px; height: 48px; border-radius: 50%; border: 2px solid #C5A869; box-shadow: 0 0 16px rgba(197,168,105,0.5); overflow: hidden; display: flex; align-items: center; justify-content: center; background: #0B0F19; }
    .avatar-mini { width: 100%; height: 100%; object-fit: cover; }
    .brand-title { font-size: 1.15rem; font-weight: 800; letter-spacing: 1px; color: #FFFFFF; font-family: 'Georgia', serif; }
    .brand-title span { color: #C5A869; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .btn-header { background: rgba(30,41,59,0.8); border: 1px solid rgba(197,168,105,0.4); color: #E2E8F0; padding: 7px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .btn-header:hover { background: #C5A869; color: #0F172A; }
    .status-badge { background: rgba(16,185,129,0.15); border: 1px solid #10B981; color: #6EE7B7; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 8px #10B981; animation: pulseDot 1.5s infinite; }
    @keyframes pulseDot { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
    
    .container { flex: 1; display: flex; padding: 14px 18px; gap: 16px; overflow: hidden; }
    .sidebar { width: 340px; background: #0B101D; border: 1px solid rgba(197,168,105,0.22); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
    
    /* 3D HOLOGRAPHIC DOCK */
    .alfred-3d-dock {
      background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,14,24,0.95) 100%);
      border: 1.5px solid rgba(197,168,105,0.4);
      border-radius: 14px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6), inset 0 0 20px rgba(197,168,105,0.06);
    }
    .dock-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.68rem; }
    .dock-badge { color: #C5A869; font-weight: 800; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px; }
    .dock-mode { color: #00E5FF; font-weight: 700; background: rgba(0,229,255,0.12); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(0,229,255,0.3); }
    
    .canvas-3d-wrap {
      width: 100%;
      height: 210px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, rgba(197,168,105,0.08) 0%, rgba(8,12,20,0.8) 70%);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.06);
    }
    #alfredCanvas3D { width: 100%; height: 100%; cursor: grab; }
    #alfredCanvas3D:active { cursor: grabbing; }
    
    .hologram-scanline {
      position: absolute;
      top: 0; left: 0; right: 0; height: 100%;
      background: linear-gradient(180deg, transparent 0%, rgba(197,168,105,0.06) 50%, transparent 100%);
      background-size: 100% 8px;
      pointer-events: none;
      animation: scanline 4s linear infinite;
    }
    @keyframes scanline { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
    
    .dock-status { text-align: center; margin-top: 8px; width: 100%; }
    .alfred-name { font-size: 0.88rem; font-weight: 800; color: #FFFFFF; letter-spacing: 0.05em; }
    .alfred-subtitle { font-size: 0.68rem; color: #C5A869; font-weight: 600; margin-top: 1px; }
    
    .voice-controls { width: 100%; display: flex; gap: 6px; margin-top: 10px; align-items: center; }
    .voice-select {
      flex: 1;
      background: #070A12;
      border: 1px solid rgba(197,168,105,0.35);
      border-radius: 6px;
      color: #E2E8F0;
      font-size: 0.72rem;
      padding: 6px 8px;
      outline: none;
      cursor: pointer;
    }
    .btn-test-voice {
      background: rgba(197,168,105,0.18);
      border: 1px solid #C5A869;
      color: #FFFFFF;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .btn-test-voice:hover { background: #C5A869; color: #0A0D14; }

    .sat-card { background: rgba(30,41,59,0.5); border: 1px solid rgba(148,163,184,0.15); border-radius: 8px; padding: 10px 12px; }
    .sat-title { font-size: 0.78rem; font-weight: 700; color: #C5A869; margin-bottom: 2px; }
    .sat-desc { font-size: 0.7rem; color: #94A3B8; }
    
    .main-terminal { flex: 1; background: #080C16; border: 1.5px solid rgba(197,168,105,0.3); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
    
    /* DROP ZONE */
    .dropzone { margin: 12px 16px; border: 2px dashed rgba(197,168,105,0.4); border-radius: 10px; padding: 12px; text-align: center; background: rgba(30,41,59,0.3); cursor: pointer; transition: all 0.2s; }
    .dropzone:hover, .dropzone.dragover { border-color: #C5A869; background: rgba(197,168,105,0.1); }
    .dropzone-title { font-size: 0.82rem; font-weight: 700; color: #C5A869; }
    .dropzone-sub { font-size: 0.7rem; color: #94A3B8; margin-top: 2px; }
    
    .chat-feed { flex: 1; padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
    .msg { padding: 12px 16px; border-radius: 10px; max-width: 90%; font-size: 0.85rem; line-height: 1.5; }
    .msg-alfred { background: rgba(15,23,42,0.85); border-left: 4px solid #C5A869; color: #E2E8F0; align-self: flex-start; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    .msg-user { background: rgba(59,130,246,0.18); border-left: 4px solid #3B82F6; color: #93C5FD; align-self: flex-end; }
    
    /* AUDIT CARD */
    .audit-card { background: #0F172A; border: 1px solid #C5A869; border-radius: 10px; padding: 14px; margin-top: 8px; }
    .audit-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(197,168,105,0.3); padding-bottom: 8px; margin-bottom: 10px; }
    .badge-status { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; }
    .badge-APROVADO { background: rgba(16,185,129,0.2); color: #34D399; border: 1px solid #10B981; }
    .badge-RESSALVAS { background: rgba(234,179,8,0.2); color: #FBBF24; border: 1px solid #F59E0B; }
    .badge-REJEITADO { background: rgba(239,68,68,0.2); color: #F87171; border: 1px solid #EF4444; }
    .finding-item { font-size: 0.75rem; padding: 4px 8px; margin-bottom: 4px; border-radius: 4px; }
    .finding-CONFORME { background: rgba(16,185,129,0.1); color: #6EE7B7; border-left: 3px solid #10B981; }
    .finding-CRÍTICO { background: rgba(239,68,68,0.15); color: #FCA5A5; border-left: 3px solid #EF4444; }
    .finding-ALERTA { background: rgba(234,179,8,0.15); color: #FDE047; border-left: 3px solid #F59E0B; }
    
    .input-bar { background: #0D1322; border-top: 1.5px solid rgba(197,168,105,0.25); padding: 12px 20px; display: flex; gap: 10px; align-items: center; }
    .input-bar input { flex: 1; background: rgba(15,23,42,0.9); border: 1px solid rgba(197,168,105,0.35); border-radius: 8px; padding: 12px 16px; color: #FFFFFF; font-size: 0.9rem; outline: none; }
    .input-bar input:focus { border-color: #C5A869; box-shadow: 0 0 10px rgba(197,168,105,0.25); }
    .btn-action { background: linear-gradient(135deg, #C5A869, #9A7B38); color: #0A0D14; font-weight: 800; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(197,168,105,0.3); }
    .btn-action:hover { background: #E8D5A3; }
    .btn-voice { background: rgba(197,168,105,0.15); border: 1.5px solid #C5A869; color: #FFFFFF; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: all 0.2s; }
    .btn-voice.listening { background: #EF4444 !important; border-color: #EF4444; animation: pulse 1s infinite alternate; }
    
    /* MODAL */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: none; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(6px); }
    .modal-box { background: #0F172A; border: 1.5px solid #C5A869; border-radius: 14px; width: 85%; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 16px 50px rgba(0,0,0,0.8); }
    .modal-header { padding: 14px 20px; border-bottom: 1px solid rgba(197,168,105,0.3); display: flex; justify-content: space-between; align-items: center; }
    .modal-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
    .close-btn { background: none; border: none; color: #94A3B8; font-size: 1.4rem; cursor: pointer; }
    .close-btn:hover { color: #FFFFFF; }
    table.radar-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    table.radar-table th { background: #1E293B; color: #C5A869; text-align: left; padding: 8px; border-bottom: 1px solid #334155; }
    table.radar-table td { padding: 8px; border-bottom: 1px solid #1E293B; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="avatar-wrap">
        <img src="/avatar" alt="ALFRED" class="avatar-mini">
      </div>
      <div>
        <div class="brand-title">ALFRED <span>EXECUTIVO</span></div>
        <div style="font-size: 0.72rem; color: #94A3B8;">100% de Autoridade Executiva & Auditoria Pericial (Mourato & Associados)</div>
      </div>
    </div>
    
    <div class="header-actions">
      <button class="btn-header" onclick="openMicaRadar()">👩‍💼 Radar CNDs (Mica)</button>
      <button class="btn-header" onclick="openDossierModal()">📜 Emitir Dossiê 75/25</button>
      <div class="status-badge">
        <div class="status-dot"></div> ALFRED 3D ATIVO
      </div>
    </div>
  </header>

  <div class="container">
    <aside class="sidebar">
      
      <!-- HOLOGRAFO 3D INTERATIVO DO ALFRED -->
      <div class="alfred-3d-dock">
        <div class="dock-header">
          <span class="dock-badge">● HOLO CORE 3D</span>
          <span class="dock-mode" id="dockAudioStatus">ÁUDIO REATIVO</span>
        </div>
        <div class="canvas-3d-wrap" id="canvas3dWrap">
          <canvas id="alfredCanvas3D" width="310" height="210"></canvas>
          <div class="hologram-scanline"></div>
        </div>
        <div class="dock-status">
          <div class="alfred-name">ALFRED PENNYWORTH AI</div>
          <div class="alfred-subtitle">Mordomo Executivo • Protocolo Batman</div>
        </div>
        <div class="voice-controls">
          <select id="voiceStyleSelect" class="voice-select">
            <option value="batman_butler">🤵 Mordomo do Batman (Grave &amp; Culto)</option>
            <option value="british_gentleman">🇬🇧 British Butler (Michael Caine)</option>
            <option value="cyber_butler">⚡ Cyber Butler (Cadência Solene)</option>
          </select>
          <button class="btn-test-voice" onclick="testButlerVoice()">
            🔊 Testar
          </button>
        </div>
      </div>

      <div style="font-size: 0.75rem; font-weight: 800; color: #C5A869; letter-spacing: 1px; margin-top: 4px; margin-bottom: 2px;">ESTRUTURA DA EQUIPE</div>
      
      <div class="sat-card" style="border-left: 3px solid #EAB308;">
        <div class="sat-title" style="color: #FEF08A;">👑 CHEFE / LIDERANÇA SUPREMA</div>
        <div class="sat-desc"><b>Mourato</b> • Decisão Executiva & Comando Comercial</div>
      </div>

      <div class="sat-card" style="border-left: 3px solid #C5A869; background: rgba(197,168,105,0.1);">
        <div class="sat-title">🛡️ CIO EXECUTIVO</div>
        <div class="sat-desc"><b>Alfred</b> • Cérebro Técnico, Compliance, 100% de Autoridade</div>
      </div>

      <div class="sat-card" style="border-left: 3px solid #EC4899; cursor: pointer;" onclick="openMicaRadar()">
        <div class="sat-title">👩‍💼 SECRETÁRIA EXECUTIVA (CLIQUE)</div>
        <div class="sat-desc"><b>Mica</b> • Radar de CNDs & Fila de Protocolos</div>
      </div>

      <div class="sat-card" style="border-left: 3px solid #3B82F6;">
        <div class="sat-title">⚙️ MÃO DE OBRA MANUAL</div>
        <div class="sat-desc"><b>Flix Studio</b> • Esteira Operacional (Porta 8765)</div>
      </div>

      <div class="sat-card" style="border-left: 3px solid #10B981;">
        <div class="sat-title">🔍 AGENTE DE CONSULTA</div>
        <div class="sat-desc"><b>Teia de Aranha</b> • Consultas & Agendamentos</div>
      </div>

      <div style="margin-top: auto; border-top: 1px solid rgba(148,163,184,0.15); padding-top: 10px;">
        <input type="text" id="sideSearch" placeholder="Consulta rápida Teia..." style="width: 100%; padding: 8px 10px; background: rgba(15,23,42,0.8); border: 1px solid rgba(197,168,105,0.3); border-radius: 6px; color: #FFFFFF; font-size: 0.75rem; margin-bottom: 6px;">
        <button class="btn-action" style="width: 100%; padding: 8px; font-size: 0.75rem;" onclick="quickSearch()">CONSULTAR NA TEIA</button>
      </div>
    </aside>

    <main class="main-terminal">
      <div class="dropzone" id="dropzone" onclick="document.getElementById('pdfInput').click()">
        <input type="file" id="pdfInput" accept=".pdf" style="display: none;" onchange="handleFileSelect(event)">
        <div class="dropzone-title">📥 ARRASTE QUALQUER ARQUIVO PDF OU CLIQUE PARA AUDITAR</div>
        <div class="dropzone-sub">Auditoria Pericial Imediata (Extrato Bancário, Balanço, CNDs ou Dossiê)</div>
      </div>

      <div class="chat-feed" id="chatFeed">
        <div class="msg msg-alfred">
          <b>Alfred Pennyworth às suas ordens, Chefe Mourato.</b><br>
          Holograma 3D quântico calibrado e operando em máxima conformidade. O motor dual (Gemini 3.5 Flash e Qwen 2.5 local) e todos os dossiês das pastas <code>ClientesPJ</code> e <code>ClientesPF</code> estão sob minha auditoria pericial contínua. Em que posso servi-lo neste momento?
        </div>
      </div>

      <div class="input-bar">
        <button class="btn-voice" id="btnVoice" title="Falar comando de voz para Alfred">🎤</button>
        <input type="text" id="cmdInput" placeholder="Fale ou digite uma instrução executiva para Alfred..." autocomplete="off">
        <button class="btn-action" id="btnSend">EXECUTAR</button>
      </div>
    </main>
  </div>

  <!-- MODAL DO RADAR MICA -->
  <div class="modal-overlay" id="micaModal">
    <div class="modal-box">
      <div class="modal-header">
        <b style="color: #C5A869;">👩‍💼 RADAR DE CNDs DA SECRETÁRIA MICA</b>
        <button class="close-btn" onclick="closeMicaRadar()">&times;</button>
      </div>
      <div class="modal-body" id="micaModalBody"></div>
    </div>
  </div>

  <!-- MODAL DE EMISSÃO DE DOSSIÊ -->
  <div class="modal-overlay" id="dossierModal">
    <div class="modal-box" style="max-width: 500px;">
      <div class="modal-header">
        <b style="color: #C5A869;">📜 EMITIR DOSSIÊ OFICIAL MOURATO 75/25</b>
        <button class="close-btn" onclick="closeDossierModal()">&times;</button>
      </div>
      <div class="modal-body" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="font-size: 0.75rem; color: #94A3B8;">Tipo de Entidade</label>
          <select id="dosTipo" style="width: 100%; padding: 8px; background: #1E293B; border: 1px solid #C5A869; border-radius: 6px; color: #FFFFFF; font-size: 0.8rem; margin-top: 4px;">
            <option value="PJ">Pessoa Jurídica (PJ)</option>
            <option value="PF">Pessoa Física (PF)</option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.75rem; color: #94A3B8;">Razão Social ou Nome do Cliente</label>
          <input type="text" id="dosNome" placeholder="Ex: MOURATO E ASSOCIADOS LTDA" style="width: 100%; padding: 8px; background: #1E293B; border: 1px solid #C5A869; border-radius: 6px; color: #FFFFFF; font-size: 0.8rem; margin-top: 4px;">
        </div>
        <div>
          <label style="font-size: 0.75rem; color: #94A3B8;">CNPJ ou CPF (com pontuação)</label>
          <input type="text" id="dosDoc" placeholder="Ex: 38.377.738/0001-45" style="width: 100%; padding: 8px; background: #1E293B; border: 1px solid #C5A869; border-radius: 6px; color: #FFFFFF; font-size: 0.8rem; margin-top: 4px;">
        </div>
        <button class="btn-action" style="margin-top: 8px;" onclick="submitDossier()">GERAR E SALVAR NA PASTA</button>
      </div>
    </div>
  </div>

  <script>
    // ============================================================
    // MOTOR HOLOGRÁFICO 3D DO ALFRED (QUANTUM BUTLER CORE)
    // ============================================================
    class Alfred3DHologram {
      constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        
        this.isSpeaking = false;
        this.speechIntensity = 0.0;
        this.targetIntensity = 0.0;
        this.angleX = 0.25;
        this.angleY = 0;
        this.angleZ = 0;
        this.targetRotX = 0.25;
        this.targetRotY = 0;
        
        // Geometria 3D do Núcleo Dodecaedro / Icosaedro
        this.nodes = [];
        this.edges = [];
        this.initGeometry();
        
        // Partículas 3D em Órbita
        this.particles = [];
        for (let i = 0; i < 48; i++) {
          const radius = 55 + Math.random() * 45;
          const theta = Math.random() * Math.PI * 2;
          const phi = (Math.random() - 0.5) * Math.PI;
          this.particles.push({
            radius,
            theta,
            phi,
            speedTheta: (Math.random() * 0.018 + 0.008) * (Math.random() > 0.5 ? 1 : -1),
            speedPhi: (Math.random() * 0.012 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
            size: Math.random() * 2 + 1,
            color: Math.random() > 0.25 ? '#C5A869' : '#00E5FF'
          });
        }

        // Parallax Interativo do Mouse
        this.canvas.addEventListener('mousemove', (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const mx = (e.clientX - rect.left) / rect.width - 0.5;
          const my = (e.clientY - rect.top) / rect.height - 0.5;
          this.targetRotY = mx * 1.4;
          this.targetRotX = -my * 0.9 + 0.25;
        });

        this.canvas.addEventListener('mouseleave', () => {
          this.targetRotX = 0.25;
          this.targetRotY = 0;
        });

        this.canvas.addEventListener('click', () => {
          testButlerVoice();
        });

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
      }

      initGeometry() {
        const phi = (1 + Math.sqrt(5)) / 2;
        const s = 32;
        const rawNodes = [
          [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
          [ 0, -1,  phi], [ 0,  1,  phi], [ 0, -1, -phi], [ 0,  1, -phi],
          [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1]
        ];
        this.nodes = rawNodes.map(pt => ({
          x: pt[0] * s,
          y: pt[1] * s,
          z: pt[2] * s
        }));

        for (let i = 0; i < this.nodes.length; i++) {
          for (let j = i + 1; j < this.nodes.length; j++) {
            const dx = this.nodes[i].x - this.nodes[j].x;
            const dy = this.nodes[i].y - this.nodes[j].y;
            const dz = this.nodes[i].z - this.nodes[j].z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < s * 2.2) {
              this.edges.push([i, j]);
            }
          }
        }
      }

      setSpeaking(speaking) {
        this.isSpeaking = speaking;
        this.targetIntensity = speaking ? 1.0 : 0.0;
        const badge = document.getElementById("dockAudioStatus");
        if (badge) {
          badge.innerText = speaking ? "FALANDO..." : "ÁUDIO REATIVO";
          badge.style.color = speaking ? "#FFD700" : "#00E5FF";
        }
      }

      rotate(p, rx, ry, rz) {
        let cosY = Math.cos(ry), sinY = Math.sin(ry);
        let x1 = p.x * cosY + p.z * sinY;
        let z1 = -p.x * sinY + p.z * cosY;
        let y1 = p.y;

        let cosX = Math.cos(rx), sinX = Math.sin(rx);
        let y2 = y1 * cosX - z1 * sinX;
        let z2 = y1 * sinX + z1 * cosX;
        let x2 = x1;

        let cosZ = Math.cos(rz), sinZ = Math.sin(rz);
        let x3 = x2 * cosZ - y2 * sinZ;
        let y3 = x2 * sinZ + y2 * cosZ;
        let z3 = z2;

        return { x: x3, y: y3, z: z3 };
      }

      project(p3d) {
        const fov = 260;
        const distance = 180;
        const scale = fov / (distance + p3d.z);
        return {
          x: this.centerX + p3d.x * scale,
          y: this.centerY + p3d.y * scale,
          scale: scale,
          z: p3d.z
        };
      }

      animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.speechIntensity += (this.targetIntensity - this.speechIntensity) * 0.12;
        this.angleY += 0.014 + this.speechIntensity * 0.025;
        this.angleX += (this.targetRotX - this.angleX) * 0.08;
        this.angleZ = Math.sin(this.angleY * 0.5) * 0.1;

        const pulse = Math.sin(Date.now() * 0.003) * 0.06 + (this.isSpeaking ? Math.sin(Date.now() * 0.02) * 0.22 : 0);
        const dynamicScale = 1.0 + pulse;

        // 1. Grade Holográfica de Fundo (Perspectiva 3D)
        this.drawHoloGrid();

        // 2. Anéis Orbitais Concêntricos 3D (Giroscópio Tecnológico)
        this.drawOrbitalRings(dynamicScale);

        // 3. Ondas Sonoras Radiais Reativas (Equalizador Holográfico)
        this.drawAudioRipples();

        // 4. Geometria 3D do Núcleo Quântico
        this.drawCorePolyhedron(dynamicScale);

        // 5. Enxame de Partículas 3D em Órbita
        this.drawParticles();

        // 6. Silhueta Estilizada do Mordomo / Monograma Central
        this.drawButlerCoreIcon(dynamicScale);

        requestAnimationFrame(this.animate);
      }

      drawHoloGrid() {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(197, 168, 105, 0.06)";
        ctx.lineWidth = 1;
        const yBase = this.height - 25;
        for (let i = -5; i <= 5; i++) {
          ctx.beginPath();
          ctx.moveTo(this.centerX + i * 28, yBase);
          ctx.lineTo(this.centerX + i * 5, this.centerY + 55);
          ctx.stroke();
        }
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          const y = yBase - j * 8;
          ctx.ellipse(this.centerX, y, 70 + j * 12, 10 + j * 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      drawOrbitalRings(dynScale) {
        const ctx = this.ctx;
        ctx.save();

        // Anel Externo 1 (Dourado Nobre)
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.centerY, 74 * dynScale, 26 * dynScale, this.angleY * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = this.isSpeaking ? "rgba(197, 168, 105, 0.85)" : "rgba(197, 168, 105, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#C5A869";
        ctx.shadowBlur = this.isSpeaking ? 14 : 6;
        ctx.stroke();

        // Anel Intermediário 2 (Ciano Tecnológico / Frequência)
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.centerY, 58 * dynScale, 20 * dynScale, -this.angleY * 0.9 + 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = this.isSpeaking ? "rgba(0, 229, 255, 0.9)" : "rgba(0, 229, 255, 0.35)";
        ctx.lineWidth = 1.2;
        ctx.shadowColor = "#00E5FF";
        ctx.shadowBlur = this.isSpeaking ? 16 : 4;
        ctx.stroke();

        // Anel Interno 3 (Ouro Brilhante Rápido)
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.centerY, 44 * dynScale, 15 * dynScale, this.angleY * 1.3 - 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(232, 213, 163, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      drawAudioRipples() {
        if (this.speechIntensity <= 0.05) return;
        const ctx = this.ctx;
        ctx.save();
        const bars = 28;
        const baseRadius = 38;
        for (let i = 0; i < bars; i++) {
          const ang = (i / bars) * Math.PI * 2;
          const wave = Math.sin(Date.now() * 0.015 + i * 0.6) * 14 * this.speechIntensity;
          const r1 = baseRadius;
          const r2 = baseRadius + Math.max(3, wave);

          const x1 = this.centerX + Math.cos(ang) * r1;
          const y1 = this.centerY + Math.sin(ang) * (r1 * 0.6);
          const x2 = this.centerX + Math.cos(ang) * r2;
          const y2 = this.centerY + Math.sin(ang) * (r2 * 0.6);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = i % 2 === 0 ? "rgba(197, 168, 105, 0.8)" : "rgba(0, 229, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#C5A869";
          ctx.shadowBlur = 8;
          ctx.stroke();
        }
        ctx.restore();
      }

      drawCorePolyhedron(dynScale) {
        const ctx = this.ctx;
        const projNodes = this.nodes.map(node => {
          const scaled = { x: node.x * dynScale, y: node.y * dynScale, z: node.z * dynScale };
          const rot = this.rotate(scaled, this.angleX, this.angleY, this.angleZ);
          return this.project(rot);
        });

        // Desenha Arestas
        ctx.save();
        ctx.lineWidth = 1.2;
        this.edges.forEach(([i, j]) => {
          const p1 = projNodes[i];
          const p2 = projNodes[j];
          const avgZ = (p1.z + p2.z) / 2;
          const alpha = Math.max(0.15, Math.min(0.9, (avgZ + 50) / 100));

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(197, 168, 105, ${alpha * (this.isSpeaking ? 1 : 0.65)})`;
          ctx.shadowColor = "#C5A869";
          ctx.shadowBlur = this.isSpeaking ? 8 : 2;
          ctx.stroke();
        });

        // Desenha Vértices
        projNodes.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, 2.5 * p.scale), 0, Math.PI * 2);
          ctx.fillStyle = this.isSpeaking ? "#00E5FF" : "#E8D5A3";
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 6;
          ctx.fill();
        });
        ctx.restore();
      }

      drawParticles() {
        const ctx = this.ctx;
        ctx.save();
        this.particles.forEach(pt => {
          pt.theta += pt.speedTheta * (this.isSpeaking ? 1.8 : 1.0);
          pt.phi += pt.speedPhi;

          const x = pt.radius * Math.cos(pt.phi) * Math.cos(pt.theta);
          const y = pt.radius * Math.sin(pt.phi);
          const z = pt.radius * Math.cos(pt.phi) * Math.sin(pt.theta);

          const rot = this.rotate({x, y, z}, this.angleX, this.angleY, this.angleZ);
          const proj = this.project(rot);

          ctx.beginPath();
          ctx.arc(proj.x, proj.y, pt.size * proj.scale, 0, Math.PI * 2);
          ctx.fillStyle = pt.color;
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 6;
          ctx.fill();
        });
        ctx.restore();
      }

      drawButlerCoreIcon(dynScale) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.centerX, this.centerY);

        // Brilho Central Quântico
        const radGrd = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * dynScale);
        radGrd.addColorStop(0, this.isSpeaking ? "rgba(255, 215, 0, 0.7)" : "rgba(197, 168, 105, 0.4)");
        radGrd.addColorStop(0.6, "rgba(0, 229, 255, 0.15)");
        radGrd.addColorStop(1, "transparent");
        ctx.fillStyle = radGrd;
        ctx.beginPath();
        ctx.arc(0, 0, 22 * dynScale, 0, Math.PI * 2);
        ctx.fill();

        // Silhueta Estilizada do Mordomo (Terno / Gravata Borboleta e Monóculo Tecnológico)
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "#C5A869";
        ctx.shadowBlur = 10;

        // Colarinho / Gravata
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(6, -2);
        ctx.lineTo(0, 5);
        ctx.closePath();
        ctx.fillStyle = "#C5A869";
        ctx.fill();
        ctx.stroke();

        // Monóculo Cibernético Brilhante
        ctx.beginPath();
        ctx.arc(4, -8, 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#00E5FF";
        ctx.lineWidth = 1.4;
        ctx.shadowColor = "#00E5FF";
        ctx.shadowBlur = this.isSpeaking ? 12 : 5;
        ctx.stroke();

        // Ponto de Foco Neural do Monóculo
        ctx.beginPath();
        ctx.arc(4, -8, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        ctx.restore();
      }
    }

    // Inicializa Holograma 3D
    let alfred3D = null;
    window.addEventListener("DOMContentLoaded", () => {
      alfred3D = new Alfred3DHologram("alfredCanvas3D");
      window.alfred3D = alfred3D;
    });

    // ============================================================
    // MOTOR DE VOZ DO MORDOMO DO BATMAN (ALFRED PENNYWORTH)
    // ============================================================
    let availableVoices = [];
    let chosenVoice = null;

    function loadButlerVoices() {
      if (!window.speechSynthesis) return;
      availableVoices = window.speechSynthesis.getVoices();
      
      // Prioridade 1: Vozes masculinas nobres em português (Antonio, Daniel, etc.)
      chosenVoice = availableVoices.find(v => 
        (v.name.includes('Antonio') || v.name.includes('Daniel') || v.name.includes('Felipe') || (v.lang.startsWith('pt') && v.name.includes('Male')))
      ) || availableVoices.find(v => v.lang.startsWith('pt')) || availableVoices[0];
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadButlerVoices;
      loadButlerVoices();
    }

    function speak(txt) {
      try {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        let clean = txt.replace(/[*_#`\[\]()]/g, " ").replace(/<[^>]*>/g, " ").trim();
        if (!clean) return;

        const style = document.getElementById("voiceStyleSelect") ? document.getElementById("voiceStyleSelect").value : "batman_butler";
        const u = new SpeechSynthesisUtterance();

        if (style === "british_gentleman") {
          const britishVoice = availableVoices.find(v => v.lang === 'en-GB' || v.name.includes('United Kingdom') || v.name.includes('George') || v.name.includes('Ryan')) || chosenVoice;
          if (britishVoice) u.voice = britishVoice;
          u.lang = "en-GB";
          u.rate = 0.88; // Cadência pausada britânica
          u.pitch = 0.82; // Tom grave e calmo
          u.text = clean;
        } else if (style === "cyber_butler") {
          if (chosenVoice) u.voice = chosenVoice;
          u.lang = "pt-BR";
          u.rate = 0.95;
          u.pitch = 0.78;
          u.text = clean;
        } else {
          // Mordomo Clássico do Batman (Português Aristocrático)
          const ptMale = availableVoices.find(v => (v.lang.startsWith('pt') && (v.name.includes('Antonio') || v.name.includes('Daniel') || v.name.includes('Male')))) || chosenVoice;
          if (ptMale) u.voice = ptMale;
          u.lang = "pt-BR";
          u.rate = 0.90; // Cadência formal e sóbria
          u.pitch = 0.84; // Timbre grave e distinto
          u.text = clean;
        }

        u.onstart = () => {
          if (window.alfred3D) window.alfred3D.setSpeaking(true);
        };

        u.onend = () => {
          if (window.alfred3D) window.alfred3D.setSpeaking(false);
        };

        u.onerror = () => {
          if (window.alfred3D) window.alfred3D.setSpeaking(false);
        };

        window.speechSynthesis.speak(u);
      } catch(e) {
        console.error("Erro na síntese de voz de Alfred:", e);
      }
    }

    function testButlerVoice() {
      const phrases = [
        "Sim, Chefe Mourato. Às suas ordens para a condução executiva.",
        "Perfeitamente, Chefe Mourato. Todos os balanços e certidões estão sob rigorosa vigilância.",
        "Com sua permissão, Chefe Mourato. A estrutura da Teia de Aranha permanece operando em máxima conformidade.",
        "Tomei a liberdade de revisar o laudo pericial, Chefe Mourato. Nenhum detalhe escapa à minha análise."
      ];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      speak(phrase);
    }

    // ============================================================
    // CHAT & DISPATCH HANDLERS
    // ============================================================
    const chatFeed = document.getElementById("chatFeed");
    const input = document.getElementById("cmdInput");
    const btnSend = document.getElementById("btnSend");
    const btnVoice = document.getElementById("btnVoice");
    const dropzone = document.getElementById("dropzone");

    // DRAG AND DROP HANDLERS
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }, false);
    });
    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }, false);
    });
    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) uploadAndAuditPDF(files[0]);
    });

    function handleFileSelect(e) {
      if (e.target.files && e.target.files.length > 0) {
        uploadAndAuditPDF(e.target.files[0]);
      }
    }

    async function uploadAndAuditPDF(file) {
      addMsg(`📄 <i>Enviando e auditando arquivo pericial: <b>${file.name}</b>...</i>`, "user");
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/audit-pdf", {
          method: "POST",
          body: formData
        });
        const rep = await res.json();
        if (!rep.success) {
          addMsg(`❌ <b>Falha na Perícia:</b> ${rep.error}`, "alfred");
          return;
        }

        let findingsHtml = rep.findings.map(f => `
          <div class="finding-item finding-${f.tipo}">
            <b>[${f.tipo}] ${f.modulo}:</b> ${f.detalhe}
          </div>
        `).join("");

        let cardHtml = `
          <div class="audit-card">
            <div class="audit-header">
              <div>
                <b>LAUDO PERICIAL: ${rep.filename}</b>
                <div style="font-size: 0.7rem; color: #94A3B8;">Tipo Detectado: <b>${rep.doc_type}</b> • Páginas: ${rep.page_count}</div>
              </div>
              <div>
                <span class="badge-status badge-${rep.status}">${rep.status} • SCORE ${rep.score}/100</span>
              </div>
            </div>
            <div style="margin-bottom: 8px;">${findingsHtml || '<div style="color: #6EE7B7; font-size: 0.75rem;">Nenhuma inconsistência pericial detectada.</div>'}</div>
            <div style="border-top: 1px solid rgba(197,168,105,0.2); padding-top: 8px; font-size: 0.78rem; color: #E2E8F0;">
              <b>PARECER EXECUTIVO DO CIO ALFRED:</b><br>
              ${rep.executive_verdict.replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
        addMsg(cardHtml, "alfred");
        speak(`Auditoria pericial concluída para o documento ${rep.filename}, Chefe Mourato. Status: ${rep.status}, Score: ${rep.score} de 100.`);
      } catch(err) {
        addMsg(`❌ Erro no upload: ${err.message}`, "alfred");
      }
    }

    // MICA RADAR
    async function openMicaRadar() {
      document.getElementById("micaModal").style.display = "flex";
      const body = document.getElementById("micaModalBody");
      body.innerHTML = "<div style='text-align: center; color: #C5A869; padding: 20px;'>👩‍💼 Secretária Mica consultando certidões da Teia...</div>";

      try {
        const res = await fetch("/api/mica/radar");
        const data = await res.json();
        
        let html = `
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div class="sat-card" style="flex: 1; text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 800; color: #34D399;">${data.totals.certidoes_regulares}</div>
              <div style="font-size: 0.7rem; color: #94A3B8;">Certidões Regulares</div>
            </div>
            <div class="sat-card" style="flex: 1; text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 800; color: #FBBF24;">${data.totals.certidoes_alerta}</div>
              <div style="font-size: 0.7rem; color: #94A3B8;">Vencendo em breve</div>
            </div>
            <div class="sat-card" style="flex: 1; text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 800; color: #F87171;">${data.totals.certidoes_vencidas}</div>
              <div style="font-size: 0.7rem; color: #94A3B8;">Vencidas / Expiradas</div>
            </div>
            <div class="sat-card" style="flex: 1; text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 800; color: #94A3B8;">${data.totals.certidoes_pendentes}</div>
              <div style="font-size: 0.7rem; color: #94A3B8;">A Coletar (75/25)</div>
            </div>
          </div>
          <table class="radar-table">
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th>TIPO</th>
                <th>DOC</th>
                <th>CND FEDERAL (180d)</th>
                <th>FGTS (30d)</th>
                <th>CNDT (180d)</th>
              </tr>
            </thead>
            <tbody>
        `;

        const allClients = [...data.pj_clients, ...data.pf_clients];
        allClients.forEach(c => {
          const fed = c.certidoes.find(x => x.tipo.includes("Federal")) || {status: "PENDENTE"};
          const fgts = c.certidoes.find(x => x.tipo.includes("FGTS")) || {status: "PENDENTE"};
          const cndt = c.certidoes.find(x => x.tipo.includes("CNDT")) || {status: "PENDENTE"};

          html += `
            <tr>
              <td><b>${c.razao_social || c.nome_completo || c.nome}</b></td>
              <td>${c.tipo}</td>
              <td>${c.cnpj || c.cpf || 'N/A'}</td>
              <td><span class="badge-status badge-${fed.status}">${fed.status}</span></td>
              <td><span class="badge-status badge-${fgts.status}">${fgts.status}</span></td>
              <td><span class="badge-status badge-${cndt.status}">${cndt.status}</span></td>
            </tr>
          `;
        });

        html += `</tbody></table>`;
        body.innerHTML = html;
      } catch(err) {
        body.innerHTML = `<div style="color: #F87171;">Erro ao carregar radar: ${err.message}</div>`;
      }
    }

    function closeMicaRadar() {
      document.getElementById("micaModal").style.display = "none";
    }

    function openDossierModal() {
      document.getElementById("dossierModal").style.display = "flex";
    }
    function closeDossierModal() {
      document.getElementById("dossierModal").style.display = "none";
    }

    async function submitDossier() {
      const tipo = document.getElementById("dosTipo").value;
      const nome = document.getElementById("dosNome").value;
      const doc = document.getElementById("dosDoc").value;
      if (!nome || !doc) {
        alert("Preencha o nome e o documento.");
        return;
      }
      closeDossierModal();
      addMsg(`📜 <i>Gerando Dossiê Oficial 75/25 para <b>${nome}</b> (${doc})...</i>`, "user");

      try {
        const res = await fetch("/api/generate-dossier", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({client_name: nome, doc_id: doc, tipo: tipo})
        });
        const rep = await res.json();
        if (rep.success) {
          addMsg(`🛡️ <b>[DOSSIÊ MOURATO GERADO]:</b> Arquivo salvo com sucesso!<br><b>Caminho:</b> <code>${rep.pdf_path}</code><br>Tamanho: ${(rep.size/1024).toFixed(1)} KB • Brasão e Marca d'Água 5.5% aplicados.`, "alfred");
          speak("Dossiê gerado com sucesso sob o padrão Mourato com marca d'água oficial, Chefe Mourato.");
        } else {
          addMsg(`❌ Erro ao gerar dossiê: ${rep.error}`, "alfred");
        }
      } catch(e) {
        addMsg(`❌ Erro: ${e.message}`, "alfred");
      }
    }

    // CHAT & COMMAND DISPATCH
    function addMsg(content, sender) {
      const d = document.createElement("div");
      d.className = `msg msg-${sender}`;
      d.innerHTML = content;
      chatFeed.appendChild(d);
      chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    async function sendCommand(text) {
      if (!text || !text.trim()) return;
      addMsg(text, "user");
      input.value = "";

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({prompt: text})
        });
        const d = await res.json();
        addMsg(`[${d.engine}]<br>${d.response.replace(/\n/g, '<br>')}`, "alfred");
        speak(d.response.substring(0, 220));
      } catch(err) {
        addMsg("Erro: " + err.message, "alfred");
      }
    }

    async function quickSearch() {
      const q = document.getElementById("sideSearch").value;
      if (!q) return;
      addMsg(`🕷️ <i>Teia de Aranha pesquisando: <b>${q}</b>...</i>`, "user");
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({query: q})
        });
        const d = await res.json();
        if (d.results && d.results.length > 0) {
          let out = `<b>Resultados localizados na Teia (${d.count}):</b><br>`;
          d.results.forEach(r => {
            out += `• <b>${r.tipo}: ${r.nome}</b> | Doc: ${r.identificador} | Pasta: <code>${r.pasta}</code><br>`;
          });
          addMsg(out, "alfred");
          speak(`Localizados ${d.count} registros na base pericial da Teia, Chefe Mourato.`);
        } else {
          addMsg(`Nenhum registro localizado na Teia para: "${q}".`, "alfred");
        }
      } catch(e) {
        addMsg(`Erro na busca: ${e.message}`, "alfred");
      }
    }

    btnSend.addEventListener("click", () => sendCommand(input.value));
    input.addEventListener("keydown", (e) => { if(e.key === "Enter") sendCommand(input.value); });

    // RECONHECIMENTO DE VOZ
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = false;
      btnVoice.addEventListener("click", () => {
        if(btnVoice.classList.contains("listening")) {
          rec.stop();
          btnVoice.classList.remove("listening");
        } else {
          btnVoice.classList.add("listening");
          rec.start();
        }
      });
      rec.onresult = (e) => {
        btnVoice.classList.remove("listening");
        let val = e.results[0][0].transcript;
        val = val.replace(/alfr[eé]de?/gi, "Alfred").replace(/mika/gi, "Mica");
        input.value = val;
        sendCommand(val);
      };
      rec.onerror = () => btnVoice.classList.remove("listening");
    }
  </script>
</body>
</html>"""

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:9000")

if __name__ == "__main__":
    print("="*60)
    print("        INICIANDO SERVIDOR EXECUTÁVEL ALFRED 2.5")
    print("            100% de Autoridade Executiva - Porta: 9000")
    print("="*60)
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=9000)
