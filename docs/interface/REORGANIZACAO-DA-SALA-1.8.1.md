# Reorganização da sala — 1.8.1

## O que mudou

- A navegação principal agora tem Banda, Músicas e Fila.
- Banda reúne a música selecionada, seu estado de preparação, instrumentos, participantes e histórico das rodadas. O histórico não tem mais uma aba separada.
- Músicas concentra as fontes de músicas: exemplos, arquivos, YouTube e partituras prontas. O texto “O repertório da noite” foi removido.
- O bloco “Artistas brasileiros e mais bibliotecas” foi removido, junto com seu evento de busca. A pesquisa geral por artista e música continua disponível.
- Ajustes saiu das abas e é acessado pela engrenagem ao lado do perfil. Clicar novamente nela retorna à aba anterior. O botão tem nome acessível e indica quando os ajustes estão abertos.

As telas usam os mesmos controles e dados, movidos sem duplicação. As mudanças não acrescentam dependências ou modelos de IA e mantêm os comandos existentes do Render.

## Arquivos alterados

- public/index.html: disposição dos blocos, navegação, engrenagem e versões dos recursos.
- public/js/room-ui.js: navegação dos ajustes e retorno à aba anterior.
- public/js/music-ui.js: texto de orientação para o instrumento logo abaixo da música.
- public/js/game.js: remoção do evento associado ao seletor de artistas removido.
- public/css/room-shell.css: engrenagem, espaçamento dos blocos de Banda e painel de preparação.
- package.json e package-lock.json: versão 1.8.1.

## Validação

51 testes aprovados, nenhum com falha e um teste POSIX pulado no Windows. Navegador: três abas, ajustes pela engrenagem e retorno, fontes em Músicas, mudança para Ensaio vocal atualizando o painel em Banda (Vocalista, Baixo e Bateria), fila e histórico visíveis nas áreas corretas. Layout de 390 × 844 sem rolagem horizontal e sem erros no console durante a navegação.

Prévia: http://localhost:3003/. Atualize a aba após sair da partida.

## Como desfazer

A cópia anterior está em outputs/backup-antes-reorganizacao-1.8.0, fora da pasta do projeto. Restaure index.html em public/; game.js, room-ui.js e music-ui.js em public/js/; room-shell.css em public/css/; package.json e package-lock.json na raiz do projeto. Atualize a página. Os ZIPs 1.8.0 anteriores também foram preservados.
