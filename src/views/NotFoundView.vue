<template>
  <div class="container fade-up">
    <section class="section">
      <div class="empty-state">
        <h1>Pagina nao encontrada</h1>
        <p style="margin-top: 0.6rem">
          O endereco informado nao existe ou foi movido. Use o menu para voltar a navegacao.
        </p>
        <div class="form-actions" style="justify-content: center; margin-top: 0.9rem">
          <RouterLink class="btn btn-primary" to="/">Ir para a home</RouterLink>
          <RouterLink class="btn btn-secondary" to="/acervo">Abrir acervo</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
