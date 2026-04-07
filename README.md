# JBSM Platform

Plataforma web do Jardim Botanico de Santa Maria (UFSM), com:

- homepage institucional
- acervo navegavel de especies
- pagina individual por especie com galeria de fotos e mapa de localizacao (uso por QR Code)
- area administrativa para CRUD
- importacao em lote por CSV
- geracao de placas com QR Code em PNG
- upload de fotos com extração de geolocalização (EXIF)

O projeto foi pensado para mobile e conexoes de dados limitadas, com selecao de imagem por perfil de rede.

## Stack

- Vue 3 + Vite
- Vue Router
- Firebase (Firestore, Storage, Auth opcionalmente)
- Papa Parse (CSV)
- QRCode (geracao de QR)
- Leaflet (mapa com geolocalização)
- Piexif.js (extração de EXIF de fotos)

## Features

### Acervo
- Busca por nome, codigo, familia, origem
- Filtros por familia e tipo
- Galeria de fotos em modal com navegacao
- Mapa interativo com localizacao da planta
- Adaptação automatica de qualidade de imagem baseada na conexao (3g/4g/economia de dados)

### Administração
- **Registros**: CRUD completo de especies
  - Upload de fotos obrigatorio (armazenamento em Firebase Storage)
  - Detecção automatica de geolocalização em fotos (EXIF)
  - Campo manual para adicionar geolocalização se houver
- **Importação CSV**: sincronização em lote com a base de dados
- **Geração de Placas**: criação de placas com QR Code personalizáveis
  - Seleção de cores customizáveis
  - Importação/exportação de templates em JSON

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Configuracao de ambiente

1. Copie [.env.example](.env.example) para `.env`.
2. Preencha as variaveis do Firebase.
3. Opcionalmente ajuste `VITE_BASE_PATH` para deploy em subpasta (GitHub Pages).

Variaveis esperadas:

- `VITE_BASE_PATH`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Se as variaveis do Firebase nao forem informadas, a aplicacao entra em modo local com dados mock para facilitar desenvolvimento.

## Regras Firebase

As regras iniciais de Firestore e Storage estao em [firebase/rules.md](firebase/rules.md).

## Fluxo administrativo

Na rota `/admin`, a plataforma oferece:

- aba de registros: cadastrar, editar e excluir especies com upload obrigatorio de fotos
- aba de importacao CSV: leitura, pre-visualizacao e sincronizacao em lote
- aba de placas: gerar e baixar PNG com QR Code por especie

## Upload de fotos

- Fotos sao comprimidas e armazenadas no Firebase Storage
- Metadados EXIF sao automaticamente extraidos
- Se contiver geolocalização (GPS), oferece opção de usar automaticamente
- Suporta arrastamento (drag-and-drop)
- Validação de tipo de arquivo

## Deploy (GitHub Pages)

1. Defina `VITE_BASE_PATH` com o nome do repositorio (ex.: `/jbsm-platform/`).
2. Execute `npm run build`.
3. Publique o conteudo de `dist/` no branch de pages.

## Estrutura principal

- `src/views`: telas da aplicacao (home, acervo, detalhe, admin, 404)
- `src/components`: componentes reutilizáveis (PhotoGallery, LocationMap, PhotoUpload)
- `src/services`: acesso a dados, Firebase, CSV, EXIF e upload de fotos
- `src/composables`: logica reutilizavel (ex.: perfil de conexao)
- `firebase/rules.md`: base para regras de seguranca
