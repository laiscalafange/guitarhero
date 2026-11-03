# Johgi — laranja escuro translúcido (2.1.1)

Os fundos claros em creme foram substituídos por laranja queimado intenso, mais escuro e com transparência. A mesma paleta vale para entrada, cabeçalho, sala da banda, músicas, fila, perfil, ajustes, seleção da Johgi, pausa e resultados. Textos em marfim e pêssego mantêm o contraste. As imagens de referência e as cores das pistas e notas permanecem as mesmas.

`public/css/johgi-theme.css` ganhou uma seção de paleta ao final. Os tons principais ficam nas variáveis `--johgi-glass`, `--johgi-surface`, `--johgi-raised` e `--johgi-deep`. Os fundos usam alfa entre aproximadamente 60% e 90%, para revelar o cenário sem comprometer a leitura. A remoção dessa seção restaura a paleta anterior dos componentes HTML.

Em `public/js/johgi-stage.js`, somente cores e transparências do placar, multiplicador e aviso de acerto/erro foram ajustadas. A sombra desses cartões também ficou translúcida. Não foram alteradas coordenadas, animações, notas, pontuação, áudio, controles ou sincronização. `public/index.html` aponta para a revisão nova dos dois arquivos; `package.json`, `package-lock.json` e `README.md` identificam a versão.

Para restaurar exatamente o visual 2.1.0, use as cópias dos arquivos em `outputs/backup-johgi-cores-2.1.0`, na pasta principal deste trabalho. Também é possível reverter apenas o commit desta paleta na branch `feature/tema-johgi-2.1.0`.

Não há imagens, fontes, modelos ou dependências novas. A mudança continua restrita à Johgi e mantém a configuração do Render Free.

Verificação: o CSS foi validado pelo parser do esbuild, o JavaScript passou na verificação de sintaxe e os três testes existentes do tema passaram. A conferência visual não foi concluída: o navegador integrado retornou indisponibilidade da API, e o controle do Chrome foi interrompido por não conseguir confirmar a URL da janela. Atualize a página para carregar a nova paleta.
