"""
ALFRED CIO — GERADOR OFICIAL DE CONTRATO BLINDADO MOURATO & ASSOCIADOS
Módulo: alfred_contract_generator.py
Diretriz Global Permanente #8:
Gera automaticamente o Contrato Particular de Prestação de Serviços (PDF)
com Cabeçalho Oficial Mourato, Marca d'Água 5.5%, taxa de 15% sobre valor tomado no banco,
despesas interestaduais, cláusula anti-by-pass (12 meses), multa penal de 20%
e quadro de assinatura dos Sócios-Administradores (Gov.br / e-CPF).
"""

import os
import datetime
import hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

SEAL_PATH = r"C:\Teia de arranha\Mourato.associados\public\mourato-seal-circle.png"
GOLD = colors.HexColor("#C5A869")
DARK = colors.HexColor("#0D121D")
MUTED = colors.HexColor("#475569")
LIGHT_BG = colors.HexColor("#F8FAFC")
GOLD_BG = colors.HexColor("#FDFBF5")

MESES_PT = [
    "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]


def gerar_contrato_mourato_pdf(
    output_path: str,
    razao_social: str = "[RAZÃO SOCIAL DA CONTRATANTE]",
    cnpj: str = "[00.000.000/0001-00]",
    endereco: str = "[ENDEREÇO COMPLETO, BAIRRO, CIDADE/UF, CEP]",
    uf: str = "",
    socio_nome: str = "[NOME COMPLETO DO SÓCIO-ADMINISTRADOR]",
    socio_cpf: str = "[000.000.000-00]",
    contato: str = "[TELEFONE / E-MAIL]",
    valor_alvo_fmt: str = "_____________________",
    honorarios_15_fmt: str = "_____________________",
) -> str:
    """Gera o contrato oficial blindado em PDF com Marca d'Água 5.5% e retorna o caminho salvo."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    now_dt = datetime.datetime.now()
    now_str = now_dt.strftime("%d/%m/%Y às %H:%M:%S")
    data_extenso = f"{now_dt.day:02d} de {MESES_PT[now_dt.month]} de {now_dt.year}"
    auth_hash = hashlib.sha256(f"MOURATO-CONTRATO-{cnpj}-{now_str}".encode()).hexdigest()[:16].upper()

    uf_clean = (uf or "").strip().upper()
    if uf_clean and uf_clean != "SP":
        uf_nota = f"Sede em Outro Estado ({uf_clean}): Aplicável Cláusula de Despesas Interestaduais"
    elif uf_clean == "SP":
        uf_nota = "Sede no Estado de São Paulo (SP) — Despesas interestaduais aplicáveis se houver diligência fora de SP"
    else:
        uf_nota = "Outro Estado (Fora de SP): Sim ( )  Não ( )"

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=38 * mm,
        bottomMargin=22 * mm,
        title=f"Contrato de Prestação de Serviços - {razao_social}",
        author="Mourato & Associados Ltda",
    )

    styles = getSampleStyleSheet()
    st_title = ParagraphStyle("TitleM", parent=styles["Normal"], fontName="Times-Bold", fontSize=12.8, leading=15.5, alignment=TA_CENTER, textColor=DARK, spaceAfter=4)
    st_sub = ParagraphStyle("SubM", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.0, leading=10.8, alignment=TA_CENTER, textColor=GOLD, spaceAfter=9)
    st_clause = ParagraphStyle("ClauseM", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9.0, leading=12.2, textColor=DARK, spaceBefore=8, spaceAfter=3)
    st_body = ParagraphStyle("BodyM", parent=styles["Normal"], fontName="Helvetica", fontSize=8.4, leading=12.2, alignment=TA_JUSTIFY, textColor=DARK, spaceAfter=3.8)
    st_indent = ParagraphStyle("IndentM", parent=st_body, leftIndent=8 * mm, spaceAfter=2.8)
    st_small = ParagraphStyle("SmallM", parent=styles["Normal"], fontName="Helvetica", fontSize=7.4, leading=10.2, alignment=TA_CENTER, textColor=MUTED)

    story = [
        Paragraph("CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE ASSESSORIA CORPORATIVA,<br/>ESTRUTURAÇÃO FINANCEIRA E AUDITORIA PERICIAL DE CRÉDITO", st_title),
        Paragraph("TÍTULO EXECUTIVO EXTRAJUDICIAL • ART. 784, III E § 4º DO CPC • CLÁUSULA ANTI-BY-PASS &amp; MULTA PENAL • ASSINATURA GOV.BR / e-CPF", st_sub),
    ]

    quadro_data = [
        [Paragraph("<b>CONTRATADA</b>", st_body), Paragraph("<b>MOURATO &amp; ASSOCIADOS LTDA</b> — CNPJ: <b>38.377.738/0001-45</b><br/>Representada por seu Sócio-Administrador: <b>JOSÉ JAILSON MOURATO DA SILVA</b> — CPF: <b>317.769.598-92</b><br/>Sede: Av. São Luís, nº 187, Sala 69 A, República, São Paulo/SP • Canal Direto: (11) 97899-0034", st_body)],
        [Paragraph("<b>CONTRATANTE (PJ)</b>", st_body), Paragraph(f"<b>{razao_social}</b> — CNPJ: <b>{cnpj}</b><br/>Endereço: {endereco}<br/><i>{uf_nota}</i>", st_body)],
        [Paragraph("<b>SÓCIO ASSINANTE /<br/>DEVEDOR SOLIDÁRIO</b>", st_body), Paragraph(f"<b>{socio_nome}</b> — CPF: <b>{socio_cpf}</b> (Sócio-Administrador)<br/>Contato: {contato}", st_body)],
        [Paragraph("<b>HONORÁRIOS,<br/>DESPESAS &amp; MULTAS</b>", st_body), Paragraph("<b>Taxa: 15% (quinze por cento)</b> sobre o <b>valor total tomado/liberado junto ao banco</b> + <b>Despesas Interestaduais</b> (quando fora de SP). <b>Pagamento no ato da contratação</b> (e ajuste automático sobre eventual valor superior tomado). <b>Multa Anti-By-Pass / Desistência de Má-Fé: 15% integrais + Multa Penal de 20%</b> (proteção de 12 meses).", st_body)],
    ]
    tbl = Table(quadro_data, colWidths=[34 * mm, 140 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("BACKGROUND", (1, 3), (1, 3), GOLD_BG),
        ("GRID", (0, 0), (-1, -1), 0.5, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 4.5 * mm))

    story.append(Paragraph("As partes acima qualificadas, representadas por seus respectivos Sócios-Administradores assinantes, celebram o presente <b>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ASSESSORIA CORPORATIVA, ESTRUTURAÇÃO FINANCEIRA E AUDITORIA PERICIAL DE CRÉDITO</b>, com fundamento nos <b>arts. 104, 107, 113, 264, 275, 389, 395, 397, 406, 408 a 416, 421, 421-A, 422, 593 a 609, 725 e 727 do Código Civil (Lei nº 10.406/2002)</b>, na <b>Lei nº 13.874/2019</b>, na <b>LGPD (Lei nº 13.709/2018)</b>, na <b>MP nº 2.200-2/2001</b>, na <b>Lei nº 14.063/2020</b> e no <b>art. 784, III e § 4º do CPC (Lei nº 14.620/2023)</b>.", st_body))

    clauses = [
        ("CLÁUSULA PRIMEIRA — DO OBJETO E ESCOPO DOS SERVIÇOS PRESTADOS", [
            "<b>1.1.</b> O presente contrato tem por objeto a prestação, pela CONTRATADA em favor da CONTRATANTE, de serviços técnicos especializados de <b>Assessoria Corporativa, Inteligência Financeira, Auditoria Pericial de Crédito e Estruturação de Dossiê Bancário</b>, compreendendo:",
            "a) <b>Diagnóstico e Auditoria Pericial (PF e PJ):</b> varredura de situação cadastral na Receita Federal, QSA, regularidade fiscal (CND Federal/PGFN, FGTS/CRF, CNDT), protestos (CENPROT/IEPTB), listas restritivas e análise técnica dos birôs (Serasa, Boa Vista SCPC, Quod) e relatórios do Banco Central (Registrato SCR e CCS);",
            "b) <b>Calibragem de Perfil e Rating de Balcão:</b> identificação de travas cadastrais, inconsistências contábeis e orientação técnica para saneamento prévio perante os critérios dos comitês bancários;",
            "c) <b>Estruturação de Dossiê Técnico-Financeiro:</b> compilação documental (PGDAS-D, DRE, Balanço Patrimonial, extratos, contratos) e emissão de parecer executivo para protocolo em instituições financeiras;",
            "d) <b>Assessoramento Estratégico em Operações de Crédito:</b> enquadramento e direcionamento para linhas compatíveis (PRONAMPE/FGO, FGI PEAC, Capital de Giro, Antecipação de Recebíveis, Consórcio e Crédito Estruturado).",
            "<b>1.2. Obrigação de Meio (Arts. 593 e 594 do Código Civil):</b> Os serviços prestados pela CONTRATADA constituem obrigação técnica de meio, competindo a aprovação final do crédito exclusivamente aos comitês das instituições financeiras sob regulação do BACEN e CMN."
        ]),
        ("CLÁUSULA SEGUNDA — DA REMUNERAÇÃO DE 15% SOBRE O VALOR TOMADO NO BANCO, DESPESAS INTERESTADUAIS E PAGAMENTO NO ATO", [
            "<b>2.1. Vinculação ao Valor Tomado no Banco (Taxa Fixa de 15%):</b> Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA honorários correspondentes a <b>15% (quinze por cento) incidentes sobre o VALOR GLOBAL EFETIVAMENTE TOMADO, CONTRATADO OU LIBERADO junto à(s) instituição(ões) financeira(s)</b> — abrangendo empréstimos, financiamentos, PRONAMPE/FGO, FGI PEAC, capital de giro, limites estruturados ou linhas correlatas contraídas em nome da CONTRATANTE (PJ), do Sócio-Administrador (PF), de empresas coligadas, do mesmo grupo econômico ou interpostas pessoas.",
            f"<b>2.2. Pagamento no Ato da Contratação &amp; Ajuste Automático:</b> O pagamento dos honorários sobre o valor-alvo inicialmente pactuado (<b>Valor-alvo inicial: R$ {valor_alvo_fmt} | Honorários 15% no ato: R$ {honorarios_15_fmt}</b>) será realizado <b>NO ATO DA CONTRATAÇÃO</b>, via <b>PIX (CNPJ 38.377.738/0001-45)</b> ou TED para a <b>MOURATO &amp; ASSOCIADOS LTDA</b>. Caso o valor efetivamente tomado/liberado no banco seja superior ao valor-alvo inicial, a CONTRATANTE obriga-se a quitar a diferença correspondente aos <b>15% (quinze por cento)</b> sobre o montante excedente em até <b>24 (vinte e quatro) horas úteis</b> após a liberação bancária, sob pena de imediata mora.",
            "<b>2.3. Despesas e Custos Adicionais Interestaduais (Cliente de Outro Estado):</b> Sendo a CONTRATANTE sediada, domiciliada ou demandando diligências fora do Estado de São Paulo, correrão <b>integral e exclusivamente por conta da CONTRATANTE</b>, <b>além</b> dos honorários de 15%, todas as despesas adicionais extraordinárias, incluindo:",
            "a) Passagens aéreas ou terrestres, traslados, deslocamentos, combustível e pedágios da diretoria ou equipe técnica;",
            "b) Hospedagem e alimentação em diligências presenciais em agências bancárias, cartórios ou reuniões na praça da CONTRATANTE;",
            "c) Emolumentos cartorários interestaduais, taxas de certidões pagas, autenticações, despachantes e envios físicos de documentos.",
            "<b>2.4.</b> Tais despesas serão pagas mediante provisão prévia ou reembolso em até 48 (quarenta e oito) horas após apresentação dos comprovantes pela CONTRATADA."
        ]),
        ("CLÁUSULA TERCEIRA — DA EXCLUSIVIDADE, ANTI-BY-PASS (NÃO CIRCUNVENÇÃO) E MULTA POR DESISTÊNCIA OU MÁ-FÉ", [
            "<b>3.1. Proteção Contra Desistência Após Serviço Feito (Resultado Útil — Art. 725 do Código Civil):</b> Uma vez iniciada a auditoria pericial, entregue o diagnóstico técnico, estruturado o dossiê ou obtida pré-aprovação/aprovação bancária, a desistência unilateral ou recusa imotivada da CONTRATANTE em concluir a contratação bancária <b>não a exime do pagamento integral dos honorários de 15%</b> sobre o crédito estruturado/aprovado, nem enseja devolução de quaisquer valores pagos no ato da contratação (Art. 603 do Código Civil).",
            "<b>3.2. Cláusula Anti-By-Pass / Não Circunvenção (Prazo de 12 Meses — Art. 727 do Código Civil):</b> Durante a vigência deste contrato e pelo prazo irretratável de <b>12 (doze) meses após o seu encerramento, cancelamento ou eventual desistência</b>, fica expressamente proibido à CONTRATANTE, ao seu Sócio-Administrador (PF) e a empresas coligadas/interpostas pessoas utilizarem o diagnóstico, saneamento de rating, dossiê ou direcionamento prestado pela CONTRATADA para <b>tomar crédito diretamente junto a bancos, cooperativas ou fintechs sem efetuar o pagamento dos honorários devidos à CONTRATADA</b>.",
            "<b>3.3. Multa Penal Compensatória por Desistência ou Fraude/By-Pass (Arts. 408 a 416 do Código Civil):</b> Caso a CONTRATANTE desista imotivadamente do contrato após o início dos trabalhos técnicos <b>OU</b> venha a contratar/tomar recursos junto a instituição financeira dentro do período de proteção de 12 (doze) meses após o serviço prestado sem pagar a CONTRATADA, ficará sujeita, cumulativamente e de pleno direito, ao pagamento de:",
            "a) <b>Honorários Integrais de 15% (quinze por cento)</b> sobre o valor total do crédito efetivamente tomado ou aprovado no banco; <b>MAIS</b>",
            "b) <b>Multa Penal Compensatória irretratável de 20% (vinte por cento)</b> sobre o valor global do crédito tomado ou aprovado (ou, não havendo crédito sacado ainda, <b>multa rescisória de 20% sobre os honorários contratados</b>), independentemente da comprovação de prejuízo adicional pela CONTRATADA, nos exatos termos do <b>art. 416 do Código Civil</b>.",
            "<b>3.4. Comprovação da Tomada de Crédito &amp; Mora (Arts. 389, 395, 397 e 406 do CC e Art. 369 do CPC):</b> A contratação de crédito pela CONTRATANTE ou seu Sócio-Administrador no período de proteção poderá ser comprovada por qualquer meio lícito, inclusive relatórios SCR/Registrato, certidões, extratos ou requisição judicial ao BACEN/instituições financeiras. Sobre quaisquer valores inadimplidos incidirão correção monetária pelo IPCA/IBGE, juros moratórios de 1% ao mês <i>pro rata die</i>, multa moratória de 2%, honorários advocatícios de 20%, protesto imediato em cartório (Lei nº 9.492/1997) e negativação nos birôs."
        ]),
        ("CLÁUSULA QUARTA — OBRIGAÇÕES, VERACIDADE DOCUMENTAL, SIGILO E LGPD", [
            "<b>4.1. Veracidade e Isenção (Art. 299 do CP e Lei nº 9.613/1998):</b> A CONTRATANTE e o Sócio Assinante declaram, sob as penas da lei, que todos os documentos, extratos, PGDAS-D, balanços e informações prestadas são autênticos e de origem lícita, isentando integralmente a CONTRATADA de qualquer responsabilidade por omissões ou inconsistências fiscais da CONTRATANTE.",
            "<b>4.2. Sigilo Bancário e LGPD (LC nº 105/2001 e Lei nº 13.709/2018, arts. 7º, V e IX, e 46):</b> As partes comprometem-se ao sigilo absoluto (NDA) sobre todos os dados financeiros, cadastrais e estratégicos trocados, autorizando a CONTRATANTE o tratamento e auditoria pericial de seus dados para execução do objeto contratual."
        ]),
        ("CLÁUSULA QUINTA — DA SOLIDARIEDADE PASSIVA, ASSINATURA DIGITAL DO SÓCIO (GOV.BR / e-CPF) E FORO", [
            "<b>5.1. Solidariedade do Sócio-Administrador Assinante (Arts. 264 e 275 do Código Civil):</b> O Sócio-Administrador qualificado no preâmbulo assina este instrumento simultaneamente como representante legal da CONTRATANTE e como <b>INTERVENIENTE ANUENTE E DEVEDOR SOLIDÁRIO (PF)</b>, respondendo pessoal e ilimitadamente por todas as obrigações, honorários de 15%, despesas interestaduais e multas previstas neste contrato.",
            "<b>5.2. Assinatura Eletrônica do Sócio Assinante e Título Executivo Extrajudicial (MP nº 2.200-2/2001, Lei nº 14.063/2020 e Art. 784, III e § 4º do CPC):</b> As partes reconhecem a plena validade jurídica deste contrato assinado eletronicamente pelos respectivos Sócios-Administradores por meio de <b>Assinatura Eletrônica Avançada via Portal Gov.br (Prata/Ouro)</b> ou <b>Certificado Digital Pessoa Física ICP-Brasil (e-CPF A1/A3)</b>, constituindo <b>Título Executivo Extrajudicial líquido, certo e exigível, dispensada expressamente a assinatura de testemunhas (Art. 784, § 4º do CPC — Lei nº 14.620/2023)</b>.",
            "<b>5.3. Foro de Eleição (Art. 63 do CPC):</b> Fica eleito o <b>Foro Central da Comarca de São Paulo/SP</b> para dirimir quaisquer litígios oriundos deste contrato, com renúncia expressa a qualquer outro."
        ])
    ]

    for title, paras in clauses:
        story.append(Paragraph(title, st_clause))
        for p_txt in paras:
            st_use = st_indent if p_txt.startswith(("a)", "b)", "c)", "d)")) else st_body
            story.append(Paragraph(p_txt, st_use))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("E, por estarem assim justas, contratadas e cientes de todas as cláusulas — em especial da vinculação de 15% ao valor tomado no banco, das despesas interestaduais e das multas de desistência e anti-by-pass — firmam o presente instrumento mediante assinatura eletrônica de seus respectivos Sócios-Administradores.", st_body))
    story.append(Paragraph(f"<b>São Paulo/SP, {data_extenso}.</b>", ParagraphStyle("DateM", parent=st_body, alignment=TA_CENTER, spaceBefore=5, spaceAfter=8)))

    sig_data = [
        [
            Paragraph("<br/><br/>________________________________________________<br/><b>JOSÉ JAILSON MOURATO DA SILVA</b><br/>CPF: 317.769.598-92 • Sócio-Administrador<br/>p/ <b>MOURATO &amp; ASSOCIADOS LTDA</b> (CNPJ 38.377.738/0001-45)<br/><i>CONTRATADA — Assinatura Digital do Sócio (Gov.br / e-CPF)</i>", st_small),
            Paragraph(f"<br/><br/>________________________________________________<br/><b>{socio_nome}</b><br/>CPF: {socio_cpf} • Sócio-Administrador &amp; Devedor Solidário<br/>p/ <b>{razao_social}</b> (CNPJ {cnpj})<br/><i>CONTRATANTE (PJ &amp; PF) — Assinatura Digital do Sócio (Gov.br / e-CPF)</i>", st_small),
        ],
        [
            Paragraph("<b>VALIDAÇÃO ELETRÔNICA (LEI Nº 14.063/2020)</b><br/>Assinatura dos Sócios Assinantes (PF) via <b>assinador.iti.br (Gov.br)</b> ou <b>Certificado Digital e-CPF (A1/A3)</b>. Título Executivo Extrajudicial — Dispensadas testemunhas (<b>Art. 784, § 4º do CPC</b>).", st_small),
            ""
        ]
    ]
    sig_tbl = Table(sig_data, colWidths=[87 * mm, 87 * mm])
    sig_tbl.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, GOLD),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("SPAN", (0, 1), (1, 1)),
        ("BACKGROUND", (0, 1), (1, 1), GOLD_BG),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(KeepTogether([sig_tbl]))

    def draw_chrome(canvas_obj, doc_obj):
        W, H = A4
        canvas_obj.saveState()
        if os.path.exists(SEAL_PATH):
            canvas_obj.saveState()
            try:
                canvas_obj.setFillAlpha(0.055)
                canvas_obj.setStrokeAlpha(0.055)
            except Exception:
                pass
            wm_size = 118 * mm
            canvas_obj.drawImage(SEAL_PATH, (W - wm_size) / 2, (H - wm_size) / 2, width=wm_size, height=wm_size, mask="auto", preserveAspectRatio=True)
            canvas_obj.restoreState()
            canvas_obj.drawImage(SEAL_PATH, 18 * mm, H - 29 * mm, width=17 * mm, height=17 * mm, mask="auto", preserveAspectRatio=True)

        canvas_obj.setFont("Times-Bold", 15.5)
        canvas_obj.setFillColor(DARK)
        canvas_obj.drawString(39 * mm, H - 17.5 * mm, "MOURATO ")
        w_m = canvas_obj.stringWidth("MOURATO ", "Times-Bold", 15.5)
        canvas_obj.setFillColor(GOLD)
        canvas_obj.drawString(39 * mm + w_m, H - 17.5 * mm, "&")
        w_amp = canvas_obj.stringWidth("&", "Times-Bold", 15.5)
        canvas_obj.setFillColor(DARK)
        canvas_obj.drawString(39 * mm + w_m + w_amp, H - 17.5 * mm, " ASSOCIADOS")

        canvas_obj.setFont("Helvetica-Bold", 7.3)
        canvas_obj.setFillColor(GOLD)
        canvas_obj.drawString(39 * mm, H - 22.3 * mm, "ASSESSORIA CORPORATIVA & ESTRUTURAÇÃO FINANCEIRA  •  QUALIDADE • CONFIANÇA • EXCELÊNCIA")
        canvas_obj.setFont("Helvetica", 6.8)
        canvas_obj.setFillColor(MUTED)
        canvas_obj.drawString(39 * mm, H - 26.8 * mm, "CNPJ: 38.377.738/0001-45  •  Av. São Luís, 187, Sala 69 A, República, São Paulo/SP  •  Canal Direto: (11) 97899-0034")
        canvas_obj.setStrokeColor(GOLD)
        canvas_obj.setLineWidth(1.3)
        canvas_obj.line(18 * mm, H - 32 * mm, W - 18 * mm, H - 32 * mm)

        canvas_obj.setStrokeColor(GOLD)
        canvas_obj.setLineWidth(0.6)
        canvas_obj.line(18 * mm, 17 * mm, W - 18 * mm, 17 * mm)
        canvas_obj.setFont("Helvetica", 6.8)
        canvas_obj.setFillColor(MUTED)
        canvas_obj.drawString(18 * mm, 12.5 * mm, f"Contrato Privado Blindado • LGPD (Lei 13.709/2018) • Emitido em {now_str} • Hash: MOURATO-{auth_hash}")
        canvas_obj.drawRightString(W - 18 * mm, 12.5 * mm, f"Página {doc_obj.page}")
        canvas_obj.restoreState()

    doc.build(story, onFirstPage=draw_chrome, onLaterPages=draw_chrome)
    return output_path
