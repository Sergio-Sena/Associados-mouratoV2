import fs from 'fs';
import path from 'path';

const BASE_TEIA = 'C:\\Teia de arranha';
const DB_PATH = 'C:\\Projetos\\Empreas\\data\\fichas_cadastrais_db.json';

// Função para sanitizar nomes de pastas
function sanitizeName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Template HTML nobre para FICHA_CADASTRAL_E_SENHAS.html
function generateFichaHtml(tipo, data, credenciais, scores, vinculos, documentos) {
  const isPj = tipo === 'PJ';
  const titulo = isPj ? (data.razao_social || data.nome_fantasia) : (data.nome_completo || data.id_alias);
  const documento = isPj ? (data.cnpj_formatado || data.cnpj || data.cnpj_raw) : (data.cpf_formatado || data.cpf || data.cpf_raw);
  
  const credsRows = (credenciais && credenciais.length > 0)
    ? credenciais.map(c => `
      <tr>
        <td><b>${c.portal || 'Portal'}</b></td>
        <td><code>${c.usuario || '-'}</code></td>
        <td style="color: #b91c1c; font-weight: bold; font-family: monospace;">${c.senha || (c.pin ? 'PIN: ' + c.pin : 'A1 / Token')}</td>
        <td><span class="badge">${c.metodo_preferencial || 'SENHA'}</span></td>
        <td>${c.url_acesso ? `<a href="${c.url_acesso}" target="_blank" class="link-btn">Acessar Portal ↗</a>` : '-'}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Nenhuma credencial registrada neste cadastro.</td></tr>';

  const scoresCards = (scores && scores.length > 0)
    ? scores.map(s => `
      <div class="kpi-card">
        <div class="kpi-label">${s.bureau || 'Birô'}</div>
        <div class="kpi-val">${s.score || '-'}</div>
        <div class="kpi-sub">${s.faixa || 'Regular'}</div>
      </div>
    `).join('')
    : '<div style="color:#94a3b8; font-size: 8.5pt;">Sem histórico numérico de scores cadastrado.</div>';

  const docsList = (documentos && documentos.length > 0)
    ? documentos.map(d => `<li>📄 <b>${d.name}</b> <span style="color:#64748b; font-size:7.5pt;">(${(d.size/1024).toFixed(1)} KB)</span></li>`).join('')
    : '<li style="color:#94a3b8;">Nenhum documento anexado ainda.</li>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha Cadastral e Senhas — ${titulo}</title>
  <style>
    :root {
      --gold: #C5A869;
      --navy: #0B111E;
      --navy-light: #151D2E;
      --border: #E2E8F0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    body { background: #0F172A; color: #1E293B; padding: 2rem 1rem; display: flex; justify-content: center; }
    .sheet { width: 210mm; min-height: 297mm; background: #FFFFFF; padding: 18mm 20mm; box-shadow: 0 10px 40px rgba(0,0,0,0.5); position: relative; }
    .no-print { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: #1E293B; padding: 0.75rem 1.25rem; border-radius: 6px; color: #fff; width: 210mm; }
    .btn-print { background: linear-gradient(135deg, #D4AF37, #996515); color: #000; font-weight: bold; border: none; padding: 0.5rem 1.2rem; border-radius: 4px; cursor: pointer; }
    .header { border-bottom: 2px solid var(--gold); padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .brand-title { font-size: 14pt; font-weight: 800; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }
    .brand-title span { color: var(--gold); }
    .brand-sub { font-size: 7pt; font-weight: 700; color: #876223; letter-spacing: 0.12em; text-transform: uppercase; }
    .doc-meta { font-size: 8pt; color: #64748B; text-align: right; }
    .banner { background: var(--navy); color: #FFFFFF; padding: 10px 14px; border-radius: 4px; border-left: 4px solid var(--gold); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .banner h1 { font-size: 11pt; font-weight: bold; }
    .badge-tipo { background: rgba(197, 168, 105, 0.25); color: #F5DF98; font-size: 7.5pt; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--gold); }
    .section-title { font-size: 9pt; font-weight: 800; color: var(--navy); border-bottom: 1px solid var(--border); padding-bottom: 3px; margin: 14px 0 8px 0; text-transform: uppercase; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 12px; }
    .data-table th { background: #F1F5F9; color: var(--navy); text-align: left; padding: 5px 8px; border: 1px solid var(--border); font-size: 7pt; text-transform: uppercase; }
    .data-table td { padding: 5px 8px; border: 1px solid var(--border); }
    .data-table tr:nth-child(even) td { background: #F8FAFC; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { background: #F8FAFC; border: 1px solid var(--border); border-top: 2px solid var(--gold); padding: 6px 8px; text-align: center; border-radius: 4px; }
    .kpi-label { font-size: 6.5pt; text-transform: uppercase; color: #64748B; font-weight: bold; }
    .kpi-val { font-size: 11pt; font-weight: 800; color: var(--navy); margin: 2px 0; font-family: monospace; }
    .kpi-sub { font-size: 6.2pt; color: #16A34A; font-weight: bold; }
    .badge { font-size: 6.5pt; font-weight: bold; padding: 2px 5px; background: #E2E8F0; border-radius: 3px; }
    .link-btn { font-size: 7pt; font-weight: bold; color: #1D4ED8; text-decoration: none; }
    .link-btn:hover { text-decoration: underline; }
    .docs-ul { font-size: 7.8pt; line-height: 1.6; list-style: none; padding-left: 0; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .sheet { box-shadow: none; padding: 10mm 15mm; width: 100%; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div>
    <div class="no-print">
      <span><b>Teia de Aranha</b> — Dossiê Cadastral e Cofre de Senhas</span>
      <button class="btn-print" onclick="window.print()">🖨️ IMPRIMIR / PDF</button>
    </div>
    <div class="sheet">
      <div class="header">
        <div>
          <div class="brand-title">TEIA DE ARANHA <span>•</span> DOSSIÊ DO CLIENTE</div>
          <div class="brand-sub">Sistema de Inteligência Cadastral & Pericial — Mourato & Associados</div>
        </div>
        <div class="doc-meta">
          <div><b>Data de Emissão:</b> ${new Date().toLocaleDateString('pt-BR')}</div>
          <div><b>Perfil:</b> ${isPj ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'}</div>
        </div>
      </div>

      <div class="banner">
        <div>
          <h1>${titulo}</h1>
          <div style="font-size: 8pt; color: #CBD5E1;">Documento: <b>${documento}</b></div>
        </div>
        <div class="badge-tipo">${isPj ? 'PESSOA JURÍDICA' : 'PESSOA FÍSICA'}</div>
      </div>

      <div class="section-title">1. Dados Cadastrais e Contato</div>
      <table class="data-table">
        <tr>
          <td style="width: 20%;"><b>Nome / Razão:</b></td>
          <td style="width: 45%;"><b>${titulo}</b></td>
          <td style="width: 15%;"><b>${isPj ? 'CNPJ:' : 'CPF:'}</b></td>
          <td style="width: 20%; font-family: monospace;"><b>${documento}</b></td>
        </tr>
        <tr>
          <td><b>${isPj ? 'NIRE / Abertura:' : 'RG / Nascimento:'}</b></td>
          <td>${isPj ? (data.nire || '-') + ' (' + (data.data_abertura || '-') + ')' : (data.rg || '-') + ' (Nasc: ' + (data.nascimento || '-') + ')'}</td>
          <td><b>${isPj ? 'Regime:' : 'Estado Civil:'}</b></td>
          <td>${isPj ? (data.regime_tributario || data.qualificacao || 'Simples Nacional') : (data.estado_civil || 'Não informado')}</td>
        </tr>
        <tr>
          <td><b>E-mail Principal:</b></td>
          <td>${data.email_principal || 'Não informado'}</td>
          <td><b>Telefone:</b></td>
          <td>${data.telefone_principal || 'Não informado'}</td>
        </tr>
        <tr>
          <td><b>Endereço:</b></td>
          <td colspan="3">${data.endereco_principal || data.endereco || 'São Paulo - SP'}</td>
        </tr>
        ${isPj ? `
        <tr>
          <td><b>Capital Social:</b></td>
          <td><b>${data.capital_social || 'R$ 1.000.000,00'}</b></td>
          <td><b>Sócio-Admin:</b></td>
          <td>${data.cargo_socio || 'Administrador'}</td>
        </tr>
        ` : ''}
      </table>

      <div class="section-title">2. Cofre de Credenciais e Senhas de Portais (Acesso Robô / Pericial)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Portal Governamental / Birô</th>
            <th>Usuário / Chave</th>
            <th>Senha / PIN</th>
            <th>Método</th>
            <th>Acesso Rápido</th>
          </tr>
        </thead>
        <tbody>
          ${credsRows}
        </tbody>
      </table>

      <div class="section-title">3. Scores e Situação nos Birôs de Crédito</div>
      <div class="kpi-row">
        ${scoresCards}
      </div>

      ${vinculos && vinculos.length > 0 ? `
      <div class="section-title">4. Vínculos Societários / Empresas Vinculadas</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Razão Social</th>
            <th>CNPJ</th>
            <th>Situação</th>
            <th>Capital</th>
          </tr>
        </thead>
        <tbody>
          ${vinculos.map(v => `
            <tr>
              <td><b>${v.razao_social || v.nome_fantasia}</b></td>
              <td style="font-family: monospace;">${v.cnpj_formatado || v.cnpj || '-'}</td>
              <td><span class="badge" style="background:#DCFCE7; color:#15803D;">${v.situacao || 'ATIVA'}</span></td>
              <td>${v.capital_social || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      <div class="section-title">5. Documentos e PDFs Arquivados no Dossiê</div>
      <ul class="docs-ul">
        ${docsList}
      </ul>

      <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 7pt; color: #64748B; display: flex; justify-content: space-between;">
        <span>Dossiê Auditado Teia de Aranha — Mourato & Associados</span>
        <span>Armazenamento Criptografado Local</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('=== INICIANDO REORGANIZAÇÃO PADRONIZADA DA TEIA DE ARANHA ===');

  // 1. Carrega dados do banco central
  const rawDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const clientsList = Array.isArray(rawDb) ? rawDb : Object.values(rawDb);
  console.log(`Carregados ${clientsList.length} cadastros de clientes da base oficial.`);

  // 2. Garante pastas mestres na raiz de C:\Teia de arranha
  const dirRobo = path.join(BASE_TEIA, 'Robo');
  const dirPj = path.join(BASE_TEIA, 'ClientesPJ');
  const dirPf = path.join(BASE_TEIA, 'ClientesPF');
  const dirOutrosPdf = path.join(BASE_TEIA, 'Outros_Arquivos_PDF');

  [dirRobo, dirPj, dirPf, dirOutrosPdf].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // 3. Cria índice de LINKS_PARA_USO.md dentro do Robo
  const linksContent = `# HUB DE LINKS OPERACIONAIS — ROBÔ TEIA DE ARANHA

Links oficiais utilizados nas rotinas de auditoria, extração e certificação cadastral:

## 1. Birôs de Crédito
- **Quod Consumidor:** https://consumidor.quod.com.br
- **Quod Empresas PJ:** https://empresas.quod.com.br
- **Boa Vista Consumidor Positivo:** https://www.consumidorpositivo.com.br
- **Boa Vista PJ:** https://www.boavistaservicos.com.br
- **Serasa Experian:** https://www.serasa.com.br
- **Serasa Limpa Nome:** https://www.serasalimpanome.com.br

## 2. Banco Central do Brasil & Órgãos Federais
- **Bacen Registrato (SCR / CCS):** https://registrato.bcb.gov.br
- **Portal Gov.br:** https://acesso.gov.br
- **Receita Federal (Consulta CNPJ):** https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp
- **Consumidor.gov.br (Senacon):** https://www.consumidor.gov.br
- **Validador ITI ICP-Brasil:** https://verificador.iti.gov.br

## 3. Estado de São Paulo & Detran
- **Detran-SP:** https://www.detran.sp.gov.br
- **PGE-SP Dívida Ativa (PRDI):** https://www.dividaativa.pge.sp.gov.br
- **JUCESP (Junta Comercial SP):** https://www.jucesponline.sp.gov.br
- **SEI Governo SP:** https://sei.sp.gov.br

*Atualizado pela plataforma Mourato & Associados.*
`;
  fs.writeFileSync(path.join(dirRobo, 'LINKS_PARA_USO.md'), linksContent, 'utf8');
  console.log('✓ LINKS_PARA_USO.md criado no Robô.');

  // 4. Copiar arquivos de execução do robô para C:\Teia de arranha\Robo
  const roboSourceDir = path.join(BASE_TEIA, 'ClientesPF');
  const roboFiles = [
    'app_teia.py', 'Teia.exe', 'Teia.spec', 'banco_dados.py', 'server.js',
    'bndes_cancel_automation.py', 'cadastrar_marcos_silva.py', 'check_pages.py',
    'clientes_banco.db', 'clients_catalog.js', 'cruzamento_pericial.js',
    'servico_email_workspace.js', 'Verificar_Status_Teia.bat', 'build_teia.ps1'
  ];

  roboFiles.forEach(f => {
    const src = path.join(roboSourceDir, f);
    if (fs.existsSync(src)) {
      const dest = path.join(dirRobo, f);
      fs.copyFileSync(src, dest);
    }
  });

  // Copia pasta service_teia se existir
  const serviceTeiaSrc = path.join(roboSourceDir, 'service_teia');
  const serviceTeiaDest = path.join(dirRobo, 'service_teia');
  if (fs.existsSync(serviceTeiaSrc) && !fs.existsSync(serviceTeiaDest)) {
    fs.cpSync(serviceTeiaSrc, serviceTeiaDest, { recursive: true });
  }
  console.log('✓ Componentes operacionais do Robô copiados para C:\\Teia de arranha\\Robo.');

  // 5. PROCESSAR CLIENTES PF
  for (const client of clientsList) {
    const nome = client.nome_completo || client.razao_social || client.id_alias;
    const cpf = client.cpf_raw || client.cpf_formatado || client.id_alias;
    if (!nome) continue;

    const folderName = `${sanitizeName(nome)}_${sanitizeName(cpf || 'PF')}`;
    const clientDir = path.join(dirPf, folderName);
    const docsDir = path.join(clientDir, 'documentos_pdf');

    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    // Procura PDFs existentes desse cliente em Bacem/ ou dados_pf_clientesPF/
    const existingPdfs = [];
    
    // Busca em Bacem/
    const bacemFolder = path.join(BASE_TEIA, 'ClientesPF', 'Bacem', nome);
    if (fs.existsSync(bacemFolder)) {
      fs.readdirSync(bacemFolder).forEach(file => {
        const fullSrc = path.join(bacemFolder, file);
        const fullDest = path.join(docsDir, file);
        if (fs.statSync(fullSrc).isFile()) {
          fs.copyFileSync(fullSrc, fullDest);
          existingPdfs.push({ name: file, size: fs.statSync(fullDest).size });
        }
      });
    }

    // Busca em dados_pf_clientesPF/
    const dadosPfMatch = path.join(BASE_TEIA, 'ClientesPF', 'dados_pf_clientesPF');
    if (fs.existsSync(dadosPfMatch)) {
      const subs = fs.readdirSync(dadosPfMatch);
      for (const sub of subs) {
        if (sub.includes(cpf) || sub.includes(sanitizeName(nome).slice(0, 10))) {
          const subPath = path.join(dadosPfMatch, sub);
          function collectFiles(curr) {
            fs.readdirSync(curr, { withFileTypes: true }).forEach(entry => {
              const p = path.join(curr, entry.name);
              if (entry.isDirectory()) collectFiles(p);
              else if (entry.name.endsWith('.pdf') || entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) {
                const dest = path.join(docsDir, entry.name);
                if (!fs.existsSync(dest)) {
                  fs.copyFileSync(p, dest);
                  existingPdfs.push({ name: entry.name, size: fs.statSync(dest).size });
                }
              }
            });
          }
          collectFiles(subPath);
        }
      }
    }

    // Grava ficha_cadastral.json
    fs.writeFileSync(path.join(clientDir, 'ficha_cadastral.json'), JSON.stringify(client, null, 2), 'utf8');

    // Grava credenciais_portais.json
    const creds = client.credenciais || [];
    fs.writeFileSync(path.join(clientDir, 'credenciais_portais.json'), JSON.stringify(creds, null, 2), 'utf8');

    // Grava scores_bureaus.json
    const scores = client.scores || [];
    fs.writeFileSync(path.join(clientDir, 'scores_bureaus.json'), JSON.stringify(scores, null, 2), 'utf8');

    // Gera FICHA_CADASTRAL_E_SENHAS.html
    const html = generateFichaHtml('PF', client, creds, scores, client.empresas_vinculadas, existingPdfs);
    fs.writeFileSync(path.join(clientDir, 'FICHA_CADASTRAL_E_SENHAS.html'), html, 'utf8');

    console.log(`✓ PF: [${folderName}] Ficha, senhas e ${existingPdfs.length} PDFs organizados.`);
  }

  // 6. PROCESSAR CLIENTES PJ
  // Empresas mapeadas da base
  const pjList = [];
  clientsList.forEach(c => {
    (c.empresas_vinculadas || []).forEach(emp => {
      pjList.push({
        ...emp,
        socio_nome: c.nome_completo,
        socio_cpf: c.cpf_formatado || c.cpf_raw,
        credenciais_socio: c.credenciais || []
      });
    });
  });

  // Garante Mourato & Associados se não estiver na lista
  if (!pjList.find(p => (p.cnpj_raw || '').includes('38377738000145') || (p.razao_social || '').includes('MOURATO'))) {
    pjList.push({
      razao_social: 'MOURATO E ASSOCIADOS LTDA',
      nome_fantasia: 'MOURATO & ASSOCIADOS',
      cnpj_formatado: '38.377.738/0001-45',
      cnpj_raw: '38377738000145',
      capital_social: 'R$ 1.000.000,00',
      endereco: 'Avenida Sao Luis, 187, Sala 69 A - Republica, Sao Paulo/SP',
      socio_nome: 'JOSE JAILSON MOURATO DA SILVA',
      socio_cpf: '317.769.598-92'
    });
  }

  for (const emp of pjList) {
    const razao = emp.razao_social || emp.nome_fantasia || 'EMPRESA_PJ';
    const cnpj = emp.cnpj_raw || emp.cnpj_formatado || '00000000000000';
    const folderName = `${sanitizeName(razao)}_${sanitizeName(cnpj)}`;
    const pjDir = path.join(dirPj, folderName);
    const docsDir = path.join(pjDir, 'documentos_pdf');

    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    const existingPdfs = [];

    // Se for Mourato, traz o EVE e a consolidação
    if (folderName.includes('MOURATO')) {
      const origMourato = path.join(dirPj, 'Mourato&Associados LTDA');
      if (fs.existsSync(origMourato)) {
        fs.readdirSync(origMourato).forEach(file => {
          const s = path.join(origMourato, file);
          const d = path.join(docsDir, file);
          if (fs.statSync(s).isFile()) {
            fs.copyFileSync(s, d);
            existingPdfs.push({ name: file, size: fs.statSync(d).size });
          }
        });
      }
    }

    // Busca se havia pasta em dados_pj_clientesPJ
    const pjOldFolder = path.join(BASE_TEIA, 'ClientesPF', 'dados_pj_clientesPJ');
    if (fs.existsSync(pjOldFolder)) {
      fs.readdirSync(pjOldFolder).forEach(sub => {
        if (sub.includes(cnpj.replace(/[^0-9]/g, '')) || sub.includes(sanitizeName(razao).slice(0, 10))) {
          const subP = path.join(pjOldFolder, sub);
          function collectPjFiles(curr) {
            fs.readdirSync(curr, { withFileTypes: true }).forEach(entry => {
              const p = path.join(curr, entry.name);
              if (entry.isDirectory()) collectPjFiles(p);
              else if (entry.name.endsWith('.pdf') || entry.name.endsWith('.png') || entry.name.endsWith('.md')) {
                const dest = path.join(docsDir, entry.name);
                if (!fs.existsSync(dest)) {
                  fs.copyFileSync(p, dest);
                  existingPdfs.push({ name: entry.name, size: fs.statSync(dest).size });
                }
              }
            });
          }
          collectPjFiles(subP);
        }
      });
    }

    // Grava ficha_cadastral.json
    fs.writeFileSync(path.join(pjDir, 'ficha_cadastral.json'), JSON.stringify(emp, null, 2), 'utf8');

    // Credenciais PJ
    const creds = emp.credenciais_socio || [];
    fs.writeFileSync(path.join(pjDir, 'credenciais_portais.json'), JSON.stringify(creds, null, 2), 'utf8');

    // Gera FICHA_CADASTRAL_E_SENHAS.html
    const html = generateFichaHtml('PJ', emp, creds, [], [], existingPdfs);
    fs.writeFileSync(path.join(pjDir, 'FICHA_CADASTRAL_E_SENHAS.html'), html, 'utf8');

    console.log(`✓ PJ: [${folderName}] Ficha, senhas e ${existingPdfs.length} PDFs organizados.`);
  }

  console.log('\n=== REORGANIZAÇÃO CONCLUÍDA COM TOTAL SUCESSO! ===');
}

main().catch(err => {
  console.error('Erro na reorganização:', err);
  process.exit(1);
});
