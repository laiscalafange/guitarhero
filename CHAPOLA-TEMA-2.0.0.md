# Chapola / Lado B — tema 2.0.0

## O visual

O tema do Chapola transforma as telas em um pub musical noturno, com preto, vinho e vermelho, luzes de velas, cartazes e olhos escondidos. A base visual é uma ilustração 2D com contornos, sombras marcadas, textura de quadrinhos e detalhes de palco. A tipografia usa Pirata One nos títulos de destaque e Barlow Condensed no restante dos títulos e botões; os textos de leitura mantêm uma fonte simples.

O tema é ativado somente quando Chapola é o personagem confirmado. Ao escolher outro personagem, a sala volta ao padrão anterior. A preferência de personagem existente é respeitada: quem já tinha Chapola selecionado vê o novo início; quem ainda não escolheu vê o início padrão até confirmar Chapola.

## Telas e detalhes

- Início e entrada: cenário próprio de pub, título, botões e formulário em preto/vermelho.
- Seleção do Chapola: fundo dos três olhos, recorte transparente do personagem e ficha com as descrições existentes.
- Sala: cabeçalho, perfil, Banda, histórico, Músicas, Fila, busca e tela de todos os resultados com a mesma paleta.
- Ajustes e perfil: mantêm seus controles e recebem a apresentação do tema.
- Partida: cenário ilustrado com sombra central para preservar a pista, bordas vermelhas, gemas com detalhe geométrico, anéis e traços de impacto nos acertos, partículas vermelhas e marfim e apresentação própria para combos e multiplicador.
- Pausa e resultado da rodada: molduras de tinta e a mesma tipografia/paleta do pub.
- O símbolo B na faixa do Chapola abre um detalhe opcional: a galeria do outro lado do espelho. Ali estão as 13 referências enviadas, incluindo o GIF do Crystal Castles. Isso não desbloqueia vantagens nem muda a partida.

As cores que distinguem as pistas continuam preservadas. As imagens não piscam sobre as notas. A preferência do sistema por movimento reduzido desativa os traços extras de impacto, mantém o olhar estático e troca o GIF por texto estático no segredo.

## O que não mudou no funcionamento

A lógica de seleção das músicas, disponibilidade dos instrumentos, geração/importação de notas, análise de IA, áudio, sincronização, teclas, janelas de acerto, pontuação, erros, combo e rede permaneceu a mesma. O código novo da partida fica na etapa de desenho e lê o estado existente.

Foi conferido que o trecho de game.js antes das funções de desenho e o trecho de eventos depois delas são idênticos aos da cópia 1.9.1. O teste do renderizador também confirma que os efeitos não modificam jogador, notas ou partículas recebidos.

A mudança em server.js é apenas o tipo de conteúdo image/gif, para servir corretamente a imagem animada fornecida. Não há dependência nova, modelo novo ou serviço externo de IA executado durante o uso do tema.

## Arquivos e imagens

- public/css/chapola-theme.css: aparência exclusiva do tema.
- public/js/chapola-theme.js: ativação local pelo personagem, elementos decorativos e galeria opcional.
- public/js/chapola-renderer.js: desenho dos efeitos, cenário e detalhes da pista.
- public/js/game.js: chamadas de apresentação no desenho da partida.
- public/js/entrance.js: avisa qual personagem foi confirmado e usa o novo recorte do Chapola.
- public/index.html: carrega os arquivos do tema.
- public/assets/chapola/: as 13 referências, cenário e recorte transparente. references.json relaciona os nomes usados no projeto aos arquivos enviados.
- server.js: suporte a image/gif.
- tests/chapola-theme.test.js e tests/render-lanes.test.js: proteção do desenho com/sem tema.
- package.json e package-lock.json: versão 2.0.0.

O cenário pub-night.png foi criado com a ferramenta integrada image_gen, tomando a foto do pub e a ilustração anterior do jogo como referências. chapola-cutout.png foi gerado a partir do desenho original para retirar o fundo. O original foi preservado; pequenos detalhes do recorte gerado podem variar. Os prompts completos e os caminhos estão em CHAPOLA-ARTE-PROMPTS-2.0.0.md.

As 13 imagens enviadas foram copiadas sem editar os arquivos originais. O conjunto de assets do tema ocupa cerca de 3,86 MB, além dos arquivos pequenos de CSS/JavaScript e fontes. A galeria recebe as imagens ao ser aberta; algumas referências também aparecem na decoração. O GIF fica fora do palco. O tema não adiciona processamento de IA ao Render.

## Verificação

- Suíte completa: 58 testes aprovados, zero falhas e um teste POSIX pulado no Windows.
- Desenho dos cinco instrumentos, de uma a cinco pistas, com acordes, notas longas, acertos e erros, testado com o tema ligado e desligado.
- Renderizador testado com combos de 0 a 199 e movimento reduzido, sem mudar o estado recebido.
- Navegador: início, entrada, seleção, sala, Músicas, Ajustes, perfil, segredo, pausa e resultado. Todas as 13 referências carregaram na galeria, incluindo o GIF servido com image/gif.
- Troca Chapola → Irisu removeu o tema e devolveu --room-bg a #12151e; o retorno a Chapola reativou o tema.
- Rodada real do exemplo Ensaio vocal em Bateria/Expert com cinco pistas, incluindo a barra do bumbo, concluída sem erro de desenho. Entrada real de teclado registrou acertos e sequência de seis; o palco, a pausa e o resultado funcionaram.
- Uma segunda rodada em Guitarra/Médio com quatro pistas registrou combo de 28 e multiplicador ×3, com os efeitos visuais ativos e resultado final exibido normalmente.
- Tela de 390 × 844: documento com 375 px, sem rolagem horizontal na sala e nos ajustes.
- Nenhum erro de console observado nessas navegações.

A prévia principal foi atualizada em http://localhost:3003/. O servidor foi reiniciado para carregar o tipo de imagem; entre novamente na sala. A hospedagem não foi publicada automaticamente.

## Como desfazer

1. Para voltar ao padrão na própria interface, selecione outro personagem pelo perfil.
2. Para remover esta atualização localmente, restaure os arquivos da pasta outputs/backup-antes-chapola-1.9.1: index.html em public/; game.js e entrance.js em public/js/; server.js, package.json e package-lock.json na raiz; render-lanes.test.js em tests/.
3. Os novos arquivos CSS/JS e assets deixam de ser usados. Para executar a suíte da versão anterior, remova também o teste novo tests/chapola-theme.test.js, ou use o pacote completo 1.9.1 preservado.
4. Reinicie npm start e atualize a página.

Os pacotes Render e Windows 2.0.0 mantêm os comandos de instalação anteriores. Os ZIPs 1.9.1 permanecem disponíveis para reversão completa.
