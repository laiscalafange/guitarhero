# BDSM de Garagem

A versão **2.1.1** ajusta o tema da Johgi para laranja queimado mais intenso, escuro e translúcido, com texto claro. Mantém pôr do sol, hibiscos, painéis de quadrinhos e efeitos no palco. Ele funciona somente quando Johgi está selecionada, mantendo o tema do Chapola e o visual padrão dos demais. Veja `JOHGI-TEMA-2.1.0.md` para a estrutura do tema e `JOHGI-CORES-2.1.1.md` para este ajuste e como desfazê-lo.

A sala mantém as abas **Banda, Músicas e Fila**. O histórico fica em Banda; o perfil permite mudar nome e personagem; a engrenagem ao lado abre os ajustes. Chapola mantém o tema em preto e vermelho e o trecho de escuridão descritos em `CHAPOLA-PALCO-2.0.8.md` e `CHAPOLA-BREU-MEIO-2.0.9.md`.

Jogo de ritmo para jogar **sozinho ou com amigos pela internet**, com salas compartilhadas, músicas de exemplo, upload de áudio, biblioteca de partituras e preparação opcional de músicas por IA.

## Iniciar no Windows

1. Instale o [Node.js](https://nodejs.org/) **22 ou superior**, caso ainda não tenha.
2. Extraia **toda a pasta** do ZIP. Não abra apenas o `index.html` diretamente.
3. Dê dois cliques em `INICIAR-JOGO.cmd` ou, no terminal da pasta, execute `npm start`.
4. Abra **http://localhost:3000** no navegador.
5. Clique em **Criar sala nova**; envie o link para os amigos. Cada amigo abre o link em seu próprio navegador e entra na sala.
6. Qualquer jogador pode adicionar/selecionar músicas; o **host** inicia a rodada e o áudio começa sincronizado para os participantes prontos.
7. Quando o host sai ou perde a conexão, o servidor passa automaticamente o controle para o jogador que entrou primeiro entre os restantes. Se uma rodada ainda não tinha começado, o novo host poderá iniciá-la novamente.

### Instalar a partir do GitHub

Na pasta do repositório, com Node.js 22 ou superior:

```bash
npm ci
npm run build:ai
npm run setup:youtube
npm start
```

Abra **http://localhost:3000**. O comando `setup:youtube` instala o programa usado na importação do YouTube; pode ser omitido para testar apenas exemplos, uploads e partituras. Ele exige acesso à internet. A análise por IA continua sendo feita no navegador.

### Regras de partida

- Cada participante escolhe **3, 4 ou 5 teclas** em Ajustes. Os outros jogadores podem escolher valores diferentes.
- Depois de receber a música, cada um clica em **Estou pronto**. O **host** só consegue começar quando todos os participantes ativos estiverem prontos. Alterar instrumento, dificuldade, teclas ou música cancela o pronto.
- Tocar uma tecla sem uma nota no tempo certo **não causa erro**. Uma nota passa a contar como erro ao ultrapassar a linha de acerto sem ser completada (inclusive a ponta de uma nota longa).
- A seção **Pontuações das rodadas anteriores** mostra pontos e erros de cada jogador e o total acumulado das **últimas 20 rodadas**. É um histórico temporário por sala: se todos saírem, o servidor reiniciar ou o serviço suspender, ele será perdido.
- **Sortear música da fila** escolhe uma música que já terminou de ser preparada, sem repetir a atual quando houver outra. Somente o host pode sortear, e a escolha é enviada para toda a sala.

### Ajustes de som

Na seção **Ajustes**, há controles separados para **Volume da música** e **Volume das teclas** (efeitos de acerto, erro e calibração). Os volumes também aparecem em **Menu (Esc)** durante uma partida. Cada participante controla o som do próprio aparelho, e as preferências ficam salvas no navegador.

Para jogar **de computadores diferentes**, o endereço `localhost` não serve: publique o servidor na internet ou disponibilize-o na mesma rede. Não basta enviar o link `localhost` para amigos fora do seu computador.

### Hospedar no Render

O arquivo `render.yaml` já está configurado para implantação de um **Web Service** Node.js. Suba os arquivos para um repositório do GitHub, conecte-o ao Render e crie o serviço a partir do Blueprint (`render.yaml`). Em seguida, compartilhe a URL pública que o Render fornecer. As salas ficam temporariamente **em memória**: reinicialização/hibernação do servidor encerra salas e descarta áudios. Use uma **única instância** do servidor para que todos compartilhem as mesmas salas. No plano gratuito, pode haver tempo de inicialização depois de um período sem uso.

### Música, partituras e IA

- **Exemplos**: músicas sintéticas incluídas, funcionam sem baixar modelos de IA.
- **Upload e YouTube**: áudios ficam temporariamente no servidor; arquivos enviados podem exigir análise antes de jogar.
- **Biblioteca**: pesquisa e importação de pacotes de partituras dependem de um catálogo externo que pode ficar indisponível.
- **IA**: processa a música no navegador do participante responsável pela preparação. O primeiro uso baixa modelos grandes (aproximadamente 110 MB para separação); exige conexão, memória e tempo de processamento. A qualidade das notas é **estimada**, não garantida.
- **YouTube**: no Windows, o pacote inclui `yt-dlp.exe`. Se deixar de funcionar, execute `CONFIGURAR-YOUTUBE.cmd` para baixar uma versão atualizada. Em outros sistemas, use `npm run setup:youtube`. Alguns vídeos são bloqueados pela própria plataforma.

## Organização dos arquivos

- `server.js`: servidor HTTP e WebSocket, salas e início das rodadas.
- `music-service.js`, `analysis-service.js`, `chart-catalog.js`, `imported-chart.js`, `youtube.js`: serviços de áudio, análises e catálogo.
- `public/index.html`: estrutura da interface.
- `public/js/game.js` e `public/js/room-client.js`: jogo, controles e conexão com a sala.
- `public/js/chapola-*.js` e `public/css/chapola-theme.css`: apresentação exclusiva do Chapola, incluindo palco e escuridão.
- `public/js/johgi-*.js` e `public/css/johgi-theme.css`: apresentação exclusiva da Johgi; usa os mesmos dados de desenho e preserva o restante do jogo.
- `public/*.js`, `public/vendor/`, `public/models/`: clientes, workers de IA, bibliotecas e modelo de notas usados pelo navegador.
- `src/`, `scripts/`: código-fonte e tarefas para recompilar os bundles.
- `tests/`: testes automatizados.
- `THIRD-PARTY-NOTICES.md` e `src/demucs/LICENSE`: avisos/licenças de componentes externos; **não remova**.

## Conferir o funcionamento

Sem instalar pacotes adicionais, a versão distribuída contém os scripts preparados e usa apenas módulos internos do Node.js para **executar** o servidor. Para verificar o básico:

```bash
npm run test:core
```

Para rodar a **suíte completa** ou modificar e recompilar workers/importadores, instale as dependências de desenvolvimento e reconstrua os bundles:

```bash
npm ci
npm run build
npm test
```

Se alterar a interface, os temas ou `server.js`, não precisa recompilar os workers. Se alterar arquivos de `src/`, execute `npm run build` antes de publicar.

**Limites atuais:** até 8 pessoas por sala; até 10 músicas por playlist; arquivo de áudio de até 25 MB. Músicas não são gravadas permanentemente. Prefira Chrome ou Edge atualizado no computador.
