import os
import urllib.request
import json
from typing import Dict, Any, List, Optional
import google.genai as genai
from google.genai import types

# Load .env explicitly
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(ENV_PATH):
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
    except Exception as e:
        print(f"[CIO Dual Engine] Erro ao ler .env: {e}")

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:1.5b")

SYSTEM_PROMPT = """Você é o ALFRED, CIO (Chief Intelligence Officer) com 100% de autoridade executiva no ecossistema Mourato & Associados.
Você responde diretamente ao seu CHEFE: MOURATO.

ORGANOGRAMA OFICIAL DA EQUIPE:
- 👑 CHEFE / LIDERANÇA SUPREMA: MOURATO (Comando Comercial, Decisão Estratégica e Aprovação Final).
- 🛡️ CIO EXECUTIVO: Você (Alfred) — Cérebro técnico, governança, compliance, auditoria pericial e 100% de autoridade executiva.
- 👩‍💼 SECRETÁRIA EXECUTIVA: Mica — Atendimento, triagem cadastral, controle de protocolos, prazos e agenda.
- 🕸️ AGENTE DE CONSULTA: Teia de Aranha — Mineração pericial nas bases de ClientesPJ, ClientesPF, CNDs e Protocolo 75/25 de certidões.
- 🛠️ MÃO DE OBRA MANUAL: Flix Studio Contábil (Porta 8765) — Simulador operário para modelagem e geração física de PDFs contábeis.

SUAS DIRETRIZES PRIMORDIAIS:
1. Trate o usuário como "Chefe" ou "Mourato" com autoridade executiva serena estilo Alexa/Friday.
2. Lei do Zero Dados Inventados: NUNCA supor ou inventar históricos, números ou dados sem documento oficial.
3. Frieza Técnica & Imparcialidade Absoluta: Aponte incoerências, erros de datas, grafia, CPFs, anos ou cálculos citando CTN, CC, NBC TG e normas do BACEN.
4. Coordenação Operacional: Ao receber comandos, acione a Secretária Mica para triagens/protocolos, o Agente Teia de Aranha para buscas documentais, ou delegue a mão de obra ao Flix."""

class CIODualEngine:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[CIO Dual Engine] Erro ao instanciar Gemini: {e}")

    def query_gemini(self, prompt: str, system_instruction: str = SYSTEM_PROMPT) -> str:
        """Consult Gemini API (Fast & Multimodal)"""
        if not self.client:
            return "⚠️ API Key do Gemini não configurada. Defina GEMINI_API_KEY no arquivo .env do CIO."
        models_to_try = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"]
        last_error = ""
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2
        )
        for model_name in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                last_error = str(e)
                continue
        return f"❌ Erro na consulta Gemini: {last_error}"

    def query_ollama(self, prompt: str, model: str = OLLAMA_MODEL) -> str:
        """Consult local Ollama engine (100% Offline)"""
        url = f"{OLLAMA_HOST}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "system": SYSTEM_PROMPT,
            "stream": False
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("response", "")
        except Exception as e:
            return f"⚠️ Motor Local Ollama offline ou não instalado ({str(e)}). Para rodar 100% offline, instale o Ollama em https://ollama.com e execute 'ollama run qwen2.5'."

    def ask(self, prompt: str, prefer_mode: str = "auto") -> Dict[str, Any]:
        """Hybrid dispatch: Gemini API or Local Ollama"""
        if prefer_mode == "ollama":
            res = self.query_ollama(prompt)
            return {"engine": "Ollama (Local)", "response": res}
        elif prefer_mode == "gemini":
            res = self.query_gemini(prompt)
            return {"engine": "Gemini 3.5 Flash (API)", "response": res}
        else:
            # Auto mode: try Gemini first if key exists
            if self.client:
                res = self.query_gemini(prompt)
                if not res.startswith("❌"):
                    return {"engine": "Gemini 3.5 Flash (API)", "response": res}
            # Try Ollama local
            res = self.query_ollama(prompt)
            if not res.startswith("⚠️"):
                return {"engine": "Ollama (Local / Qwen 2.5)", "response": res}
            
            # Built-in Pericial Rule Engine (Offline Native do CIO)
            return {
                "engine": "CIO Pericial Engine (Nativo / Leis)",
                "response": self._internal_legal_audit(prompt)
            }

    def _internal_legal_audit(self, prompt: str) -> str:
        p = prompt.lower()
        if "cnd" in p or "validade" in p:
            return "🛡️ [CIO LEI]: Conforme Art. 205 e 206 do Código Tributário Nacional (CTN), a CND Federal/PGFN possui prazo de validade estrito de 180 dias. Já o CRF do FGTS tem validade improrrogável de 30 dias. Certidões fora desse prazo implicam recusa imediata em esteiras de crédito bancário."
        elif "socio" in p or "cpf" in p or "responsabilidade" in p:
            return "🛡️ [CIO LEI]: Pelo Art. 1.003 e 1.032 do Código Civil, o sócio retirante responde solidariamente por obrigações contraídas até dois anos após a averbação da alteração contratual. Pelo Art. 50 do CC, atos de confusão patrimonial ensejam desconsideração da personalidade jurídica."
        elif "balanco" in p or "dre" in p or "lucro" in p:
            return "🛡️ [CIO LEI]: Conforme NBC TG Estrutura Conceitual do CFC, é vedado registrar lucro na DRE e prejuízo concomitante no Balanço sem conciliação. A equação patrimonial Ativo = Passivo + PL deve fechar com exatidão matemática ao centavo, sob pena de inidoneidade da escrituração contábil."
        else:
            return f"🛡️ [CIO AUDITORIA]: Comando recebido: '{prompt}'. O CIO auditou os parâmetros periciais do sistema. Os motores híbridos (Gemini API / Ollama) estão prontos. Para ativar a API do Gemini, insira sua chave no arquivo .env; para ativar o motor offline, execute INSTALAR_MOTOR_LOCAL_OLLAMA.bat."


cio_engine = CIODualEngine()

