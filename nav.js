// Barra de navegação compartilhada entre as telas do site.
// Para incluir uma tela nova, adicione-a em TELAS e carregue este script na página dela.
(function () {
  const TELAS = [
    { titulo: "Checklist do gestor", caminho: "" },
    { titulo: "Status das implantações", caminho: "status-implantacoes/" },
  ];

  const base = new URL(".", document.currentScript.src);
  const atual = location.href.split(/[?#]/)[0].replace(/index\.html$/, "");

  const estilo = document.createElement("style");
  estilo.textContent = `
    .sn { --sn-fundo: #1b2230; --sn-texto: #c9d0dc; --sn-ativo: #ffffff; --sn-marca: #6fb0de;
      background: var(--sn-fundo); font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
    @media (prefers-color-scheme: dark) { .sn { --sn-fundo: #0b0e13; } }
    .sn-wrap { max-width: var(--sn-largura, 1160px); margin: 0 auto; padding: 0 16px; display: flex; gap: 4px; overflow-x: auto; }
    .sn a { color: var(--sn-texto); text-decoration: none; font-size: .9rem; white-space: nowrap;
      padding: 12px 14px; border-bottom: 3px solid transparent; }
    .sn a:hover { color: var(--sn-ativo); }
    .sn a:focus-visible { outline: 2px solid var(--sn-marca); outline-offset: -2px; }
    .sn a[aria-current="page"] { color: var(--sn-ativo); font-weight: 600; border-bottom-color: var(--sn-marca); }
    @media print { .sn { display: none; } }
  `;
  document.head.appendChild(estilo);

  const nav = document.createElement("nav");
  nav.className = "sn";
  nav.setAttribute("aria-label", "Telas");
  const wrap = document.createElement("div");
  wrap.className = "sn-wrap";

  for (const tela of TELAS) {
    const link = document.createElement("a");
    link.href = new URL(tela.caminho, base).href;
    link.textContent = tela.titulo;
    if (link.href === atual) link.setAttribute("aria-current", "page");
    wrap.appendChild(link);
  }

  nav.appendChild(wrap);
  document.body.prepend(nav);
})();
