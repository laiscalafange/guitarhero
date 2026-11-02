# Área de músicas — 1.7.0

## Organização da tela

O painel de músicas agora ocupa toda a largura da sala e fica separado de Banda, Ajustes e Histórico. No computador, as ações de adicionar ficam à esquerda e a playlist à direita. No celular, os cartões se empilham.

1. **Música selecionada:** nome, duração, origem, instrumentos disponíveis e estado atual. O cartão acompanha a escolha da sala.
2. **Adicionar músicas:** Exemplos, Meu arquivo, YouTube e Partituras prontas, com campos, botões, espaçamentos e mensagens padronizados. As abas também aceitam setas, Home e End.
3. **Prontas para jogar:** músicas já preparadas, escolher, sortear e remover.
4. **Em preparação:** ordem, progresso, falhas, prioridade e cancelamento em segundo plano. As opções de aparelho e GPU ficam em Opções de preparação.
5. **Estado da música selecionada:** mensagens e controles de preparação permanecem juntos abaixo dos cartões.

A importação local de partituras fica em Já tem um pacote no computador? na aba Partituras prontas. Explicações mais longas e bibliotecas extras ficam em seções recolhíveis.

## Separação do código

- `public/css/music-room.css`: layout e estilos somente da área de músicas.
- `public/js/music-ui.js`: cartão da música atual, textos das abas e navegação por teclado. Recebe informações resumidas do jogo.
- `public/js/game.js`: continua responsável por áudio, rede, importações e fila. Envia os dados da música atual para `JamMusicUI.updateCurrent(...)` e informa mudanças de aba a `JamMusicUI.setSource(...)`.
- `public/index.html`: estrutura dos cartões e carregamento dos arquivos.

O estilo está limitado ao elemento `#musicRoom`, classe `.music-room`, para facilitar a próxima estilização por personagem. A base atual é neutra.

## Preparado para as paletas dos personagens

As cores são variáveis CSS no começo de `music-room.css`:

| Variável | O que controla |
| --- | --- |
| `--music-bg` | Fundo dos cartões |
| `--music-surface` / `--music-raised` | Campos, linhas e superfícies destacadas |
| `--music-text` / `--music-muted` | Textos principais e auxiliares |
| `--music-border` | Bordas |
| `--music-accent` | Seleção, botões principais e destaque |
| `--music-success` / `--music-error` | Pronto e falha |
| `--music-radius` / `--music-shadow` | Cantos e sombra |
| `--music-font` | Fonte dos controles |

Na próxima etapa, uma paleta poderá substituir essas variáveis sem refazer buscas, fila ou importações. Exemplo de alteração local simples: trocar `--music-accent:#e8bf83` muda o destaque da área inteira.

## Verificação

- Suíte completa: **51 testes aprovados**, um teste POSIX pulado no Windows.
- Nenhum ID duplicado no HTML.
- Navegador: entrada no modo solo, troca de exemplo, atualização do cartão e navegação das abas por teclado.
- Importação real da partitura de exemplo de seis segundos pelo navegador: adicionada em Prontas para jogar, selecionada e exibida corretamente no cartão, com duração, origem e guitarra. Sem usar IA nessa importação.
- Layout conferido no computador e em 390 × 844, sem rolagem horizontal; nenhum erro no console nessa navegação.

## Como ver e instalar

Use http://localhost:3003/. Atualize após sair de uma partida e entre na sala novamente. Esta atualização não reiniciou o servidor local durante o trabalho.

Render: envie o conteúdo do pacote Render 1.7.0 ao repositório e mantenha os comandos existentes de build e início. Windows: extraia o pacote Windows e execute `npm start`. A entrega não foi publicada na sua conta Render. Não há nova dependência nem modelo de IA nesta atualização.

## Como desfazer

Os arquivos anteriores estão em `outputs/backup-antes-musicas-1.6.1`. Restaure `index.html` em `public/` e `game.js` em `public/js/`. Os novos arquivos CSS/JS ficam sem uso quando o HTML anterior volta. Para voltar a entrega inteira, use os pacotes 1.6.1 preservados ou restaure o commit anterior no GitHub.
