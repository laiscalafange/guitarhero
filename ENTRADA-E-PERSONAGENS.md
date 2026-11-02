# Entrada da varanda e seleção de personagens

Esta versão parte do `guitarhero.zip` enviado em 01/11/2026, que já tinha o código dividido em CSS e JavaScript, quantidade de teclas, volumes separados, prontidão e histórico. O projeto anterior em `Guitaband-IA` foi preservado.

## O que mudou

- Entrada com a imagem de varanda em pixel art fornecida por você: cidade à noite, pôsteres, instrumentos e luzes quentes. A imagem realista não foi usada.
- Tipografia e detalhes com uma direção de quadrinhos e videogame, em roxo, creme e amarelo.
- Formulário de nome e código, criação de sala e modo solo reorganizados.
- Seleção com sete personagens: Chapola, Irisu, Roberto Montanna, Ratazana, Lizzi / Raul Ameixas, Johgi e Tatsugiri. As descrições das fichas foram transcritas; Johgi usa o texto enviado no chat.
- A escolha é solicitada antes de entrar se ainda não houver personagem salvo. Fechar ou apertar Esc cancela a escolha sem iniciar a sala. Confirmar retoma a ação de entrar/criar/jogar sozinho que você havia escolhido.
- O personagem fica salvo neste navegador em `guitaband-avatar-v1`, pode ser trocado antes de entrar e aparece na lista da banda para os demais jogadores. O servidor aceita somente os sete IDs conhecidos.
- Personagens não limitam a escolha de instrumentos: os favoritos na ficha são apenas descrição.

As imagens originais dos seis personagens com arte avulsa foram copiadas. Para Johgi, que veio apenas na ficha com várias poses, foi preparada uma versão com fundo transparente a partir da pose frontal, usando Imagegen. A ficha original também foi mantida em `public/assets/avatars/gio.jpg`. O ID interno `gio` foi preservado; o nome exibido é Johgi.

## Arquivos principais

- `public/index.html`: estrutura da entrada e janela de personagens.
- `public/css/entrance.css`: visual da entrada, seletor e adaptação para celular.
- `public/js/entrance.js`: fichas, escolha, confirmação e preferência local.
- `public/assets/`: fundo e artes dos personagens.
- `public/js/game.js`: solicitação da escolha antes de entrar e avatar na lista da banda.
- `server.js`: entrega das imagens e validação do ID do avatar.

Não há execução adicional de IA no servidor para esse visual. O cenário e os personagens são arquivos estáticos enviados ao navegador. A prévia local está na porta 3003; o pacote usa `npm start` e a porta definida pelo ambiente, como antes.

## Validação

Foi executada a suíte completa: 50 testes passaram e um teste POSIX ficou pulado no Windows. Depois foi acrescentado e aprovado um teste de compartilhamento dos avatares, tipos de imagens e bloqueio de caminhos fora da pasta pública. Os testes antigos que ainda procuravam JavaScript dentro do HTML foram atualizados para ler os arquivos externos do ZIP enviado.

No navegador: seleção obrigatória, confirmação de Johgi, persistência após recarregar, avatar na banda, criação de sala, prontidão e início da partida. Entrada e seletor também conferidos em viewport de 390 × 844, sem rolagem horizontal.

## Instalar e hospedar

Extraia o ZIP para Windows e execute `npm start` com Node.js 24. Para o Render, envie todo o conteúdo do ZIP Render ao repositório e mantenha Web Service / Node / Free, Build Command `npm ci --include=dev && npm run build:ai && npm run setup:youtube`, Start Command `npm start`. O `render.yaml` está incluído. Esta entrega não foi publicada na sua conta Render.

## Desfazer

O ZIP original em Downloads não foi alterado. Para desfazer tudo, restaure o projeto a partir dele ou volte ao commit anterior à atualização no GitHub e publique novamente. Os pacotes anteriores em outputs também foram preservados.

Para remover só o visual e os avatares, restaure `public/index.html`, `public/js/game.js` e `server.js` do ZIP original. Os arquivos extras de CSS, JS e imagens podem ficar sem uso. Para trocar apenas textos e gostos, edite os dados no começo de `public/js/entrance.js`.
