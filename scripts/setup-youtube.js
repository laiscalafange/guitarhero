'use strict';
// Instala somente dentro deste projeto; não altera PATH nem instalações do Windows.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

async function main() {
  const file = process.platform === 'win32' ? 'yt-dlp.exe' : process.platform === 'linux' ? 'yt-dlp_linux' : 'yt-dlp_macos';
  if (!['win32', 'linux', 'darwin'].includes(process.platform) || process.arch !== 'x64') {
    throw Error('Instale yt-dlp para seu sistema e configure YT_DLP_PATH. Consulte README.md.');
  }
  const dir = path.join(__dirname, '..', 'bin');
  await fs.mkdir(dir, { recursive: true });
  const base = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
  console.log('Baixando yt-dlp da distribuição oficial do projeto…');
  const sums = await fetch(base + 'SHA2-256SUMS', { signal: AbortSignal.timeout(120000) });
  if (!sums.ok) throw Error('Não foi possível obter a verificação SHA-256: HTTP ' + sums.status);
  const line = (await sums.text()).split('\n').find(line => line.trim().endsWith(' ' + file));
  if (!line) throw Error('Arquivo ausente na lista de verificação oficial.');
  const response = await fetch(base + file, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw Error('Falha no download: HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (hash !== line.split(/\s+/)[0]) throw Error('SHA-256 diferente do oficial. Instalação cancelada.');
  const target = path.join(dir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  await fs.writeFile(target, bytes, { mode: 0o755 });
  console.log('Pronto. YouTube configurado apenas na pasta bin deste projeto.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
