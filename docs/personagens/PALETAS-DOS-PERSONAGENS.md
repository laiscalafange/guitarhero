# Paletas dos personagens — 1.6.1

A janela de seleção agora muda de paleta imediatamente ao explorar um personagem, sem precisar confirmar. São alterados fundo, bordas, títulos, legendas, textura atrás da arte, brilho, miniatura selecionada, barra de rolagem e botão de confirmação.

| Personagem | Paleta |
| --- | --- |
| Chapola | Vermelho escuro, preto e rosa avermelhado |
| Irisu | Azul profundo e azul claro |
| Roberto Montanna | Verde oliva, vermelho e creme |
| Ratazana | Rosa, vinho e creme rosado |
| Lizzi / Raul Ameixas | Roxo, lilás e creme |
| Johgi | Terracota, vermelho e dourado |
| Tatsugiri | Verde escuro, preto e verde claro |

As cores claras dos títulos e botões mantêm a leitura sobre os fundos escuros. O tema acompanha a personagem em foco por clique ou pelas setas do teclado. As imagens, descrições e escolha salva continuam funcionando como antes. A capa e a partida mantêm seus próprios visuais.

## Arquivos

- `public/css/character-themes.css`: sete paletas e regras de cor.
- `public/js/entrance.js`: informa ao seletor qual personagem está em foco (`data-character`).
- `public/index.html`: carrega o CSS novo e a versão atualizada do seletor.

O efeito é feito por CSS no navegador, sem modelos ou downloads de imagens adicionais. Foi conferida no navegador a troca das sete paletas, inclusive os fundos e as cores calculadas dos botões.

## Ver e desfazer

Atualize http://localhost:3003/, clique em START e abra o seletor. Clique nos personagens para comparar.

Os arquivos anteriores estão em `outputs/backup-antes-paletas-1.6.0`. Para desfazer somente esta mudança, restaure `index.html` em `public/` e `entrance.js` em `public/js/`. O CSS novo pode permanecer sem uso. Os pacotes 1.6.0 anteriores também foram preservados.

Para hospedar, use o pacote Render 1.6.1 com os mesmos comandos de build e início. Nenhuma atualização foi publicada na sua conta Render por esta alteração.
