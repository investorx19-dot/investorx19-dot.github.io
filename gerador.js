// gerador.js - Configuração Mega-Sena (01 a 60) ✅ (ES Module)

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

// 🚀 FUNÇÃO INTELIGENTE (usa engine.js)
// historico é opcional por enquanto
export function gerarJogoInteligente(quantidade = 6) {
  return gerarJogoEngine(HISTORICO_MEGA, quantidade);
}

// 🔥 FUNÇÃO ORIGINAL (mantida + adaptada)
export function gerarJogoValido(linhasAtivas, excluidas, quantidade = 6, historico = []) {
  quantidade = Number(quantidade || 6);

  if (quantidade < 6) quantidade = 6;
  if (quantidade > 15) quantidade = 15;

  // Garante que excluidas seja um Set válido
  if (!(excluidas instanceof Set)) {
    excluidas = new Set(Array.isArray(excluidas) ? excluidas : []);
  }

 const modoAutomatico =
  Array.isArray(linhasAtivas) &&
  linhasAtivas.length === 6 &&
  [1, 2, 3, 4, 5, 6].every(l => linhasAtivas.includes(l));

if (!Array.isArray(linhasAtivas) || linhasAtivas.length === 0 || modoAutomatico) {
  return gerarJogoInteligente(quantidade);
}

  if (quantidade < linhasAtivas.length) {
    throw new Error(
      "Não é possível gerar " +
        quantidade +
        " dezenas com " +
        linhasAtivas.length +
        " linhas ativas."
    );
  }

  const disponiveisPorLinha = {};

  linhasAtivas.forEach(function (l) {
    if (!LINE_RANGES[l]) {
      throw new Error("Linha inválida: " + l);
    }

    disponiveisPorLinha[l] = LINE_RANGES[l].filter(function (n) {
      return !excluidas.has(n);
    });
  });

  for (const l of linhasAtivas) {
    if (disponiveisPorLinha[l].length === 0) {
      throw new Error("Linha " + l + " sem números disponíveis.");
    }
  }

  const jogo = [];
  const usados = new Set();

  // 🔹 Garante pelo menos 1 número por linha ativa
  linhasAtivas.forEach(function (l) {
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

    linhasAtivas.forEach(function (l) {
      restantes.push(...disponiveisPorLinha[l]);
    });

    restantes = [...new Set(restantes.filter(n => !usados.has(n)))];

    let f = restantes.filter(n => FIBONACCI.includes(n));
    let p = restantes.filter(n => PRIMOS.includes(n));
    let m = restantes.filter(n => MULT3.includes(n));
    let r = restantes.filter(
      n =>
        !FIBONACCI.includes(n) &&
        !PRIMOS.includes(n) &&
        !MULT3.includes(n)
    );

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