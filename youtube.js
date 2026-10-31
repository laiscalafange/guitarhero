'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const MAX_AUDIO = 25 * 1024 * 1024;
const MAX_DURATION = 15 * 60;
const localBinary = path.join(__dirname, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const executable = process.env.YT_DLP_PATH || (fs.existsSync(localBinary) ? localBinary : 'yt-dlp');
const common = ['--ignore-config', '--no-playlist', '--no-warnings', '--no-progress', '--socket-timeout', '20', '--retries', '1', '--extractor-retries', '1', '--no-js-runtimes', '--js-runtimes', 'node:' + process.execPath];

function run(args, signal, timeout = 90000) {
  return new Promise((resolve, reject) => {
    execFile(executable, [...common, ...args], { signal, timeout, windowsHide: true, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (!error) return resolve(stdout);
      if (error.code === 'ENOENT') return reject(Error('YouTube não configurado no servidor. Execute npm run setup:youtube e reinicie o jogo.'));
      if (error.name === 'AbortError') return reject(Error('Importação cancelada: a sala foi encerrada.'));
      if (error.killed) return reject(Error('O YouTube demorou para responder. Tente outra música.'));
      // Não expõe URLs assinadas, detalhes internos nem caminhos do servidor.
      if (/sign in|bot|captcha|confirm your age|private video|unavailable|not available|403|429/i.test(stderr)) {
        return reject(Error('O YouTube bloqueou o acesso ou este vídeo exige login/está indisponível. Tente outro vídeo ou um arquivo do PC.'));
      }
      if (/max.filesize|larger than/i.test(stderr)) return reject(Error('O áudio ultrapassa 25 MB. Escolha outro vídeo.'));
      reject(Error('Não foi possível obter este áudio do YouTube. Tente outro vídeo ou atualize com npm run setup:youtube.'));
    });
  });
}
function videoId(value) {
  const raw = String(value || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'youtu.be') return videoId(url.pathname.slice(1).split('/')[0]);
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      const id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|embed)\//.test(url.pathname) ? url.pathname.split('/')[2] : null;
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
  } catch {}
  return null;
}
function cleanEntry(entry) {
  if (!entry || !/^[a-zA-Z0-9_-]{11}$/.test(entry.id)) return null;
  const duration = Number(entry.duration) || null;
  const live = entry.is_live || ['is_live', 'is_upcoming'].includes(entry.live_status);
  return { id: entry.id, title: String(entry.title || 'Música').slice(0, 160), channel: String(entry.channel || entry.uploader || '').slice(0, 100), duration,
    unavailable: live ? 'Transmissão ao vivo' : duration > MAX_DURATION ? 'Mais de 15 minutos' : null };
}
async function search(query, signal) {
  const id = videoId(query);
  const target = id ? 'https://www.youtube.com/watch?v=' + id : 'ytsearch6:' + query;
  const result = JSON.parse(await run(['--flat-playlist', '--dump-single-json', '--skip-download', '--', target], signal));
  return (result.entries || [result]).map(cleanEntry).filter(Boolean);
}
async function download(id, signal) {
  if (!videoId(id)) throw Error('Vídeo inválido.');
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'guitaband-'));
  // Reforça o limite em disco mesmo para respostas sem tamanho conhecido.
  let oversized = false;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const monitor = setInterval(() => {
    for (const name of fs.readdirSync(dir)) {
      try { if (fs.statSync(path.join(dir, name)).size > MAX_AUDIO) { oversized = true; controller.abort(); } } catch {}
    }
  }, 250);
  monitor.unref();
  try {
    // Um único formato de áudio: não precisa converter ou instalar FFmpeg.
    const output = await run(['--no-simulate', '--format', 'bestaudio[ext=m4a]/bestaudio[ext=webm]', '--max-filesize', String(MAX_AUDIO),
      '--match-filters', '!is_live & duration <= 900', '--output', path.join(dir, 'audio.%(ext)s'),
      '--print', 'after_move:%(.{id,title,duration,ext})j', '--', 'https://www.youtube.com/watch?v=' + id], controller.signal, 180000);
    if (!output.trim()) throw Error('Escolha um vídeo de até 15 minutos e 25 MB, que não seja ao vivo.');
    const info = JSON.parse(output.trim().split('\n').at(-1));
    if (!['m4a', 'webm'].includes(info.ext)) throw Error('Formato de áudio não suportado.');
    const file = path.join(dir, 'audio.' + info.ext);
    const stat = await fsp.stat(file);
    if (!stat.size || stat.size > MAX_AUDIO) throw Error('O áudio está vazio ou ultrapassa 25 MB.');
    return { bytes: await fsp.readFile(file), mime: info.ext === 'm4a' ? 'audio/mp4' : 'audio/webm', name: String(info.title || 'Música do YouTube').slice(0, 90), duration: info.duration, sourceId: id };
  } catch (error) {
    if (oversized) throw Error('O áudio ultrapassa 25 MB. Escolha outro vídeo.');
    if (error.code === 'ENOENT') throw Error('O download não retornou um áudio. Tente outro vídeo.');
    throw error;
  } finally {
    clearInterval(monitor);
    signal?.removeEventListener('abort', abort);
    await fsp.rm(dir, { recursive: true, force: true });
  }
}
module.exports = { search, download, videoId };
