import os
from pathlib import Path
import pypdf

base_teia = Path(r"C:\Teia de arranha")

erros = []
total_sucessos = 0

for tipo in ["ClientesPF", "ClientesPJ"]:
    p = base_teia / tipo
    for c in sorted(p.iterdir()):
        if not c.is_dir():
            continue
        
        pdf1 = c / "01_CADASTRO_E_SENHAS_PROTEGIDO.pdf"
        pdf2 = c / "02_DOSSIE_E_BIROS_COMPLETO.pdf"
        xlsx1 = c / "01_PLANILHA_CADASTRO_E_SENHAS.xlsx"
        xlsx2 = c / "02_PLANILHA_DOSSIE_E_BIROS.xlsx"
        ficha_pdf = c / "FICHA_CADASTRAL_E_SENHAS.pdf"

        # Valida PDF 1
        if not pdf1.exists():
            erros.append(f"{c.name}: 01_CADASTRO_E_SENHAS_PROTEGIDO.pdf não encontrado")
        else:
            try:
                r1 = pypdf.PdfReader(str(pdf1))
                if not r1.is_encrypted:
                    erros.append(f"{c.name}: 01_CADASTRO_E_SENHAS_PROTEGIDO.pdf NÃO está criptografado!")
                else:
                    decrypt_res = r1.decrypt("1307")
                    if not decrypt_res:
                        erros.append(f"{c.name}: Falha ao descriptografar 01_CADASTRO com senha 1307!")
                    else:
                        total_sucessos += 1
            except Exception as e:
                erros.append(f"{c.name}: Erro ao ler PDF 1: {e}")

        # Valida PDF 2
        if not pdf2.exists():
            erros.append(f"{c.name}: 02_DOSSIE_E_BIROS_COMPLETO.pdf não encontrado")
        else:
            try:
                r2 = pypdf.PdfReader(str(pdf2))
                if r2.is_encrypted:
                    erros.append(f"{c.name}: 02_DOSSIE_E_BIROS_COMPLETO.pdf NÃO deveria estar criptografado!")
                elif len(r2.pages) == 0:
                    erros.append(f"{c.name}: 02_DOSSIE_E_BIROS_COMPLETO.pdf está vazio!")
                else:
                    total_sucessos += 1
            except Exception as e:
                erros.append(f"{c.name}: Erro ao ler PDF 2: {e}")

        # Valida Excel 1 e 2
        if not xlsx1.exists():
            erros.append(f"{c.name}: 01_PLANILHA_CADASTRO_E_SENHAS.xlsx não encontrado")
        else:
            total_sucessos += 1

        if not xlsx2.exists():
            erros.append(f"{c.name}: 02_PLANILHA_DOSSIE_E_BIROS.xlsx não encontrado")
        else:
            total_sucessos += 1

        print(f"✓ Validado com sucesso: {tipo} / {c.name}")

print(f"\n==========================================")
print(f"TOTAL DE ITENS VALIDADOS COM SUCESSO: {total_sucessos}")
if erros:
    print(f"ENCONTRADOS {len(erros)} ERROS:")
    for err in erros:
        print(f"  - {err}")
else:
    print("STATUS: 100% PERFEITO! ZERO ERROS! TODOS OS CLIENTES EM CONFORMIDADE TOTAL.")
print(f"==========================================")
