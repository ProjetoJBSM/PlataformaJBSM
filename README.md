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

## Upload de fotos

- Fotos sao comprimidas e armazenadas no Firebase Storage
- Metadados EXIF sao automaticamente extraidos
- Se contiver geolocalização (GPS), oferece opção de usar automaticamente
- Suporta arrastamento (drag-and-drop)
- Validação de tipo de arquivo
