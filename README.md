# Guitaband — Jam na Garagem Online

Jogo de ritmo para jogar **sozinho ou com amigos pela internet**, com salas compartilhadas, músicas de exemplo, upload de áudio, biblioteca de partituras e preparação opcional de músicas por IA.

## Iniciar no Windows

1. Instale o [Node.js](https://nodejs.org/) **22 ou superior**, caso ainda não tenha.
2. Extraia **toda a pasta** do ZIP. Não abra apenas o `index.html` diretamente.
3. Dê dois cliques em `INICIAR-JOGO.cmd` ou, no terminal da pasta, execute `npm start`.
4. Abra **http://localhost:3000** no navegador.
5. Clique em **Criar sala nova**; envie o link para os amigos. Cada amigo abre o link em seu próprio navegador e entra na sala.
6. Qualquer jogador pode adicionar/selecionar músicas; o **host** inicia a rodada e o áudio começa sincronizado para os participantes prontos.

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
- `public/index.html`: interface e lógica do jogo; mantido junto para evitar quebrar controles e testes já existentes.
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

Se alterar somente `public/index.html` ou `server.js`, não precisa recompilar os workers. Se alterar arquivos de `src/`, execute `npm run build` antes de publicar.

**Limites atuais:** até 8 pessoas por sala; até 10 músicas por playlist; arquivo de áudio de até 25 MB. Músicas não são gravadas permanentemente. Prefira Chrome ou Edge atualizado no computador.
