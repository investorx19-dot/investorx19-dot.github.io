// engine.js

// 🔢 Divide números em faixas (linhas)
function dividirPorFaixa() {
    return [
        { nome: "1-10", numeros: [1,2,3,4,5,6,7,8,9,10] },
        { nome: "11-20", numeros: [11,12,13,14,15,16,17,18,19,20] },
        { nome: "21-30", numeros: [21,22,23,24,25,26,27,28,29,30] },
        { nome: "31-40", numeros: [31,32,33,34,35,36,37,38,39,40] },
        { nome: "41-50", numeros: [41,42,43,44,45,46,47,48,49,50] },
        { nome: "51-60", numeros: [51,52,53,54,55,56,57,58,59,60] }
    ];
}

// 🎯 Decide quantas faixas ficarão vazias
function escolherFaixasVazias(faixas) {
    const random = Math.random();

    let quantidade = 1;
    if (random < 0.3) quantidade = 2;
    if (random < 0.1) quantidade = 0;

    let faixasDisponiveis = [...faixas];
    let vazias = [];

    for (let i = 0; i < quantidade; i++) {
        const index = Math.floor(Math.random() * faixasDisponiveis.length);
        vazias.push(faixasDisponiveis[index]);
        faixasDisponiveis.splice(index, 1);
    }

    return vazias;
}

// 🎲 Pega número aleatório de uma lista
function pegarNumeroAleatorio(lista) {
    const index = Math.floor(Math.random() * lista.length);
    return lista[index];
}

// 🧠 Geração principal do jogo
export function gerarJogo() {

    const faixas = dividirPorFaixa();

    // Escolhe quais faixas NÃO usar
    const faixasVazias = escolherFaixasVazias(faixas);

    // Remove faixas vazias
    const faixasAtivas = faixas.filter(f => !faixasVazias.includes(f));

    let numerosDisponiveis = faixasAtivas.flatMap(f => f.numeros);

    let jogo = [];

    while (jogo.length < 6) {
        let numero = pegarNumeroAleatorio(numerosDisponiveis);

        if (!jogo.includes(numero)) {
            jogo.push(numero);
        }
    }

    // Ordena os números
    jogo.sort((a, b) => a - b);

    return jogo;
}