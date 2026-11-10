# Sala inteira com abas — 1.8.0

Esta atualização organiza toda a sala do jogo, tomando a estrutura da referência enviada como base. O padrão visual é neutro e compartilhado entre as áreas, preparado para uma futura personalização por personagem.

## Estrutura

| Aba | Conteúdo |
| --- | --- |
| Banda | Instrumento, dificuldade, teclas, participantes e ajuda para jogar |
| Músicas | Música selecionada, exemplos, arquivos, YouTube e biblioteca de partituras |
| Fila | Prontas para jogar, músicas em preparação, prioridade, remoção e opções de análise |
| Histórico | Totais da sala e resultados por rodada |
| Ajustes | Controles, áudio e ritmo/sincronização, agrupados em seções |

Ao entrar, Banda é a aba inicial. O cabeçalho permite navegar por clique, setas, Home e End.

O painel Sua sessão reúne a música e prontidão, convite, trocar sala, Estou pronto, início da partida e mensagens da conexão. No computador ele acompanha a rolagem ao lado do conteúdo. No celular aparece antes da área da aba. O menu de abas permanece acessível no topo durante a rolagem.

Os atalhos Escolher música, Ver fila e Abrir fila levam à área correspondente. Um botão de consultar partitura dentro da fila abre automaticamente Músicas na origem Partituras prontas.

## Preservação do estado

Mudar de aba apenas alterna a visibilidade dos painéis. Os campos, controles, lista de músicas e tarefas não são recriados. Busca digitada, músicas recebidas e preparação em segundo plano permanecem no mesmo estado. Os controles de prontidão e início são únicos e continuam usando as regras multiplayer existentes.

Os ajustes foram agrupados movendo os controles existentes: Teclado e controles, Áudio e Ritmo e sincronização. O conjunto de teclas, volumes e atrasos já salvo continua sendo usado.

## Arquivos

- `public/index.html`: cabeçalho, cinco painéis e sessão lateral.
- `public/js/room-ui.js`: navegação, organização dos ajustes, perfil e contador da fila.
- `public/css/room-shell.css`: padrão visual de toda a sala e adaptação para celular.
- `public/js/game.js`: informa dados de sessão/fila e abre a aba correta nos atalhos da biblioteca.
- `public/js/music-ui.js` e `public/css/music-room.css`: continuam cuidando da apresentação específica de músicas.

## Preparado para estilizar por personagem

As variáveis no começo de `room-shell.css`, em `#setup`, controlam a sala inteira: `--room-bg`, `--room-surface`, `--room-raised`, `--room-border`, `--room-text`, `--room-muted`, `--room-accent`, `--room-success`, `--room-danger` e `--room-radius`.

A área de músicas recebe as mesmas cores por meio de suas variáveis `--music-*`. Assim uma futura paleta poderá alcançar cabeçalho, Banda, Músicas, Fila, Ajustes, Histórico e sessão lateral, sem refazer o funcionamento das abas.

## Verificação

- Suíte completa: **51 testes aprovados**, um teste POSIX pulado no Windows.
- HTML com 161 IDs únicos, sem duplicações.
- No navegador: navegação pelas cinco abas, preservação da busca ao alternar e agrupamento dos ajustes.
- Fluxo completo: importação de uma partitura de teste de seis segundos em Músicas, escolha em Fila, prontidão em Banda, início e término da rodada, retorno e resultado em Histórico.
- Cinco abas verificadas em 390 × 844, sem rolagem horizontal e sem erros no console nessa navegação.

## Prévia e instalação

http://localhost:3003/. Atualize após sair da partida e entre novamente na sala. O servidor local não foi reiniciado durante esta alteração.

Os pacotes 1.8.0 para Render e Windows incluem tudo desta versão. O Render mantém os comandos anteriores de build e início; esta alteração não foi publicada na sua conta. Não há dependência nem modelo de IA novo.

## Desfazer

Os arquivos anteriores estão em `outputs/backup-antes-abas-sala-1.7.0`. Para desfazer a reorganização local, restaure `index.html` em `public/` e `game.js` em `public/js/`. Os arquivos novos de sala ficam sem uso. O `music-ui.js` também foi guardado, embora não tenha sido alterado nesta etapa.

Para uma reversão completa da entrega, os ZIPs 1.7.0 anteriores foram preservados. Na hospedagem, volte ao commit anterior e publique novamente.
