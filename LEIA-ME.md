# Jam na Garagem — Multiplayer Online

Versão para jogar com amigos pela internet, no PC ou no celular, sem precisar usar Claude, extensões ou banco de dados.

## 1. Testar no seu computador (Windows)

1. Instale **Node.js 20 ou superior** (já é suficiente; o jogo não usa bibliotecas extras).
2. Extraia este ZIP, abra a pasta `jam-na-garagem-multiplayer` no VS Code e abra **Terminal > Novo Terminal**.
3. Execute:

   ```powershell
   npm start
   ```

4. Abra **http://localhost:3000** no navegador.
5. Digite seu nome e clique em **Criar sala nova**. Para testar, abra o endereço em outro navegador ou aba, digite outro nome e entre usando o código da sala.

**Importante:** abrir o arquivo `index.html` com duplo clique **não ativa o multiplayer**. Use o site servido pelo Node.js (localmente ou hospedado).

## 2. Publicar grátis para seus amigos jogarem de suas casas

Use um **Web Service** no [Render](https://render.com), pois o jogo precisa de servidor WebSocket. O GitHub Pages sozinho não executa o servidor.

1. Crie um repositório no GitHub e envie **os arquivos desta pasta** (`server.js`, `package.json`, `render.yaml`, `public/index.html` e este guia). A pasta `public` deve continuar como pasta.
2. Acesse Render, clique em **New > Web Service** e conecte o repositório do GitHub.
3. Selecione os seguintes campos:

   | Configuração | Valor |
   | --- | --- |
   | Language / Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free, se disponível |
   | Health Check Path | `/health` |

   Alternativa: use o arquivo `render.yaml` para implantar como Blueprint.
4. Depois que o deploy concluir, entre no endereço **HTTPS** disponibilizado pelo Render, por exemplo `https://seu-jogo.onrender.com`.
5. Crie uma sala, clique em **Copiar convite** e envie o link completo aos amigos. Cada pessoa entra com seu nome. **Máximo de 8 conexões por sala**.

No plano grátis, o serviço pode hibernar após ficar sem tráfego e levar um tempo para abrir novamente; isso depende das regras atuais do Render. Salas e resultados ficam em memória e desaparecem quando o servidor reinicia.

## 3. Como jogar junto

- **Host:** quem entra primeiro no código da sala (normalmente quem cria) escolhe a música e inicia a partida.
- **Amigos:** entram no mesmo link ou código, escolhem instrumento e dificuldade. O painel **Banda** mostra quem está conectado.
- **Músicas de exemplo:** o host escolhe uma. Os outros navegadores geram automaticamente a mesma música. Não precisa baixar nada.
- **Arquivo próprio:** cada jogador deve selecionar **exatamente o mesmo arquivo de áudio** em seu próprio dispositivo. O servidor verifica a identificação do conteúdo; arquivos com músicas diferentes não participam da mesma rodada. Arquivos não são enviados nem compartilhados pelo servidor.
- **Controles:** teclado (A, S, D, F, G ou H, J, K, L, Ç), ou toque nos botões da pista no celular.
- **Pontuação:** os acertos e erros de cada jogador são enviados em tempo real. No fim, os resultados aparecem na tabela. Se dois jogadores escolherem o mesmo instrumento, podem cobrir as notas um do outro.
- **Jogar novamente:** o host inicia a próxima rodada na tela de resultados.
- **Sair:** o botão `Sair` do palco devolve você ao lobby. Use **Trocar sala** no lobby para entrar em outra sala.

## 4. O que essa versão faz — e limites

- Usa WebSocket para sincronizar jogadores, instrumentos, lobby, início da música, acertos e placar.
- Cada dispositivo **reproduz a música localmente**; não há transmissão de áudio ou chamada de voz pelo servidor.
- O jogo depende da conexão: atraso elevado, instabilidade ou suspensão do navegador podem comprometer o sincronismo.
- Não há login, senha, salvamento permanente de resultados ou reconexão automática. Salas são temporárias e ficam em memória em **uma única instância** do servidor.
- O modo solo continua funcionando pelo site quando o servidor está ligado, sem precisar criar uma sala de amigos.

## 5. Organização

```
jam-na-garagem-multiplayer/
├─ public/
│  └─ index.html       # Interface + jogo + cliente WebSocket
├─ server.js           # Hospeda o HTML e gerencia as salas WebSocket
├─ package.json        # Comando npm start
├─ render.yaml         # Configuração opcional para Render
└─ LEIA-ME.md          # Este guia
```

## 6. Diagnóstico rápido

- **Não conecta:** confirme que abriu o endereço `http://localhost:3000` (ou o site HTTPS hospedado), e que o terminal `npm start` continua aberto.
- **Sala cheia:** já há 8 conexões naquele código; crie outra sala ou feche uma aba antiga.
- **Amigo não aparece:** verifique se usou exatamente o mesmo código e se a conexão com o servidor está ativa.
- **A música não inicia para alguém:** aguarde aparecer a música como pronta para todos; se for arquivo próprio, cada participante precisa carregá-lo.
- **Erro de áudio:** use um navegador atualizado e toque na tela para liberar a reprodução. Se necessário, teste uma música de exemplo.
- **Travou depois de um deploy/reinício:** atualize a página e entre novamente na sala.
