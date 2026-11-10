# Breu total, olhos e brilhos distantes — 2.0.4

## O que mudou

Durante o auge da sequência, o fundo do pub é coberto por preto 100% opaco. A mobília, as luzes e as molduras deixam de aparecer. A entrada e a saída continuam graduais, e o pub volta à iluminação anterior no final do efeito. A pista, as notas, os controles e a pontuação permanecem visíveis por serem desenhados depois do fundo.

Os olhos agora têm tratamento de brilho separado dos rostos. No computador, podem aparecer seis pares principais e quatro pares minúsculos, como brilhos de olhinhos mais distantes. No celular, ficam quatro pares principais e dois distantes para caber nas laterais da pista. Entram em momentos diferentes e permanecem por mais tempo, com uma variação lenta e discreta de intensidade.

Rostos, caveira e monstro ficaram menores e muito escuros, quase imperceptíveis. Continuam surgindo um por vez, com intervalos, durante no máximo 1,35 segundo. No exemplo de 25 segundos, cada um aparece por cerca de 0,87 segundo. As imagens mantêm bordas dissolvidas no preto e a pista fica na frente delas.

## Funcionamento preservado

A sequência continua exclusiva do Chapola. Pode ser desligada em Ajustes → Visual do Chapola e respeita movimento reduzido. O período do efeito começa em 18% da música, dura até 80 segundos e se adapta a faixas curtas. Faixas com menos de dez segundos não usam a sequência.

Não foram alterados áudio, notas, sincronização, controles, pontuação, instrumentos, salas ou análise de músicas. Foram reutilizados os arquivos existentes. As várias aparições dos olhos usam a mesma camada preparada em memória; não baixam uma imagem para cada par. Não há novo modelo de IA nem dependência de servidor, e a configuração do Render Free foi preservada.

## Arquivos alterados

- `public/js/chapola-haunting.js`: preto opaco, olhos prolongados, brilhos distantes e presenças menores e breves.
- `public/js/chapola-theme.js`: brilho dos olhos separado do escurecimento dos rostos; descrição do ajuste.
- `public/index.html`: versão dos scripts para carregar a atualização.
- `tests/chapola-haunting.test.js`: duração das presenças, coexistência dos olhos, preto opaco, recorte e comportamento em telas diferentes.
- `package.json` e `package-lock.json`: versão 2.0.4.

Os arquivos de imagem originais e o desenho normal do pub foram preservados.

## Verificação

Nove testes aprovados, sem falhas, executando:

`node --test tests/chapola-haunting.test.js tests/chapola-theme.test.js tests/render-lanes.test.js`

Os testes cobrem músicas de durações diferentes, olhos simultâneos, pausas entre rostos, preto opaco no auge, fotos ausentes, opção desligada, movimento reduzido, tamanhos e recortes de tela, cinco instrumentos, acertos e combos.

Também foram jogadas rodadas completas de Ensaio vocal no navegador, em 1395 × 885 e 390 × 844, com as teclas A/S/G/H. Foram conferidos o breu, os olhos, os brilhos, as figuras discretas e a volta da iluminação antes do fim. Nenhum erro de console apareceu nessas rodadas.

Capturas em `outputs/chapola-breu-{before,demon,face,skull,eyes,redPortrait,after}-2.0.4.jpg` e `outputs/chapola-breu-celular-{eyes,after}-2.0.4.jpg`.

## Ver e instalar

Atualize http://localhost:3003/ e jogue com o Chapola. O efeito depende da opção Assombrações no palco estar ligada.

Pacotes completos: `outputs/bdsm-de-garagem-2.0.4-render.zip` e `outputs/bdsm-de-garagem-2.0.4-windows.zip`. A instalação segue as instruções já existentes no projeto. A hospedagem não foi publicada automaticamente.

## Como desfazer

A versão anterior está em `outputs/backup-antes-breu-olhos-2.0.3`. Para restaurar somente esta alteração, feche a partida e copie:

1. `index.html` para `outputs/Guitaband-Varanda/public/`.
2. `chapola-haunting.js` e `chapola-theme.js` para `outputs/Guitaband-Varanda/public/js/`.
3. `chapola-haunting.test.js` para `outputs/Guitaband-Varanda/tests/`.
4. `package.json` e `package-lock.json` para a raiz de `outputs/Guitaband-Varanda/`.
5. Atualize a aba do jogo.

Os pacotes completos 2.0.3 também foram mantidos. Não é necessário apagar músicas ou imagens para reverter esta mudança.
