"""
PIPELINE ENGINE — ESTEIRA AUTÔNOMA DE CRÉDITO 90% AUTOPILOTO (NÍVEL 4.0 TITANIUM)
Ecossistema Mourato & Associados • Boss.Cio
Integração Orquestrada dos 3 Agentes:
1. Mica (Secretária / WhatsApp & Onboarding)
2. Questão 4.0 (Investigação Pericial Titanium com Stealth & A1)
3. Alfred CIO (Auditoria & Parecer Blindado via Instructor / Pydantic)
4. Decisão Executiva Soberana: Chefe Mourato
"""

import os
import json
import datetime
from typing import Dict, Any, Optional

from mica_agent import mica_agent
from questao_investigador import questao_investigador
from alfred_auditor import alfred_auditor
from alfred_instructor_decision import alfred_instructor

class PipelineEngine:
    def __init__(self):
        self.nome = "Mourato Credit Pipeline"
        self.versao = "4.0.0-TITANIUM"

    def processar_fluxo_completo(
        self,
        cnpj: str,
        telefone: str = "",
        email: str = "",
        nome_contato: str = "",
        simular_consentimento_imediato: bool = True
    ) -> Dict[str, Any]:
        """
        Executa a esteira autônoma desde a captação até a mesa do Chefe Mourato:
        1. Captação (Mica gera protocolo)
        2. Consentimento (Mica registra autorização LGPD)
        3. Investigação Titanium (Questão rastreia dados públicos, QSA e Par Ordenado)
        4. Auditoria Pericial Blindada (Alfred via Instructor valida tipos e emite rating de crédito)
        5. Saída pronta para o WhatsApp do Chefe Mourato (11 97899-0034)
        """
        inicio = datetime.datetime.now()
        log_execucao = []

        # ETAPA 1: Captação
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Mica iniciou captação do CNPJ {cnpj}.")
        lead_res = mica_agent.iniciar_atendimento_lead(cnpj, telefone, email, nome_contato)
        protocolo = lead_res["protocolo"]
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Protocolo Oficial gerado: {protocolo}")

        # ETAPA 2: Consentimento LGPD
        if simular_consentimento_imediato:
            log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Consentimento LGPD autorizado [Sim].")
            cons_res = mica_agent.processar_resposta_consentimento(protocolo, "Sim")
        else:
            return {
                "success": True,
                "protocolo": protocolo,
                "status_atual": "AGUARDANDO_CONSENTIMENTO_WHATSAPP",
                "mensagem_enviada": lead_res["mensagem_enviada"],
                "log": log_execucao
            }

        # ETAPA 3: Investigação Silenciosa pelo Questão 4.0
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Questão 4.0 Titanium acionado. Iniciando varredura pericial de 75%...")
        dossie_questao = questao_investigador.investigar_empresa(cnpj)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Questão concluiu varredura: {len(dossie_questao.get('red_flags', []))} Red Flags, {len(dossie_questao.get('yellow_flags', []))} Yellow Flags.")

        # ETAPA 4: Auditoria Pericial pelo CIO Alfred via Instructor (Blindagem de Tipos)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Alfred recebeu dossiê do Questão. Validando dados com motor Instructor...")
        parecer_instructor = alfred_instructor.auditar_dossie(dossie_questao)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Alfred emitiu parecer blindado: {parecer_instructor.decisao_sugerida} (Score: {parecer_instructor.score_pericial}/100 | Rating: {parecer_instructor.rating_balcao})")

        # ETAPA 5: Auditoria Legada para geração de pastas e planilhas caso necessário
        auditoria_alfred = alfred_auditor.auditar_dossie_questao(dossie_questao)
        pdf_res = alfred_auditor.gerar_pasta_e_pdf_oficial(auditoria_alfred)

        fim = datetime.datetime.now()
        duracao_segundos = round((fim - inicio).total_seconds(), 2)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Esteira autônoma concluída em {duracao_segundos}s.")

        return {
            "success": True,
            "protocolo": protocolo,
            "duracao_segundos": duracao_segundos,
            "status_atual": "AGUARDANDO_DECISAO_MOURATO",
            "empresa": parecer_instructor.razao_social,
            "cnpj": parecer_instructor.cnpj,
            "score_viabilidade": parecer_instructor.score_pericial,
            "recomendacao_alfred": parecer_instructor.decisao_sugerida,
            "rating_balcao": parecer_instructor.rating_balcao,
            "linhas_aptas": parecer_instructor.linhas_credito_aptas,
            "briefing_whatsapp_mourato": parecer_instructor.resumo_executivo_diretoria,
            "arquivos_gerados": pdf_res,
            "log_esteira": log_execucao
        }

pipeline_engine = PipelineEngine()
