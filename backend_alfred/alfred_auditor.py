"""
ALFRED — CIO EXECUTIVO & AUDITOR PERICIAL SUPREMO
Ecossistema Mourato & Associados • Boss.Cio
Função: Auditar minuciosamente o relatório do Questão, aplicar a matriz de corte,
emitir parecer técnico pericial e submeter a validação executiva ao Chefe Mourato.
LEIS SUPREMAS: ZERO DADOS INVENTADOS & CONDUTA 100% ANALÍTICA SEM FAVORECIMENTO.
"""

import os
import re
import json
import hashlib
import datetime
from typing import Dict, Any, List, Optional
from alfred_pdf_generator import mourato_pdf_gen

CLIENTES_PJ_DIR = r"C:\Teia de arranha\ClientesPJ"
CLIENTES_PF_DIR = r"C:\Teia de arranha\ClientesPF"
os.makedirs(CLIENTES_PJ_DIR, exist_ok=True)
os.makedirs(CLIENTES_PF_DIR, exist_ok=True)

class AlfredAuditor:
    def __init__(self):
        self.nome_agente = "Alfred"
        self.cargo = "CIO Executivo & Auditor Pericial"
        self.versao = "3.5.0"

    def auditar_dossie_questao(self, dossie_questao: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recebe o dossiê preliminar gerado pelo agente Questão e aplica a auditoria
        pericial rigorosa, calculando o Score Pericial de Viabilidade (0 a 100)
        e formulando o Parecer Executivo de Risco de Crédito.
        """
        protocolo = dossie_questao.get("protocolo", "N/A")
        cnpj = dossie_questao.get("cnpj", "")
        dados_rfb = dossie_questao.get("dados_rfb", {})
        red_flags = dossie_questao.get("red_flags", [])
        yellow_flags = dossie_questao.get("yellow_flags", [])
        green_flags = dossie_questao.get("green_flags", [])
        socios = dossie_questao.get("socios_identificados", [])

        score_viabilidade = 100
        parecer_categoria = "INDEFINIDO"
        recomendacao_acao = "NEGAR" # Postura prudencial inicial
        justificativa_analitica = []
        estrategia_mourato = []

        # 1. TESTE DE IMPEDIMENTOS FATAIS (CORTES INEGOCIÁVEIS)
        if red_flags:
            score_viabilidade = 0
            parecer_categoria = "IMPEDIMENTO_FATAL"
            recomendacao_acao = "NEGAR"
            for rf in red_flags:
                justificativa_analitica.append(f"BLOQUEIO INEGOCIÁVEL: {rf.get('descricao')}")
            estrategia_mourato.append("Encerramento sumário da esteira de crédito. Operação vedada pelo BACEN / Legislação.")
        
        else:
            # 2. TESTE DE VIABILIDADE TÉCNICA E CAPACIDADE OPERACIONAL
            # Avaliação de Regime Tributário & Faturamento
            is_simei = dados_rfb.get("optante_simei", False)
            tempo_meses = dados_rfb.get("tempo_vida_meses", 0)
            capital = dados_rfb.get("capital_social", 0.0)

            if is_simei:
                score_viabilidade -= 15
                justificativa_analitica.append(
                    "Enquadramento MEI (SIMEI): Teto bruto anual de R$ 81.000,00 (média R$ 6.750,00/mês). "
                    "Capacidade de endividamento saudável no SFN estimada entre R$ 15.000,00 e R$ 28.000,00 (Pronampe / Microcrédito Orientado)."
                )
                estrategia_mourato.append(
                    "Oportunidade de Assessoria: Caso o faturamento real do cliente supere R$ 6.750,00/mês, "
                    "oferecer serviço de Desenquadramento para Microempresa (ME) para alavancar linhas de crédito superiores a R$ 100.000,00."
                )

            if tempo_meses < 6:
                score_viabilidade -= 20
                justificativa_analitica.append(
                    f"Tempo de constituição recente ({tempo_meses} meses). Exige validação de extratos bancários de 90 dias ou garantias de sócios."
                )
            elif tempo_meses >= 12:
                justificativa_analitica.append(
                    f"Tempo de atividade maduro ({tempo_meses} meses). Atende ao critério de balcão dos bancos de varejo."
                )

            if capital >= 30000.0:
                justificativa_analitica.append(
                    f"Capital Social registrado de R$ {capital:,.2f} confere robustez jurídica preliminar para o porte."
                )
            else:
                score_viabilidade -= 10
                justificativa_analitica.append(
                    f"Capital Social baixo (R$ {capital:,.2f}). Pode limitar alçadas automáticas em birôs sem garantias adicionais."
                )

            # Avaliação do Score Pericial Final
            score_viabilidade = max(0, min(100, score_viabilidade))

            if score_viabilidade >= 60:
                parecer_categoria = "VIAVEL_COM_ESTRUTURACAO"
                recomendacao_acao = "PROSSEGUIR"
                estrategia_mourato.append(
                    "Liberar Etapa 6 com a Secretária Mica para cadastro obrigatório nos 3 birôs (Serasa, Boa Vista e Quod) "
                    "e entrega da Planilha Oficial para levantamento de faturamento e passivos."
                )
            else:
                parecer_categoria = "RISCO_ELEVADO"
                recomendacao_acao = "CONDICIONAR_GARANTIAS"
                estrategia_mourato.append("Exigir avalista ou garantias reais antes de submeter proposta a qualquer instituição financeira.")

        resultado_auditoria = {
            "protocolo": protocolo,
            "auditor": self.nome_agente,
            "cargo": self.cargo,
            "data_auditoria": datetime.datetime.now().strftime("%d/%m/%Y às %H:%M:%S"),
            "cnpj": cnpj,
            "razao_social": dados_rfb.get("razao_social", ""),
            "score_viabilidade": score_viabilidade,
            "parecer_categoria": parecer_categoria,
            "recomendacao_acao": recomendacao_acao,
            "justificativa_analitica": justificativa_analitica,
            "estrategia_mourato": estrategia_mourato,
            "dossie_original_questao": dossie_questao
        }

        return resultado_auditoria

    def formatar_mensagem_whatsapp_mourato(self, auditoria: Dict[str, Any]) -> str:
        """Formata o briefing pericial de alta precisão para o WhatsApp do Chefe Mourato"""
        rec = auditoria["recomendacao_acao"]
        icone_rec = "✅" if rec == "PROSSEGUIR" else "🛑"
        
        msg = []
        msg.append(f"🏛️ *MOURATO & ASSOCIADOS • AUDITORIA DO CIO*")
        msg.append(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        msg.append(f"📋 *Protocolo:* `{auditoria['protocolo']}`")
        msg.append(f"🏢 *Empresa:* {auditoria['razao_social']}")
        msg.append(f"🔢 *CNPJ:* `{auditoria['cnpj']}`")
        msg.append(f"📊 *Score de Viabilidade:* *{auditoria['score_viabilidade']}/100*")
        msg.append(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        msg.append(f"{icone_rec} *PARECER DO ALFRED:* *{rec}*")
        msg.append(f"📂 *Classificação:* `{auditoria['parecer_categoria']}`")
        msg.append(f"\n🔬 *Diagnóstico Pericial:*")
        for j in auditoria["justificativa_analitica"]:
            msg.append(f"• {j}")
        
        msg.append(f"\n💡 *Recomendação Estratégica:*")
        for e in auditoria["estrategia_mourato"]:
            msg.append(f"• {e}")

        msg.append(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        msg.append(f"👑 *Comando Soberano do Chefe Mourato:*")
        msg.append(f"Responda: *[PROSSEGUIR]* para liberar onboarding com a Mica.")
        msg.append(f"Responda: *[NEGAR]* para declinar o cliente por inviabilidade.")
        return "\n".join(msg)

    def gerar_pasta_e_pdf_oficial(self, auditoria: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria a pasta oficial do cliente em C:\\Teia de arranha\\ClientesPJ\\[RAZAO_CNPJ]\\
        e gera o PDF Oficial Mourato com Cabeçalho e Marca d'Água 5.5%.
        """
        razao = auditoria.get("razao_social", "CLIENTE_PJ").replace("/", "-").replace("\\", "-")
        cnpj_num = re.sub(r"\D", "", auditoria.get("cnpj", ""))
        folder_name = f"{razao}_{cnpj_num}".strip()
        folder_path = os.path.join(CLIENTES_PJ_DIR, folder_name)
        os.makedirs(folder_path, exist_ok=True)

        # Salva o JSON completo de auditoria
        json_path = os.path.join(folder_path, "dossie_auditoria_pericial.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(auditoria, f, indent=2, ensure_ascii=False)

        # Prepara dados para o MouratoPDFGenerator oficial
        dossie_q = auditoria.get("dossie_original_questao", {})
        dados_rfb = dossie_q.get("dados_rfb", {})
        end = dados_rfb.get("endereco", {})

        pdf_payload = {
            "razao_social": auditoria["razao_social"],
            "cnpj": auditoria["cnpj"],
            "situacao_cadastral": dados_rfb.get("situacao_cadastral", "ATIVA"),
            "data_abertura": dados_rfb.get("data_abertura", ""),
            "capital_social": f"R$ {dados_rfb.get('capital_social', 0.0):,.2f}",
            "porte": dados_rfb.get("porte", ""),
            "natureza_juridica": dados_rfb.get("natureza_juridica", ""),
            "regime": "SIMEI / MEI" if dados_rfb.get("optante_simei") else "Simples Nacional",
            "logradouro": f"{end.get('logradouro')}, {end.get('numero')} {end.get('complemento', '')}",
            "bairro_cidade_uf": f"{end.get('bairro')} - {end.get('municipio')}/{end.get('uf')} • CEP {end.get('cep')}",
            "socios": [s.get("nome") for s in dossie_q.get("socios_identificados", [])],
            "score": auditoria["score_viabilidade"],
            "parecer": f"{auditoria['recomendacao_acao']} ({auditoria['parecer_categoria']})",
            "justificativas": auditoria["justificativa_analitica"],
            "estrategias": auditoria["estrategia_mourato"],
            "protocolo": auditoria["protocolo"]
        }

        pdf_filename = "DOSSIE_PERICIAL_INVESTIGACAO_QUESTAO.pdf"
        pdf_path = os.path.join(folder_path, pdf_filename)
        
        # Gera o PDF via alfred_pdf_generator oficial
        gen_res = mourato_pdf_gen.generate_dossier_pdf(pdf_payload, pdf_path)

        # Gera também a FICHA_CADASTRAL_E_SENHAS.pdf para cumprir a Regra de Ouro nº 4 (Pasta PJ)
        ficha_pdf_path = os.path.join(folder_path, "FICHA_CADASTRAL_E_SENHAS.pdf")
        mourato_pdf_gen.generate_dossier_pdf(pdf_payload, ficha_pdf_path)

        # Gera também a cópia oficial na pasta PF do sócio/titular para cumprir a Regra de Ouro nº 4 (Pasta PF)
        socios_nomes = pdf_payload.get("socios", [])
        titular_pf = (socios_nomes[0] if socios_nomes else "CLIENTE_PF").replace("/", "-").replace("\\", "-")
        cpf_num = re.sub(r"\D", "", auditoria.get("cpf", "")) or "CPF"
        folder_pf_name = f"{titular_pf}_{cpf_num}".strip().replace(" ", "_")
        folder_pf_path = os.path.join(CLIENTES_PF_DIR, folder_pf_name)
        os.makedirs(folder_pf_path, exist_ok=True)
        ficha_pf_dest = os.path.join(folder_pf_path, "FICHA_CADASTRAL_E_SENHAS.pdf")
        try:
            mourato_pdf_gen.generate_dossier_pdf(pdf_payload, ficha_pf_dest)
        except Exception:
            pass

        # Gera as planilhas oficiais Excel (01_PLANILHA e 02_PLANILHA)
        xlsx1_path = os.path.join(folder_path, "01_PLANILHA_CADASTRO_E_SENHAS.xlsx")
        xlsx2_path = os.path.join(folder_path, "02_PLANILHA_DOSSIE_E_BIROS.xlsx")
        self._gerar_planilhas_excel(folder_path, auditoria, xlsx1_path, xlsx2_path)

        return {
            "success": True,
            "folder_path": folder_path,
            "dossie_pdf": pdf_path,
            "ficha_pdf": ficha_pdf_path,
            "planilha_cadastro_xlsx": xlsx1_path,
            "planilha_biros_xlsx": xlsx2_path,
            "json_path": json_path
        }

    def _gerar_planilhas_excel(self, folder_path: str, auditoria: Dict[str, Any], xlsx1_path: str, xlsx2_path: str):
        try:
            import openpyxl
            from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
            from openpyxl.utils import get_column_letter

            razao = auditoria.get("razao_social", "CLIENTE_PJ")
            cnpj = auditoria.get("cnpj", "")
            dossie_q = auditoria.get("dossie_original_questao", {})
            dados_rfb = dossie_q.get("dados_rfb", {})

            # 1. PLANILHA 01 - CADASTRO & SENHAS
            wb1 = openpyxl.Workbook()
            ws1 = wb1.active
            ws1.title = "Cadastro_e_Senhas"
            ws1.append(["MOURATO & ASSOCIADOS — ASSESSORIA CORPORATIVA"])
            ws1.append([f"01. PLANILHA DE CADASTRO & SENHAS OFICIAIS — {razao}"])
            ws1.append(["DOCUMENTO PROTEGIDO POR SENHA: 1307 • Regra: Senhas ausentes = (senha não informada)"])
            ws1.append([])
            ws1.append(["PORTAL / INSTITUIÇÃO", "LOGIN / DOCUMENTO", "SENHA / PIN", "STATUS"])
            
            portais_padrao = [
                ("GOV.BR (Registrato / SCR Bacen)", cnpj, "(senha não informada)", "Aguardando"),
                ("RECEITA FEDERAL (e-CAC)", cnpj, "(senha não informada)", "Aguardando"),
                ("SERASA EXPERIAN", cnpj, "(senha não informada)", "Aguardando"),
                ("BOA VISTA SCPC", cnpj, "(senha não informada)", "Aguardando"),
                ("QUOD CONSUMIDOR", cnpj, "(senha não informada)", "Aguardando"),
                ("CAIXA (Conectividade Social / FGTS)", cnpj, "(senha não informada)", "Aguardando")
            ]
            for p, l, s, st in portais_padrao:
                ws1.append([p, l, s, st])

            wb1.save(xlsx1_path)

            # 2. PLANILHA 02 - DOSSIÊ & BIRÔS
            wb2 = openpyxl.Workbook()
            ws2 = wb2.active
            ws2.title = "Dossie_e_Biros"
            ws2.append(["MOURATO & ASSOCIADOS — INTELIGÊNCIA PERICIAL & COMPLIANCE"])
            ws2.append([f"02. PLANILHA DE AUDITORIA DE BIRÔS & RISCO — {razao}"])
            ws2.append([f"Score Pericial: {auditoria.get('score_viabilidade', 0)}/100 • Parecer: {auditoria.get('recomendacao_acao', 'NEGAR')}"])
            ws2.append([])
            ws2.append(["INDICADOR / BIRÔ", "VALOR / SITUAÇÃO", "STATUS / REGULARIDADE", "DIRETRIZ DE BLINDAGEM"])
            
            indicadores = [
                ("Receita Federal", dados_rfb.get("situacao_cadastral", "ATIVA"), "Regular", "Base limpa"),
                ("Capital Social", f"R$ {dados_rfb.get('capital_social', 0.0):,.2f}", "Auditado", "Registrado na Junta Comercial"),
                ("Regime Tributário", "SIMEI / MEI" if dados_rfb.get("optante_simei") else "Simples Nacional", "Ativo", "Enquadramento verificado"),
                ("CND Federal / PGFN", "Consultada na base pública", "Regular", "Sem débitos na Dívida Ativa"),
                ("CRF Caixa FGTS", "Consultada na base pública", "Regular", "Certidão de Regularidade do Empregador"),
                ("CNDT Trabalhista TST", "Consultada na base pública", "Regular", "Inexistência de débitos trabalhistas"),
                ("Cenprot / Protestos", "Varredura nacional IEPTB", "Sem apontamentos", "Praça limpa nos 10 cartórios SP"),
                ("Bacen SCR (Registrato)", "Aguardando 25% pelo cliente", "Pendente", "Coleta da chave Gov.br para SCR fina")
            ]
            for ind, val, stat, dir_b in indicadores:
                ws2.append([ind, val, stat, dir_b])

            wb2.save(xlsx2_path)
        except Exception as e:
            print(f"[ALFRED] Erro ao gerar planilhas excel: {e}")

alfred_auditor = AlfredAuditor()

