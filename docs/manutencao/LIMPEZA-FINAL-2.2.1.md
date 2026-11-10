# Limpeza da versão final — 2.2.1

Foram retirados 34 arquivos obsoletos da árvore atual do repositório, somando 25.468.142 bytes, aproximadamente 25,5 MB (24,3 MiB). O histórico do Git foi preservado: essa redução vale para os arquivos da versão atual e para o ZIP dessa versão, sem reescrever commits antigos.

## O que saiu e por quê

- Avatares PNG, fundos e estilos de uma interface anterior que já não são carregados pelo HTML, pelos scripts ou pelos temas atuais.
- Uma cópia antiga do JavaScript em public/css/game.js e uma página de teste antiga em tests/index.html.
- A ficha antiga gio.jpg: a seleção usa johgi.png e o perfil usa johgi-face-v2.png.
- A foto demon-photo.png de uma animação anterior; o breu atual usa apenas o catálogo de olhos.
- O hibiscus.svg sem referência na interface; as flores atuais são desenhadas pelo tema.
- Dois logs locais de prévia também foram retirados da pasta de execução; eles já eram ignorados pelo Git.

Os avatares JPG dos outros personagens são carregados por caminhos montados em JavaScript e foram mantidos. A galeria secreta do Chapola ainda usa fotos que não aparecem no breu; essas imagens também foram mantidas. Os arquivos WASM de CPU/GPU, o modelo Basic Pitch, os fontes de compilação, os testes e os avisos de licença continuam incluídos.

A análise segue preparando guitarra, baixo, bateria, vocal e teclado. O teste de somente guitarra e os experimentos audio2chart estão fora da pasta publicada. Não houve mudança nas regras, controles, pontuação ou tempos das notas nesta limpeza. A limitação atual da importação do YouTube continua registrada no README.

## Inventário de remoções do repositório

| Arquivo | Bytes |
|---|---:|
| `public/assets/avatars/gio.jpg` | 324.233 |
| `public/assets/chapola/demon-photo.png` | 1.588.986 |
| `public/assets/johgi/hibiscus.svg` | 835 |
| `public/assets/avatar-sprites.png` | 4.031 |
| `public/assets/avatars/chapola-perfil.png` | 1.346.708 |
| `public/assets/avatars/chapola.png` | 852.100 |
| `public/assets/avatars/irisu-perfil.png` | 1.457.416 |
| `public/assets/avatars/irisu.png` | 1.141.176 |
| `public/assets/avatars/lizz-perfil.png` | 1.383.760 |
| `public/assets/avatars/lizz.png` | 998.594 |
| `public/assets/avatars/ratazana-perfil.png` | 2.051.990 |
| `public/assets/avatars/ratazana.png` | 1.854.523 |
| `public/assets/avatars/roberto-montanna-perfil.png` | 1.351.951 |
| `public/assets/avatars/roberto-montanna.png` | 967.938 |
| `public/assets/avatars/tatsugiri-perfil.png` | 970.197 |
| `public/assets/avatars/tatsugiri.png` | 1.246.469 |
| `public/assets/avatars/vana-perfil.png` | 245.925 |
| `public/assets/avatars/vana.png` | 1.613.959 |
| `public/assets/bg-componentes-jam.png` | 1.334.247 |
| `public/assets/bg-home-jam.png` | 2.272.876 |
| `public/assets/bg-main-jam.png` | 2.122.259 |
| `public/assets/garage-night.svg` | 5.254 |
| `public/assets/garage-pixel-night.png` | 14.668 |
| `public/css/game.js` | 99.828 |
| `public/css/jam-avatars.css` | 27.242 |
| `public/css/jam-stage.css` | 4.178 |
| `public/css/jam-theme.css` | 78.006 |
| `public/css/redesign.css` | 13.923 |
| `public/css/redesign.js` | 21.321 |
| `public/css/visual-v2.css` | 11.737 |
| `public/css/visual-v3.css` | 19.146 |
| `public/js/jam-effects.js` | 3.825 |
| `public/js/redesign.js` | 20.936 |
| `tests/index.html` | 17.905 |

## Validação da versão limpa

- Suíte completa: 84 testes aprovados, nenhuma falha e um teste POSIX pulado no Windows.
- Verificação HTTP de 78 endereços: scripts, estilos, fundos, avatares dinâmicos dos sete personagens, galeria secreta, olhos, workers, bibliotecas WASM e modelo de notas responderam com sucesso.
- A verificação dos arquivos não inclui uma revisão visual automatizada no Chrome.

## Como desfazer

O backup local completo dos arquivos retirados está em outputs/backup-limpeza-final-2.2.1 no workspace. O manifest.json contém caminho, tamanho e SHA-256 de cada cópia. As subpastas jogo/ e repositorio/ correspondem às pastas originais. Restaure os arquivos desejados nos mesmos caminhos relativos. Esse backup fica fora da pasta do jogo e não será enviado ao GitHub.

No Git, reverta o commit da limpeza para restaurar os arquivos que eram versionados. Os documentos de versões anteriores foram preservados como histórico; alguns descrevem recursos ou arquivos substituídos por versões posteriores.
