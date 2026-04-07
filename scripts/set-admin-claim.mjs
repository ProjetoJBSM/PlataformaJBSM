import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import admin from 'firebase-admin'

function getArgValue(args, flag) {
  const index = args.indexOf(flag)
  if (index === -1) {
    return null
  }

  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    return null
  }

  return value
}

function hasFlag(args, flag) {
  return args.includes(flag)
}

function printUsage() {
  console.log('Uso:')
  console.log('  npm run set-admin-claim -- --service-account <arquivo.json> --email <email>')
  console.log('  npm run set-admin-claim -- --service-account <arquivo.json> --uid <uid>')
  console.log('')
  console.log('Opcoes:')
  console.log('  --service-account  Caminho para o JSON da service account (obrigatorio)')
  console.log('  --email            Email do usuario a receber claim admin=true')
  console.log('  --uid              UID do usuario a receber claim admin=true')
  console.log('  --remove-admin     Remove a claim admin do usuario')
  console.log('  --help             Mostra esta ajuda')
}

async function loadServiceAccount(serviceAccountPath) {
  const resolvedPath = path.resolve(process.cwd(), serviceAccountPath)
  const raw = await fs.readFile(resolvedPath, 'utf8')
  const parsed = JSON.parse(raw)

  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('JSON de service account invalido: campos obrigatorios ausentes.')
  }

  return parsed
}

function buildNextClaims(currentClaims, removeAdmin) {
  const nextClaims = { ...(currentClaims || {}) }

  if (removeAdmin) {
    delete nextClaims.admin
  } else {
    nextClaims.admin = true
  }

  return Object.keys(nextClaims).length ? nextClaims : null
}

async function run() {
  const args = process.argv.slice(2)

  if (hasFlag(args, '--help')) {
    printUsage()
    return
  }

  const serviceAccountPath = getArgValue(args, '--service-account')
  const email = getArgValue(args, '--email')
  const uid = getArgValue(args, '--uid')
  const removeAdmin = hasFlag(args, '--remove-admin')

  if (!serviceAccountPath) {
    throw new Error('Informe --service-account <arquivo.json>.')
  }

  if ((!email && !uid) || (email && uid)) {
    throw new Error('Informe exatamente um identificador: --email <email> OU --uid <uid>.')
  }

  const serviceAccount = await loadServiceAccount(serviceAccountPath)

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })

  const auth = admin.auth()
  const userRecord = email
    ? await auth.getUserByEmail(email.trim())
    : await auth.getUser(uid.trim())

  const nextClaims = buildNextClaims(userRecord.customClaims, removeAdmin)

  await auth.setCustomUserClaims(userRecord.uid, nextClaims)
  await auth.revokeRefreshTokens(userRecord.uid)

  const updatedUser = await auth.getUser(userRecord.uid)

  console.log('Operacao concluida com sucesso.')
  console.log(`Projeto: ${serviceAccount.project_id}`)
  console.log(`UID: ${updatedUser.uid}`)
  console.log(`Email: ${updatedUser.email || '(sem email)'}`)
  console.log(`Claims atuais: ${JSON.stringify(updatedUser.customClaims || {})}`)
  console.log('Tokens revogados. O usuario deve fazer logout/login para receber o novo token.')
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Erro desconhecido.'
  console.error(`Erro: ${message}`)
  process.exit(1)
})
