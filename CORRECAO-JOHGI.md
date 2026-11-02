# Correção da imagem de Johgi — 1.5.1

A aba que estava aberta ainda usava o recorte antigo de uma pose dentro da ficha com várias imagens. Esse recorte deixava uma faixa estreita e pedaços do fundo. Além disso, a miniatura de perfil usava o mesmo arquivo de corpo inteiro, em vez de um retrato de rosto.

Agora a imagem grande usa `public/assets/avatars/johgi.png`, com o corpo inteiro e fundo transparente, e perfil, miniaturas de seleção e lista da banda usam `johgi-face-v2.png`, com rosto e ombros sobre fundo claro. O retrato foi preparado com Imagegen a partir da arte de Johgi.

As referências do CSS e do seletor foram atualizadas para 1.5.1, para carregar a versão nova ao atualizar a aba. No tamanho intermediário de celular/tablet, o desenho de corpo inteiro também passa a usar enquadramento sem cortar as extremidades.

Como ver: atualize a aba `http://localhost:3003/` e abra a seleção de personagens. A escolha salva e a ficha de descrição de Johgi continuam iguais.

Para desfazer esta correção, os arquivos anteriores estão em `outputs/backup-johgi-1.5.0`: copie `index.html` para `public/`, `entrance.css` para `public/css/` e `entrance.js` para `public/js/`. Os pacotes ZIP anteriores também foram preservados; os pacotes com esta correção levam `1.5.1` no nome.
