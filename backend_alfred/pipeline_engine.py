"""
PIPELINE ENGINE — ESTEIRA AUTÔNOMA DE CRÉDITO 90% AUTOPILOTO
Ecossistema Mourato & Associados • Boss.Cio
Integração Orquestrada dos 3 Agentes:
1. Mica (Secretária / WhatsApp & Onboarding)
2. Questão (Investigação Pericial 75% Dados Públicos)
3. Alfred (CIO / Auditoria e Emissão de Parecer)
4. Decisão Executiva Soberana: Chefe Mourato
"""

import os
import json
import datetime
from typing import Dict, Any, Optional

from mica_agent import mica_agent
from questao_investigador import questao_investigador
from alfred_auditor import alfred_auditor

class PipelineEngine:
    def __init__(self):
        self.nome = "Mourato Credit Pipeline"
        self.versao = "4.0.0"

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
        3. Investigação 75% (Questão rastreia dados públicos e impedimentos)
        4. Auditoria Pericial (Alfred calcula viabilidade, gera parecer e PDF oficial com marca d'água 5.5%)
        5. Saída pronta para o WhatsApp do Chefe Mourato
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
            log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Consentimento LGPD autorizado pelo cliente [Sim].")
            cons_res = mica_agent.processar_resposta_consentimento(protocolo, "Sim")
        else:
            return {
                "success": True,
                "protocolo": protocolo,
                "status_atual": "AGUARDANDO_CONSENTIMENTO_WHATSAPP",
                "mensagem_enviada": lead_res["mensagem_enviada"],
                "log": log_execucao
            }

        # ETAPA 3: Investigação Silenciosa pelo Questão (75% Dados Públicos)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Questão acionado em segundo plano. Iniciando varredura pericial de 75%...")
        dossie_questao = questao_investigador.investigar_75_porcento_pj(cnpj, protocolo)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Questão concluiu varredura: {len(dossie_questao.get('red_flags', []))} Red Flags, {len(dossie_questao.get('yellow_flags', []))} Yellow Flags.")

        # ETAPA 4: Auditoria Pericial pelo CIO Alfred
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Alfred recebeu o dossiê do Questão. Executando auditoria analítica e cálculo de risco...")
        auditoria_alfred = alfred_auditor.auditar_dossie_questao(dossie_questao)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Alfred emitiu parecer: {auditoria_alfred['recomendacao_acao']} (Score: {auditoria_alfred['score_viabilidade']}/100)")

        # Geração da Pasta e PDFs Oficiais com Marca d'Água 5.5%
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Alfred gerando Dossiê e Ficha Cadastral em PDF oficial com Marca d'Água 5.5%...")
        pdf_res = alfred_auditor.gerar_pasta_e_pdf_oficial(auditoria_alfred)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Arquivos salvos com sucesso em: {pdf_res['folder_path']}")

        # Formatação do Briefing para o Chefe Mourato
        msg_whatsapp_mourato = alfred_auditor.formatar_mensagem_whatsapp_mourato(auditoria_alfred)

        # Atualiza o registro no pipeline da Mica com o resultado compilado
        pipeline = mica_agent._carregar_pipeline()
        if protocolo in pipeline:
            pipeline[protocolo]["dossie_questao"] = dossie_questao
            pipeline[protocolo]["auditoria_alfred"] = auditoria_alfred
            pipeline[protocolo]["status_etapa"] = "AGUARDANDO_DECISAO_MOURATO"
            pipeline[protocolo]["pasta_cliente"] = pdf_res["folder_path"]
            pipeline[protocolo]["dossie_pdf"] = pdf_res["dossie_pdf"]
            pipeline[protocolo]["ficha_pdf"] = pdf_res["ficha_pdf"]
            mica_agent._salvar_pipeline(pipeline)

        fim = datetime.datetime.now()
        duracao_segundos = round((fim - inicio).total_seconds(), 2)
        log_execucao.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Esteira autônoma concluída em {duracao_segundos}s. Aguardando comando soberano do Chefe Mourato.")

        return {
            "success": True,
            "protocolo": protocolo,
            "duracao_segundos": duracao_segundos,
            "status_atual": "AGUARDANDO_DECISAO_MOURATO",
            "empresa": auditoria_alfred["razao_social"],
            "cnpj": auditoria_alfred["cnpj"],
            "score_viabilidade": auditoria_alfred["score_viabilidade"],
            "recomendacao_alfred": auditoria_alfred["recomendacao_acao"],
            "parecer_categoria": auditoria_alfred["parecer_categoria"],
            "briefing_whatsapp_mourato": msg_whatsapp_mourato,
            "arquivos_gerados": pdf_res,
            "log_esteira": log_execucao
        }

pipeline_engine = PipelineEngine()

