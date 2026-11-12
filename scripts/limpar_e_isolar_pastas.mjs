import fs from 'fs';
import path from 'path';

const BASE_TEIA = 'C:\\Teia de arranha';
const DIR_PF = path.join(BASE_TEIA, 'ClientesPF');
const DIR_ROBO = path.join(BASE_TEIA, 'Robo');
const DIR_OUTROS = path.join(BASE_TEIA, 'Outros_Arquivos_PDF');

const VALID_PF_FOLDERS = [
  'ANGELA_VITORIA_DE_PAULA_MAGALHAES_06962449267',
  'ERIVALDO_DOS_SANTOS_CAMILO_12144612471',
  'HELIA_MARIA_MOURATO_DA_SILVA_15391713889',
  'JOSE_JAILSON_MOURATO_DA_SILVA_31776959892',
  'JOSE_JAITON_MOURATO_F1DA80D8_6DBA_46E7_97F4_BCCE70019D2D',
  'LUIZ_CARLOS_SILVA_MARQUES_25472676835',
  'MARCOS_JOSE_DA_SILVA_11923123840',
  'NILSON_OLIVEIRA_DOS_SANTOS_08698640842',
  'SERGIO_PEREIRA_SENA_SERGIO',
  'SILVANEI_MARIANO_NUNES_26713421873'
];

async function clean() {
  console.log('=== LIMPANDO E ISOLANDO PASTAS DE CLIENTES ===');

  // Garante pastas destino
  const roboScripts = path.join(DIR_ROBO, 'motores_e_scripts');
  if (!fs.existsSync(roboScripts)) fs.mkdirSync(roboScripts, { recursive: true });
  if (!fs.existsSync(DIR_OUTROS)) fs.mkdirSync(DIR_OUTROS, { recursive: true });

  const items = fs.readdirSync(DIR_PF, { withFileTypes: true });

  for (const item of items) {
    const full = path.join(DIR_PF, item.name);

    if (item.isDirectory()) {
      if (VALID_PF_FOLDERS.includes(item.name)) {
        // Pasta oficial de cliente PF: MANTÉM!
        continue;
      }

      // Pastas antigas de sistema/build do robô: move para Robo/legado/
      const destDir = path.join(DIR_ROBO, 'legado_sistema', item.name);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(path.dirname(destDir), { recursive: true });
        try {
          fs.renameSync(full, destDir);
          console.log(`[DIR MOVIDO] ${item.name} -> Robo/legado_sistema/`);
        } catch (e) {
          console.log(`[AVISO DIR] ${item.name}: ${e.message}`);
        }
      }
    } else {
      // Arquivo solto na raiz de ClientesPF
      if (item.name.endsWith('.pdf')) {
        const destPdf = path.join(DIR_OUTROS, item.name);
        try {
          fs.renameSync(full, destPdf);
          console.log(`[PDF MOVIDO] ${item.name} -> Outros_Arquivos_PDF/`);
        } catch (e) {
          console.log(`[AVISO PDF] ${item.name}: ${e.message}`);
        }
      } else {
        const destScript = path.join(roboScripts, item.name);
        try {
          fs.renameSync(full, destScript);
          console.log(`[SCRIPT MOVIDO] ${item.name} -> Robo/motores_e_scripts/`);
        } catch (e) {
          console.log(`[AVISO SCRIPT] ${item.name}: ${e.message}`);
        }
      }
    }
  }

  // Também limpa pasta duplicada Mourato&Associados LTDA de ClientesPJ se já existe MOURATO_E_ASSOCIADOS_LTDA_38377738000145
  const pjMouratoAntiga = path.join(BASE_TEIA, 'ClientesPJ', 'Mourato&Associados LTDA');
  const pjMouratoNovaDocs = path.join(BASE_TEIA, 'ClientesPJ', 'MOURATO_E_ASSOCIADOS_LTDA_38377738000145', 'documentos_pdf');
  if (fs.existsSync(pjMouratoAntiga)) {
    fs.readdirSync(pjMouratoAntiga).forEach(f => {
      const src = path.join(pjMouratoAntiga, f);
      const dst = path.join(pjMouratoNovaDocs, f);
      if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
    });
    try {
      fs.rmSync(pjMouratoAntiga, { recursive: true, force: true });
      console.log('✓ Pasta duplicada Mourato&Associados LTDA mesclada com a oficial.');
    } catch (e) {}
  }

  console.log('=== LIMPEZA E ISOLAMENTO FINALIZADOS COM SUCESSO! ===');
}

clean().catch(console.error);

