# Documentação — BDSM de Garagem

Este diretório reúne os documentos de desenvolvimento do jogo. O ponto de partida para instalar, executar e testar continua sendo o [README principal](../README.md).

**Importante:** muitos arquivos registram decisões de versões anteriores; mantenha-os como **histórico técnico**, não como descrição obrigatoriamente atual do comportamento do jogo. Consulte primeiro as versões mais recentes e o README principal.

## Mapa de pastas

| Pasta | Conteúdo |
| --- | --- |
| `interface/` | Telas, navegação, perfil e sala |
| `musicas/` | Biblioteca, pesquisa, partituras e notas |
| `personagens/` | Paletas e temas específicos |
| `manutencao/` | Limpeza de arquivos e registros de manutenção |
| `relatorios/` | Análises técnicas e validações |

## Índice por assunto

### Interface e sala

- [TELA-INICIAL-1.6.0.md](interface/TELA-INICIAL-1.6.0.md) — Tela inicial e início de jogo
- [ENTRADA-E-PERSONAGENS.md](interface/ENTRADA-E-PERSONAGENS.md) — Entrada e seleção de personagens
- [SALA-COM-ABAS-1.8.0.md](interface/SALA-COM-ABAS-1.8.0.md) — Sala organizada por abas (histórico)
- [REORGANIZACAO-DA-SALA-1.8.1.md](interface/REORGANIZACAO-DA-SALA-1.8.1.md) — Reorganização da sala e ajustes
- [PERFIL-E-LIMPEZA-1.8.2.md](interface/PERFIL-E-LIMPEZA-1.8.2.md) — Perfil editável e simplificação da interface

### Músicas e jogabilidade

- [AREA-DE-MUSICAS-1.7.0.md](musicas/AREA-DE-MUSICAS-1.7.0.md) — Área de músicas e fila
- [PESQUISA-DE-PARTITURAS-1.9.0.md](musicas/PESQUISA-DE-PARTITURAS-1.9.0.md) — Pesquisa de partituras
- [TODOS-OS-RESULTADOS-1.9.1.md](musicas/TODOS-OS-RESULTADOS-1.9.1.md) — Paginação e listagem dos resultados
- [NOTAS-MUSICAIS-2.2.0.md](musicas/NOTAS-MUSICAIS-2.2.0.md) — Distribuição das notas por pista

### Identidade dos personagens

- [PALETAS-DOS-PERSONAGENS.md](personagens/PALETAS-DOS-PERSONAGENS.md) — Paletas de cores dos personagens

### Tema Chapola

- [CHAPOLA-TEMA-2.0.0.md](personagens/chapola/CHAPOLA-TEMA-2.0.0.md) — Tema visual Chapola
- [CHAPOLA-ARTE-PROMPTS-2.0.0.md](personagens/chapola/CHAPOLA-ARTE-PROMPTS-2.0.0.md) — Referências e prompts de arte
- [CHAPOLA-SOMBRAS-2.0.1.md](personagens/chapola/CHAPOLA-SOMBRAS-2.0.1.md) — Primeira versão das sombras
- [CHAPOLA-FOTOS-2.0.2.md](personagens/chapola/CHAPOLA-FOTOS-2.0.2.md) — Aparições fotográficas
- [CHAPOLA-INTEGRACAO-2.0.3.md](personagens/chapola/CHAPOLA-INTEGRACAO-2.0.3.md) — Integração das aparições ao pub
- [CHAPOLA-BREU-2.0.4.md](personagens/chapola/CHAPOLA-BREU-2.0.4.md) — Breu e olhos
- [CHAPOLA-SEQUENCIA-2.0.5.md](personagens/chapola/CHAPOLA-SEQUENCIA-2.0.5.md) — Sequência de apagamento e aparições
- [CHAPOLA-VISIBILIDADE-2.0.6.md](personagens/chapola/CHAPOLA-VISIBILIDADE-2.0.6.md) — Visibilidade dos efeitos
- [CHAPOLA-SO-OLHOS-2.0.7.md](personagens/chapola/CHAPOLA-SO-OLHOS-2.0.7.md) — Efeito somente com olhos
- [CHAPOLA-PALCO-2.0.8.md](personagens/chapola/CHAPOLA-PALCO-2.0.8.md) — Palco, notas e efeitos
- [CHAPOLA-BREU-MEIO-2.0.9.md](personagens/chapola/CHAPOLA-BREU-MEIO-2.0.9.md) — Momento do efeito durante a música

### Tema Johgi

- [JOHGI-TEMA-2.1.0.md](personagens/johgi/JOHGI-TEMA-2.1.0.md) — Tema tropical Johgi
- [JOHGI-CORES-2.1.1.md](personagens/johgi/JOHGI-CORES-2.1.1.md) — Ajuste de cores e transparências
- [CORRECAO-JOHGI.md](personagens/johgi/CORRECAO-JOHGI.md) — Correção do tema Johgi

### Manutenção

- [LIMPEZA-FINAL-2.2.1.md](manutencao/LIMPEZA-FINAL-2.2.1.md) — Inventário de remoção de arquivos obsoletos

### Relatórios

- [RELATORIO-OTIMIZACAO-2.2.2.md](relatorios/RELATORIO-OTIMIZACAO-2.2.2.md) — Análise de desempenho, correções e testes

## Arquivos mantidos na raiz

- [README.md](../README.md) — instruções de execução, regras, hospedagem e testes.
- [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) — avisos de licença que devem acompanhar a distribuição.

## Boas práticas para novas atualizações

Registre mudanças de interface em `interface/`, música e partituras em `musicas/`, temas em `personagens/`, manutenção em `manutencao/` e diagnósticos em `relatorios/`. Adicione um link neste índice e atualize o README principal quando a alteração afetar o uso do jogo.
