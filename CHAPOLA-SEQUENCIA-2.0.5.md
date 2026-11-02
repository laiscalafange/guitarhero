# Breu antes e depois das aparições — 2.0.5

## A nova ordem

A sequência agora tem cinco etapas separadas:

1. O pub apaga gradualmente, sem nenhuma aparição.
2. O cenário fica totalmente preto por um intervalo, ainda vazio.
3. Começam os olhos, os pequenos brilhos e as presenças discretas.
4. Todos os elementos desaparecem. O breu permanece vazio por mais um intervalo.
5. Só então a iluminação do pub volta gradualmente.

As notas, os controles e a pontuação continuam visíveis. O fundo fica preto 100% opaco durante as pausas e as aparições. Não há olhos ou figuras durante as transições de luz.

No exemplo Ensaio vocal, de 25 segundos, os tempos aproximados são:

| Etapa | Intervalo |
| --- | --- |
| Apagar | 4,50 a 6,92 s |
| Breu vazio | 6,92 a 8,30 s |
| Aparições | 8,30 a 17,61 s |
| Breu vazio novamente | 17,61 a 19,68 s |
| Luz voltando | 19,68 a 21,75 s |

O efeito começa em 18% da música, dura até 80 segundos e se adapta à duração da faixa. Músicas com menos de dez segundos não usam a sequência.

## Mais presenças, discretas e ligadas ao ambiente

Agora há seis tipos de figura: monstro, rosto, caveira, vulto, fragmento de rosto espreitando e retrato vermelho. Eles se revezam em até dez passagens, sempre com no máximo uma dessas figuras por vez e com pausas. Faixas muito curtas usam seis passagens para que cada tipo tenha sua vez.

Cada passagem dura até 1,35 segundo. No exemplo de 25 segundos, dura cerca de 0,71 segundo, com cerca de 0,22 segundo entre passagens. Os olhos e brilhos permanecem em uma camada independente por mais tempo, dentro do período reservado às aparições.

As figuras estão presas às posições da porta, do espelho, da bateria e da mobília no desenho original do pub. Parte delas fica encoberta nesses pontos. No celular, a posição é adaptada ao trecho visível do cenário.

Além das bordas suaves, cada figura recebe uma máscara de sombra lateral: só uma parte do rosto conserva luminosidade. Um deslocamento de poucos pixels sugere alguém espreitando atrás do anteparo, sem aumentar a imagem em direção ao jogador. A pista fica na frente das presenças. O resultado continua muito escuro, para ser percebido discretamente.

Foram reutilizados os arquivos existentes. O vulto usa um recorte do rosto de `vortex.jpg`, sem o cenário circular ao redor; o fragmento de rosto usa `watching.jpg`. As imagens originais não foram alteradas.

## Arquivos alterados

- `public/js/chapola-haunting.js`: etapas de luz, pausas de breu vazio, sequência ampliada, posições e movimento de espreita.
- `public/js/chapola-theme.js`: recortes, máscara de sombra preparada em memória e descrição do ajuste.
- `public/index.html`: versão dos scripts para carregar a atualização.
- `tests/chapola-haunting.test.js`: ordem das etapas, intervalo vazio, presenças e enquadramento.
- `package.json` e `package-lock.json`: versão 2.0.5.

Esta mudança afeta a apresentação do Chapola. Áudio, sincronização, notas, pontuação, instrumentos, teclas, fila de análise e salas mantêm o funcionamento anterior. O efeito continua opcional em Ajustes → Visual do Chapola e respeita movimento reduzido.

## Peso e Render Free

Não foi acrescentado modelo de IA, vídeo ou dependência de servidor. Os recortes e as máscaras são preparados uma vez, em camadas limitadas a 512 pixels no maior lado. A animação reutiliza essas camadas e continua no navegador. A configuração de hospedagem no Render Free foi preservada.

## Verificação

Dez testes aprovados, sem falhas, executando:

`node --test tests/chapola-haunting.test.js tests/chapola-theme.test.js tests/render-lanes.test.js`

Os testes verificam que nenhuma aparição existe enquanto a luz apaga ou volta, que há breu vazio antes e depois, e que as figuras se revezam. Também cobrem durações diferentes, opção desligada, movimento reduzido, imagens ainda não carregadas, tamanhos de tela e os cinco instrumentos com acertos e combos.

No navegador, foram jogadas rodadas completas do exemplo Ensaio vocal em 1280 × 720 e 390 × 844, usando as teclas A/S/G/H. Foram conferidas as duas pausas de breu vazio, as figuras parcialmente encobertas e a volta da iluminação. Não apareceram erros de console.

Capturas no computador: `outputs/chapola-sequencia-{before,black-before,demon,face,skull,shadow,watching,redPortrait,eyes,black-after,after}-2.0.5.jpg`.

Capturas no celular: `outputs/chapola-sequencia-celular-{black-before,skull,shadow,eyes,black-after,after}-2.0.5.jpg`.

## Ver e instalar

Atualize http://localhost:3003/ e jogue com o Chapola e Assombrações no palco ligada.

Pacotes completos: `outputs/bdsm-de-garagem-2.0.5-render.zip` e `outputs/bdsm-de-garagem-2.0.5-windows.zip`. A instalação segue as instruções já existentes no projeto. A hospedagem não foi publicada automaticamente.

## Desfazer esta alteração

A cópia da versão anterior está em `outputs/backup-antes-sequencia-pub-2.0.4`. Feche a partida e restaure:

1. `index.html` em `outputs/Guitaband-Varanda/public/`.
2. `chapola-haunting.js` e `chapola-theme.js` em `outputs/Guitaband-Varanda/public/js/`.
3. `chapola-haunting.test.js` em `outputs/Guitaband-Varanda/tests/`.
4. `package.json` e `package-lock.json` na raiz de `outputs/Guitaband-Varanda/`.
5. Atualize a aba do jogo.

Os ZIPs completos 2.0.4 também foram preservados. Não é necessário apagar imagens ou músicas para reverter esta mudança.
