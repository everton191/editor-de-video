# VideoLab Pessoal

Editor de videos pessoal, local-first, web/PWA, sem IA, sem login obrigatorio, sem planos pagos e sem marca d'agua obrigatoria.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:5174` ou a URL indicada pelo Vite.

## Como testar o fluxo inicial

1. Clique em `Novo projeto`.
2. Escolha formato, FPS e crie em branco.
3. Clique em `Importar midia` para adicionar MP4/WebM, imagem ou audio.
4. Use `Adicionar texto` para criar texto no canvas e na timeline.
5. Arraste o texto no preview.
6. Selecione clipes na timeline para alterar propriedades.
7. Clique em `Salvar` para persistir o `project_json` no IndexedDB.
8. Volte para a Home e reabra o projeto em `Projetos recentes`.
9. Acesse `Exportar` para escolher resolucao, qualidade, 4K e presets de melhoria tradicional.

## O que ja funciona

- Estrutura React + TypeScript + Vite.
- PWA com manifest, icone e service worker gerado no build.
- Estado global com Zustand.
- Persistencia local com Dexie/IndexedDB.
- Criacao e reabertura de projetos.
- Modelo `project_json` nao destrutivo.
- Importacao de video, imagem e audio para assets locais do navegador.
- Canvas/preview com elementos ativos no tempo atual.
- Texto editavel, selecionavel e arrastavel no canvas.
- Timeline funcional com trilhas, clipes, playhead, selecao, dividir, duplicar e excluir.
- Painel de propriedades para posicao, escala, rotacao, opacidade, duracao, volume e texto.
- Pacotes mockados com validacao de `manifest.json`.
- Tela de exportacao com 720p, 1080p, 2K, 4K, presets e plano FFmpeg.

## Preparado para fase 2

- Renderizacao real via FFmpeg.wasm em worker para projetos pequenos.
- Renderizacao local com FFmpeg instalado ou `ffmpeg-static`.
- Exportacao completa de textos, overlays, transicoes, audio e filtros.
- Keyframes, chroma key manual, mascaras e waveform.
- Empacotamento Android via PWA/Capacitor e futura versao desktop com Electron.

## Limitacoes atuais

- A exportacao MP4 ainda prepara o plano de renderizacao, mas nao gera o arquivo final.
- 4K no navegador pode consumir muita memoria; a rota recomendada para videos grandes e FFmpeg local em desktop ou Android nativo com pipeline proprio.
- Arquivos importados usam `blob:` durante a sessao; a fase seguinte deve persistir blobs/assets no IndexedDB ou File System Access API quando disponivel.
