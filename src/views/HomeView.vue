<template>
  <div class="container fade-up">
    <section class="hero-banner">
      <div class="hero-grid">
        <div>
          <h1>Jardim Botanico de Santa Maria</h1>
          <p>
            Um acervo vivo para conservacao, pesquisa, extensao e lazer. Explore especies,
            acesse informacoes por QR Code e descubra a biodiversidade presente no campus.
          </p>
          <div class="hero-badge">Plataforma oficial do acervo botanico digital</div>
          <div class="form-actions" style="margin-top: 1rem">
            <RouterLink class="btn btn-primary" to="/acervo">Explorar acervo</RouterLink>
          </div>
        </div>

        <div class="panel">
          <div class="stats-row">
            <article class="stat-card">
              <strong>349+</strong>
              <span>especies catalogadas</span>
            </article>
            <article class="stat-card">
              <strong>2500+</strong>
              <span>individuos no jardim</span>
            </article>
            <article class="stat-card">
              <strong>13 ha</strong>
              <span>area de conservacao</span>
            </article>
          </div>
          <p style="margin-top: 0.8rem; color: var(--muted)">
            Navegue no acervo mesmo em conexoes instaveis. A plataforma prioriza imagens leves
            quando necessario para manter o acesso rapido em campo.
          </p>
        </div>
      </div>
    </section>

    <section class="section" id="sobre">
      <header class="section-header">
        <h2 class="section-title">Sobre o Jardim</h2>
        <p class="section-subtitle">
          Orgão suplementar do CCNE/UFSM, fundado em 1981, com foco em conservacao de especies
          florestais nativas e atividades de ensino, pesquisa e extensao.
        </p>
      </header>

      <div class="grid-cards">
        <article class="card">
          <h3>Missao</h3>
          <p>
            Preservar a flora regional e ampliar o acesso publico ao conhecimento botanico por
            meio de trilhas, acervo digital e acoes educativas.
          </p>
        </article>
        <article class="card">
          <h3>Uso educacional</h3>
          <p>
            O ambiente serve como laboratorio a ceu aberto para disciplinas da universidade e
            para escolas da regiao em visitas guiadas.
          </p>
        </article>
        <article class="card">
          <h3>Experiencia mobile</h3>
          <p>
            As especies sao acessadas no local por placas com QR Code, com paginas otimizadas
            para leitura rapida em celulares.
          </p>
        </article>
      </div>
    </section>

    <section class="section" id="atracoes">
      <header class="section-header">
        <h2 class="section-title">Atracoes</h2>
      </header>
      <div class="grid-cards">
        <article class="card">
          <h3>Trilhas ecologicas</h3>
          <p>
            Percursos com especies nativas, sinalizacao interpretativa e pontos de observacao da
            biodiversidade local.
          </p>
        </article>
        <article class="card">
          <h3>Jardim sensorial</h3>
          <p>
            Espaco com foco em texturas, aromas e formas, ampliando a experiencia de contato com
            as plantas.
          </p>
        </article>
        <article class="card">
          <h3>Visitas guiadas</h3>
          <p>
            Roteiros para turmas e grupos agendados durante o periodo letivo, com equipe de
            apoio do Jardim.
          </p>
        </article>
      </div>
    </section>

    <section class="section" id="visite">
      <header class="section-header">
        <h2 class="section-title">Planeje sua visita</h2>
      </header>
      <div class="panel">
        <p>
          Horario regular: segunda a sexta, das 8h as 17h. Abre eventualmente aos domingos.
          Agendamentos de grupos durante periodo letivo podem ser feitos pelo formulario oficial.
        </p>
        <div class="form-actions" style="margin-top: 0.9rem">
          <a class="btn btn-primary" href="https://forms.gle/9GoPeqG27csYxWJ86" target="_blank" rel="noreferrer">
            Agendar visita
          </a>
          <a
            class="btn btn-secondary"
            href="https://www.ufsm.br/orgaos-suplementares/jardim-botanico"
            target="_blank"
            rel="noreferrer"
          >
            Site institucional
          </a>
        </div>
        <p style="margin-top: 0.8rem; color: var(--muted)">
          Endereco: Av. Roraima, 1000 - Camobi, Santa Maria/RS.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
