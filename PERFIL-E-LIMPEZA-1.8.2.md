# Perfil editável e limpeza de textos — 1.8.2

## Alterações

- Removidos os textos solicitados da tela inicial e da entrada: “Monte sua banda. Escolha a música. Toque com seus amigos.”, “Seu passe para a noite”, “01 — Chega mais” e “Bora fazer um som?”.
- Removido “01 / Encontre seu som” e o bloco “Como funcionam as partituras prontas?”.
- Removidas as mensagens redundantes “Música sincronizada”, “Música pronta. Escolha sua função em J1” e as explicações da música já preparada. O painel de preparação fica oculto quando a música está pronta. A identificação e os instrumentos continuam no cartão da música.
- Removidos “Toque para iniciar sua música”, a explicação “Uma música por vez…” e o aviso “Este aparelho está habilitado para preparar a fila. Mantenha a aba aberta.” Os botões de análise, prioridade e processamento continuam funcionando.
- A engrenagem fica imediatamente à direita do avatar; o nome aparece à esquerda dele.
- Clicar no perfil abre um diálogo para salvar um novo nome ou mudar o personagem usando a seleção existente. Alterações são compartilhadas com os participantes sem sair da sala. Nomes vazios são rejeitados; nomes têm até 16 caracteres. Esc ou Fechar cancela a edição não salva.

Avisos de erro e progresso das tarefas continuam disponíveis. Não foram adicionados modelos, dependências ou processamento ao servidor Render.

## Testar GPU

Desligado: usa a CPU via WebAssembly. Ligado: tenta usar WebGPU na separação dos instrumentos quando o navegador e a placa aceitam o modelo. Se a tentativa falhar, há tentativa pela CPU. O modelo é o mesmo; ativar GPU não é uma opção de maior qualidade. A velocidade depende do aparelho e não há aceleração garantida. A opção vale para a próxima análise, sem reiniciar uma tarefa que já esteja em andamento. A interface mantém o aviso dos cerca de 30 MB extras de componentes no primeiro uso.

## Verificação

Suíte: 51 testes aprovados, zero falhas e um teste POSIX pulado no Windows. No navegador: tela inicial e entrada simplificadas, painel de preparação oculto no exemplo pronto, fila limpa, edição do nome, rejeição de nome com apenas espaços, mudança de Chapola para Irisu e confirmação do nome e do avatar em um segundo jogador na mesma sala. A engrenagem continua abrindo os ajustes. Nenhum erro de console observado nessa navegação. O personagem usado no teste foi restaurado a Chapola.

## Arquivos alterados

public/index.html, public/js/game.js, public/js/room-ui.js, public/css/room-shell.css, package.json e package-lock.json. Nenhuma alteração em server.js.

## Desfazer

A cópia anterior está em outputs/backup-antes-perfil-e-textos-1.8.1. Restaure index.html em public/; game.js e room-ui.js em public/js/; room-shell.css em public/css/; package.json e package-lock.json na raiz do projeto. Atualize a aba. Os pacotes 1.8.1 foram preservados.

Prévia: http://localhost:3003/. A hospedagem não foi atualizada automaticamente.
