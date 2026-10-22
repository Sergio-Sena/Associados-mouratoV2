import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[postbuild] Erro: dist/index.html não encontrado!');
  process.exit(1);
}

const routesToMirror = [
  'ficha-cadastral',
  'onboarding',
  'cadastro',
  'ficha'
];

console.log('[postbuild] Espelhando index.html para rotas estáticas SPA...');

routesToMirror.forEach((route) => {
  const routeDir = path.join(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(routeDir, 'index.html'));
  fs.copyFileSync(indexPath, path.join(distDir, `${route}.html`));
  console.log(`  ✓ Rota gerada: dist/${route}/index.html & dist/${route}.html`);
});

// Fallback universal 404 para hosts estáticos/Amplify
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));
console.log('  ✓ Fallback gerado: dist/404.html');

console.log('[postbuild] Sucesso: Todas as rotas SPA físicas geradas com perfeição!');
