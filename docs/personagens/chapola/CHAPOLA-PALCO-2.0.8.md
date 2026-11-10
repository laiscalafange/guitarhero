# Braço, notas e efeitos do Chapola — 2.0.8

## O que mudou no visual

O braço recebeu acabamento escuro, bordas vermelhas com filetes de metal, rebites, marcas discretas de desgaste e detalhes em perspectiva. Ao acumular combo, o vermelho ganha intensidade e pequenos traços de energia percorrem as bordas.

As notas redondas foram substituídas, no Chapola, por gemas facetadas com aro de metal, centro colorido e reflexo claro. As cores das pistas foram preservadas para continuar fácil distinguir qual tecla corresponde a cada nota. O bumbo da bateria continua sendo uma barra larga laranja, agora com acabamento de metal.

As notas longas têm uma fita colorida com contorno escuro, um fio de luz central e uma ponta marcada. Quando a tecla está pressionada durante a nota, o rastro recebe detalhes de energia em movimento.

Os alvos das teclas viraram placas hexagonais, com aro na cor da pista e letras claras. Eles usam os nomes reais das teclas configuradas pelo jogador. Acertos geram clarões, ondas geométricas e pequenas faíscas em vermelho e marfim.

O placar ganhou uma moldura própria, selo B do Chapola, multiplicador em uma placa de metal e medidor de progresso do combo. Os textos de julgamento têm contorno escuro, sublinhado e pequenos traços de impacto. O menu da partida e a barra de progresso também receberam acabamento na mesma paleta.

## Funcionamento preservado

O novo desenho só é usado quando o personagem selecionado é o Chapola. Os demais personagens continuam com o visual padrão.

Não foram alterados os instantes das notas, a perspectiva e posição delas, os botões configurados, as janelas de acerto, as regras de sustain, a pontuação, o combo ou o multiplicador. O desenho lê os resultados do jogo para produzir os efeitos.

O breu, os sete tipos de olhos, a duração maior e o preto uniforme da versão 2.0.7 foram preservados. Os controles de movimento reduzido continuam sendo respeitados: partículas e deslocamentos decorativos do braço são removidos nessa preferência.

## Organização dos arquivos

- `public/js/chapola-stage.js`: novo arquivo dedicado ao desenho do braço, trilhos, gemas, rastros, alvos, placar e efeitos. Não altera dados do jogador nem calcula acertos.
- `public/js/chapola-theme.js`: encaminha as chamadas de desenho do Chapola ao arquivo novo e aplica a preferência de movimento reduzido.
- `public/js/game.js`: chama o desenho personalizado nas funções que exibem as notas e o jogador. O caminho padrão continua disponível para os demais personagens.
- `public/css/chapola-theme.css`: acabamento do cabeçalho da partida, botões e barra de progresso.
- `public/index.html`: carrega o arquivo novo e atualiza as versões dos scripts e do CSS.
- `tests/chapola-stage.test.js`: valida o desenho com dados imutáveis, dimensões, bumbo e movimento reduzido.
- `tests/render-lanes.test.js`: confere cinco instrumentos com o visual padrão, o desenho anterior e o novo palco.
- `package.json` e `package-lock.json`: versão 2.0.8.

O arquivo antigo `chapola-renderer.js` continua responsável pelo fundo do pub e pelo desenho anterior usado como alternativa. A animação dos olhos permanece separada em `chapola-haunting.js`.

## Peso e Render Free

O arquivo novo do palco tem cerca de 10,5 KB, sem compressão. Não há imagem, vídeo, modelo de IA ou biblioteca nova. Os efeitos são desenhos em Canvas no navegador. A configuração do servidor e da hospedagem Render Free foi preservada.

## Verificação

Na suíte completa, 70 testes passaram, sem falhas, e um teste específico de POSIX foi pulado no Windows. Depois do último ajuste de leitura do placar, os quatro testes do novo palco e da integração de renderização foram repetidos e passaram.

Os testes cobrem os cinco instrumentos, de uma a cinco pistas, notas simultâneas, sustain, bumbo, erros, teclas personalizadas, acertos, combos e movimento reduzido. Também verificam que o desenho não modifica jogador, notas, partículas ou o estado do contexto de desenho.

Foi comparado o `game.js` com a cópia anterior: as alterações ficaram restritas ao trecho que desenha notas e jogador. O código antes desse trecho e a partir de `drawFx` permanece igual, incluindo controles, áudio e regras.

No navegador, foram jogadas rodadas completas de Ensaio vocal: bateria em 1280 × 720 e baixo em 390 × 844. Foram conferidos o bumbo largo, as gemas, os rastros, as teclas A/S/G/H, efeitos de acerto, a transição de breu e a volta do pub. Não apareceram erros de console nessas rodadas.

Os níveis mais altos de combo foram verificados em testes de desenho com estados imutáveis; nas rodadas do navegador, foram registrados acertos e sequências curtas.

Capturas no computador: `outputs/chapola-palco-{bateria,acertos,combo,breu,volta}-2.0.8.jpg`.

Capturas no celular: `outputs/chapola-palco-celular-{notas,sustain,acertos,breu,volta}-2.0.8.jpg`.

## Ver e instalar

Atualize http://localhost:3003/ e jogue com o Chapola.

Pacotes completos: `outputs/bdsm-de-garagem-2.0.8-render.zip` e `outputs/bdsm-de-garagem-2.0.8-windows.zip`. A instalação segue as instruções já existentes no projeto. A hospedagem não foi publicada automaticamente.

O guia da mudança anterior é [`CHAPOLA-SO-OLHOS-2.0.7.md`](CHAPOLA-SO-OLHOS-2.0.7.md), incluído no projeto e em `outputs/`. Ele descreve as imagens dos olhos e como desfazer essa parte separadamente.

## Desfazer só a nova estética do braço

A cópia anterior está em `outputs/backup-antes-braco-chapola-2.0.7`. Feche a partida e restaure:

1. `index.html` em `outputs/Guitaband-Varanda/public/`.
2. `game.js` e `chapola-theme.js` em `outputs/Guitaband-Varanda/public/js/`.
3. `chapola-theme.css` em `outputs/Guitaband-Varanda/public/css/`.
4. `render-lanes.test.js` em `outputs/Guitaband-Varanda/tests/`.
5. `package.json` e `package-lock.json` na raiz de `outputs/Guitaband-Varanda/`.
6. Atualize a aba.

O arquivo novo `chapola-stage.js` deixa de ser carregado pelo jogo ao restaurar esses arquivos. Não é necessário apagar imagens, músicas ou preferências. Os pacotes completos 2.0.7 foram preservados para restaurar a versão anterior inteira, mantendo os olhos novos e o breu prolongado.
