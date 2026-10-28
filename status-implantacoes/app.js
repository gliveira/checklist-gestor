(function () {
  const CHAVE = "status-implantacoes-eduq-v2";
  const ITENS = ["Conta ASAAS", "Liberações ASAAS", "Plano de contas", "Emissão nota", "Matriz", "Turmas", "EAD"];
  const ETAPAS = { T: "Treinamento", A: "Acompanhamento", F: "Finalizado", P: "A iniciar" };
  const TIPOS = ["IMP", "TREIN"];
  const VALORES = [["OK", "OK"], ["", "Pendente"], ["NU", "NU"], ["ND", "ND"]];
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const MES_NOME = { Jan: "Janeiro", Fev: "Fevereiro", Mar: "Março", Abr: "Abril", Mai: "Maio", Jun: "Junho",
    Jul: "Julho", Ago: "Agosto", Set: "Setembro", Out: "Outubro", Nov: "Novembro", Dez: "Dezembro" };

  // Dados da planilha "Clientes Yuri.xlsx". Valores dos itens: OK, NU, ND ou "" (pendente).
  const ORIGINAL = {
    atualizadoEm: "2026-10-28",
    clientes: [
      { etapa: "T", cliente: "ATUALIZA",     itens: ["OK", "", "", "", "OK", "OK", ""],           mes: "",    tipo: "IMP" },
      { etapa: "A", cliente: "ACQUA FIRE",   itens: ["OK", "OK", "OK", "NU", "OK", "OK", "OK"],   mes: "",    tipo: "IMP" },
      { etapa: "F", cliente: "INAER",        itens: ["OK", "OK", "OK", "OK", "OK", "OK", "OK"],   mes: "Out", tipo: "IMP" },
      { etapa: "A", cliente: "ANDREA LINS",  itens: ["OK", "OK", "OK", "OK", "OK", "OK", "OK"],   mes: "",    tipo: "IMP" },
      { etapa: "",  cliente: "UNIBARAO",     itens: ["OK", "OK", "OK", "OK", "OK", "OK", "OK"],   mes: "",    tipo: "IMP" },
      { etapa: "A", cliente: "SONDOTECNICA", itens: ["NU", "NU", "NU", "NU", "NU", "NU", "OK"],   mes: "",    tipo: "IMP" },
      { etapa: "T", cliente: "REVOLUTION",   itens: ["OK", "OK", "OK", "", "OK", "OK", "OK"],     mes: "",    tipo: "IMP" },
      { etapa: "T", cliente: "NORD",         itens: ["OK", "OK", "OK", "", "OK", "OK", "OK"],     mes: "",    tipo: "IMP" },
      { etapa: "T", cliente: "KNT",          itens: ["", "", "OK", "", "", "", ""],               mes: "",    tipo: "IMP" },
      { etapa: "F", cliente: "INCAF",        itens: ["ND", "ND", "ND", "ND", "OK", "OK", "OK"],   mes: "Out", tipo: "TREIN" },
      { etapa: "T", cliente: "HABILIS",      itens: ["OK", "OK", "OK", "", "OK", "OK", "OK"],     mes: "",    tipo: "IMP" },
      { etapa: "P", cliente: "CDCS",         itens: ["", "", "", "", "", "", ""],                 mes: "",    tipo: "TREIN" },
    ],
  };

  const $ = id => document.getElementById(id);
  const copia = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dataBR = iso => iso.split("-").reverse().join("/");
  const hojeISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  function carregar() {
    try {
      const s = localStorage.getItem(CHAVE);
      if (s) return JSON.parse(s);
    } catch (e) { /* sem armazenamento: usa os dados originais */ }
    return copia(ORIGINAL);
  }

  function gravar(dados) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
      return true;
    } catch (e) {
      return false;
    }
  }

  let salvo = carregar();
  let estado = copia(salvo);
  let editando = false;

  function mensagem(texto, erro) {
    $("status").textContent = texto;
    $("status").classList.toggle("erro", !!erro);
  }

  function calc(c) {
    const aplic = c.itens.filter(x => x !== "NU" && x !== "ND");
    return { ok: aplic.filter(x => x === "OK").length, total: aplic.length, pend: ITENS.filter((_, i) => c.itens[i] === "") };
  }

  const chip = v => v === "OK" ? '<span class="chip c-ok">OK</span>'
    : v === "NU" ? '<span class="chip c-nu">NU</span>'
    : v === "ND" ? '<span class="chip c-nd">ND</span>'
    : '<span class="chip c-pend">—</span>';
  const opts = (lista, atual) => lista.map(([val, rot]) => `<option value="${esc(val)}"${val === atual ? " selected" : ""}>${esc(rot)}</option>`).join("");
  const sep = j => (j === 0 || j === 4 ? "sep" : "");

  function linhaLeitura(c) {
    const k = calc(c);
    const pct = k.total ? Math.round(100 * k.ok / k.total) : 0;
    const prog = k.total
      ? `<div class="prog"><div class="bar"><i style="width:${pct}%"></i></div><small>${k.ok}/${k.total}</small></div>`
      : '<div class="prog"><small>não se aplica</small></div>';
    return `<tr><td><span class="etapa" title="${ETAPAS[c.etapa] || "Sem etapa"}">${esc(c.etapa) || "—"}</span></td>`
      + `<td class="cli">${esc(c.cliente)}</td><td>${esc(c.tipo)}</td>`
      + c.itens.map((x, j) => `<td class="${sep(j)}">${chip(x)}</td>`).join("")
      + `<td class="sep">${esc(MES_NOME[c.mes] || "")}</td><td>${prog}</td></tr>`;
  }

  function linhaEdicao(c, i) {
    return `<tr data-i="${i}">`
      + `<td><select id="etapa-${i}" data-campo="etapa" aria-label="Etapa">${opts([["", "— · Sem etapa"], ...Object.entries(ETAPAS).map(([k, v]) => [k, k + " · " + v])], c.etapa)}</select></td>`
      + `<td class="cli"><input type="text" class="nome" id="cliente-${i}" data-campo="cliente" value="${esc(c.cliente)}" aria-label="Nome do cliente"></td>`
      + `<td><select id="tipo-${i}" data-campo="tipo" aria-label="Tipo">${opts(TIPOS.map(t => [t, t]), c.tipo)}</select></td>`
      + c.itens.map((x, j) => `<td class="${sep(j)}"><select id="item-${i}-${j}" class="v-${x || "pend"}" data-item="${j}" aria-label="${ITENS[j]}">${opts(VALORES, x)}</select></td>`).join("")
      + `<td class="sep"><select id="mes-${i}" data-campo="mes" aria-label="Mês de finalização">${opts([["", "—"], ...MESES.map(m => [m, MES_NOME[m]])], c.mes)}</select></td>`
      + `<td><button type="button" class="link-danger" data-remover="${i}">Remover</button></td></tr>`;
  }

  function renderResumo() {
    const L = estado.clientes;
    const conta = k => L.filter(c => c.etapa === k).length;
    $("stats").innerHTML = [
      [L.length, "clientes"],
      [L.filter(c => c.tipo === "IMP").length + " / " + L.filter(c => c.tipo === "TREIN").length, "implantação / treinamento"],
      [conta("T"), "em treinamento"],
      [conta("A"), "em acompanhamento"],
      [conta("F"), "finalizados"],
      [L.filter(c => calc(c).pend.length).length, "clientes com pendências"],
    ].map(([n, t]) => `<div class="stat"><b>${n}</b><span>${t}</span></div>`).join("");

    $("pendencias").innerHTML = [...L].sort((a, b) => calc(b).pend.length - calc(a).pend.length).map(c => {
      const k = calc(c);
      const corpo = k.pend.length
        ? `<ul>${k.pend.map(p => `<li>${p}</li>`).join("")}</ul>`
        : `<p class="note">${k.total ? "Todos os itens aplicáveis concluídos." : "Não utiliza nenhum dos itens controlados."}</p>`;
      return `<div class="pcard ${k.pend.length ? "" : "done"}"><h3><span>${esc(c.cliente)}</span><span class="etapa">${ETAPAS[c.etapa] || "Sem etapa"}</span></h3>${corpo}</div>`;
    }).join("");

    $("atualizado").textContent = dataBR(estado.atualizadoEm);
  }

  function render() {
    $("linhas").innerHTML = estado.clientes.map(editando ? linhaEdicao : linhaLeitura).join("");
    $("col-prog").textContent = editando ? "" : "Progresso";
    ["btn-add", "btn-cancelar", "btn-salvar"].forEach(id => { $(id).hidden = !editando; });
    ["btn-editar", "btn-csv", "btn-restaurar"].forEach(id => { $(id).hidden = editando; });
    renderResumo();
  }

  $("linhas").addEventListener("change", e => {
    const tr = e.target.closest("tr[data-i]");
    if (!tr) return;
    const c = estado.clientes[+tr.dataset.i];
    if (e.target.dataset.item !== undefined) {
      c.itens[+e.target.dataset.item] = e.target.value;
      e.target.className = "v-" + (e.target.value || "pend");
    } else if (e.target.dataset.campo === "cliente") {
      c.cliente = e.target.value.trim().toUpperCase();
    } else if (e.target.dataset.campo) {
      c[e.target.dataset.campo] = e.target.value;
    }
    renderResumo();
  });

  $("linhas").addEventListener("click", e => {
    const b = e.target.closest("button[data-remover]");
    if (!b) return;
    estado.clientes.splice(+b.dataset.remover, 1);
    render();
  });

  $("btn-editar").addEventListener("click", () => { editando = true; mensagem(""); render(); });

  $("btn-cancelar").addEventListener("click", () => { estado = copia(salvo); editando = false; mensagem(""); render(); });

  $("btn-add").addEventListener("click", () => {
    estado.clientes.push({ etapa: "P", cliente: "NOVO CLIENTE", itens: ["", "", "", "", "", "", ""], mes: "", tipo: "IMP" });
    render();
    $(`cliente-${estado.clientes.length - 1}`).select();
  });

  $("btn-salvar").addEventListener("click", () => {
    if (estado.clientes.some(c => !c.cliente)) return mensagem("Preencha o nome de todos os clientes antes de salvar.", true);
    estado.atualizadoEm = hojeISO();
    salvo = copia(estado);
    editando = false;
    render();
    const ok = gravar(salvo);
    mensagem(ok ? "Salvo neste navegador." : "Este navegador bloqueou o armazenamento. As alterações somem ao fechar a página.", !ok);
  });

  $("btn-restaurar").addEventListener("click", () => {
    if (!window.confirm("Descartar todas as edições e voltar aos dados da planilha original?")) return;
    try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
    salvo = copia(ORIGINAL);
    estado = copia(salvo);
    render();
    mensagem("Dados originais restaurados.");
  });

  $("btn-csv").addEventListener("click", () => {
    const cab = ["Etapa", "Cliente", ...ITENS, "Mês finalização", "Tipo"];
    const linhas = estado.clientes.map(c => [c.etapa, c.cliente, ...c.itens, MES_NOME[c.mes] || "", c.tipo]);
    const csv = [cab, ...linhas].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `status-implantacoes-${hojeISO()}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  render();
})();
