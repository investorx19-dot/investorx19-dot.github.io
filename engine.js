// engine.js

// 🔢 Divide números em faixas (linhas)
function dividirPorFaixa() {
    return [
        { id: 1, nome: "1-10", numeros: [1,2,3,4,5,6,7,8,9,10] },
        { id: 2, nome: "11-20", numeros: [11,12,13,14,15,16,17,18,19,20] },
        { id: 3, nome: "21-30", numeros: [21,22,23,24,25,26,27,28,29,30] },
        { id: 4, nome: "31-40", numeros: [31,32,33,34,35,36,37,38,39,40] },
        { id: 5, nome: "41-50", numeros: [41,42,43,44,45,46,47,48,49,50] },
        { id: 6, nome: "51-60", numeros: [51,52,53,54,55,56,57,58,59,60] }
    ];
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

// 🔍 Descobre quais linhas ficaram vazias em um sorteio
function obterLinhasVaziasDoSorteio(sorteio) {
    const linhasPresentes = new Set();

    sorteio.forEach(numero => {
        const linha = Math.floor((numero - 1) / 10) + 1;
        linhasPresentes.add(linha);
    });

    const linhasVazias = [];

    for (let linha = 1; linha <= 6; linha++) {
        if (!linhasPresentes.has(linha)) {
            linhasVazias.push(linha);
        }
    }

    return linhasVazias;
}

// 📊 Calcula pesos com base no histórico
function calcularPesosLinhasVazias(historico = []) {
    const pesos = {
        1: 1,
        2: 1,
        3: 1,
        4: 1,
        5: 1,
        6: 1
    };

    if (!Array.isArray(historico) || historico.length === 0) {
        return pesos;
    }

    historico.forEach(sorteio => {
        if (!Array.isArray(sorteio) || sorteio.length === 0) return;

        const linhasVazias = obterLinhasVaziasDoSorteio(sorteio);

        linhasVazias.forEach(linha => {
            pesos[linha] += 1;
        });
    });

    return pesos;
}

// 🎯 Escolhe 1 linha com peso
function escolherLinhaComPeso(linhasDisponiveis, pesos) {
    const totalPeso = linhasDisponiveis.reduce((acc, faixa) => {
        return acc + (pesos[faixa.id] || 1);
    }, 0);

    let alvo = Math.random() * totalPeso;
    let acumulado = 0;

    for (const faixa of linhasDisponiveis) {
        acumulado += (pesos[faixa.id] || 1);

        if (alvo <= acumulado) {
            return faixa;
        }
    }

    return linhasDisponiveis[0];
}

// 🎯 Decide quantas faixas ficarão vazias
function escolherQuantidadeFaixasVazias() {
    const random = Math.random();

    if (random < 0.1) return 0;
    if (random < 0.3) return 2;
    return 1;
}

// 🎯 Decide quais faixas ficarão vazias com peso
function escolherFaixasVazias(faixas, historico = []) {
    const quantidade = escolherQuantidadeFaixasVazias();
    const pesos = calcularPesosLinhasVazias(historico);

    let faixasDisponiveis = [...faixas];
    let vazias = [];

    for (let i = 0; i < quantidade; i++) {
        if (faixasDisponiveis.length === 0) break;

        const escolhida = escolherLinhaComPeso(faixasDisponiveis, pesos);
        vazias.push(escolhida);

        faixasDisponiveis = faixasDisponiveis.filter(f => f.id !== escolhida.id);
    }

    return vazias;
}

// 🧠 Geração principal do jogo
export function gerarJogo(historico = []) {
    let tentativas = 0;

    while (tentativas < 200) {
        tentativas++;

        const faixas = dividirPorFaixa();
        const faixasVazias = escolherFaixasVazias(faixas, historico);
        const faixasAtivas = faixas.filter(f => !faixasVazias.some(v => v.id === f.id));

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

    // fallback
    const faixas = dividirPorFaixa();
    const faixasVazias = escolherFaixasVazias(faixas, historico);
    const faixasAtivas = faixas.filter(f => !faixasVazias.some(v => v.id === f.id));
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