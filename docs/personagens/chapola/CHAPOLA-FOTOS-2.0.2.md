# Aparições fotográficas — 2.0.2

## O que mudou

As criaturas de contorno desenhado foram substituídas por imagens. O par de olhos principal usa exatamente o arquivo black man.jpe enviado, já presente no projeto como public/assets/chapola/eyes.jpg. Foi conferida a igualdade dos hashes dos dois arquivos.

A cena também usa watching.jpg, phantom.jpg, skull-eyes.png e red-portrait.jpg, das referências anteriores. Um recorte com aparência fotográfica do monstro foi preparado com image_gen a partir de red-mask.jpg. Os originais foram preservados.

As imagens surgem em momentos diferentes, com pequenas aproximações e bordas dissolvidas no preto. O braço recebe um recorte de proteção, e notas, pontuação e interface são desenhadas depois do fundo. As criaturas vetoriais da versão anterior foram removidas desta sequência.

## Mais tempo no breu

A sequência começa em cerca de 18% da faixa e dura até 80 segundos, sendo proporcionalmente mais curta em músicas pequenas. O escuro permanece estável por mais tempo entre a entrada e a saída graduais. Na faixa de exemplo de 25 s, começa em 4,5 s e termina perto de 21,75 s; numa faixa de 3 minutos, vai de cerca de 32 s até 112 s. Depois o pub retorna ao normal.

A animação continua exclusiva do Chapola, pode ser desligada nos ajustes e respeita movimento reduzido. Não muda áudio, sincronização, notas, controles ou pontuação. Não acrescenta análise de IA durante o jogo.

## Peso e carregamento

O novo arquivo demon-photo.png ocupa cerca de 1,59 MB. As demais imagens já estavam no projeto. As fotos de aparição só são solicitadas para o Chapola quando o efeito está habilitado e o aparelho não pede movimento reduzido. Cada foto é preparada uma vez numa camada em memória limitada a 512 px no maior lado, com máscara de apresentação; durante a música, o canvas reutiliza essas camadas. Não há vídeo nem processamento por pixel em cada quadro.

## Arquivos alterados

- public/js/chapola-haunting.js: composição fotográfica e novo intervalo de breu.
- public/js/chapola-theme.js: carregamento, camadas de imagens e texto do ajuste.
- public/assets/chapola/demon-photo.png: recorte fotográfico gerado a partir da referência.
- public/index.html: versões dos scripts.
- tests/chapola-haunting.test.js: duração, uso de fotografias, recorte e comportamento quando imagens não carregaram.
- package.json e package-lock.json: versão 2.0.2.

## Verificação

62 testes aprovados, zero falhas e um teste POSIX pulado no Windows. Depois do ajuste da disposição no celular, os quatro testes das aparições foram repetidos e passaram.

No navegador: exemplo Ensaio vocal com as fotos, acertos e combos durante a sequência e retorno da iluminação normal antes do fim. As três capturas foram feitas perto de 8%, 49% e 94% da música, sem erros de console. Arquivos: outputs/chapola-fotos-before-2.0.2.jpg, outputs/chapola-fotos-peak-2.0.2.jpg e outputs/chapola-fotos-after-2.0.2.jpg. Também foi testada uma rodada em 390 × 844, com as fotos reposicionadas nas laterais, notas legíveis e nenhum erro de console; captura em outputs/chapola-fotos-celular-2.0.2.jpg. As teclas personalizadas e a escolha de personagem anterior foram preservadas ao encerrar os testes.

## Desfazer

A cópia 2.0.1 está em outputs/backup-antes-fotos-sombras-2.0.1. Restaure index.html em public/; chapola-haunting.js e chapola-theme.js em public/js/; chapola-haunting.test.js em tests/; package.json e package-lock.json na raiz. O novo demon-photo.png deixa de ser usado. Atualize a aba. Os ZIPs 2.0.1 foram preservados para reversão completa.

Prévia: http://localhost:3003/. Não foi necessário reiniciar o servidor, e a hospedagem não foi publicada automaticamente.

## Arte e prompt

Foi utilizada a ferramenta integrada image_gen para preparar o arquivo public/assets/chapola/demon-photo.png, com transparência. Ele é uma interpretação fotográfica do monstro original, não uma extração exata de seus pixels. A foto original red-mask.jpg foi mantida.

Prompt completo:

Edit target: the provided photograph of a frightening creature/mask on a bright red background. Create a high-quality photographic cutout for a horror game, based faithfully on this creature. Remove the flat red backdrop completely and output true transparent alpha, including around horns and shoulders. Retain the creature's recognizable bony dark face, elongated jaw, sharp teeth, irregular horns and black-cloaked upper body in the same frontal pose. Improve photographic clarity modestly while retaining worn, real physical texture, dark eye sockets, low-key red side light and black clothing. It must look like a terrifying photographed practical-effects creature emerging from darkness, NOT a cartoon, vector, outline illustration, cute character or comic book drawing. Keep head and upper torso fully visible, fade lower cloak gently to transparency. No graphic blood or exposed wounds, no extra props, no text, no white edge or halo. One creature, centered, transparent background.
