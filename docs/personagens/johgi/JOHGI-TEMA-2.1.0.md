# Johgi — tema tropical, versão 2.1.0

## Direção visual

O tema usa o pôr do sol das imagens enviadas, o hibisco do personagem, creme, coral, rosa e laranja. Contornos, letras de quadrinhos e sombras deslocadas seguem a linguagem ilustrada da entrada. Os textos e controles continuam nos mesmos lugares e com as mesmas funções.

Na entrada há praia e palmeiras. A sala ganha painéis de papel claro, o retrato da Johgi e o selo da sessão tropical. Perfil, ajustes, músicas, pesquisa de partituras, fila, histórico, pausa e resultados usam a mesma paleta. No palco, o braço permanece escuro para manter o contraste. As notas viram palhetas com as cores originais de cada pista; o bumbo continua sendo uma barra larga. Sustentações, alvos, acertos e combos recebem estrelas, pétalas e detalhes de sol.

O tema é ativado pelo ID já existente da Johgi (`gio`). O nome artístico e a descrição não foram alterados. A referência a Chapola no fim do pedido foi interpretada como um trecho do prompt anterior: o novo tema pertence somente à Johgi.

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `public/css/johgi-theme.css` | Cores, tipografia, painéis, diálogos, entrada e adaptação a telas menores. Os seletores ficam limitados à Johgi. |
| `public/js/johgi-theme.js` | Ativa a classe visual ao escolher `gio`. Para os outros personagens, encaminha os desenhos ao tema anterior. |
| `public/js/johgi-stage.js` | Desenha cenário, braço, notas, sustentações, placar, multiplicador e efeitos. Só lê os dados recebidos. |
| `public/assets/johgi/` | Quatro referências copiadas sem editar os originais e um hibisco vetorial criado para a interface. |
| `public/index.html` | Carrega o CSS e os dois scripts novos, antes da inicialização do jogo. |
| `tests/johgi-theme.test.js` | Verifica ausência de alterações em notas, jogador e contexto do canvas; troca de tema e movimento reduzido. |
| `package.json`, `package-lock.json`, [`README.md`](../../../README.md) | Identificação da versão e documentação. Não acrescentam dependências. |

## Referências usadas

- `IMG-20261101-WA0040.jpg`: cenário principal da entrada e da partida (`sunset-beach.jpg`).
- `IMG-20261101-WA0041.jpg`: fundo da sala e da ficha (`sunset-palm.jpg`).
- `IMG-20261102-WA0013.jpg`: papel floral discreto da área de envio (`hibiscus-paper.jpg`).
- `IMG-20261102-WA0015.jpg`: ondas no símbolo da música selecionada (`tropical-waves.jpg`).
- As demais imagens orientaram a paleta, os detalhes florais, os brilhos e as formas. As imagens com tabelas de cores, marcas ou frases não são exibidas como painéis no jogo.

O hibisco é um SVG de aproximadamente 1 KB, também incorporado ao CSS para funcionar com os tipos de arquivo que o servidor já aceita. Não foi necessário modificar o servidor para servir SVG.

## O que permanece igual

`game.js`, `entrance.js`, `chapola-theme.js`, `server.js` e `render.yaml` foram comparados por SHA-256 com a cópia anterior e permanecem idênticos. Não houve alterações na análise de músicas, áudio, relógio, controles, rede, regras ou pontuação. As notas mantêm seus instantes, pistas e durações. O tema só desenha sobre os dados já fornecidos pelo jogo.

O Chapola continua com seu pub e seu breu. Irisu, Roberto, Ratazana, Lizzi e Tatsugiri mantêm o visual padrão. A opção de movimento reduzido do aparelho desativa brilhos móveis e partículas decorativas da Johgi.

## Peso e hospedagem

Os cinco arquivos de arte somam 380.120 bytes (cerca de 371 KB). Com CSS e scripts, o acréscimo fica próximo de 0,4 MB. As fontes já eram usadas pelo jogo. As imagens são carregadas conforme o tema aparece, e o cenário é reutilizado entre entrada e partida.

Não há modelo de IA novo, biblioteca adicional ou processamento de imagem no servidor. O processamento dos efeitos continua no navegador, e a configuração do Render Free foi mantida.

## Conferência

A suíte completa teve 73 testes aprovados, nenhuma falha e um teste POSIX pulado no Windows. Os testes que usam servidor local precisaram rodar com acesso à rede local; a primeira execução isolada foi bloqueada por EACCES, sem exigir alteração no código.

Foram conferidos no navegador a ficha, a entrada, a sala, a pesquisa de músicas, ajustes, perfil, partida, pausa e resultado. A bateria registrou acertos e combo durante a música; a rodada de guitarra também chegou ao resultado sem erro de desenho. Os painéis couberam na largura de celular sem rolagem lateral. Uma rolagem excedente no menu foi corrigida reposicionando o hibisco; pausa e resultado ficaram com a largura de conteúdo igual à largura disponível. O desenho automatizado cobre os cinco instrumentos, de uma a cinco pistas, incluindo o bumbo, notas longas, combos e contexto gráfico preservado.

Na troca de personagens pelo perfil, Irisu voltou ao visual padrão, Chapola recuperou seu tema e Johgi voltou ao tropical. A versão fica organizada na branch `feature/tema-johgi-2.1.0`. A prévia local usa `http://localhost:3003/`; esta alteração não executa uma implantação no Render.

## Como desfazer

Para deixar de usar o tema sem apagar arquivos, basta escolher outro personagem no perfil.

Para desativar apenas este tema no código, retire de `public/index.html` as linhas que carregam `johgi-theme.css`, `johgi-stage.js` e `johgi-theme.js`. O roteamento volta ao tema anterior do jogo. Não é necessário editar o servidor ou a lógica de partida.

A cópia anterior dos arquivos existentes fica em `outputs/backup-antes-johgi-2.1.0`, na pasta principal deste trabalho. Ela inclui `public/index.html`, [`README.md`](../../../README.md), `package.json` e `package-lock.json`. O registro `logica-e-temas-preservados.json` guarda os hashes dos arquivos que permaneceram intactos.
