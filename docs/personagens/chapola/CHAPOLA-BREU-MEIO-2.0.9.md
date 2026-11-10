# Breu perto da metade da música — 2.0.9

O pub agora começa a apagar aos 45% da faixa. A sequência segue a ordem: apagar completamente, pequena pausa no preto, olhos, pausa sem olhos e iluminação voltando.

O período inteiro do efeito dura até 100 segundos, limitado a 45% da duração da música. Assim, há tempo para a luz voltar antes do final. Em faixas curtas, a permanência dos olhos se adapta ao trecho disponível.

| Música | Começa a apagar | Primeiros olhos, aproximadamente | Iluminação restaurada |
| --- | --- | --- | --- |
| 25 segundos | 11,25 s | 12,73 s | 22,50 s |
| 3 minutos | 1min21s | 1min22,55s | 2min42s |

Os sete tipos de olhos, o preto uniforme, a nova estética do braço e os efeitos do Chapola foram preservados. A alteração é no momento em que o efeito visual acontece; não altera áudio, notas, controles ou pontuação. Não há dependência nova nem mudança na configuração do Render Free.

Arquivos alterados: `public/js/chapola-haunting.js`, `public/index.html`, `tests/chapola-haunting.test.js`, `package.json` e `package-lock.json`.

Foram aprovados os 14 testes de olhos, palco e renderização dos instrumentos. Eles verificam o começo da faixa sem breu, o início perto da metade, as pausas sem olhos e a volta da iluminação. Uma rodada completa de Ensaio vocal também foi conferida no navegador em 1280 × 720, sem erros de console.

Capturas: `outputs/chapola-breu-meio-{inicio,meio,saida,volta}-2.0.9.jpg`.

Atualize http://localhost:3003/ para carregar a versão nova. Pacotes completos: `outputs/bdsm-de-garagem-2.0.9-render.zip` e `outputs/bdsm-de-garagem-2.0.9-windows.zip`. A hospedagem não foi publicada automaticamente.

Para desfazer só esta mudança, use `outputs/backup-antes-breu-meio-2.0.8`: restaure `chapola-haunting.js` em `public/js/`, `index.html` em `public/`, `chapola-haunting.test.js` em `tests/` e os dois arquivos de pacote na raiz do projeto `outputs/Guitaband-Varanda/`. Depois atualize a aba. Os ZIPs completos 2.0.8 também foram preservados.
