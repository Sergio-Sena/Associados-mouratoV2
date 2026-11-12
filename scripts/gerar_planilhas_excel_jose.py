import os
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

pf_dir = Path(r"C:\Teia de arranha\ClientesPF\JOSE_JAILSON_MOURATO_DA_SILVA_31776959892")
docs_dir = pf_dir / "documentos_pdf"

def aplicar_estilos(ws):
    ws.views.sheetView[0].showGridLines = True
    thin = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )
    for row in ws.iter_rows():
        for cell in row:
            if cell.value is not None:
                cell.border = thin

    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val = str(cell.value or '')
            max_len = max(max_len, len(val))
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 14), 50)

# ==========================================================
# PLANILHA 1: CADASTRO E SENHAS (PROTEGIDA POR SENHA 1307)
# ==========================================================
wb1 = openpyxl.Workbook()
ws1 = wb1.active
ws1.title = "Cadastro_e_Senhas"

ws1.append(["MOURATO & ASSOCIADOS — ASSESSORIA CORPORATIVA"])
ws1.append(["01. PLANILHA DE CADASTRO & SENHAS OFICIAIS (PROTEGIDA)"])
ws1.append(["Regra: Se não tem senha ou informação, preencher com (senha não informada)."])
ws1.append([])

ws1.append(["1. DADOS CADASTRAIS", "INFORMAÇÃO OFICIAL"])
ws1.append(["Nome Completo", "JOSÉ JAILSON MOURATO DA SILVA"])
ws1.append(["CPF", "317.769.598-92"])
ws1.append(["RG", "33.878.601 SSP/PE"])
ws1.append(["Data de Nascimento", "06/03/1988"])
ws1.append(["Mãe", "HELIA MARIA MOURATO DA SILVA"])
ws1.append(["Pai", "ANTONIO PEREIRA DA SILVA"])
ws1.append(["Estado Civil", "Solteiro"])
ws1.append(["Telefones", "(11) 97899-0034 / (11) 94744-5745"])
ws1.append(["E-mails", "mourato.importacao@gmail.com / jota.jailson@hotmail.com"])
ws1.append(["Endereço", "Rua Ana Paulina, 171, Vila Comercial, São Paulo/SP - CEP: 05139-060"])
ws1.append(["Empresa Vinculada", "MOURATO E ASSOCIADOS LTDA (CNPJ: 38.377.738/0001-45)"])
ws1.append([])

ws1.append(["2. RELAÇÃO DE BIRÔS E SENHAS", "LINK OFICIAL", "LOGIN / USUÁRIO", "SENHA / PIN", "STATUS"])
senhas_dados = [
    ["Serasa Experian", "serasa.com.br", "317.769.598-92", "Jota1307", "CONECTADO"],
    ["Boa Vista (SCPC)", "consumidorpositivo.com.br", "317.769.598-92", "290618", "CONECTADO"],
    ["Quod Gestora", "consumidor.quod.com.br", "31776959892", "aJfbAtwX7", "CONECTADO"],
    ["Bacen Registrato", "registrato.bcb.gov.br", "317.769.598-92", "123456", "CONECTADO"],
    ["Detran-SP", "detran.sp.gov.br", "317.769.598-92", "123456", "CONECTADO"],
    ["PGE-SP Dívida Ativa", "dividaativa.pge.sp.gov.br", "317.769.598-92", "123456", "CONECTADO"],
    ["Portal REGULARIZE", "regularize.pgfn.gov.br", "317.769.598-92", "123456", "CONECTADO"],
    ["Portal e-CAC RFB", "ecac.receita.fazenda.gov.br", "317.769.598-92", "123456", "CONECTADO"],
    ["SPC Brasil", "spcbrasil.org.br", "317.769.598-92", "(senha não informada)", "SEM ACESSO"],
    ["CENPROT Protestos", "pesquisaprotesto.com.br", "317.769.598-92", "(senha não informada)", "PÚBLICO"],
    ["TST (CNDT)", "tst.jus.br", "317.769.598-92", "(senha não informada)", "PÚBLICO"]
]
for item in senhas_dados:
    ws1.append(item)

aplicar_estilos(ws1)
ws1.protection.set_password("1307")
ws1.protection.enable()

xlsx1_path = pf_dir / "01_PLANILHA_CADASTRO_E_SENHAS.xlsx"
wb1.save(xlsx1_path)
print(f"✓ Planilha 1 salva com senha 1307: {xlsx1_path}")


# ==========================================================
# PLANILHA 2: DOSSIÊ E BIRÔS COMPLETO (100% INFORMAÇÕES - ABERTA)
# Regra: Sem senhas. Valores inexistentes ficam estritamente em branco.
# ==========================================================
wb2 = openpyxl.Workbook()
ws2 = wb2.active
ws2.title = "Dossie_e_Biros"

ws2.append(["MOURATO & ASSOCIADOS — ASSESSORIA CORPORATIVA"])
ws2.append(["02. DOSSIÊ PERICIAL DE BIRÔS DE CRÉDITO & COMPLIANCE (100% AUDITADO)"])
ws2.append(["Regra: 100% das consultas oficiais. Campos sem apontamento/valor ficam estritamente em branco."])
ws2.append([])

ws2.append(["1. SCORES HOMOLOGADOS", "PONTUAÇÃO", "SITUAÇÃO DO CADASTRO"])
ws2.append(["Score Quod", 711, "Extrato Oficial 14/10/2026"])
ws2.append(["Score Boa Vista", 800, "Cadastro Positivo Ativo"])
ws2.append(["Score Serasa Experian", 654, "Sem Apontamentos Ativos"])
ws2.append(["Rating SCR Bacen", "A1", "Código KPXA-XE7M-GN"])
ws2.append(["SPC Brasil", "", ""]) # Em branco - sem extrato
ws2.append([])

ws2.append(["2. BANCO CENTRAL DO BRASIL (SCR)", "VALOR REGISTRADO (R$)", "DIAGNÓSTICO"])
ws2.append(["Dívidas em Dia", 259.43, "Operacional Corrente"])
ws2.append(["Dívidas Vencidas / Inadimplência", 0.00, "Zero Atraso Nacional"])
ws2.append(["Prejuízo Registrado (Write-off)", 0.00, "Zero Prejuízo Baixado"])
ws2.append(["Limites de Crédito Disponíveis", 2153.62, "Itaú Unibanco S.A."])
ws2.append([])

ws2.append(["3. CONTAS E RELACIONAMENTOS (CCS BACEN)", "ISPB", "VÍNCULO", "STATUS"])
ws2.append(["Itaú Unibanco S.A.", "60.701.190", "Conta Corrente / Depósito", "Ativa"])
ws2.append(["Nu Pagamentos S.A. (Nubank)", "18.236.120", "Conta de Pagamento", "Ativa"])
ws2.append(["Banco Santander (Brasil) S.A.", "90.400.888", "Conta Corrente / Cartão", "Ativa"])
ws2.append(["Banco C6 S.A.", "31.872.495", "Conta de Pagamento", "Ativa"])
ws2.append([])

ws2.append(["4. HISTÓRICO DE PAGAMENTO (QUOD)", "CONTRATO", "HISTÓRICO", "STATUS"])
ws2.append(["Banco Itaú Unibanco", "Cartão Final 8649", "Faturas Pagas Rigorosamente em Dia", "Pontualidade 100%"])
ws2.append(["Banco Itaú Unibanco", "Cheque Especial", "Saldo Devedor: R$ 0,00", "Limite Livre"])
ws2.append(["Banco Itaú Unibanco", "Empréstimo 000002960703672", "Parcelas 1 a 4 Quitadas com Antecedência", "Totalmente Quitado"])
ws2.append(["Banco Itaú Unibanco", "Empréstimo 000003264314083", "Parcelas 1 a 4 Quitadas com Antecedência", "Totalmente Quitado"])
ws2.append(["Claro S.A. & Eletropaulo", "Contas de Consumo", "Pontualidade 100% em 2026", "Cadastro Positivo A+"])
ws2.append([])

ws2.append(["5. CERTIDÕES, PROTESTOS E DÍVIDA ATIVA", "ÓRGÃO / CARTÓRIO", "RESULTADO DA CONSULTA", "CLASSIFICAÇÃO"])
ws2.append(["Central de Protestos CENPROT", "6º Cartório de Protesto de SP", "Nada Consta Ativo (Protesto Pago e Baixado)", "Zero Protestos"])
ws2.append(["Dívida Ativa da União (PGFN)", "Receita Federal / PGFN", "Certidão Conjunta Negativa (Nada Consta)", "100% Regular"])
ws2.append(["Portal Dívida Aberta PGFN", "Fazenda Nacional", "Não Inscrito em Dívida Ativa", "Ficha Limpa"])
ws2.append(["Dívida Ativa Estadual (PGE-SP)", "Procuradoria Geral do Estado", "CDA 1.480.853.730 de IPVA moto DUZ-0988 (Desvinculação via Súmula 585 STJ)", "Em Defesa"])
ws2.append([])

ws2.append(["6. AUDITORIA FORENSE E COMPLIANCE", "ESFERA / CADASTRO", "RESULTADO OFICIAL"])
ws2.append(["Tribunal de Justiça de SP (TJSP)", "Distribuição Cível", "Nada Consta"])
ws2.append(["Tribunal de Justiça de SP (TJSP)", "Distribuição Criminal", "Nada Consta"])
ws2.append(["Tribunal Regional Federal (TRF-3)", "Justiça Federal 3ª Região", "Nada Consta"])
ws2.append(["Tribunal Superior do Trabalho (TST)", "CNDT Trabalhista", "Nada Consta"])
ws2.append(["Conselho Nacional de Justiça (CNJ)", "BNMP Mandados de Prisão", "Nada Consta"])
ws2.append(["Portal Transparência (CEIS / CNEP)", "Listas Restritivas", "Nada Consta"])
ws2.append([])

ws2.append(["7. PARECER CONCLUSIVO", "RATING ATRIBUÍDO: AAA", "APTO PARA AVAL, FIANÇA E CRÉDITO ESTRUTURADO"])

aplicar_estilos(ws2)

xlsx2_path = pf_dir / "02_PLANILHA_DOSSIE_E_BIROS.xlsx"
wb2.save(xlsx2_path)
print(f"✓ Planilha 2 salva com sucesso (Aberto): {xlsx2_path}")
