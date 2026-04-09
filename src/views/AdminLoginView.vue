<template>
  <div class="container fade-up">
    <section class="section admin-login-shell">
      <header class="section-header">
        <h1 class="section-title">Acesso administrativo</h1>
        <p class="section-subtitle">
          Entre com seu usuario administrador para acessar os recursos de gestao do acervo.
        </p>
      </header>

      <div class="admin-login-panel panel">
        <p v-if="infoMessage" class="state-box state-loading" style="margin-bottom: 0.8rem">
          {{ infoMessage }}
        </p>
        <p v-if="errorMessage" class="state-box state-error" style="margin-bottom: 0.8rem">
          {{ errorMessage }}
        </p>
        <p v-if="successMessage" class="state-box state-loading" style="margin-bottom: 0.8rem">
          {{ successMessage }}
        </p>

        <form class="form-grid" @submit.prevent="handleLogin">
          <label class="field-full">
            <span class="field-label">Email</span>
            <input
              v-model="email"
              class="input"
              type="email"
              autocomplete="username"
              required
              placeholder="admin@exemplo.com"
            />
          </label>

          <label class="field-full">
            <span class="field-label">Senha</span>
            <input
              v-model="password"
              class="input"
              type="password"
              autocomplete="current-password"
              required
              placeholder="Sua senha"
            />
          </label>

          <div class="field-full form-actions">
            <button class="btn btn-primary" type="submit" :disabled="loading || !hasFirebaseConfig">
              {{ loading ? 'Entrando...' : 'Entrar' }}
            </button>
            <a
              v-if="showResetPasswordLink"
              class="forgot-link"
              href="#"
              :aria-disabled="resetLoading || loading"
              @click.prevent="handleResetPassword"
            >
              {{ resetLoading ? 'Enviando email...' : 'Esqueceu a sua senha?' }}
            </a>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useRoute, useRouter } from 'vue-router'

import { auth, hasFirebaseConfig } from '../services/firebase'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const resetLoading = ref(false)
const failedLoginAttempts = ref(0)
const errorMessage = ref('')
const successMessage = ref('')

const infoMessage = computed(() => {
  if (!hasFirebaseConfig || route.query.reason === 'firebase-config') {
    return 'Firebase nao configurado no build atual. Verifique os secrets VITE_FIREBASE_* do GitHub Actions.'
  }

  if (route.query.reason === 'not-admin') {
    return 'Sua conta esta autenticada, mas nao possui permissao de administrador.'
  }

  return ''
})

const showResetPasswordLink = computed(() => failedLoginAttempts.value >= 3)

function isInvalidCredentialError(code) {
  return (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/too-many-requests'
  )
}

function normalizeAuthError(error) {
  const code = error?.code || ''

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Email ou senha invalidos.'
  }

  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas de login. Tente novamente em alguns minutos.'
  }

  return 'Falha no login. Verifique suas credenciais e tente novamente.'
}

async function handleLogin() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!hasFirebaseConfig || !auth) {
    errorMessage.value = 'Firebase não configurado para autenticação neste ambiente.'
    return
  }

  loading.value = true

  try {
    const credentials = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    const tokenResult = await credentials.user.getIdTokenResult(true)

    if (tokenResult?.claims?.admin !== true) {
      await signOut(auth)
      errorMessage.value = 'Usuário sem permissão de administrador.'
      return
    }

    failedLoginAttempts.value = 0

    const redirectTarget =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
        ? route.query.redirect
        : '/admin'

    await router.replace(redirectTarget)
  } catch (error) {
    if (isInvalidCredentialError(error?.code)) {
      failedLoginAttempts.value += 1
    }

    errorMessage.value = normalizeAuthError(error)
  } finally {
    loading.value = false
  }
}

function normalizeResetError(error) {
  const code = error?.code || ''

  if (code === 'auth/invalid-email') {
    return 'Informe um email válido para redefinir a senha.'
  }

  if (code === 'auth/user-not-found') {
    return 'Não encontramos um usuário com esse email.'
  }

  if (code === 'auth/too-many-requests') {
    return 'Muitas solicitações de redefinição. Tente novamente em alguns minutos.'
  }

  return 'Não foi possível enviar o email de redefinição agora.'
}

async function handleResetPassword() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!hasFirebaseConfig || !auth) {
    errorMessage.value = 'Firebase não configurado para envio de redefinição.'
    return
  }

  const targetEmail = email.value.trim()
  if (!targetEmail) {
    errorMessage.value = 'Digite seu email para receber o link de redefinição.'
    return
  }

  resetLoading.value = true

  try {
    await sendPasswordResetEmail(auth, targetEmail)
    successMessage.value = 'Email de redefinição enviado. Verifique sua caixa de entrada e spam.'
  } catch (error) {
    errorMessage.value = normalizeResetError(error)
  } finally {
    resetLoading.value = false
  }
}
</script>

<style scoped>
.admin-login-shell {
  max-width: 560px;
  margin-inline: auto;
}

.admin-login-panel {
  margin-top: 1rem;
}

.forgot-link {
  color: var(--green-700);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  padding: 0.1rem 0;
}

.forgot-link[aria-disabled='true'] {
  opacity: 0.55;
  pointer-events: none;
}
</style>
