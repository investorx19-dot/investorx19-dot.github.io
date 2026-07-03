// gerador.js - Configuração Mega-Sena (01 a 60) ✅ (ES Module Oficial)

import { gerarJogo as gerarJogoEngine } from './engine.js';
import { HISTORICO_MEGA } from './historico.js';

export const LINE_RANGES = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  2: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  3: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  4: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
  5: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  6: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60]
};

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55];
const PRIMOS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];
const MULT3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60];

// 🛡️ TRAVA DE SEGURANÇA INTERNA
async function validarAcessoUsuario() {
  const userId = localStorage.getItem("userId") || localStorage.getItem("uid") || localStorage.getItem("user_id");
  if (!userId) return;

  try {
    const resposta = await fetch("https://mark6-backend.onrender.com/verificar-acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const resultado = await resposta.json();

    if (resultado && resultado.autorizado === false) {
      alert(resultado.mensagem || "Seu período de teste expirou.");
      window.location.href = "https://mark6.com.br/planos.html";
    }
  } catch (e) {
    console.log("Acesso verificado.");
  }
}

// 🚀 FUNÇÃO INTELIGENTE
export function gerarJogoInteligente(quantidade = 6) {
  validarAcessoUsuario().catch(() => {}); 
  return gerarJogoEngine(HISTORICO_MEGA, Number(quantidade || 6));
}

// 🔥 FUNÇÃO ORIGINAL
export function gerarJogoValido(linhasAtivas, excluidas, quantidade = 6, historico = []) {
  validarAcessoUsuario().catch(() => {});

  quantidade = Number(quantidade || 6);
  if (quantidade < 6) quantidade = 6;
  if (quantidade > 15) quantidade = 15;

  if (!(excluidas instanceof Set)) {
    excluidas = new Set(Array.isArray(excluidas) ? excluidas : []);
  }

  // Tratamento preventivo caso linhasAtivas chegue quebrado ou nulo por delay de carregamento
  const arrLinhas = Array.isArray(linhasAtivas) ? linhasAtivas : [];

  const modoAutomatico =
    arrLinhas.length === 6 &&
    [1, 2, 3, 4, 5, 6].every(l => arrLinhas.includes(l));

  if (arrLinhas.length === 0 || modoAutomatico) {
    return gerarJogoInteligente(quantidade);
  }

  if (quantidade < arrLinhas.length) {
    throw new Error("Não é possível gerar " + quantidade + " dezenas com " + arrLinhas.length + " linhas ativas.");
  }

  const disponiveisPorLinha = {};

  arrLinhas.forEach(function (l) {
    if (!LINE_RANGES[l]) throw new Error("Linha inválida: " + l);
    disponiveisPorLinha[l] = LINE_RANGES[l].filter(n => !excluidas.has(n));
  });

  for (const l of arrLinhas) {
    if (disponiveisPorLinha[l].length === 0) throw new Error("Linha " + l + " sem números disponíveis.");
  }

  const jogo = [];
  const usados = new Set();

  arrLinhas.forEach(function (l) {
    const nums = disponiveisPorLinha[l];
    const idx = Math.floor(Math.random() * nums.length);
    const n = nums[idx];
    jogo.push(n);
    usados.add(n);
    disponiveisPorLinha[l].splice(idx, 1);
  });

  let faltam = quantidade - jogo.length;

  if (faltam > 0) {
    let restantes = [];
    arrLinhas.forEach(l => restantes.push(...disponiveisPorLinha[l]));
    restantes = [...new Set(restantes.filter(n => !usados.has(n)))];

    let f = restantes.filter(n => FIBONACCI.includes(n));
    let p = restantes.filter(n => PRIMOS.includes(n));
    let m = restantes.filter(n => MULT3.includes(n));
    let r = restantes.filter(n => !FIBONACCI.includes(n) && !PRIMOS.includes(n) && !MULT3.includes(n));

    const pegar = arr => {
      if (!arr.length) return null;
      return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
    };

    while (jogo.length < quantidade) {
      let escolha = null;
      const tipo = Math.random();

      if (tipo < 0.25) escolha = pegar(f);
      else if (tipo < 0.5) escolha = pegar(p);
      else if (tipo < 0.75) escolha = pegar(m);
      else escolha = pegar(r);

      if (escolha && !jogo.includes(escolha)) {
        jogo.push(escolha);
      } else {
        restantes = restantes.filter(n => !jogo.includes(n));
        if (restantes.length === 0) break;
        const idx = Math.floor(Math.random() * restantes.length);
        jogo.push(restantes.splice(idx, 1)[0]);
      }
    }
  }

  return jogo.sort((a, b) => a - b);
}