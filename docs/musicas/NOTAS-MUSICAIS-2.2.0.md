# Notas mais musicais — versão 2.2.0

A IA principal continua sendo Demucs 6s + Basic Pitch. Esta versão melhora a etapa que transforma as alturas reconhecidas em teclas jogáveis. Não há um novo treinamento, modelo ou download de pesos.

## O que mudou

- **Graves à esquerda e agudas à direita.** As alturas são agrupadas em faixas ordenadas. Alturas próximas podem compartilhar uma tecla quando existem mais sons que pistas; a ordem não se inverte.
- **Teclas consistentes.** Uma mesma altura mantém sua tecla na mesma música, instrumento e dificuldade. Foi removido o deslocamento dependente da nota anterior que podia trocar a cor no Fácil.
- **Registro mais estável.** Quando o mesmo ataque contém dobras de oitava, a organização escolhe uma voz detectada próxima ao registro habitual da parte. O baixo prioriza a voz grave. Isso reduz trocas entre fundamental e harmônicos; não inventa uma frequência ausente da análise.
- **Menos influência de extremos raros.** A distribuição considera frequência e força dos sons. Uma altura extrema isolada deixa de comprimir o riff inteiro em poucas teclas.
- **Acordes mais legíveis.** Dobras de oitava e componentes muito fracos do mesmo ataque não viram teclas adicionais. Acordes rápidos usam até duas teclas. Três teclas ficam reservadas para vozes sustentadas claras e espaçadas no Expert. Fácil e Médio continuam com uma tecla por ataque; baixo e vocal seguem uma voz.
- **Folga nas notas longas.** Fácil e Médio deixam aproximadamente 70 ms para soltar uma sustentação antes do próximo ataque. A duração nunca é aumentada além do som detectado.
- **Bateria consistente.** A posição vem da peça reconhecida e do número de pistas, sem ser empurrada para outra cor por causa da nota anterior.

Os tempos das notas continuam vindo dos eventos reconhecidos no áudio. Esta alteração não força os ataques para uma grade de BPM. As partituras prontas importadas continuam com as notas e posições escritas pelo autor.

## Referências humanas analisadas

Foram examinadas partituras creditadas à Harmonix no catálogo usado pelo jogo:

| Música | Ataques de guitarra no Médio | Padrões de três ataques que se repetem | Saltos rápidos de três pistas ou mais |
|---|---:|---:|---:|
| Her Majesty — The Beatles | 38 | 36,1% | 0 |
| Seven Nation Army — The White Stripes | 153 | 83,4% | 0 |
| Blitzkrieg Bop — Ramones | 307 | 100% | 0 |

Um acorde simultâneo conta como um ataque. A medição de saltos considera o centro das teclas de um ataque e um intervalo menor que 350 ms. São três exemplos, não um padrão universal de toda música.

As referências orientaram principalmente a consistência dos desenhos, a escolha de vozes e a legibilidade. Os números acima não foram usados para treinar uma rede neural nem para copiar sequências prontas. MIDI de Guitar Hero/Rock Band costuma guardar botões, não as frequências reais das cordas: ele não é, sozinho, uma referência de altura musical.

Também foram consultadas orientações de autores sobre ordem de alturas, coerência de acordes e sustentações:

- [Harmonix: revisão de Through the Fire and Flames](https://www.harmonixmusic.com/blog/a-look-behind-the-new-authoring-of-through-the-fire-and-flames)
- [Mariteaux: autoria de guitarra Expert](https://mariteaux.somnolescent.net/modding/guitar-hero/tutorials/authoring-expert-guitar/)

Os dois exemplos novos foram extraídos por intervalos de bytes do pacote: aproximadamente 162 KB e 136 KB, sem baixar os áudios completos. As referências e medições ficam em `work/human-charting-2.2.0` no workspace local.

## Comparação com a organização anterior

Mesma análise de 30 segundos de Her Majesty; nenhum modelo de áudio foi executado novamente.

| Dificuldade | Teclas antes → depois | Ataques antes → depois | Acordes de três teclas antes → depois |
|---|---:|---:|---:|
| Fácil | 54 → 54 | 54 → 54 | 0 → 0 |
| Médio | 73 → 73 | 73 → 73 | 0 → 0 |
| Difícil | 176 → 163 | 107 → 107 | 0 → 0 |
| Expert | 234 → 187 | 126 → 126 | 33 → 0 |

O novo mapa ainda depende da qualidade da transcrição. Esta mudança não resolve todos os ataques extras ou ausentes. Em algumas passagens, seguir melhor a altura reconhecida pode produzir saltos maiores: no Expert desse trecho, a métrica de saltos rápidos passou de 1 para 3; no Médio, caiu de 6 para 4. A avaliação ao jogar continua importante.

## Para ver e comparar

- **Jogo atualizado:** `http://localhost:3005/`. Use esta prévia nova para pesquisar no YouTube. As salas antigas da porta 3003 foram preservadas.
- **Antes e depois:** `http://localhost:3006/`. A usa a organização anterior; B usa a nova, com o mesmo áudio, Expert, cinco pistas, teclas A S D F G e o motor de partida existente. Esc abre a pausa. O botão da outra versão encerra a rodada atual.

No comparativo, os dois mapas entram pelo caminho de partitura importada. Assim, o som é a mesma mistura nas duas versões; a comparação não avalia o silenciamento de instrumentos por erro. Os mapas já estão preparados e o miniteste não baixa modelos nem inicia uma nova análise.

No jogo normal, atualize a página para carregar `chart-engine.js?v=2.2.0` e prepare outra rodada. Análises já disponíveis no mesmo site podem usar a organização nova sem serem refeitas. Uma prévia em outra porta é outra origem para o armazenamento do navegador.

## Pesquisa do YouTube

A consulta real `oceano phl noturnboy` falhou no processo da prévia antiga e retornou seis resultados, HTTP 200, no servidor novo da porta 3005, incluindo Oceano, do canal Phl Notunrboy. O programa de busca também retornou a música quando executado diretamente com acesso à rede.

As mensagens agora distinguem falta de permissão de rede, falha de conexão, bloqueio HTTP e erros desconhecidos. O erro genérico deixa de instruir quem está no computador local a procurar exclusivamente Logs do Render.

Um teste adicional com o link de outro vídeo recebeu exigência de verificação do YouTube. Isso foi identificado como bloqueio da plataforma; não é uma confirmação de que todo vídeo possa ser importado. A pesquisa pelo nome acima foi validada. Não houve implantação no Render nesta alteração.

## Validação e custo

- 85 testes: **84 aprovados, zero falhas e um teste POSIX pulado no Windows**.
- Compilação completa dos importadores e workers CPU/GPU concluída com esbuild 0.25.12 em WASM, como alternativa local à restrição de acesso do executável nativo deste ambiente. A dependência do projeto não foi alterada.
- Testes novos cobrem ordem de alturas, repetição, extremos raros, acordes, dobras de oitava, bateria, limites de duração e preservação de partituras humanas.
- Comparativo A/B passou por HTTP/WebSocket reais, importação, acerto de tecla com pontuação positiva, pausa, término e troca de versão. Canvas e Web Audio foram simulados com JSDOM e um relógio avançado; não houve inspeção visual nem audição automatizada no Chrome.
- Um teste de 50 mil eventos levou cerca de 52 ms na mediana deste computador. É a organização das teclas, não a análise do áudio inteiro.

Não foram adicionados modelos, fontes, imagens ou dependências à distribuição do jogo. O processamento continua no navegador; o servidor do Render mantém a mesma função.

## Arquivos e como desfazer

Arquivos funcionais: `public/chart-engine.js`, `public/index.html` e `youtube.js`. Os workers foram regenerados; versão, testes e documentação foram atualizados. A lógica de pontuação, controles e reprodução em `public/js/game.js` permaneceu igual.

O backup anterior está em `outputs/backup-antes-notas-humanas-2.2.0`, fora da pasta do jogo. Ele contém os arquivos anteriores, inclusive os workers e as mensagens do YouTube. Para voltar integralmente, restaure os arquivos desse backup nos mesmos caminhos relativos de `outputs/Guitaband-Varanda`; remova este documento se desejar. No Git, reverta o commit desta alteração, preservando o histórico.

O miniteste é separado. Para reabri-lo depois de encerrar o processo, execute `node work/human-charting-2.2.0/mini/server.cjs` a partir do workspace. Ele depende apenas dos arquivos locais dessa pasta e do projeto do jogo; não usa o ambiente Python do experimento audio2chart.
