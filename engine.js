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
function contarPares(jogo) {
    return jogo.filter(n => n % 2 === 0).length;
}

function contarConsecutivos(jogo) {
    let total = 0;
    const ordenado = [...jogo].sort((a, b) => a - b);

    for (let i = 0; i < ordenado.length - 1; i++) {
        if (ordenado[i] + 1 === ordenado[i + 1]) {
            total++;
        }
    }

    return total;
}

function somaJogo(jogo) {
    return jogo.reduce((acc, n) => acc + n, 0);
}

function jogoValido(jogo) {
    const pares = contarPares(jogo);
    const consecutivos = contarConsecutivos(jogo);
    const soma = somaJogo(jogo);

    const paresOk = pares >= 2 && pares <= 4;
    const consecutivosOk = consecutivos <= 2;
    const somaOk = soma >= 130 && soma <= 220;

    return paresOk && consecutivosOk && somaOk;
}
// 🧠 Geração principal do jogo
export function gerarJogo() {
    let tentativas = 0;

    while (tentativas < 200) {
        tentativas++;

        const faixas = dividirPorFaixa();

        const faixasVazias = escolherFaixasVazias(faixas);
        const faixasAtivas = faixas.filter(f => !faixasVazias.includes(f));

        let numerosDisponiveis = faixasAtivas.flatMap(f => f.numeros);

        let jogo = [];

        while (jogo.length < 6) {
            let numero = pegarNumeroAleatorio(numerosDisponiveis);

            if (!jogo.includes(numero)) {
                jogo.push(numero);
            }
        }

        jogo.sort((a, b) => a - b);

        if (jogoValido(jogo)) {
            return jogo;
        }
    }

    // se não achar um jogo válido após várias tentativas,
    // retorna um jogo simples mesmo
    const faixas = dividirPorFaixa();
    const faixasVazias = escolherFaixasVazias(faixas);
    const faixasAtivas = faixas.filter(f => !faixasVazias.includes(f));
    let numerosDisponiveis = faixasAtivas.flatMap(f => f.numeros);

    let jogoFinal = [];

    while (jogoFinal.length < 6) {
        let numero = pegarNumeroAleatorio(numerosDisponiveis);

        if (!jogoFinal.includes(numero)) {
            jogoFinal.push(numero);
        }
    }

    return jogoFinal.sort((a, b) => a - b);
}