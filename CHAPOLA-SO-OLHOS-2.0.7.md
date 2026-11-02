# Somente olhos, preto uniforme e mais tempo — 2.0.7

## O que mudou

A animação no breu agora mostra apenas olhos. Foram retirados dela os rostos, monstros, caveira, vultos e retratos. Essas figuras também deixaram de ser carregadas para o efeito.

Foi mantido o par antigo, de `black man.jpe`, junto com as seis imagens novas enviadas. Os pares aparecem em momentos diferentes e se alternam com saída e entrada suaves. As cores originais dos olhos novos foram preservadas, inclusive os vermelhos.

Uma das referências contém uma boca. O recorte de apresentação usa somente a faixa dos olhos; a boca fica fora. Os arquivos originais foram preservados, e as seis cópias novas foram conferidas por SHA-256 para garantir que são idênticas aos arquivos enviados.

| Referência enviada | Arquivo no projeto |
| --- | --- |
| transferir (9).jpe | eyes-red-rings.jpg |
| Creepy wall_.jpe | eyes-wall.jpg |
| transferir (8).jpe | eyes-heavy.jpg |
| red eyes.jpe | eyes-red-glints.jpg |
| transferir (7).jpe | eyes-hollow.jpg |
| transferir (6).jpe | eyes-red-rim.jpg |

## Preto igual e permanência maior

O ponto de preto é corrigido antes de aumentar o brilho dos olhos. Assim, o ganho não clareia junto o fundo escuro da foto. A composição dissolve as bordas no preto do cenário, eliminando as manchas claras que apareciam em volta de alguns pares.

O período de breu passou de até 80 para até 100 segundos, adaptado à duração da música. Os pares também permanecem até perto do fim do período reservado aos olhos, em vez de desaparecerem cedo. No exemplo de 25 segundos, o período de olhos vai aproximadamente de 4,05 a 20,20 segundos. Numa faixa de três minutos, vai de cerca de 9,55 a 105,70 segundos.

A ordem continua: apagar completamente, breu vazio curto, olhos, breu vazio e luz voltando. Todos os olhos somem antes de começar a volta da iluminação. As notas, os controles e a pontuação continuam visíveis.

No computador há até dez pontos de olhos, incluindo pequenos brilhos distantes; no celular, seis pontos. As sete variedades têm sua vez nos dois formatos. O efeito continua exclusivo do Chapola, pode ser desligado em Ajustes → Visual do Chapola → Olhos no breu e respeita movimento reduzido.

## Arquivos alterados

- `public/js/chapola-haunting.js`: catálogo dos sete olhos, alternância, duração maior e retirada da sequência de outras figuras.
- `public/js/chapola-theme.js`: carregamento só dos olhos, recortes em memória, preservação das cores e ponto de preto.
- `public/assets/chapola/eyes-*.jpg`: seis cópias novas das referências enviadas.
- `public/assets/chapola/references.json`: relação entre as cópias e os nomes originais.
- `public/index.html`: versão dos scripts para o navegador carregar a atualização.
- `tests/chapola-haunting.test.js`: olhos permitidos, recortes, permanência, trocas, ausência de outras figuras e transições de luz.
- `package.json` e `package-lock.json`: versão 2.0.7.

As referências antigas foram preservadas nos arquivos do projeto e na galeria já existente. A retirada de figuras nesta mudança se aplica à animação durante a música. Não foram alterados os personagens, os pôsteres do cenário normal ou outras telas.

## Peso e Render Free

As seis imagens novas somam 33.416 bytes, cerca de 33,4 KB. Não há novo modelo de IA, vídeo ou dependência. Os olhos usam camadas preparadas uma vez em memória, limitadas a 512 pixels no maior lado. A configuração do Render Free foi preservada.

Esta mudança é visual. Áudio, sincronização, notas, instrumentos, teclas, pontuação, salas e fila de análise mantêm o funcionamento anterior.

## Verificação

Onze testes aprovados, sem falhas:

`node --test tests/chapola-haunting.test.js tests/chapola-theme.test.js tests/render-lanes.test.js`

Os testes verificam as sete variedades no computador e no celular, a exclusão da boca no recorte, a permanência maior, o início antecipado, o breu vazio e a ausência de acesso às fotos antigas na animação. Também cobrem opção desligada, movimento reduzido, imagens ausentes, recorte da pista e cinco instrumentos com acertos e combos.

Foram jogadas rodadas completas de Ensaio vocal no navegador. Após a correção do preto, o efeito foi conferido em 1280 × 720 e 390 × 844, sem erros de console. Foi verificada a saída de todos os olhos antes de a luz voltar.

Capturas da versão final: `outputs/chapola-olhos-linger-2.0.7.jpg`, `outputs/chapola-olhos-black-after-2.0.7.jpg`, `outputs/chapola-olhos-after-2.0.7.jpg` e `outputs/chapola-olhos-celular-{first,second,linger,black-after,after}-2.0.7.jpg`.

## Ver e instalar

Atualize http://localhost:3003/ e jogue com o Chapola e Olhos no breu ligado.

Pacotes completos: `outputs/bdsm-de-garagem-2.0.7-render.zip` e `outputs/bdsm-de-garagem-2.0.7-windows.zip`. A instalação segue as instruções já existentes no projeto. A hospedagem não foi publicada automaticamente.

## Desfazer esta mudança

A cópia anterior está em `outputs/backup-antes-so-olhos-2.0.6`. Feche a partida e restaure:

1. `index.html` em `outputs/Guitaband-Varanda/public/`.
2. `chapola-haunting.js` e `chapola-theme.js` em `outputs/Guitaband-Varanda/public/js/`.
3. `references.json` em `outputs/Guitaband-Varanda/public/assets/chapola/`.
4. `chapola-haunting.test.js` em `outputs/Guitaband-Varanda/tests/`.
5. `package.json` e `package-lock.json` na raiz de `outputs/Guitaband-Varanda/`.
6. Atualize a aba.

As seis imagens novas deixam de ser usadas ao restaurar esses arquivos; não é necessário apagá-las. Os pacotes completos 2.0.6 também foram preservados.
