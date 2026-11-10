# Assombrações do Chapola — 2.0.1

## O que acontece durante a música

Com Chapola selecionado, o pub passa por uma sequência: a iluminação diminui gradualmente, a escuridão toma o fundo e surgem pares de olhos, uma figura com chifres, uma silhueta alta e uma criatura baixa. Elas aparecem e desaparecem em momentos um pouco diferentes. Depois, as figuras somem, as sombras recuam e a iluminação normal do pub retorna.

A sequência acontece uma vez por faixa de pelo menos dez segundos. Começa em cerca de 28% da música e dura até 22 segundos, sendo proporcionalmente mais curta nas músicas pequenas. Na música de exemplo de 25 segundos, começa perto de 7 s e termina por volta de 19 s; o restante volta ao fundo normal. Não é um efeito que depende de acertos ou erros.

O estilo continua 2D, usando silhuetas, contornos vermelhos, olhos e formas gráficas. Não há novos arquivos de imagem nem vídeo. O arquivo novo de animação tem cerca de 6 KB de JavaScript.

## Controles e preservação da partida

Nos Ajustes, com Chapola escolhido, aparece Visual do Chapola → Assombrações no palco. A escolha é salva neste navegador. Os outros personagens mantêm o padrão e não recebem a sequência. A preferência do sistema por movimento reduzido desativa a sequência automaticamente.

O efeito usa o tempo e a duração já existentes da faixa. Ele não altera notas, áudio, sincronização, pontuação, instrumentos, combo ou rede. O desenho é feito antes da pista e a área das aparições tem um recorte extra para não ocupar o braço. Cabeçalho, notas e indicadores continuam sendo desenhados por cima. Não existem flashes de tela inteira, vídeos, novos modelos de IA ou cálculos de análise no Render.

Depois do fim da sequência, o desenho extra para completamente: o fundo volta ao renderizador normal do tema, sem figuras persistentes. Fora da janela do efeito, o módulo só verifica o tempo e retorna.

## Arquivos

- public/js/chapola-haunting.js: sequência, fades, criaturas e recorte da pista, sem acesso a funções do jogo.
- public/js/chapola-theme.js: controle de preferência e chamada do efeito de fundo.
- public/js/game.js: passa a duração e a geometria de leitura à etapa de apresentação.
- public/css/chapola-theme.css: apresentação do controle exclusivo do Chapola.
- public/index.html: novo script e versões dos recursos.
- tests/chapola-haunting.test.js: testes da sequência, retorno ao normal, recorte e preferências.
- package.json e package-lock.json: versão 2.0.1.

## Verificação

Suíte completa: 61 testes aprovados, zero falhas e um teste POSIX pulado no Windows. Os testes novos cobrem músicas de 10 a 900 segundos, iluminação e desaparecimento das figuras, tempo inválido, opção desligada, movimento reduzido, desenho para celular e desktop e ausência de modificações no jogador. Depois do acabamento das silhuetas, os testes da sequência foram repetidos e passaram.

No navegador, a faixa de exemplo Ensaio vocal foi tocada com o tema: aparições visíveis no fundo, notas e acertos funcionando durante a sequência e pub restaurado antes de terminar. Foram capturadas as três fases aos 13%, 50% e 83% da faixa: outputs/chapola-sombras-before-2.0.1.jpg, outputs/chapola-sombras-peak-2.0.1.jpg e outputs/chapola-sombras-after-2.0.1.jpg. Não houve erros de console. O controle exclusivo foi conferido e ficou oculto ao retornar a Roberto, o personagem que estava selecionado antes do teste. As teclas personalizadas existentes foram preservadas.

## Desfazer

Os arquivos anteriores estão em outputs/backup-antes-sombras-2.0.0. Restaure index.html em public/; game.js e chapola-theme.js em public/js/; chapola-theme.css em public/css/; package.json e package-lock.json na raiz. O arquivo novo chapola-haunting.js deixa de ser usado. Para reversão completa, os ZIPs 2.0.0 foram preservados.

A prévia local é http://localhost:3003/. Atualize a aba e escolha Chapola. Esta alteração não exige reiniciar o servidor existente; a hospedagem não foi publicada automaticamente. Os pacotes 2.0.1 mantêm os comandos de instalação anteriores.
