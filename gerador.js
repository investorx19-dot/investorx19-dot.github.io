// gerador.js - Configuração Mega-Sena (01 a 60)

const LINE_RANGES = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  2: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  3: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  4: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
  5: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  6: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60]
};

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55];
const PRIMOS    = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];
const MULT3     = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60];

// Função para gerar um jogo válido de exatamente 6 dezenas
// com pelo menos 1 dezena em cada linha marcada
function gerarJogoValido(linhasAtivas, excluidas) {
  // Mapa de números disponíveis por linha
  const disponiveisPorLinha = {};
  linhasAtivas.forEach(l => {
    disponiveisPorLinha[l] = LINE_RANGES[l].filter(n => !excluidas.has(n));
  });

  // Verifica se todas as linhas têm pelo menos 1 número disponível
  for (const l of linhasAtivas) {
    if (disponiveisPorLinha[l].length === 0) {
      throw new Error(`A Linha ${l} (${LINE_RANGES[l][0]}-${LINE_RANGES[l][9]}) não tem números disponíveis (todos excluídos).`);
    }
  }

  // 1. Distribuição mínima: exatamente 1 dezena por linha marcada
  const jogo = [];
  const usados = new Set();

  linhasAtivas.forEach(l => {
    const nums = disponiveisPorLinha[l];
    const idx = Math.floor(Math.random() * nums.length);
    const n = nums[idx];
    jogo.push(n);
    usados.add(n);
    disponiveisPorLinha[l].splice(idx, 1); // remove para não repetir
  });

  // 2. Quantos números ainda faltam (normalmente 6 - número de linhas)
  let faltam = 6 - jogo.length;

  if (faltam > 0) {
    // Coleta todos os números restantes disponíveis
    let restantes = [];
    linhasAtivas.forEach(l => {
      restantes.push(...disponiveisPorLinha[l]);
    });
    restantes = [...new Set(restantes.filter(n => !usados.has(n)))];

    if (restantes.length < faltam) {
      throw new Error("Não há números suficientes para completar 6 dezenas após garantir 1 por linha.");
    }

    // Categorização nos restantes
    let f = restantes.filter(n => FIBONACCI.includes(n));
    let p = restantes.filter(n => PRIMOS.includes(n));
    let m = restantes.filter(n => MULT3.includes(n));
    let r = restantes.filter(n => 
      !FIBONACCI.includes(n) && !PRIMOS.includes(n) && !MULT3.includes(n)
    );

    // Quantidades ajustadas ao que falta
    let qFib = Math.random() < 0.6 ? 0 : 1;
    let qPri = Math.floor(Math.random() * 3);       // 0 a 2
    let qMul = 1 + Math.floor(Math.random() * 3);   // 1 a 3
    let qRan = 1 + Math.floor(Math.random() * 3);   // 1 a 3

    let total = qFib + qPri + qMul + qRan;
    if (total > faltam) {
      qMul = Math.max(1, qMul - (total - faltam));
      total = qFib + qPri + qMul + qRan;
    }
    if (total < faltam) {
      qMul += (faltam - total);
    }

    const pegar = arr => arr.length ? arr.splice(Math.floor(Math.random() * arr.length), 1)[0] : null;

    // Adiciona conforme regras (para de adicionar quando chega a 6)
    for (let i = 0; i < qFib && jogo.length < 6; i++) { let n = pegar(f); if (n) jogo.push(n); }
    for (let i = 0; i < qPri && jogo.length < 6; i++) { let n = pegar(p); if (n) jogo.push(n); }
    for (let i = 0; i < qMul && jogo.length < 6; i++) { let n = pegar(m); if (n) jogo.push(n); }
    for (let i = 0; i < qRan && jogo.length < 6; i++) { let n = pegar(r); if (n) jogo.push(n); }

    // Completa com qualquer restante se ainda faltar
    restantes = restantes.filter(n => !jogo.includes(n));
    while (jogo.length < 6 && restantes.length > 0) {
      let idx = Math.floor(Math.random() * restantes.length);
      jogo.push(restantes.splice(idx, 1)[0]);
    }
  }

  // Ordena e retorna
  return jogo.sort((a, b) => a - b);
}
