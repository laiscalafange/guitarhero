# Pesquisa de partituras — versão 1.9.0

## O que mudou

A pesquisa continua em Músicas → Partituras prontas. O botão Ampliar busca usa a largura da sala e recolhe temporariamente o painel lateral enquanto você compara os resultados. Banda e Fila continuam acessíveis no cabeçalho.

- Busca livre por música/artista e campo opcional de artista específico. Ao preencher artista, o primeiro campo passa a ser o título da música; é possível pesquisar apenas o artista deixando o título vazio.
- Filtros de guitarra, baixo, bateria e teclado; Fácil, Médio, Difícil e Expert. São enviados ao catálogo, antes da paginação.
- Ordenação por correspondência, nome, artista ou menor duração.
- Carregar mais resultados, preservando a pesquisa anterior e eliminando pacotes repetidos. A consulta solicita páginas de 25 entradas do catálogo; ele pode enviar mais de uma versão de cada entrada.
- Partituras do mesmo artista/título são agrupadas para comparar autor, álbum, ano, duração, instrumentos e dificuldades. Qualificadores no título, como Live, não são apagados. O agrupamento é visual e não mistura os áudios ou as notas dos pacotes.
- As dificuldades exibidas vêm das contagens de notas por instrumento/dificuldade. O nível de intensidade do song.ini não é usado para inventar as dificuldades disponíveis. Dados ausentes ficam como não informados; a importação confirma o conteúdo real do pacote.
- Correspondências exatas de texto, após normalizar acentos e pontuação, são distinguidas de artista correspondente ou resultado semelhante. Uma comparação textual aproximada melhora a ordem dos candidatos retornados. Não há garantia de corrigir qualquer erro de digitação ou encontrar músicas que o catálogo não possui.
- Consultas automáticas do YouTube/fila não dizem mais que uma música possui partitura só porque o catálogo retornou resultados parecidos. Elas oferecem conferir as versões. As consultas manuais têm prioridade sobre as automáticas que ainda aguardam a vez.
- Estados claros para consulta em andamento, lista vazia, catálogo indisponível e nova tentativa. Falha de conexão não é apresentada como prova de inexistência.

## Render gratuito

Não há dependência, modelo de IA ou banco de dados novo. A busca consulta metadados sob demanda; somente Importar pacote baixa áudio/partitura. O servidor mantém até 64 consultas em cache por dez minutos, agrupa requisições iguais e limita consultas simultâneas a duas. O navegador também limita o cache e a lista carregada a 400 partituras, pedindo filtros mais específicos ao atingir esse limite. O download continua restrito ao CDN autorizado, autenticado por participante e limitado pelos controles existentes.

Filtros de vocal não foram expostos: a busca geral do provedor não tem a mesma opção de vocal dos instrumentos de pistas. Vocal aparece nos resultados quando informado nos dados do catálogo e é confirmado após importar.

## Testes

- 57 testes aprovados, nenhum com falha e um teste POSIX pulado no Windows.
- Novos testes cobrem preservação de Live, cache por filtros/páginas, requisições avançadas, dificuldades extraídas das notas, classificação de candidatos parecidos, ordenação aproximada, concorrência, indisponibilidade e encaminhamento autenticado de filtros.
- Navegador com consulta real Queen + Bateria + Expert: primeira e segunda páginas carregadas, agrupamento de Killer Queen com três partituras e nenhum pacote repetido na lista.
- Busca real Don't Let Me Down + The Beatles: duas partituras agrupadas, importação completa de uma delas e entrada em Prontas para jogar sem IA. Seleção confirmou Guitarra, Baixo, Bateria e Vocalista na tela Banda.
- Busca sem resultado mostra orientação e oculta Carregar mais.
- Tela de 390 × 844 com conteúdo de 375 px, sem rolagem horizontal. Navegação entre abas preservou a pesquisa; nenhum erro de console observado no teste.
- HTML com 175 IDs únicos.

O teste baixou o pacote apenas para a sala temporária. Nenhuma música foi incluída nos ZIPs de instalação.

## Arquivos

chart-catalog.js delega consultas ao novo catalog-search.js e mantém o download existente. music-service.js encaminha filtros e página. public/index.html, public/js/game.js e o novo public/css/chart-search.css compõem a interface. tests/catalog-search.test.js cobre a busca. package.json e package-lock.json identificam a versão 1.9.0.

## Prévia, instalação e reversão

Prévia: http://localhost:3003/. O servidor local foi reiniciado para carregar o código de pesquisa; entre novamente na sala. A hospedagem não foi atualizada automaticamente. Os ZIPs 1.9.0 de Render e Windows mantêm os comandos de instalação anteriores.

A cópia anterior está em outputs/backup-antes-busca-1.8.2. Restaure index.html em public/; game.js em public/js/; chart-catalog.js, music-service.js, package.json e package-lock.json na raiz do projeto. Reinicie npm start. Os novos catalog-search.js e public/css/chart-search.css deixam de ser usados. Para reversão completa, os ZIPs 1.8.2 foram preservados.

## Referência técnica do provedor

A integração foi conferida no cliente oficial Bridge e na API pública:
https://github.com/Geomitron/Bridge/blob/master/src-angular/app/core/services/search.service.ts
https://github.com/Geomitron/Bridge/blob/master/src-shared/interfaces/search.interface.ts
