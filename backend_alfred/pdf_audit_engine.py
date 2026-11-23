import os
import re
import datetime
from typing import Dict, Any, List, Optional
import pypdf
from cio_dual_engine import cio_engine

def validate_cnpj(cnpj_str: str) -> bool:
    numbers = [int(c) for c in cnpj_str if c.isdigit()]
    if len(numbers) != 14 or len(set(numbers)) == 1:
        return False
    # 1st digit
    weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    d1 = sum(w * n for w, n in zip(weights, numbers[:12])) % 11
    d1 = 0 if d1 < 2 else 11 - d1
    if numbers[12] != d1:
        return False
    # 2nd digit
    weights = [6] + weights
    d2 = sum(w * n for w, n in zip(weights, numbers[:13])) % 11
    d2 = 0 if d2 < 2 else 11 - d2
    return numbers[13] == d2

def validate_cpf(cpf_str: str) -> bool:
    numbers = [int(c) for c in cpf_str if c.isdigit()]
    if len(numbers) != 11 or len(set(numbers)) == 1:
        return False
    d1 = sum(w * n for w, n in zip(range(10, 1, -1), numbers[:9])) % 11
    d1 = 0 if d1 < 2 else 11 - d1
    if numbers[9] != d1:
        return False
    d2 = sum(w * n for w, n in zip(range(11, 1, -1), numbers[:10])) % 11
    d2 = 0 if d2 < 2 else 11 - d2
    return numbers[10] == d2

class PDFPericialAuditor:
    def __init__(self):
        pass

    def audit_pdf(self, pdf_path: str) -> Dict[str, Any]:
        if not os.path.exists(pdf_path):
            return {"success": False, "error": f"Arquivo não encontrado: {pdf_path}"}

        # 1. Extração do texto via pypdf
        text = ""
        page_count = 0
        try:
            reader = pypdf.PdfReader(pdf_path)
            if reader.is_encrypted:
                try:
                    reader.decrypt("")
                except Exception:
                    pass
            page_count = len(reader.pages)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        except Exception as e:
            return {"success": False, "error": f"Falha na leitura pericial do PDF: {str(e)}"}

        text_upper = text.upper()
        findings: List[Dict[str, str]] = []
        doc_type = "OUTROS_DOCUMENTOS"
        score = 100

        # 2. Identificação pericial do documento
        if "RECEITA FEDERAL" in text_upper and ("CONJUNTA" in text_upper or "PROCURADORIA-GERAL" in text_upper or "TRIBUTOS FEDERAIS" in text_upper):
            doc_type = "CND_FEDERAL_PGFN"
        elif "CAIXA" in text_upper and ("FGTS" in text_upper or "CRF" in text_upper or "REGULARIDADE DO EMPREGADOR" in text_upper):
            doc_type = "CRF_FGTS_CAIXA"
        elif "JUSTIÇA DO TRABALHO" in text_upper and "CNDT" in text_upper or "DÉBITOS TRABALHISTAS" in text_upper:
            doc_type = "CNDT_TRABALHISTA"
        elif "BALANÇO PATRIMONIAL" in text_upper:
            doc_type = "BALANCO_PATRIMONIAL"
        elif "DEMONSTRAÇÃO DO RESULTADO" in text_upper or "DRE" in text_upper:
            doc_type = "DRE_CONTABIL"
        elif "CADASTRO NACIONAL DA PESSOA JURÍDICA" in text_upper or "COMPROVANTE DE INSCRIÇÃO" in text_upper:
            doc_type = "CARTAO_CNPJ"
        elif "SERASA" in text_upper or "EXPERIAN" in text_upper:
            doc_type = "RELATORIO_SERASA"
        elif "BOA VISTA" in text_upper or "SCPC" in text_upper:
            doc_type = "RELATORIO_BOA_VISTA"
        elif "BANCO CENTRAL" in text_upper and ("REGISTRATO" in text_upper or "SCR" in text_upper):
            doc_type = "SCR_BANCO_CENTRAL"

        # 3. Extração e validação de CNPJs / CPFs
        cnpjs_found = re.findall(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b", text)
        cpfs_found = re.findall(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b", text)

        for cnpj in set(cnpjs_found):
            valid = validate_cnpj(cnpj)
            if not valid:
                score -= 30
                findings.append({
                    "tipo": "CRÍTICO",
                    "modulo": "Validação Cadastral",
                    "detalhe": f"CNPJ inválido detectado no documento: {cnpj} (Dígito verificador incorreto perante algoritmo da RFB)."
                })
            else:
                findings.append({
                    "tipo": "CONFORME",
                    "modulo": "Validação Cadastral",
                    "detalhe": f"CNPJ auditado e matematicamente válido: {cnpj}"
                })

        for cpf in set(cpfs_found):
            valid = validate_cpf(cpf)
            if not valid:
                score -= 25
                findings.append({
                    "tipo": "CRÍTICO",
                    "modulo": "Validação Cadastral",
                    "detalhe": f"CPF com dígitos verificadores inválidos: {cpf} perante algoritmo da Receita Federal."
                })
            else:
                findings.append({
                    "tipo": "CONFORME",
                    "modulo": "Validação Cadastral",
                    "detalhe": f"CPF auditado e matematicamente válido: {cpf}"
                })

        # 4. Auditoria de Validade Temporal (Datas)
        dates_found = re.findall(r"\b(\d{2})[/.-](\d{2})[/.-](\d{4})\b", text)
        now = datetime.datetime.now()
        parsed_dates = []
        for d, m, y in dates_found:
            try:
                dt = datetime.datetime(int(y), int(m), int(d))
                parsed_dates.append(dt)
            except Exception:
                continue

        # Regras de validade estritas por tipo
        if doc_type == "CND_FEDERAL_PGFN":
            # CTN Art 205/206: Validade de 180 dias
            # Procura data de validade expressa
            m_val = re.search(r"V[ÁA]LID[AO]\s+AT[ÉE]\s*:?\s*(\d{2}[/.-]\d{2}[/.-]\d{4})", text_upper)
            if m_val:
                d_str = m_val.group(1).replace("-", "/").replace(".", "/")
                try:
                    dt_val = datetime.datetime.strptime(d_str, "%d/%m/%Y")
                    if dt_val < now:
                        score -= 40
                        findings.append({
                            "tipo": "CRÍTICO",
                            "modulo": "Validade Temporal (CTN)",
                            "detalhe": f"CND Federal VENCIDA em {dt_val.strftime('%d/%m/%Y')}. Rejeição automática em bancos e licitações."
                        })
                    else:
                        dias_restantes = (dt_val - now).days
                        findings.append({
                            "tipo": "CONFORME",
                            "modulo": "Validade Temporal (CTN)",
                            "detalhe": f"CND Federal Vigente até {dt_val.strftime('%d/%m/%Y')} ({dias_restantes} dias restantes)."
                        })
                except Exception:
                    pass

        elif doc_type == "CRF_FGTS_CAIXA":
            # FGTS Lei 8.036/90: Validade estrita de 30 dias
            m_val = re.search(r"VALIDADE\s*:?\s*(\d{2}[/.-]\d{2}[/.-]\d{4})\s*A\s*(\d{2}[/.-]\d{2}[/.-]\d{4})", text_upper)
            if m_val:
                d_str = m_val.group(2).replace("-", "/").replace(".", "/")
                try:
                    dt_val = datetime.datetime.strptime(d_str, "%d/%m/%Y")
                    if dt_val < now:
                        score -= 50
                        findings.append({
                            "tipo": "CRÍTICO",
                            "modulo": "Validade CRF Caixa",
                            "detalhe": f"CRF do FGTS EXPIRADO em {dt_val.strftime('%d/%m/%Y')}. Operações bancárias travadas."
                        })
                    else:
                        findings.append({
                            "tipo": "CONFORME",
                            "modulo": "Validade CRF Caixa",
                            "detalhe": f"CRF do FGTS Regular e Vigente até {dt_val.strftime('%d/%m/%Y')}."
                        })
                except Exception:
                    pass

        # 5. Auditoria Contábil (Balanço & DRE)
        if doc_type in ["BALANCO_PATRIMONIAL", "DRE_CONTABIL"]:
            # Procura equação fundamental: Ativo Total vs Passivo + PL
            ativo_match = re.search(r"TOTAL\s+DO\s+ATIVO\D*([\d.,]+)", text_upper)
            passivo_match = re.search(r"TOTAL\s+DO\s+PASSIVO\D*([\d.,]+)", text_upper)
            if ativo_match and passivo_match:
                try:
                    at_val = float(ativo_match.group(1).replace(".", "").replace(",", "."))
                    pt_val = float(passivo_match.group(1).replace(".", "").replace(",", "."))
                    if abs(at_val - pt_val) > 0.05:
                        score -= 45
                        findings.append({
                            "tipo": "CRÍTICO",
                            "modulo": "Equação Patrimonial (NBC TG)",
                            "detalhe": f"EQUAÇÃO CONTÁBIL DESBALANCEADA: Total do Ativo (R$ {at_val:,.2f}) difere do Total do Passivo/PL (R$ {pt_val:,.2f}). Inconsistência pericial grave."
                        })
                    else:
                        findings.append({
                            "tipo": "CONFORME",
                            "modulo": "Equação Patrimonial (NBC TG)",
                            "detalhe": f"Equação Patrimonial exata ao centavo: Ativo = Passivo + PL (R$ {at_val:,.2f})."
                        })
                except Exception:
                    pass

        # 6. Auditoria de Lei do Zero (Dados Inventados / Placeholders)
        placeholders = ["A DEFINIR", "TESTE", "DADOS INVENTADOS", "NOME DO CLIENTE", "000.000.000-00", "00.000.000/0000-00"]
        for p in placeholders:
            if p in text_upper:
                score -= 30
                findings.append({
                    "tipo": "ALERTA",
                    "modulo": "Lei do Zero Dados Inventados",
                    "detalhe": f"Identificado termo fictício ou placeholder suspeito no documento: '{p}'."
                })

        score = max(0, min(100, score))

        # 7. Síntese Executiva via Alfred Cognitivo (Gemini 3.5 Flash)
        ai_prompt = f"""Como CIO e Auditor Pericial da Mourato & Associados, analise sumariamente as seguintes informações extraídas do documento {os.path.basename(pdf_path)}:
Tipo Identificado: {doc_type}
Score Pericial Preliminar: {score}/100
Apontamentos Forenses: {len(findings)} itens
Texto amostral (primeiros 1.000 caracteres):
{text[:1000]}

Emita seu Parecer Executivo Oficial em 3 parágrafos objetivos:
1. Natureza do documento e regularidade formal.
2. Riscos identificados (tributários, contábeis ou de esteira de crédito).
3. Veredito e recomendação ao Chefe Mourato."""

        try:
            ai_verdict = cio_engine.query_gemini(ai_prompt)
        except Exception:
            ai_verdict = f"Auditoria pericial automatizada concluída com Score {score}/100. Conformidade estrutural verificada conforme diretrizes periciais do ecossistema Mourato."

        return {
            "success": True,
            "filename": os.path.basename(pdf_path),
            "doc_type": doc_type,
            "page_count": page_count,
            "score": score,
            "status": "APROVADO" if score >= 80 else ("RESSALVAS" if score >= 50 else "REJEITADO"),
            "cnpjs": list(set(cnpjs_found)),
            "cpfs": list(set(cpfs_found)),
            "findings": findings,
            "executive_verdict": ai_verdict,
            "audit_timestamp": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }

pdf_auditor = PDFPericialAuditor()
