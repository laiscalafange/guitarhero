# BDSM de Garagem — tela inicial 1.6.0

## O que mudou

- A primeira tela agora é a capa do jogo: cenário em pixel art, título grande **BDSM DE GARAGEM**, indicação de até oito jogadores, texto de apresentação, botão START e Créditos.
- START abre o formulário de nome, código, personagem, criar sala e jogar sozinho, centralizado sobre o mesmo cenário.
- Voltar ao início retorna à capa e preserva o que foi digitado no formulário. A escolha de personagem continua salva neste navegador.
- Créditos abre uma janela com os personagens; o botão de fechar e Esc permitem voltar.
- Nome atualizado na aba, identidade visual, janela de personagens, README, pacote npm e mensagem de inicialização do servidor.

O novo fundo `public/assets/garage-title-night.png` foi preparado com Imagegen a partir da referência enviada, removendo os textos e botões da imagem. O título e os controles são HTML real, com foco de teclado, e não fazem parte da imagem.

## Arquivos principais

- `public/index.html`: capa, formulário e créditos.
- `public/css/title-screen.css`: aparência da capa e centralização do formulário, incluindo celular.
- `public/js/entrance.js`: transição START / entrada / voltar e janela de créditos.
- `public/assets/garage-title-night.png`: cenário.
- `package.json` / `package-lock.json`: nome `bdsm-de-garagem-multiplayer`, versão 1.6.0.

Os identificadores antigos das preferências locais foram mantidos para preservar teclas, volumes e personagem. O nome técnico do serviço no `render.yaml` foi mantido para não transformar uma atualização de aparência em criação de outro serviço via Blueprint. Isso não altera o novo nome exibido no site.

## Como ver e instalar

Prévia local: http://localhost:3003/. Atualize a aba para ver a capa nova.

Windows: extraia o pacote Windows e execute `npm start` com Node.js 24. Por padrão abre na porta 3000; o ambiente pode definir outra porta.

Render Free: substitua o conteúdo do repositório pelo pacote Render, mantendo o comando de build `npm ci --include=dev && npm run build:ai && npm run setup:youtube` e o comando de início `npm start`. A entrega não foi publicada na sua conta Render. O custo de processamento da IA no servidor não mudou: o cenário é uma imagem estática.

## O que foi conferido

Os 11 testes de interface e multiplayer passaram. No navegador foram conferidos capa, START, formulário central, voltar, créditos e entrada no modo solo. As duas telas também foram conferidas em 390 × 844, sem rolagem horizontal, e não foram encontrados erros no console nessa navegação.

## Como desfazer

O pacote anterior `guitaband-varanda-1.5.1-render.zip` foi preservado em outputs. Restaure essa versão ou o commit anterior no GitHub e publique novamente.

Há também uma cópia dos arquivos anteriores da interface e do servidor em `outputs/backup-antes-start-1.5.1`. Para uma reversão local da interface, restaure `index.html` em `public/`, `entrance.js` em `public/js/` e `entrance.css` em `public/css/`. O CSS e o cenário novos ficam sem uso quando o HTML anterior é restaurado.
