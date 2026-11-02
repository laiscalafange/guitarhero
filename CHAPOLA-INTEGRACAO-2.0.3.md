# Chapola: presenças dentro do pub — 2.0.3

## Resultado

O pub escurece sem perder completamente as paredes, os bancos, a porta e os instrumentos. Isso mantém a sensação de estar dentro do ambiente. As aparições ficam menores e presas ao enquadramento do cenário, em vez de acompanhar as bordas da tela como imagens sobrepostas.

Os olhos principais aparecem no espelho; o monstro surge na sombra atrás da bateria; o outro olhar ocupa a porta; o rosto aparece no espelho; a caveira fica na sombra do quadro à esquerda, voltada para o centro; o retrato vermelho surge junto ao banco do fundo. No celular, esses pontos são adaptados ao trecho visível da parede. A pista continua na frente das presenças.

As imagens recebem menos saturação, menos brilho, um tom discreto próximo ao vermelho do pub e uma máscara com bordas suaves. A transparência varia durante a entrada e a saída. O monstro, que já é muito escuro, usa uma mistura que preserva os detalhes do ambiente sob sua silhueta. Nenhum arquivo de imagem original foi alterado.

## Uma presença por vez

Agora há seis aparições em sequência, com intervalos vazios entre elas. Foram retirados os olhos extras que permaneciam no palco e se somavam à sequência.

Cada aparição dura até 4,5 segundos, incluindo o surgimento e o desaparecimento graduais. A duração se ajusta à música para que as seis tenham sua vez. No exemplo de 25 segundos, cada uma fica por cerca de 1,45 segundo, com cerca de 0,56 segundo de pausa. Numa faixa de três minutos, ficam por 4,5 segundos, com aproximadamente 4,83 segundos entre elas.

O período de penumbra continua começando em 18% da faixa e dura até 80 segundos. O pub clareia progressivamente depois. Músicas com menos de dez segundos não usam a sequência. Ela continua exclusiva do Chapola, pode ser desligada em Ajustes → Visual do Chapola e respeita a preferência de movimento reduzido do aparelho.

## Arquivos e desempenho

- `public/js/chapola-haunting.js`: alternância, posições no ambiente, penumbra e proteção da pista.
- `public/js/chapola-theme.js`: tratamento visual das imagens uma vez ao carregar e descrição do ajuste.
- `public/js/chapola-renderer.js`: retirada do par de olhos que ficava permanentemente por cima do cenário.
- `public/index.html`: atualização das versões dos scripts para o navegador buscar a mudança.
- `tests/chapola-haunting.test.js`: alternância, pausas, tamanho, enquadramento, celular, opções desligadas e fim da sequência.
- `package.json` e `package-lock.json`: versão 2.0.3.

Foram reutilizadas as imagens já presentes no projeto. Não há nova dependência, modelo de IA ou vídeo. As camadas continuam limitadas a 512 pixels no maior lado, preparadas uma vez em memória. Durante cada quadro, aparece no máximo uma foto da sequência. O servidor e a configuração do Render Free não foram alterados.

Esta alteração afeta a apresentação. Áudio, notas, sincronização, instrumentos, controles, pontuação e comunicação das salas mantêm o funcionamento anterior.

## Verificação

A suíte completa passou com 63 testes aprovados, zero falhas e um teste específico de POSIX pulado no Windows. Depois do último ajuste visual e da inclusão de mais uma verificação de tamanho/enquadramento, os sete testes do tema e das aparições também passaram.

No navegador, foram jogadas rodadas completas do exemplo Ensaio vocal, com as teclas personalizadas A/S/G/H. As seis aparições e a volta da iluminação foram registradas em 1280 × 720. Outra rodada foi conferida em 390 × 844, com acertos, combos, notas legíveis e retorno normal. Não apareceram erros de console nessas rodadas. O tamanho normal da janela foi restaurado após o teste.

Capturas em `outputs/chapola-integracao-{before,eyes,demon,watching,face,skull,redPortrait,after}-2.0.3.jpg` e `outputs/chapola-integracao-celular-{eyes,demon,face,skull,after}-2.0.3.jpg`.

## Ver e instalar

Prévia local: http://localhost:3003/. Atualize a aba para carregar os scripts novos. A sequência aparece ao jogar com o Chapola e a opção de assombrações ligada.

Pacotes completos atualizados: `outputs/bdsm-de-garagem-2.0.3-render.zip` e `outputs/bdsm-de-garagem-2.0.3-windows.zip`. O pacote Render mantém o processo de instalação já documentado no projeto. A hospedagem não foi publicada automaticamente.

## Desfazer só esta mudança

A cópia anterior está em `outputs/backup-antes-integracao-pub-2.0.2`. Feche a partida e restaure:

1. `index.html` em `outputs/Guitaband-Varanda/public/`.
2. `chapola-haunting.js`, `chapola-theme.js` e `chapola-renderer.js` em `outputs/Guitaband-Varanda/public/js/`.
3. `chapola-haunting.test.js` em `outputs/Guitaband-Varanda/tests/`.
4. `package.json` e `package-lock.json` na raiz de `outputs/Guitaband-Varanda/`.
5. Atualize a aba.

Os pacotes 2.0.2 também foram preservados para restaurar a versão completa anterior. Não é necessário apagar imagens ou músicas para desfazer esta alteração.
