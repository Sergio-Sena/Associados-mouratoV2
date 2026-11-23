"""
MICA — SECRETÁRIA EXECUTIVA VIRTUAL & ONBOARDING WHATSAPP
Ecossistema Mourato & Associados • Boss.Cio
Função: Atendimento humanizado, captação de leads, consentimento LGPD,
condução sequencial obrigatória dos 3 birôs e entrega de materiais.
"""

import os
import json
import datetime
import re
from typing import Dict, Any, List, Optional

PIPELINE_STORE_PATH = r"C:\Projetos\Boss.Cio\uploads\leads_pipeline.json"
os.makedirs(os.path.dirname(PIPELINE_STORE_PATH), exist_ok=True)

class MicaAgent:
    def __init__(self):
        self.nome_agente = "Mica"
        self.cargo = "Secretária Executiva Virtual"
        self.versao = "3.2.0"
        self.links_biros = {
            "SERASA": "https://www.serasa.com.br/",
            "BOAVISTA": "https://app.consumidorpositivo.com.br/inicio",
            "QUOD": "https://consumidor.quod.com.br/"
        }
        self.link_planilha_mourato = "https://mouratoassociados.com.br/area-cliente/planilha-coleta"

    def _carregar_pipeline(self) -> Dict[str, Any]:
        if os.path.exists(PIPELINE_STORE_PATH):
            try:
                with open(PIPELINE_STORE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _salvar_pipeline(self, data: Dict[str, Any]):
        try:
            with open(PIPELINE_STORE_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[MICA ERRO] Falha ao salvar pipeline: {e}")

    def gerar_protocolo_oficial(self, cnpj_ou_cpf: str) -> str:
        digitos = re.sub(r"\D", "", cnpj_ou_cpf)[:8]
        data_tag = datetime.datetime.now().strftime("%Y%m%d")
        return f"MA-{data_tag}-{digitos}"

    def iniciar_atendimento_lead(self, cnpj: str, telefone: str = "", email: str = "", nome_contato: str = "") -> Dict[str, Any]:
        """
        ETAPA 1: Captação do Lead com Protocolo Oficial
        ETAPA 2: Triagem e Solicitação de Consentimento LGPD
        """
        protocolo = self.gerar_protocolo_oficial(cnpj)
        pipeline = self._carregar_pipeline()

        lead = {
            "protocolo": protocolo,
            "cnpj": cnpj,
            "telefone": telefone,
            "email": email,
            "nome_contato": nome_contato,
            "data_criacao": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "status_etapa": "AGUARDANDO_CONSENTIMENTO",
            "consentimento_lgpd": None,
            "data_consentimento": None,
            "dossie_questao": None,
            "auditoria_alfred": None,
            "decisao_mourato": None,
            "data_decisao_mourato": None,
            "onboarding_biros": {
                "serasa": {"enviado": False, "confirmado": False, "data": None},
                "boavista": {"enviado": False, "confirmado": False, "data": None},
                "quod": {"enviado": False, "confirmado": False, "data": None}
            },
            "materiais_entregues": False,
            "historico_mensagens": []
        }

        # Mensagem Padrão Obrigatória da ETAPA 2
        msg_etapa2 = (
            f"Olá{', ' + nome_contato if nome_contato else ''}! Sou a Mica, secretária executiva da Mourato & Associados.\n\n"
            f"Obrigado pela confiança. Seu protocolo é *[{protocolo}]*.\n\n"
            f"Para darmos continuidade ao atendimento, você permite fazer mais algumas consultas públicas na sua empresa?\n\n"
            f"Opções: *[Sim]* | *[Não]*"
        )

        lead["historico_mensagens"].append({
            "remetente": "Mica",
            "texto": msg_etapa2,
            "data": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        })

        pipeline[protocolo] = lead
        self._salvar_pipeline(pipeline)

        return {
            "success": True,
            "protocolo": protocolo,
            "mensagem_enviada": msg_etapa2,
            "status": "AGUARDANDO_CONSENTIMENTO"
        }

    def processar_resposta_consentimento(self, protocolo: str, resposta_sim_ou_nao: str) -> Dict[str, Any]:
        """
        Processa a resposta do cliente na ETAPA 2:
        - Se [Não]: Agradece e encerra.
        - Se [Sim]: Inicia análise e aciona o Questão em segundo plano.
        """
        pipeline = self._carregar_pipeline()
        lead = pipeline.get(protocolo)
        if not lead:
            return {"success": False, "error": f"Protocolo {protocolo} não encontrado."}

        resp_clean = resposta_sim_ou_nao.strip().lower()
        agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        lead["historico_mensagens"].append({
            "remetente": "Cliente",
            "texto": resposta_sim_ou_nao,
            "data": agora
        })

        if "não" in resp_clean or "nao" in resp_clean:
            lead["consentimento_lgpd"] = False
            lead["status_etapa"] = "CONSENTIMENTO_RECUSADO_ENCERRADO"
            msg_resposta = (
                f"Agradecemos o seu retorno. Por respeito à sua privacidade e às diretrizes da LGPD, "
                f"seu protocolo *[{protocolo}]* foi encerrado. Caso deseje retomar no futuro, estaremos à disposição. Tenha um excelente dia!"
            )
            lead["historico_mensagens"].append({"remetente": "Mica", "texto": msg_resposta, "data": agora})
            self._salvar_pipeline(pipeline)
            return {"success": True, "protocolo": protocolo, "status": lead["status_etapa"], "mensagem": msg_resposta, "acionar_questao": False}

        elif "sim" in resp_clean:
            lead["consentimento_lgpd"] = True
            lead["data_consentimento"] = agora
            lead["status_etapa"] = "CONSENTIMENTO_APROVADO_EM_INVESTIGACAO"
            msg_resposta = (
                f"Perfeito! Agradecemos a autorização. Já iniciamos a varredura preliminar dos dados públicos da sua empresa com nosso departamento de inteligência pericial.\n\n"
                f"Em instantes nosso CIO executivo Alfred emitirá o parecer técnico para apreciação da diretoria. Por favor, aguarde um momento."
            )
            lead["historico_mensagens"].append({"remetente": "Mica", "texto": msg_resposta, "data": agora})
            self._salvar_pipeline(pipeline)
            return {"success": True, "protocolo": protocolo, "status": lead["status_etapa"], "mensagem": msg_resposta, "acionar_questao": True}

        else:
            return {"success": False, "error": "Resposta não compreendida. Por favor responda [Sim] ou [Não]."}

    def avancar_onboarding_biros(self, protocolo: str, confirmacao_cliente: bool = False) -> Dict[str, Any]:
        """
        ETAPA 6: Onboarding Sequencial e Obrigatório nos 3 Birôs
        Ordem Estrita:
        1. Serasa
        2. Boa Vista
        3. Quod
        Conclusão: Entrega de Planilha e Disparo de E-mail
        """
        pipeline = self._carregar_pipeline()
        lead = pipeline.get(protocolo)
        if not lead:
            return {"success": False, "error": f"Protocolo {protocolo} não encontrado."}

        agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        onb = lead["onboarding_biros"]

        # Passo 1: Serasa
        if not onb["serasa"]["confirmado"]:
            if not onb["serasa"]["enviado"]:
                onb["serasa"]["enviado"] = True
                onb["serasa"]["data"] = agora
                msg = (
                    f"🔷 *Etapa 1 de 3 — Acesso ao Birô SERASA:*\n"
                    f"Acesse o link oficial do Serasa Experian e faça seu login:\n"
                    f"👉 {self.links_biros['SERASA']}\n\n"
                    f"Você já possui cadastro ativo neste portal?"
                )
                lead["status_etapa"] = "ONBOARDING_SERASA_ENVIADO"
                lead["historico_mensagens"].append({"remetente": "Mica", "texto": msg, "data": agora})
                self._salvar_pipeline(pipeline)
                return {"success": True, "biro": "SERASA", "pergunta": msg, "concluido": False}
            elif confirmacao_cliente:
                onb["serasa"]["confirmado"] = True
                # Imediatamente prepara o passo 2 (Boa Vista)
                onb["boavista"]["enviado"] = True
                onb["boavista"]["data"] = agora
                msg = (
                    f"✅ Cadastro no Serasa confirmado!\n\n"
                    f"🔶 *Etapa 2 de 3 — Acesso ao Birô BOA VISTA (SCPC):*\n"
                    f"Agora, acesse o link oficial do portal Boa Vista Consumidor Positivo:\n"
                    f"👉 {self.links_biros['BOAVISTA']}\n\n"
                    f"Você já possui cadastro ativo neste portal?"
                )
                lead["status_etapa"] = "ONBOARDING_BOAVISTA_ENVIADO"
                lead["historico_mensagens"].append({"remetente": "Mica", "texto": msg, "data": agora})
                self._salvar_pipeline(pipeline)
                return {"success": True, "biro": "BOAVISTA", "pergunta": msg, "concluido": False}

        # Passo 2: Boa Vista
        elif not onb["boavista"]["confirmado"]:
            if confirmacao_cliente:
                onb["boavista"]["confirmado"] = True
                # Imediatamente prepara o passo 3 (Quod)
                onb["quod"]["enviado"] = True
                onb["quod"]["data"] = agora
                msg = (
                    f"✅ Cadastro na Boa Vista confirmado!\n\n"
                    f"🟣 *Etapa 3 de 3 — Acesso ao Birô QUOD:*\n"
                    f"Por fim, acesse o portal oficial da Quod:\n"
                    f"👉 {self.links_biros['QUOD']}\n\n"
                    f"Você já possui cadastro ativo neste portal?"
                )
                lead["status_etapa"] = "ONBOARDING_QUOD_ENVIADO"
                lead["historico_mensagens"].append({"remetente": "Mica", "texto": msg, "data": agora})
                self._salvar_pipeline(pipeline)
                return {"success": True, "biro": "QUOD", "pergunta": msg, "concluido": False}

        # Passo 3: Quod -> Conclusão e Entrega da Planilha
        elif not onb["quod"]["confirmado"]:
            if confirmacao_cliente:
                onb["quod"]["confirmado"] = True
                lead["materiais_entregues"] = True
                lead["status_etapa"] = "ONBOARDING_CONCLUIDO_MATERIAIS_ENTREGUES"
                msg_final = (
                    f"🎉 *Parabéns! Todos os 3 birôs (Serasa, Boa Vista e Quod) foram confirmados com sucesso!*\n\n"
                    f"Segue o link oficial e seguro da nossa planilha pericial para coleta detalhada de faturamento e passivos:\n"
                    f"📊 *Nossa Planilha:* {self.link_planilha_mourato}\n\n"
                    f"✉️ Acabamos de disparar também para o seu e-mail cadastrado as instruções formais de preenchimento e os próximos passos da sua operação de crédito.\n\n"
                    f"A Mourato & Associados agradece a parceria e está pronta para destravar o seu crédito!"
                )
                lead["historico_mensagens"].append({"remetente": "Mica", "texto": msg_final, "data": agora})
                self._salvar_pipeline(pipeline)
                return {"success": True, "biro": "FINAL", "concluido": True, "mensagem_final": msg_final}

        return {"success": True, "concluido": True, "status": lead["status_etapa"]}

    def registrar_decisao_mourato(self, protocolo: str, decisao: str) -> Dict[str, Any]:
        """Registra a decisão do Chefe Mourato ([Prosseguir] ou [Negar])"""
        pipeline = self._carregar_pipeline()
        lead = pipeline.get(protocolo)
        if not lead:
            return {"success": False, "error": f"Protocolo {protocolo} não encontrado."}

        agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        dec = decisao.strip().upper()

        if "NEGAR" in dec:
            lead["decisao_mourato"] = "NEGADO"
            lead["data_decisao_mourato"] = agora
            lead["status_etapa"] = "RECUSADO_DIRETORIA_MOURATO"
            msg = (
                f"Prezado cliente, após criteriosa análise pericial do seu protocolo *[{protocolo}]*, "
                f"identificamos que a estrutura cadastral no momento não atende aos requisitos mínimos das instituições financeiras parceiras. "
                f"Agradecemos o seu contato e nos mantemos à disposição para reavaliação futura."
            )
            lead["historico_mensagens"].append({"remetente": "Mica", "texto": msg, "data": agora})
            self._salvar_pipeline(pipeline)
            return {"success": True, "decisao": "NEGADO", "mensagem": msg}

        elif "PROSSEGUIR" in dec:
            lead["decisao_mourato"] = "APROVADO"
            lead["data_decisao_mourato"] = agora
            lead["status_etapa"] = "APROVADO_AGUARDANDO_ONBOARDING"
            self._salvar_pipeline(pipeline)
            # Aciona a primeira mensagem de onboarding (Serasa)
            return self.avancar_onboarding_biros(protocolo, confirmacao_cliente=False)

        return {"success": False, "error": "Decisão deve ser 'PROSSEGUIR' ou 'NEGAR'."}

mica_agent = MicaAgent()

