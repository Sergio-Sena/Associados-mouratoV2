import os
import json
import re
import datetime
from typing import Dict, Any, List

CLIENTES_PJ_DIR = r"C:\Teia de arranha\ClientesPJ"
CLIENTES_PF_DIR = r"C:\Teia de arranha\ClientesPF"

class MicaRadar:
    def __init__(self):
        pass

    def scan_all_clients(self) -> Dict[str, Any]:
        pj_list = self._scan_pj()
        pf_list = self._scan_pf()
        
        # Summary counts
        total_pj = len(pj_list)
        total_pf = len(pf_list)
        
        expired_count = 0
        warning_count = 0
        regular_count = 0
        pending_count = 0
        
        for item in pj_list + pf_list:
            for cnd in item.get("certidoes", []):
                st = cnd.get("status")
                if st == "VENCIDA":
                    expired_count += 1
                elif st == "ALERTA":
                    warning_count += 1
                elif st == "REGULAR":
                    regular_count += 1
                else:
                    pending_count += 1

        return {
            "success": True,
            "timestamp": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "totals": {
                "clientes_pj": total_pj,
                "clientes_pf": total_pf,
                "certidoes_vencidas": expired_count,
                "certidoes_alerta": warning_count,
                "certidoes_regulares": regular_count,
                "certidoes_pendentes": pending_count
            },
            "pj_clients": pj_list,
            "pf_clients": pf_list
        }

    def _scan_pj(self) -> List[Dict[str, Any]]:
        results = []
        if not os.path.exists(CLIENTES_PJ_DIR):
            return results

        for folder_name in os.listdir(CLIENTES_PJ_DIR):
            fpath = os.path.join(CLIENTES_PJ_DIR, folder_name)
            if not os.path.isdir(fpath):
                continue

            client_info = {
                "folder": folder_name,
                "tipo": "PJ",
                "nome": folder_name,
                "cnpj": "",
                "certidoes": []
            }

            # Tenta extrair CNPJ do nome da pasta
            m = re.search(r"(\d{14})", folder_name.replace(".", "").replace("-", "").replace("/", ""))
            if m:
                raw = m.group(1)
                client_info["cnpj"] = f"{raw[:2]}.{raw[2:5]}.{raw[5:8]}/{raw[8:12]}-{raw[12:]}"

            # Procura dados cadastrais
            ficha_json = os.path.join(fpath, "ficha_cadastral.json")
            if os.path.exists(ficha_json):
                try:
                    with open(ficha_json, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        client_info["razao_social"] = data.get("razao_social", folder_name)
                        client_info["nome_fantasia"] = data.get("nome_fantasia", "")
                        client_info["situacao"] = data.get("situacao_cadastral", "ATIVA")
                except Exception:
                    pass

            # Audita certidões no diretório
            client_info["certidoes"] = self._audit_cnds_in_dir(fpath)
            results.append(client_info)

        return results

    def _scan_pf(self) -> List[Dict[str, Any]]:
        results = []
        if not os.path.exists(CLIENTES_PF_DIR):
            return results

        for folder_name in os.listdir(CLIENTES_PF_DIR):
            fpath = os.path.join(CLIENTES_PF_DIR, folder_name)
            if not os.path.isdir(fpath):
                continue

            client_info = {
                "folder": folder_name,
                "tipo": "PF",
                "nome": folder_name,
                "cpf": "",
                "certidoes": []
            }

            m = re.search(r"(\d{11})", folder_name.replace(".", "").replace("-", ""))
            if m:
                raw = m.group(1)
                client_info["cpf"] = f"{raw[:3]}.{raw[3:6]}.{raw[6:9]}-{raw[9:]}"

            ficha_json = os.path.join(fpath, "ficha_cadastral.json")
            if os.path.exists(ficha_json):
                try:
                    with open(ficha_json, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        client_info["nome_completo"] = data.get("nome_completo", folder_name)
                        client_info["score_serasa"] = data.get("score_serasa", 0)
                except Exception:
                    pass

            client_info["certidoes"] = self._audit_cnds_in_dir(fpath)
            results.append(client_info)

        return results

    def _audit_cnds_in_dir(self, directory: str) -> List[Dict[str, Any]]:
        cnds = [
            {"tipo": "CND Federal / PGFN", "status": "PENDENTE_COLETA", "prazo_legal": "180 dias (CTN Art. 205)", "vencimento": "N/A"},
            {"tipo": "CRF FGTS Caixa", "status": "PENDENTE_COLETA", "prazo_legal": "30 dias (Lei 8.036/90)", "vencimento": "N/A"},
            {"tipo": "CNDT Trabalhista", "status": "PENDENTE_COLETA", "prazo_legal": "180 dias (Lei 12.440/11)", "vencimento": "N/A"},
            {"tipo": "Falência e Concordata TJ", "status": "PENDENTE_COLETA", "prazo_legal": "90 dias", "vencimento": "N/A"}
        ]

        # Scan all pdfs and files inside
        found_files = []
        for root, _, files in os.walk(directory):
            for f in files:
                found_files.append(os.path.join(root, f))

        now = datetime.datetime.now()

        for fpath in found_files:
            fname = os.path.basename(fpath).upper()
            
            # Checa CND Federal
            if "CND" in fname or "FEDERAL" in fname or "RECEITA" in fname:
                mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(fpath))
                dias = (now - mod_time).days
                if dias > 180:
                    cnds[0]["status"] = "VENCIDA"
                    cnds[0]["vencimento"] = f"Expirada há {dias - 180} dias (Emissão: {mod_time.strftime('%d/%m/%Y')})"
                elif dias > 150:
                    cnds[0]["status"] = "ALERTA"
                    cnds[0]["vencimento"] = f"Vence em {180 - dias} dias"
                else:
                    cnds[0]["status"] = "REGULAR"
                    cnds[0]["vencimento"] = f"Válida ({180 - dias} dias restantes)"

            # Checa FGTS
            if "FGTS" in fname or "CRF" in fname:
                mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(fpath))
                dias = (now - mod_time).days
                if dias > 30:
                    cnds[1]["status"] = "VENCIDA"
                    cnds[1]["vencimento"] = f"Expirada há {dias - 30} dias (Emissão: {mod_time.strftime('%d/%m/%Y')})"
                elif dias > 20:
                    cnds[1]["status"] = "ALERTA"
                    cnds[1]["vencimento"] = f"Vence em {30 - dias} dias"
                else:
                    cnds[1]["status"] = "REGULAR"
                    cnds[1]["vencimento"] = f"Válida ({30 - dias} dias restantes)"

            # Checa CNDT
            if "CNDT" in fname or "TRABALHISTA" in fname:
                mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(fpath))
                dias = (now - mod_time).days
                if dias > 180:
                    cnds[2]["status"] = "VENCIDA"
                    cnds[2]["vencimento"] = f"Expirada há {dias - 180} dias"
                else:
                    cnds[2]["status"] = "REGULAR"
                    cnds[2]["vencimento"] = f"Válida ({180 - dias} dias restantes)"

        return cnds

mica_radar = MicaRadar()

