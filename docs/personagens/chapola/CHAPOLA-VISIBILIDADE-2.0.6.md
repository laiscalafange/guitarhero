# Aparições mais cedo e mais visíveis — 2.0.6

## O que mudou

O efeito começa mais cedo na música. Depois que o pub fica totalmente preto, a espera até a primeira figura foi reduzida para aproximadamente 0,25 a 0,35 segundo, conforme a duração da faixa. A ordem foi preservada: apagar, breu vazio curto, aparições, breu vazio e iluminação voltando.

No exemplo Ensaio vocal, de 25 segundos, a primeira figura começa por volta de 4,05 segundos de música, em vez de 8,30 segundos. Numa faixa de três minutos, começa perto de 9,55 segundos, em vez de aproximadamente 50 segundos. O tempo considera o início do áudio, após a contagem de preparação.

## Figuras mais perceptíveis

Rostos e bichos receberam mais brilho, contraste e opacidade. As imagens originalmente mais escuras têm uma compensação maior de brilho. A máscara de sombra lateral foi suavizada para deixar uma parte maior do rosto reconhecível, mantendo as bordas dissolvidas no preto.

As figuras também ficaram um pouco maiores e permanecem por mais tempo: até 2,4 segundos por passagem. No exemplo de 25 segundos, cada uma fica cerca de 1,22 segundo, em vez de 0,71 segundo. No celular, os pontos foram deslocados um pouco para as laterais para evitar que a pista esconda a maior parte da figura.

Os recortes ligados à porta, ao espelho e à mobília, a parte encoberta das figuras e o pequeno movimento de espreita foram preservados. Há no máximo um rosto ou bicho por vez. Os olhos continuam em uma camada independente.

Os seis tipos se revezam em seis passagens nas faixas muito curtas, dez nas intermediárias e vinte nas que têm um período maior de aparições. Isso mantém mais oportunidades de perceber as figuras durante músicas longas.

## Exemplo de 25 segundos

| Etapa | Intervalo aproximado |
| --- | --- |
| Pub apagando | 2,50 a 3,70 s |
| Breu vazio curto | 3,70 a 4,05 s |
| Aparições | 4,05 a 18,20 s |
| Tudo some; breu vazio | 18,20 a 19,00 s |
| Luz voltando | 19,00 a 20,50 s |

O fundo continua preto 100% opaco durante o breu. As figuras e os olhos só aparecem depois de apagar completamente e somem antes de a iluminação voltar. A pista, as notas, os controles e a pontuação continuam visíveis.

## Arquivos alterados

- `public/js/chapola-haunting.js`: início antecipado, pausa menor, permanência, tamanho, opacidade e posição das presenças.
- `public/js/chapola-theme.js`: tratamento de brilho e máscara de sombra das imagens.
- `public/index.html`: versão dos scripts para carregar a mudança.
- `tests/chapola-haunting.test.js`: tempos, duração, ordem das transições, tamanho, opacidade e enquadramento.
- `package.json` e `package-lock.json`: versão 2.0.6.

Esta alteração afeta somente a apresentação do Chapola. Notas, sincronização, áudio, pontuação, instrumentos, teclas, salas e fila de análise foram preservados. O efeito continua opcional e respeita movimento reduzido.

## Peso e hospedagem

Não foram acrescentadas imagens, modelos de IA, vídeos ou dependências. Os filtros e as máscaras continuam sendo preparados uma vez em camadas de até 512 pixels. A configuração do Render Free foi preservada.

## Verificação

Onze testes aprovados, sem falhas:

`node --test tests/chapola-haunting.test.js tests/chapola-theme.test.js tests/render-lanes.test.js`

Os testes incluem a primeira figura antes de dez segundos, pausa curta após apagar, duração suficiente no exemplo curto, ausência de imagens nas transições de luz, revezamento, opacidade, recorte, telas diferentes e cinco instrumentos com acertos e combos.

Também foram jogadas rodadas completas de Ensaio vocal em 1280 × 720 e 390 × 844, com as teclas A/S/G/H. Foram registradas as seis figuras, o breu vazio e a volta da iluminação. Não apareceram erros de console. O brilho das imagens mais escuras recebeu um último ajuste, conferido na rodada do celular.

Capturas no computador: `outputs/chapola-visibilidade-{before,black-before,demon,face,skull,shadow,watching,redPortrait,black-after,after}-2.0.6.jpg`.

Capturas no celular: `outputs/chapola-visibilidade-celular-{demon,face,skull,redPortrait,black-after,after}-2.0.6.jpg`.

## Ver e instalar

Atualize http://localhost:3003/ e jogue com o Chapola e Assombrações no palco ligada.

Pacotes completos: `outputs/bdsm-de-garagem-2.0.6-render.zip` e `outputs/bdsm-de-garagem-2.0.6-windows.zip`. A instalação segue as instruções já existentes no projeto. A hospedagem não foi publicada automaticamente.

## Desfazer esta alteração

A cópia anterior está em `outputs/backup-antes-visibilidade-2.0.5`. Feche a partida e restaure:

1. `index.html` em `outputs/Guitaband-Varanda/public/`.
2. `chapola-haunting.js` e `chapola-theme.js` em `outputs/Guitaband-Varanda/public/js/`.
3. `chapola-haunting.test.js` em `outputs/Guitaband-Varanda/tests/`.
4. `package.json` e `package-lock.json` na raiz de `outputs/Guitaband-Varanda/`.
5. Atualize a aba do jogo.

Os ZIPs completos 2.0.5 foram preservados. Não é necessário apagar imagens ou músicas para reverter esta mudança.
