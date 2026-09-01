import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ⚠️ IMPORTANTE: Substitua as chaves abaixo pelas credenciais do seu projeto Firebase
// (Você encontra essas credenciais no seu index.html ou no console do Firebase)
const firebaseConfig = {
      apiKey: "AIzaSyA9ccyTSDoWiqrwnq9K7nAEjeOHZahKIu0",
      authDomain: "painel-megasena.firebaseapp.com",
      projectId: "painel-megasena",
      storageBucket: "painel-megasena.firebasestorage.app",
      messagingSenderId: "924943702876",
      appId: "1:924943702876:web:77929086c5addb13b37f99"
    };

// Inicializa o Firebase Frontend
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Guardará os números selecionados pelo usuário
export const dezenasSelecionadas = new Set();

async function carregarHeatmap() {
  const grid = document.getElementById('volante-grid');
  const tooltip = document.getElementById('tooltip-estatistica');
  const listaView = document.getElementById('lista-selecao');
  const contadorView = document.getElementById('contador-selecao');

  try {
    // 1. Busca o documento único gerado pelo nosso script no backend
    const docRef = doc(db, "estatisticas", "mega_sena_atual");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error("❌ Documento estatisticas/mega_sena_atual não foi encontrado.");
      grid.innerHTML = "<p style='grid-column: span 10; text-align: center; color: #ef4444;'>Estatísticas não encontradas no banco de dados.</p>";
      return;
    }

    const dadosDezenas = docSnap.data().dezenas;
    let maxFreq = 0;
    let minFreq = Infinity;

    // Descobre as frequências máxima e mínima
    Object.values(dadosDezenas).forEach(info => {
      if (info.frequencia > maxFreq) maxFreq = info.frequencia;
      if (info.frequencia < minFreq) minFreq = info.frequencia;
    });

    // Função que converte frequência em cor HSL (240 = Azul/Frio, 0 = Vermelho/Quente)
    function calcularCor(frequencia) {
      if (maxFreq === minFreq) return "hsl(120, 100%, 50%)";
      const percentual = (frequencia - minFreq) / (maxFreq - minFreq);
      const hue = (1 - percentual) * 240; 
      return `hsl(${hue}, 100%, 50%)`;
    }

    // Atualiza a exibição do painel de seleção no rodapé
    function atualizarPainelSelecao() {
      contadorView.textContent = dezenasSelecionadas.size;
      const ordenados = Array.from(dezenasSelecionadas).sort((a, b) => a - b);
      listaView.textContent = ordenados.length > 0 
        ? ordenados.map(n => n.toString().padStart(2, '0')).join(' - ') 
        : "Nenhuma dezena selecionada";
    }

    // Renderiza o volante de 60 dezenas
    grid.innerHTML = "";
    for (let i = 1; i <= 60; i++) {
      const dezenaStr = i.toString().padStart(2, '0');
      const info = dadosDezenas[dezenaStr];

      const bola = document.createElement('div');
      bola.className = 'dezena-bola';
      bola.textContent = dezenaStr;

      if (info) {
        bola.style.backgroundColor = calcularCor(info.frequencia);

        // Eventos do Tooltip ao passar o mouse
        bola.addEventListener('mouseenter', () => {
          tooltip.innerHTML = `
            Dezena <strong>${dezenaStr}</strong><br>
            Sorteada: <strong>${info.frequencia}x</strong><br>
            Atraso: <strong>${info.atraso}</strong> concurso(s)
          `;
          tooltip.style.opacity = '1';
        });

        bola.addEventListener('mousemove', (e) => {
          tooltip.style.left = (e.pageX + 15) + 'px';
          tooltip.style.top = (e.pageY + 15) + 'px';
        });

        bola.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
        });

        // Evento de Seleção ao clicar
        bola.addEventListener('click', () => {
          const num = parseInt(dezenaStr, 10);
          if (dezenasSelecionadas.has(num)) {
            dezenasSelecionadas.delete(num);
            bola.classList.remove('selecionada');
          } else {
            dezenasSelecionadas.add(num);
            bola.classList.add('selecionada');
          }
          atualizarPainelSelecao();
        });
      } else {
        bola.style.backgroundColor = '#334155';
      }

      grid.appendChild(bola);
    }

  } catch (error) {
    console.error("❌ Erro ao carregar mapa de calor:", error);
  }
}
// --- LÓGICA DO GERADOR DE JOGOS ---
const btnGerar = document.getElementById('btn-gerar');
const divResultados = document.getElementById('resultado-jogos');

// Função para embaralhar um array (Método Fisher-Yates)
function embaralhar(array) {
  const novoArray = [...array];
  for (let i = novoArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [novoArray[i], novoArray[j]] = [novoArray[j], novoArray[i]];
  }
  return novoArray;
}

// Quando o botão for clicado
btnGerar?.addEventListener('click', () => {
  const tamanhoJogo = parseInt(document.getElementById('qtd-dezenas-jogo').value);
  const qtdPares = parseInt(document.getElementById('filtro-pares').value);
  const qtdImpares = parseInt(document.getElementById('filtro-impares').value);

  // 1. Validações Iniciais
  if (qtdPares + qtdImpares !== tamanhoJogo) {
    return alert(`Erro: A soma de pares (${qtdPares}) e ímpares (${qtdImpares}) tem de ser igual a ${tamanhoJogo}.`);
  }

  const selecionadas = Array.from(dezenasSelecionadas);
  
  if (selecionadas.length < tamanhoJogo) {
    return alert(`Selecione pelo menos ${tamanhoJogo} dezenas no mapa de calor!`);
  }

  // 2. Separar pares e ímpares
  const paresDisponiveis = selecionadas.filter(n => n % 2 === 0);
  const imparesDisponiveis = selecionadas.filter(n => n % 2 !== 0);

  if (paresDisponiveis.length < qtdPares) {
    return alert(`Precisa de ${qtdPares} pares no filtro, mas só selecionou ${paresDisponiveis.length} no mapa.`);
  }
  if (imparesDisponiveis.length < qtdImpares) {
    return alert(`Precisa de ${qtdImpares} ímpares no filtro, mas só selecionou ${imparesDisponiveis.length} no mapa.`);
  }

  // 3. Gerar os jogos
  divResultados.innerHTML = '<h3 style="color: #2d6cff; margin-bottom: 10px;">Jogos Gerados:</h3>';
  
  // Exemplo: Vamos gerar 5 jogos seguidos baseados nas escolhas
  for (let i = 0; i < 5; i++) {
    // Embaralha as dezenas disponíveis
    const paresEmbaralhados = embaralhar(paresDisponiveis);
    const imparesEmbaralhados = embaralhar(imparesDisponiveis);

    // Pega a quantidade exata exigida pelo utilizador
    const paresEscolhidos = paresEmbaralhados.slice(0, qtdPares);
    const imparesEscolhidos = imparesEmbaralhados.slice(0, qtdImpares);

    // Junta, ordena de forma crescente e coloca um 0 à esquerda se for menor que 10
    const jogoFinal = [...paresEscolhidos, ...imparesEscolhidos]
      .sort((a, b) => a - b)
      .map(n => n.toString().padStart(2, '0'));

    // Adiciona ao ecrã
    const jogoDiv = document.createElement('div');
    jogoDiv.className = 'jogo-gerado';
    jogoDiv.textContent = `Jogo ${i + 1}: ${jogoFinal.join(' - ')}`;
    divResultados.appendChild(jogoDiv);
  }
});
document.addEventListener("DOMContentLoaded", carregarHeatmap);