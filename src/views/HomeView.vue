<template>
  <div class="container fade-up">
    <section class="hero-banner">
      <div class="hero-grid">
        <div>
          <h1>Jardim Botânico de Santa Maria</h1>
          <p>
            Um acervo vivo para conservação, pesquisa, extensão e lazer. Explore espécies,
            acesse informações por QR Code e descubra a biodiversidade presente no campus.
          </p>
          <div class="hero-badge">Plataforma oficial do acervo botânico digital</div>
          <div class="form-actions" style="margin-top: 1rem">
            <RouterLink class="btn btn-primary" to="/acervo">Explorar acervo</RouterLink>
          </div>
        </div>

        <div class="panel">
          <div class="stats-row">
            <article class="stat-card">
              <strong>349+</strong>
              <span>espécies catalogadas</span>
            </article>
            <article class="stat-card">
              <strong>2500+</strong>
              <span>indivíduos no jardim</span>
            </article>
            <article class="stat-card">
              <strong>13 ha</strong>
              <span>área de conservação</span>
            </article>
          </div>
          <p style="margin-top: 0.8rem; color: var(--muted)">
            Navegue no acervo mesmo em conexões instáveis. A plataforma prioriza imagens leves
            quando necessário para manter o acesso rápido em campo.
          </p>
        </div>
      </div>
    </section>

    <section class="section" id="sobre">
      <header class="section-header">
        <h2 class="section-title">Sobre o Jardim</h2>
        <p class="section-subtitle">
          Orgão suplementar do CCNE/UFSM, fundado em 1981, com foco em conservação de espécies
          florestais nativas e atividades de ensino, pesquisa e extensão.
        </p>
      </header>

      <div class="grid-cards">
        <article class="card">
          <h3>Missão</h3>
          <p>
            Preservar a flora regional e ampliar o acesso público ao conhecimento botânico por
            meio de trilhas, acervo digital e ações educativas.
          </p>
        </article>
        <article class="card">
          <h3>Uso educacional</h3>
          <p>
            O ambiente serve como laboratório a céu aberto para disciplinas da universidade e
            para escolas da região em visitas guiadas.
          </p>
        </article>
        <article class="card">
          <h3>Experiência mobile</h3>
          <p>
            As espécies são acessadas no local por placas com QR Code, com páginas otimizadas
            para leitura rápida em celulares.
          </p>
        </article>
      </div>
    </section>

    <section class="section" id="atracoes">
      <header class="section-header">
        <h2 class="section-title">Atrações</h2>
      </header>
      <div class="grid-cards">
        <article class="card">
          <h3>Trilhas ecológicas</h3>
          <p>
            Percursos com espécies nativas, sinalização interpretativa e pontos de observação da
            biodiversidade local.
          </p>
        </article>
        <article class="card">
          <h3>Jardim sensorial</h3>
          <p>
            Espaço com foco em texturas, aromas e formas, ampliando a experiência de contato com
            as plantas.
          </p>
        </article>
        <article class="card">
          <h3>Visitas guiadas</h3>
          <p>
            Roteiros para turmas e grupos agendados durante o período letivo, com equipe de
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
          Horário regular: segunda a sexta, das 8h as 17h. Abre eventualmente aos domingos.
          Agendamentos de grupos durante período letivo podem ser feitos pelo formulário oficial.
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
          Endereço: Av. Roraima, 1000 - Camobi, Santa Maria/RS.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
