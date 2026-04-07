# Firebase rules - JBSM Platform

Este arquivo guarda uma versao inicial de regras para Firestore e Storage.
Ajuste conforme a estrategia de autenticacao do projeto.

## Firestore (firestore.rules)

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    // Colecao publica para leitura no acervo.
    match /species/{speciesId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Storage (storage.rules)

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    // Imagens de especies sao publicas para leitura.
    match /species-images/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

## Observacoes

- Para manter a simplicidade inicial, o acervo e publico para leitura.
- Escrita exige usuario autenticado com custom claim admin=true.
- Se o projeto usar outro modelo de autenticacao, ajuste a funcao isAdmin().
