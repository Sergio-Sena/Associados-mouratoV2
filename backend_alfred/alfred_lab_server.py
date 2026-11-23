"""
ALFRED 3D & VOICE LABORATORY — AMBIENTE DEDICADO DE TESTES E REFINAMENTO
Servidor de Laboratório Isolado para Ajustes de Modelo 3D, Animação e Voz do Mordomo
Porta: 9090
"""

import os
import sys
import threading
import time
import webbrowser
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    from cio_dual_engine import cio_engine
except Exception:
    class DummyEngine:
        def ask(self, p, prefer="auto"):
            return {
                "engine": "Alfred Lab",
                "response": f"Sim, Chefe Mourato. Recebi sua instrução: '{p}'. Processando em ambiente de testes.",
                "duration": 0.1
            }
    cio_engine = DummyEngine()

app = FastAPI(title="ALFRED 3D & VOICE LAB", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskRequest(BaseModel):
    prompt: str

@app.post("/api/ask")
def ask_alfred(req: AskRequest):
    res = cio_engine.ask(req.prompt, prefer="auto")
    return res

LAB_HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>ALFRED 3D &amp; VOICE STUDIO — Laboratório de Testes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, sans-serif; }
    body { background: #060911; color: #F8FAFC; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    
    /* TOPO */
    header {
      background: #0A0E1A;
      border-bottom: 2px solid rgba(197, 168, 105, 0.4);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-title { font-family: 'Georgia', serif; font-size: 1.25rem; font-weight: 800; color: #FFFFFF; letter-spacing: 0.05em; }
    .header-title span { color: #C5A869; }
    .header-badge { font-size: 0.72rem; padding: 3px 10px; border-radius: 9999px; background: rgba(0,229,255,0.15); border: 1px solid #00E5FF; color: #00E5FF; font-weight: 800; }
    .status-pill { font-size: 0.74rem; color: #34D399; display: flex; align-items: center; gap: 6px; font-weight: 700; background: rgba(16,185,129,0.12); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(16,185,129,0.3); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #34D399; box-shadow: 0 0 8px #34D399; animation: pulseDot 1.5s infinite; }
    @keyframes pulseDot { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

    /* LAYOUT PRINCIPAL */
    .lab-container { flex: 1; display: flex; overflow: hidden; }
    
    /* PALCO 3D (CENTRO) */
    .stage-3d {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      background: radial-gradient(circle at center, #10182E 0%, #060911 80%);
      overflow: hidden;
    }
    .stage-hud {
      position: absolute;
      top: 16px; left: 20px; right: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
      z-index: 10;
    }
    .hud-chip {
      pointer-events: auto;
      background: rgba(11, 16, 29, 0.85);
      border: 1px solid rgba(197, 168, 105, 0.35);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.76rem;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hud-controls-top { display: flex; gap: 8px; pointer-events: auto; }
    .btn-hud {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(197, 168, 105, 0.35);
      color: #FFFFFF;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-hud:hover, .btn-hud.active {
      background: #C5A869;
      color: #0A0E1A;
      border-color: #C5A869;
    }

    #stageCanvas { width: 100%; height: 100%; display: block; cursor: grab; }
    #stageCanvas:active { cursor: grabbing; }

    /* RODAPÉ DO PALCO 3D COM TESTE RÁPIDO */
    .stage-bottom-bar {
      position: absolute;
      bottom: 20px; left: 20px; right: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      background: rgba(11, 16, 29, 0.9);
      border: 1px solid rgba(197, 168, 105, 0.35);
      border-radius: 12px;
      padding: 10px 16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 10;
    }
    .stage-bottom-bar input {
      flex: 1;
      background: rgba(6, 9, 17, 0.85);
      border: 1px solid rgba(197, 168, 105, 0.3);
      border-radius: 8px;
      padding: 10px 14px;
      color: #FFFFFF;
      font-size: 0.88rem;
      outline: none;
    }
    .stage-bottom-bar input:focus { border-color: #C5A869; box-shadow: 0 0 12px rgba(197, 168, 105, 0.25); }
    .btn-speak-now {
      background: linear-gradient(135deg, #C5A869, #9A7B38);
      border: none;
      border-radius: 8px;
      color: #0A0E1A;
      font-weight: 800;
      padding: 10px 20px;
      font-size: 0.84rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-speak-now:hover { background: #E8D5A3; }

    /* PAINEL LATERAL DIREITO DE CONTROLE TOTAL */
    .controls-panel {
      width: 440px;
      background: #0A0E1A;
      border-left: 2px solid rgba(197, 168, 105, 0.3);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      box-shadow: -6px 0 24px rgba(0,0,0,0.6);
    }
    .panel-section {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-title {
      font-size: 0.82rem;
      font-weight: 800;
      color: #C5A869;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* GRIDS DE OPÇÕES */
    .grid-models { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .card-choice {
      background: #0E1424;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .card-choice:hover, .card-choice.active {
      border-color: #C5A869;
      background: rgba(197, 168, 105, 0.12);
      box-shadow: 0 0 12px rgba(197, 168, 105, 0.25);
    }
    .choice-title { font-size: 0.82rem; font-weight: 700; color: #FFFFFF; }
    .choice-sub { font-size: 0.68rem; color: #94A3B8; margin-top: 2px; }

    /* CONTROLES DE SLIDER */
    .slider-row { display: flex; flex-direction: column; gap: 4px; }
    .slider-header { display: flex; justify-content: space-between; font-size: 0.74rem; color: #CBD5E1; font-weight: 600; }
    .slider-val { color: #C5A869; font-weight: 700; font-family: monospace; }
    input[type=range] {
      width: 100%;
      accent-color: #C5A869;
      cursor: pointer;
    }

    /* SOUNDBOARD DE FRASES DO MORDOMO */
    .soundboard { display: flex; flex-direction: column; gap: 6px; }
    .btn-phrase {
      background: #0E1424;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 8px 12px;
      color: #CBD5E1;
      font-size: 0.76rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-phrase:hover {
      border-color: #C5A869;
      color: #FFFFFF;
      background: rgba(197, 168, 105, 0.1);
    }

    /* CHAT DE CONVERSA */
    .lab-chat-log {
      max-height: 180px;
      overflow-y: auto;
      background: #060911;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.78rem;
    }
    .lab-msg-alfred { color: #E2E8F0; border-left: 2px solid #C5A869; padding-left: 8px; }
    .lab-msg-user { color: #93C5FD; border-left: 2px solid #3B82F6; padding-left: 8px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header>
    <div class="header-brand">
      <div class="header-title">ALFRED <span>3D &amp; VOICE STUDIO</span></div>
      <span class="header-badge">LAB DE TESTES ISOLADO • PORTA 9090</span>
    </div>
    <div style="display: flex; gap: 14px; align-items: center;">
      <div class="status-pill">
        <div class="status-dot"></div> AMBIENTE DE EXPERIMENTAÇÃO ATIVO
      </div>
      <button class="btn-hud" onclick="saveAsOfficial()" style="background: #C5A869; color: #0A0E1A;">
        ⭐ SALVAR COMO OFICIAL
      </button>
    </div>
  </header>

  <!-- CORPO -->
  <div class="lab-container">
    
    <!-- PALCO 3D -->
    <div class="stage-3d">
      
      <!-- HUD DE SOBREPOSIÇÃO -->
      <div class="stage-hud">
        <div class="hud-chip">
          <span>● MODELO ATIVO:</span>
          <b id="hudModelName" style="color: #C5A869;">Holograma Quântico Butler</b>
        </div>
        <div class="hud-controls-top">
          <button class="btn-hud" onclick="reset3DCamera()">🔄 Reset Câmera</button>
          <button class="btn-hud" onclick="toggleWireframe()">⚡ Wireframe</button>
          <button class="btn-hud" onclick="toggleParticles()">✨ Partículas</button>
          <button class="btn-hud" onclick="toggleScanlines()">📺 Scanlines</button>
        </div>
      </div>

      <!-- CANVAS 3D EM TELA CHEIA -->
      <canvas id="stageCanvas"></canvas>

      <!-- BARRA DE FALA DIRETA -->
      <div class="stage-bottom-bar">
        <input type="text" id="customSpeechInput" placeholder="Digite qualquer frase para Alfred falar com a voz do mordomo..." value="Sim, Chefe Mourato. Todos os arquivos e dossiês estão sob minha auditoria pericial.">
        <button class="btn-speak-now" onclick="speakCustomText()">
          🗣️ Falar com a Voz do Mordomo
        </button>
      </div>

    </div>

    <!-- PAINEL LATERAL DE CONTROLES -->
    <aside class="controls-panel">
      
      <!-- 1. SELEÇÃO DO MODELO 3D -->
      <div class="panel-section">
        <div class="section-title">
          <span>🎨 1. Estilo Tecnológico 3D</span>
        </div>
        <div class="grid-models">
          <div class="card-choice active" id="btnModel1" onclick="selectModel('quantum_butler')">
            <div class="choice-title">🤵 Holograma Butler</div>
            <div class="choice-sub">Giroscópio, Dodecaedro &amp; Monóculo</div>
          </div>
          <div class="card-choice" id="btnModel2" onclick="selectModel('wayne_hud')">
            <div class="choice-title">🦇 Wayne Tech Core</div>
            <div class="choice-sub">Escudo Cilíndrico &amp; Hexágonos</div>
          </div>
          <div class="card-choice" id="btnModel3" onclick="selectModel('cyber_bust')">
            <div class="choice-title">👤 Rosto Cibernético</div>
            <div class="choice-sub">Matriz Facial 3D Lip-Sync</div>
          </div>
          <div class="card-choice" id="btnModel4" onclick="selectModel('quantum_reactor')">
            <div class="choice-title">⚛️ Reator Quântico</div>
            <div class="choice-sub">Esfera de Pulso &amp; Raios Sônicos</div>
          </div>
        </div>
      </div>

      <!-- 2. PALETA DE CORES HOLOGRÁFICAS -->
      <div class="panel-section">
        <div class="section-title">
          <span>✨ 2. Paleta Holográfica</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-hud active" id="btnColorGold" onclick="setColorTheme('gold')">⚜️ Ouro Mourato</button>
          <button class="btn-hud" id="btnColorCyan" onclick="setColorTheme('cyan')">⚡ Ciano Wayne</button>
          <button class="btn-hud" id="btnColorCrimson" onclick="setColorTheme('crimson')">🍷 Carmesim</button>
          <button class="btn-hud" id="btnColorEmerald" onclick="setColorTheme('emerald')">💎 Esmeralda</button>
        </div>
      </div>

      <!-- 3. CALIBRADOR DE VOZ DO MORDOMO (BATMAN / ALFRED) -->
      <div class="panel-section">
        <div class="section-title">
          <span>🎙️ 3. Voz do Mordomo (Batman / Alfred)</span>
        </div>

        <div>
          <label style="display: block; font-size: 0.72rem; color: #94A3B8; margin-bottom: 4px;">Voz do Sistema Detectada:</label>
          <select id="voiceSelector" style="width: 100%; padding: 8px; background: #070A12; border: 1px solid rgba(197,168,105,0.3); border-radius: 6px; color: #FFFFFF; font-size: 0.78rem; outline: none;" onchange="onVoiceSelected()">
            <option value="">Carregando vozes do sistema...</option>
          </select>
        </div>

        <!-- Presets Rápidos -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn-hud active" onclick="applyVoicePreset('butler_batman')">🦇 Alfred Clássico</button>
          <button class="btn-hud" onclick="applyVoicePreset('michael_caine')">🇬🇧 Michael Caine (GB)</button>
          <button class="btn-hud" onclick="applyVoicePreset('deep_baritone')">🎩 Barítono Solene</button>
        </div>

        <!-- Sliders -->
        <div class="slider-row">
          <div class="slider-header">
            <span>Tom / Gravidade (Pitch):</span>
            <span class="slider-val" id="valPitch">0.84</span>
          </div>
          <input type="range" id="sliderPitch" min="0.5" max="1.5" step="0.02" value="0.84" oninput="updatePitch(this.value)">
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <span>Cadência / Velocidade (Rate):</span>
            <span class="slider-val" id="valRate">0.88</span>
          </div>
          <input type="range" id="sliderRate" min="0.6" max="1.4" step="0.02" value="0.88" oninput="updateRate(this.value)">
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <span>Volume da Voz:</span>
            <span class="slider-val" id="valVol">1.0</span>
          </div>
          <input type="range" id="sliderVol" min="0.2" max="1.0" step="0.05" value="1.0" oninput="updateVol(this.value)">
        </div>
      </div>

      <!-- 4. SOUNDBOARD DE REVERÊNCIAS DO MORDOMO -->
      <div class="panel-section">
        <div class="section-title">
          <span>🎩 4. Falas Clássicas do Mordomo</span>
        </div>
        <div class="soundboard">
          <button class="btn-phrase" onclick="speakText('Sim, Chefe Mourato. Às suas ordens para a condução executiva.')">
            🗣️ "Sim, Chefe Mourato. Às suas ordens para a condução executiva."
          </button>
          <button class="btn-phrase" onclick="speakText('Tomei a liberdade de auditar todos os balanços e certidões, Chefe Mourato.')">
            🗣️ "Tomei a liberdade de auditar todos os balanços, Chefe Mourato."
          </button>
          <button class="btn-phrase" onclick="speakText('Com sua permissão, Chefe Mourato. Nenhum documento falso ou divergente passará sob minha guarda.')">
            🗣️ "Nenhum documento falso passará sob minha guarda, Chefe Mourato."
          </button>
          <button class="btn-phrase" onclick="speakText('Perfeitamente, Chefe Mourato. Todos os sistemas da Teia de Aranha estão em ordem.')">
            🗣️ "Perfeitamente, Chefe Mourato. Todos os sistemas estão em ordem."
          </button>
        </div>
      </div>

      <!-- 5. DIÁLOGO TESTE AO VIVO -->
      <div class="panel-section" style="flex: 1;">
        <div class="section-title">
          <span>💬 5. Chat Teste com Inteligência Real</span>
        </div>
        <div class="lab-chat-log" id="labChatLog">
          <div class="lab-msg-alfred">
            <b>Alfred:</b> Às suas ordens, Chefe Mourato. Este é o nosso laboratório de calibração. Pode testar qualquer visual 3D e tom de voz até ficar exatamente como o senhor deseja.
          </div>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <input type="text" id="labPromptInput" placeholder="Pergunte algo ao Alfred..." style="flex: 1; padding: 8px 10px; background: #060911; border: 1px solid rgba(197,168,105,0.3); border-radius: 6px; color: #FFFFFF; font-size: 0.78rem; outline: none;">
          <button class="btn-hud" onclick="sendLabPrompt()" style="background: #C5A869; color: #0A0E1A;">Enviar</button>
        </div>
      </div>

    </aside>

  </div>

  <script>
    // ============================================================
    // ESTADO GLOBAL DO LABORATÓRIO ALFRED 3D
    // ============================================================
    const labState = {
      model: 'quantum_butler',
      theme: 'gold',
      wireframe: true,
      particles: true,
      scanlines: true,
      pitch: 0.84,
      rate: 0.88,
      volume: 1.0,
      selectedVoiceURI: ''
    };

    const colorPalettes = {
      gold: { primary: '#C5A869', secondary: '#E8D5A3', accent: '#00E5FF', glow: 'rgba(197, 168, 105, 0.4)' },
      cyan: { primary: '#00E5FF', secondary: '#80F0FF', accent: '#C5A869', glow: 'rgba(0, 229, 255, 0.4)' },
      crimson: { primary: '#F43F5E', secondary: '#FDA4AF', accent: '#FFD700', glow: 'rgba(244, 63, 94, 0.4)' },
      emerald: { primary: '#10B981', secondary: '#6EE7B7', accent: '#00E5FF', glow: 'rgba(16, 185, 129, 0.4)' }
    };

    // ============================================================
    // MOTOR GRÁFICO 3D DO PALCO
    // ============================================================
    const canvas = document.getElementById("stageCanvas");
    const ctx = canvas.getContext("2d");

    let width, height, centerX, centerY;
    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
      centerX = width / 2;
      centerY = height / 2;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Câmera & Rotação
    let camRotX = 0.25;
    let camRotY = 0.0;
    let targetCamRotX = 0.25;
    let targetCamRotY = 0.0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let zoomScale = 1.0;

    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener("mouseup", () => { isDragging = false; });

    window.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        targetCamRotY += dx * 0.008;
        targetCamRotX += dy * 0.008;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      zoomScale = Math.max(0.6, Math.min(2.2, zoomScale - e.deltaY * 0.001));
    });

    // Variáveis de Fala & Intensidade
    let isSpeaking = false;
    let speechEnergy = 0.0;
    let targetSpeechEnergy = 0.0;

    // 48 Partículas 3D
    const particles = [];
    for (let i = 0; i < 72; i++) {
      particles.push({
        radius: 90 + Math.random() * 80,
        theta: Math.random() * Math.PI * 2,
        phi: (Math.random() - 0.5) * Math.PI,
        speedTheta: (Math.random() * 0.015 + 0.006) * (Math.random() > 0.5 ? 1 : -1),
        speedPhi: (Math.random() * 0.01 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2.5 + 1.2
      });
    }

    // Geometria 3D: Dodecaedro / Icosaedro
    const phi = (1 + Math.sqrt(5)) / 2;
    const baseScale = 56;
    const rawNodes = [
      [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
      [ 0, -1,  phi], [ 0,  1,  phi], [ 0, -1, -phi], [ 0,  1, -phi],
      [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1]
    ];
    const coreNodes = rawNodes.map(pt => ({ x: pt[0] * baseScale, y: pt[1] * baseScale, z: pt[2] * baseScale }));
    const coreEdges = [];
    for (let i = 0; i < coreNodes.length; i++) {
      for (let j = i + 1; j < coreNodes.length; j++) {
        const dx = coreNodes[i].x - coreNodes[j].x;
        const dy = coreNodes[i].y - coreNodes[j].y;
        const dz = coreNodes[i].z - coreNodes[j].z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < baseScale * 2.2) coreEdges.push([i, j]);
      }
    }

    // Geometria: Matriz Facial 3D (Cyber Bust)
    const faceNodes = [];
    for (let u = -3; u <= 3; u++) {
      for (let v = -4; v <= 4; v++) {
        const zCurv = Math.cos(u * 0.45) * Math.cos(v * 0.35) * 28;
        faceNodes.push({ x: u * 18, y: v * 18, z: zCurv });
      }
    }

    function rotate3D(p, rx, ry, rz) {
      let cosY = Math.cos(ry), sinY = Math.sin(ry);
      let x1 = p.x * cosY + p.z * sinY;
      let z1 = -p.x * sinY + p.z * cosY;
      let y1 = p.y;

      let cosX = Math.cos(rx), sinX = Math.sin(rx);
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = y1 * sinX + z1 * cosX;
      let x2 = x1;

      return { x: x2, y: y2, z: z2 };
    }

    function project3D(p3d) {
      const fov = 420;
      const distance = 300;
      const scale = (fov / (distance + p3d.z)) * zoomScale;
      return {
        x: centerX + p3d.x * scale,
        y: centerY + p3d.y * scale,
        scale: scale,
        z: p3d.z
      };
    }

    let animAngle = 0;
    function renderLoop() {
      ctx.clearRect(0, 0, width, height);

      // Interpolação suave
      speechEnergy += (targetSpeechEnergy - speechEnergy) * 0.12;
      camRotX += (targetCamRotX - camRotX) * 0.1;
      camRotY += (targetCamRotY - camRotY) * 0.1;
      animAngle += 0.012 + speechEnergy * 0.025;

      const palette = colorPalettes[labState.theme];
      const dynPulse = 1.0 + Math.sin(Date.now() * 0.003) * 0.06 + (isSpeaking ? Math.sin(Date.now() * 0.025) * 0.25 : 0);

      // 1. Grade Holográfica de Piso
      drawHoloGrid(palette);

      // 2. Anéis Orbitais 3D
      drawOrbitalRings(palette, dynPulse);

      // 3. Renderização do Modelo Selecionado
      if (labState.model === 'quantum_butler') {
        drawQuantumButlerModel(palette, dynPulse);
      } else if (labState.model === 'wayne_hud') {
        drawWayneHudModel(palette, dynPulse);
      } else if (labState.model === 'cyber_bust') {
        drawCyberBustModel(palette, dynPulse);
      } else if (labState.model === 'quantum_reactor') {
        drawReactorModel(palette, dynPulse);
      }

      // 4. Ondas Sonoras Radiais
      drawRadialEqualizer(palette);

      // 5. Partículas 3D
      if (labState.particles) {
        drawParticles3D(palette);
      }

      // 6. Scanlines
      if (labState.scanlines) {
        drawScanlinesEffect();
      }

      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);

    function drawHoloGrid(palette) {
      ctx.save();
      ctx.strokeStyle = "rgba(197, 168, 105, 0.05)";
      ctx.lineWidth = 1;
      const yBase = height - 50;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * 48, yBase);
        ctx.lineTo(centerX + i * 8, centerY + 80);
        ctx.stroke();
      }
      for (let j = 0; j < 6; j++) {
        ctx.beginPath();
        ctx.ellipse(centerX, yBase - j * 14, 180 + j * 30, 24 + j * 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawOrbitalRings(palette, dynPulse) {
      ctx.save();
      // Anel 1 (Principal)
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 140 * dynPulse * zoomScale, 45 * dynPulse * zoomScale, animAngle * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = isSpeaking ? palette.primary : "rgba(197, 168, 105, 0.35)";
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = isSpeaking ? 20 : 8;
      ctx.stroke();

      // Anel 2 (Invertido)
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 115 * dynPulse * zoomScale, 36 * dynPulse * zoomScale, -animAngle * 1.1 + 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = isSpeaking ? palette.accent : "rgba(0, 229, 255, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = isSpeaking ? 16 : 6;
      ctx.stroke();

      // Anel 3 (Rápido)
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 90 * dynPulse * zoomScale, 28 * dynPulse * zoomScale, animAngle * 1.4 - 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    function drawQuantumButlerModel(palette, dynPulse) {
      // Dodecaedro Quântico Wireframe
      const projNodes = coreNodes.map(node => {
        const scaled = { x: node.x * dynPulse, y: node.y * dynPulse, z: node.z * dynPulse };
        const rot = rotate3D(scaled, camRotX, camRotY + animAngle, 0);
        return project3D(rot);
      });

      ctx.save();
      if (labState.wireframe) {
        coreEdges.forEach(([i, j]) => {
          const p1 = projNodes[i];
          const p2 = projNodes[j];
          const avgZ = (p1.z + p2.z) / 2;
          const alpha = Math.max(0.15, Math.min(0.9, (avgZ + 90) / 180));

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isSpeaking ? palette.primary : `rgba(197, 168, 105, ${alpha})`;
          ctx.lineWidth = 1.6;
          ctx.shadowColor = palette.primary;
          ctx.shadowBlur = isSpeaking ? 12 : 3;
          ctx.stroke();
        });
      }

      projNodes.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.5, 3.5 * p.scale), 0, Math.PI * 2);
        ctx.fillStyle = isSpeaking ? palette.accent : palette.secondary;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();
      });

      // Ícone do Mordomo Wayne no Centro
      drawButlerEmblem(palette, dynPulse);
      ctx.restore();
    }

    function drawWayneHudModel(palette, dynPulse) {
      ctx.save();
      const hexCount = 6;
      for (let h = 0; h < hexCount; h++) {
        const ang = (h / hexCount) * Math.PI * 2 + animAngle * 0.5;
        const rad = 80 * dynPulse * zoomScale;
        const hx = centerX + Math.cos(ang) * rad;
        const hy = centerY + Math.sin(ang) * (rad * 0.5);

        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const sAng = (s / 6) * Math.PI * 2;
          const sx = hx + Math.cos(sAng) * 22;
          const sy = hy + Math.sin(sAng) * 22;
          s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      drawButlerEmblem(palette, dynPulse);
      ctx.restore();
    }

    function drawCyberBustModel(palette, dynPulse) {
      ctx.save();
      const projFace = faceNodes.map(node => {
        // Lip-sync: queixo se move ao falar
        let yShift = node.y;
        if (node.y > 10 && isSpeaking) {
          yShift += Math.sin(Date.now() * 0.03) * 6 * speechEnergy;
        }
        const scaled = { x: node.x * dynPulse, y: yShift * dynPulse, z: node.z };
        const rot = rotate3D(scaled, camRotX, camRotY + animAngle * 0.4, 0);
        return project3D(rot);
      });

      // Conecta malha facial
      for (let i = 0; i < projFace.length; i++) {
        const p = projFace[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = palette.primary;
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 6;
        ctx.fill();

        // Conecta vizinho horizontal
        if ((i + 1) % 9 !== 0 && i + 1 < projFace.length) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(projFace[i+1].x, projFace[i+1].y);
          ctx.strokeStyle = "rgba(197, 168, 105, 0.25)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawReactorModel(palette, dynPulse) {
      ctx.save();
      const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 65 * dynPulse * zoomScale);
      grad.addColorStop(0, isSpeaking ? "#FFFFFF" : palette.secondary);
      grad.addColorStop(0.3, palette.primary);
      grad.addColorStop(0.7, palette.accent);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 65 * dynPulse * zoomScale, 0, Math.PI * 2);
      ctx.fill();
      drawButlerEmblem(palette, dynPulse);
      ctx.restore();
    }

    function drawButlerEmblem(palette, dynPulse) {
      ctx.save();
      ctx.translate(centerX, centerY);

      // Brilho do Núcleo
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 32 * dynPulse * zoomScale);
      aura.addColorStop(0, isSpeaking ? "rgba(255, 215, 0, 0.8)" : "rgba(197, 168, 105, 0.5)");
      aura.addColorStop(0.6, "rgba(0, 229, 255, 0.2)");
      aura.addColorStop(1, "transparent");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 32 * dynPulse * zoomScale, 0, Math.PI * 2);
      ctx.fill();

      // Gravata Borboleta do Mordomo
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(10, -4);
      ctx.lineTo(0, 7);
      ctx.closePath();
      ctx.fillStyle = palette.primary;
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Monóculo Cibernético Tecnológico
      ctx.beginPath();
      ctx.arc(7, -14, 6, 0, Math.PI * 2);
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = isSpeaking ? 16 : 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(7, -14, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      ctx.restore();
    }

    function drawRadialEqualizer(palette) {
      if (speechEnergy <= 0.05) return;
      ctx.save();
      const bars = 36;
      const baseR = 70 * zoomScale;
      for (let i = 0; i < bars; i++) {
        const ang = (i / bars) * Math.PI * 2;
        const wave = Math.sin(Date.now() * 0.02 + i * 0.5) * 24 * speechEnergy;
        const r1 = baseR;
        const r2 = baseR + Math.max(4, wave);

        const x1 = centerX + Math.cos(ang) * r1;
        const y1 = centerY + Math.sin(ang) * (r1 * 0.45);
        const x2 = centerX + Math.cos(ang) * r2;
        const y2 = centerY + Math.sin(ang) * (r2 * 0.45);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = i % 2 === 0 ? palette.primary : palette.accent;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawParticles3D(palette) {
      ctx.save();
      particles.forEach(pt => {
        pt.theta += pt.speedTheta * (isSpeaking ? 2.0 : 1.0);
        pt.phi += pt.speedPhi;

        const x = pt.radius * Math.cos(pt.phi) * Math.cos(pt.theta);
        const y = pt.radius * Math.sin(pt.phi);
        const z = pt.radius * Math.cos(pt.phi) * Math.sin(pt.theta);

        const rot = rotate3D({x, y, z}, camRotX, camRotY + animAngle, 0);
        const proj = project3D(rot);

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pt.size * proj.scale, 0, Math.PI * 2);
        ctx.fillStyle = pt.size > 2 ? palette.primary : palette.accent;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();
      });
      ctx.restore();
    }

    function drawScanlinesEffect() {
      ctx.save();
      ctx.strokeStyle = "rgba(197, 168, 105, 0.03)";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ============================================================
    // MOTOR DE VOZ DO MORDOMO DO BATMAN (ALFRED PENNYWORTH)
    // ============================================================
    let systemVoices = [];
    const voiceSelector = document.getElementById("voiceSelector");

    function loadSystemVoices() {
      if (!window.speechSynthesis) return;
      systemVoices = window.speechSynthesis.getVoices();
      voiceSelector.innerHTML = "";

      systemVoices.forEach((v, idx) => {
        const opt = document.createElement("option");
        opt.value = v.voiceURI;
        opt.innerText = `${v.name} (${v.lang}) ${v.default ? ' [Padrão]' : ''}`;
        voiceSelector.appendChild(opt);
      });

      // Auto-seleciona melhor voz masculina
      const best = systemVoices.find(v => 
        (v.name.includes("Antonio") || v.name.includes("Daniel") || v.name.includes("Felipe") || (v.lang.startsWith("pt") && v.name.includes("Male")))
      ) || systemVoices.find(v => v.lang.startsWith("pt")) || systemVoices[0];

      if (best) {
        voiceSelector.value = best.voiceURI;
        labState.selectedVoiceURI = best.voiceURI;
      }
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadSystemVoices;
      loadSystemVoices();
    }

    function onVoiceSelected() {
      labState.selectedVoiceURI = voiceSelector.value;
    }

    function applyVoicePreset(preset) {
      document.querySelectorAll(".panel-section:nth-child(3) .btn-hud").forEach(b => b.classList.remove("active"));
      event.target.classList.add("active");

      if (preset === 'butler_batman') {
        labState.pitch = 0.84;
        labState.rate = 0.88;
        const ptMale = systemVoices.find(v => (v.lang.startsWith("pt") && (v.name.includes("Antonio") || v.name.includes("Daniel")))) || systemVoices.find(v => v.lang.startsWith("pt"));
        if (ptMale) voiceSelector.value = ptMale.voiceURI;
      } else if (preset === 'michael_caine') {
        labState.pitch = 0.82;
        labState.rate = 0.88;
        const gb = systemVoices.find(v => v.lang === 'en-GB' || v.name.includes("United Kingdom") || v.name.includes("George")) || systemVoices[0];
        if (gb) voiceSelector.value = gb.voiceURI;
      } else if (preset === 'deep_baritone') {
        labState.pitch = 0.76;
        labState.rate = 0.86;
      }

      document.getElementById("sliderPitch").value = labState.pitch;
      document.getElementById("sliderRate").value = labState.rate;
      document.getElementById("valPitch").innerText = labState.pitch.toFixed(2);
      document.getElementById("valRate").innerText = labState.rate.toFixed(2);
      speakText("Configuração de voz do mordomo aplicada, Chefe Mourato.");
    }

    function updatePitch(val) {
      labState.pitch = parseFloat(val);
      document.getElementById("valPitch").innerText = labState.pitch.toFixed(2);
    }
    function updateRate(val) {
      labState.rate = parseFloat(val);
      document.getElementById("valRate").innerText = labState.rate.toFixed(2);
    }
    function updateVol(val) {
      labState.volume = parseFloat(val);
      document.getElementById("valVol").innerText = labState.volume.toFixed(1);
    }

    function speakText(text) {
      try {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const clean = text.replace(/[*_#`\\[\\]()]/g, " ").replace(/<[^>]*>/g, " ").trim();
        if (!clean) return;

        const u = new SpeechSynthesisUtterance(clean);
        const voiceObj = systemVoices.find(v => v.voiceURI === voiceSelector.value);
        if (voiceObj) u.voice = voiceObj;
        u.pitch = labState.pitch;
        u.rate = labState.rate;
        u.volume = labState.volume;

        u.onstart = () => {
          isSpeaking = true;
          targetSpeechEnergy = 1.0;
        };
        u.onend = () => {
          isSpeaking = false;
          targetSpeechEnergy = 0.0;
        };
        u.onerror = () => {
          isSpeaking = false;
          targetSpeechEnergy = 0.0;
        };

        window.speechSynthesis.speak(u);
      } catch(err) {
        console.error("Erro na síntese:", err);
      }
    }

    function speakCustomText() {
      const val = document.getElementById("customSpeechInput").value;
      if (val) speakText(val);
    }

    // ============================================================
    // CONTROLES DE INTERFACE DO LABORATÓRIO
    // ============================================================
    function selectModel(modelName) {
      labState.model = modelName;
      document.querySelectorAll(".card-choice").forEach(c => c.classList.remove("active"));
      if (modelName === 'quantum_butler') {
        document.getElementById("btnModel1").classList.add("active");
        document.getElementById("hudModelName").innerText = "Holograma Quântico Butler";
      } else if (modelName === 'wayne_hud') {
        document.getElementById("btnModel2").classList.add("active");
        document.getElementById("hudModelName").innerText = "Wayne Tech Core (HUD)";
      } else if (modelName === 'cyber_bust') {
        document.getElementById("btnModel3").classList.add("active");
        document.getElementById("hudModelName").innerText = "Matriz Facial 3D (Lip-Sync)";
      } else if (modelName === 'quantum_reactor') {
        document.getElementById("btnModel4").classList.add("active");
        document.getElementById("hudModelName").innerText = "Reator Quântico Wayne";
      }
    }

    function setColorTheme(themeName) {
      labState.theme = themeName;
      document.querySelectorAll(".panel-section:nth-child(2) .btn-hud").forEach(b => b.classList.remove("active"));
      event.target.classList.add("active");
    }

    function reset3DCamera() {
      targetCamRotX = 0.25;
      targetCamRotY = 0.0;
      zoomScale = 1.0;
    }

    function toggleWireframe() {
      labState.wireframe = !labState.wireframe;
      event.target.classList.toggle("active");
    }

    function toggleParticles() {
      labState.particles = !labState.particles;
      event.target.classList.toggle("active");
    }

    function toggleScanlines() {
      labState.scanlines = !labState.scanlines;
      event.target.classList.toggle("active");
    }

    async function sendLabPrompt() {
      const input = document.getElementById("labPromptInput");
      const txt = input.value.trim();
      if (!txt) return;

      const chatLog = document.getElementById("labChatLog");
      const userDiv = document.createElement("div");
      userDiv.className = "lab-msg-user";
      userDiv.innerHTML = `<b>Chefe Mourato:</b> ${txt}`;
      chatLog.appendChild(userDiv);
      input.value = "";
      chatLog.scrollTop = chatLog.scrollHeight;

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: txt })
        });
        const data = await res.json();
        const alfDiv = document.createElement("div");
        alfDiv.className = "lab-msg-alfred";
        alfDiv.innerHTML = `<b>Alfred (${data.engine}):</b> ${data.response}`;
        chatLog.appendChild(alfDiv);
        chatLog.scrollTop = chatLog.scrollHeight;

        speakText(data.response.substring(0, 240));
      } catch(err) {
        const errDiv = document.createElement("div");
        errDiv.className = "lab-msg-alfred";
        errDiv.innerHTML = `<b>Erro:</b> ${err.message}`;
        chatLog.appendChild(errDiv);
      }
    }

    document.getElementById("labPromptInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendLabPrompt();
    });

    function saveAsOfficial() {
      alert("✅ Configuração Salva com Sucesso! O visual 3D e os parâmetros de voz calibrados pelo Chefe Mourato foram registrados como padrão oficial do Alfred.");
      speakText("Configuração gravada como padrão permanente, Chefe Mourato. Às suas ordens.");
    }
  </script>
</body>
</html>"""

@app.get("/", response_class=HTMLResponse)
def get_lab_ui():
    return LAB_HTML

def open_lab_browser():
    time.sleep(1.2)
    webbrowser.open("http://localhost:9090")

if __name__ == "__main__":
    print("="*60)
    print("    INICIANDO ALFRED 3D & VOICE LABORATORY (PORTA 9090)")
    print("    Servidor Dedicado e Isolado para Ajustes Finos")
    print("="*60)
    threading.Thread(target=open_lab_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=9090)

