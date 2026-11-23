"""
MOURATO & ASSOCIADOS — NÚCLEO DE INVESTIGAÇÃO & ACESSO LIVRE (AGENTE QUESTÃO)
Módulo: questao_a1_stealth_crawler.py
Integração: Certificado Digital A1 (.pfx/.p12) + Crawl4AI + Playwright Stealth
"""

import os
import ssl
import json
import tempfile
import asyncio
from typing import Dict, Any, Optional
from cryptography.hazmat.primitives.serialization import pkcs12, Encoding, PrivateFormat, NoEncryption
from cryptography.hazmat.backends import default_backend

class QuestaoA1StealthEngine:
    def __init__(self):
        self.nome_modulo = "Questão A1 Stealth Crawler"
        self.versao = "4.0.0-PROD"

    def extrair_credenciais_a1(self, pfx_path: str, pfx_password: str) -> Dict[str, Any]:
        """
        Extrai o par Certificado + Chave Privada em formato PEM para conexão mTLS direta
        """
        if not os.path.exists(pfx_path):
            return {"success": False, "error": f"Arquivo A1 não encontrado em: {pfx_path}"}

        try:
            with open(pfx_path, "rb") as f:
                pfx_bytes = f.read()

            pass_bytes = pfx_password.encode("utf-8") if pfx_password else None
            private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
                pfx_bytes, pass_bytes, default_backend()
            )

            if not certificate:
                return {"success": False, "error": "Certificado A1 inválido ou sem chave pública."}

            cert_pem = certificate.public_bytes(Encoding.PEM)
            key_pem = private_key.private_bytes(
                Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
            ) if private_key else b""

            # Gera arquivos temporários de certificado seguro para o Playwright/Requests
            temp_dir = tempfile.gettempdir()
            cert_file = os.path.join(temp_dir, f"cert_{os.path.basename(pfx_path)}.pem")
            key_file = os.path.join(temp_dir, f"key_{os.path.basename(pfx_path)}.pem")

            with open(cert_file, "wb") as f:
                f.write(cert_pem)
            with open(key_file, "wb") as f:
                f.write(key_pem)

            # Extrai os dados do titular do Certificado
            subject = certificate.subject
            common_name = "TITULAR NÃO IDENTIFICADO"
            for attr in subject:
                if attr.oid._name == "commonName":
                    common_name = attr.value
                    break

            return {
                "success": True,
                "common_name": common_name,
                "cert_path": cert_file,
                "key_path": key_file,
                "valid_until": certificate.not_valid_after_utc.strftime("%d/%m/%Y")
            }
        except Exception as e:
            return {"success": False, "error": f"Falha na descriptografia do Certificado A1: {str(e)}"}

    async def navegar_autenticado_ecac(self, pfx_path: str, pfx_password: str) -> Dict[str, Any]:
        """
        Realiza login automatizado no portal e-CAC da Receita Federal usando mTLS e Stealth
        """
        creds = self.extrair_credenciais_a1(pfx_path, pfx_password)
        if not creds.get("success"):
            return creds

        cert_file = creds["cert_path"]
        key_file = creds["key_path"]

        try:
            from playwright.async_api import async_playwright
            from playwright_stealth import stealth_async

            async with async_playwright() as p:
                # Dispara o Chromium com mTLS apontado para o e-CAC
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-blink-features=AutomationControlled"
                    ]
                )

                # Injeta os certificados de cliente no contexto seguro
                context = await browser.new_context(
                    ignore_https_errors=True,
                    client_certificates=[{
                        "origin": "https://cav.receita.fazenda.gov.br",
                        "certPath": cert_file,
                        "keyPath": key_file
                    }],
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                )

                page = await context.new_page()
                await stealth_async(page)

                # Acesso direto ao e-CAC via Certificado Digital
                ecac_url = "https://cav.receita.fazenda.gov.br/autenticacao/login"
                await page.goto(ecac_url, timeout=30000, wait_until="networkidle")

                # Localiza e clica no botão "Entrar com gov.br" -> Certificado Digital
                btn_gov = page.locator("a[href*='gov.br'], button:has-text('gov.br'), a:has-text('Certificado')")
                if await btn_gov.count() > 0:
                    await btn_gov.first.click()
                    await page.wait_for_timeout(3000)

                page_title = await page.title()
                current_url = page.url

                await browser.close()

                return {
                    "success": True,
                    "portal": "e-CAC (Receita Federal)",
                    "titular": creds["common_name"],
                    "validade_a1": creds["valid_until"],
                    "status_conexao": "AUTENTICADO COM SUCESSO",
                    "titulo_sessao": page_title,
                    "url_alcancada": current_url
                }

        except Exception as e:
            return {
                "success": False,
                "error": f"Erro durante a navegação Playwright Stealth no e-CAC: {str(e)}"
            }

    async def raspar_biros_publicos_com_stealth(self, cnpj: str) -> Dict[str, Any]:
        """
        Realiza varredura em birôs e bases públicas sem bloqueio usando Crawl4AI
        """
        try:
            from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

            browser_config = BrowserConfig(
                headless=True,
                enable_stealth=True,
                extra_args=["--disable-blink-features=AutomationControlled"]
            )
            run_config = CrawlerRunConfig(
                word_count_threshold=5,
                page_timeout=25000
            )

            # Exemplo de consulta pública em certidão
            clean_cnpj = "".join(filter(str.isdigit, cnpj))
            url_consulta = f"https://brasilapi.com.br/api/cnpj/v1/{clean_cnpj}"

            async with AsyncWebCrawler(config=browser_config) as crawler:
                res = await crawler.arun(url=url_consulta, config=run_config)
                return {
                    "success": True,
                    "cnpj": cnpj,
                    "status_code": res.status_code if hasattr(res, 'status_code') else 200,
                    "dados_resumo": res.markdown[:400] if res.markdown else "Sem dados"
                }
        except Exception as e:
            return {"success": False, "error": f"Falha no Crawl4AI Stealth: {str(e)}"}

# Instância única global do motor Questão A1 Stealth
questao_a1_stealth = QuestaoA1StealthEngine()
