<template>
  <div class="home-view fade-up">
    <section class="home-hero-stage">
      <div class="container">
        <div class="hero-banner home-hero-banner">
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
                  <strong>2000+</strong>
                  <span>indivíduos no jardim</span>
                </article>
                <article class="stat-card">
                  <strong>13 ha</strong>
                  <span>área de conservação</span>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="container">
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
        <div class="attractions-grid">
          <article class="attraction-item">
            <img
              class="attraction-photo"
              src="../assets/img/passeioescola.jpg"
              alt="Grupo em trilha ecológica no Jardim Botânico"
              loading="lazy"
              decoding="async"
            />
            <div class="card attraction-card">
              <h3>Trilhas ecológicas</h3>
              <p>
                Percursos com espécies nativas, sinalização interpretativa e pontos de observação da
                biodiversidade local.
              </p>
            </div>
          </article>

          <article class="attraction-item">
            <img
              class="attraction-photo"
              src="../assets/img/jardimsensorial.jpg"
              alt="Área do jardim sensorial com vegetação e trilha"
              loading="lazy"
              decoding="async"
            />
            <div class="card attraction-card">
              <h3>Jardim sensorial</h3>
              <p>
                Espaço com foco em texturas, aromas e formas, ampliando a experiência de contato com
                as plantas.
              </p>
            </div>
          </article>

          <article class="attraction-item">
            <img
              class="attraction-photo"
              src="../assets/img/tourguiado.jpg"
              alt="Visita guiada com grupo no Jardim Botânico"
              loading="lazy"
              decoding="async"
            />
            <div class="card attraction-card">
              <h3>Visitas guiadas</h3>
              <p>
                Roteiros para turmas e grupos agendados durante o período letivo, com equipe de
                apoio do Jardim.
              </p>
            </div>
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
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.home-hero-stage {
  width: 100%;
  min-height: clamp(320px, 44vw, 520px);
  padding: clamp(0.95rem, 2.5vw, 1.8rem) 0;
  background-image:
    linear-gradient(120deg, rgba(14, 25, 16, 0.4), rgba(24, 42, 24, 0.3)),
    url('../assets/img/homepage2crop2.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.home-hero-banner {
  background:
    linear-gradient(150deg, rgba(24, 42, 24, 0.78), rgba(53, 86, 52, 0.64)),
    radial-gradient(circle at 15% 25%, rgba(174, 212, 147, 0.24), transparent 36%),
    radial-gradient(circle at 85% 10%, rgba(223, 239, 206, 0.18), transparent 24%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.attractions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.attraction-item {
  min-width: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.7rem;
}

.attraction-card {
  height: 100%;
  padding: 1rem 1.15rem;
}

.attraction-photo {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
  border-radius: var(--radius-md);
  border: 1px solid rgba(77, 99, 57, 0.14);
  box-shadow: var(--shadow-soft);
}

.attraction-card p {
  color: var(--muted);
}

@media (max-width: 960px) {
  .attractions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .home-hero-stage {
    min-height: clamp(280px, 62vw, 420px);
    padding: 0.85rem 0;
  }

  .attractions-grid {
    grid-template-columns: 1fr;
  }

  .attraction-photo {
    aspect-ratio: 16 / 9;
  }
}
</style>
