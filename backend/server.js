const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const admin = require("firebase-admin");
const fs = require("fs");

console.log("ARQUIVO CERTO CARREGADO");
console.log("CAMINHO:", __filename);

const app = express();

const allowedOrigins = [
  "https://mark6.com.br",
  "https://www.mark6.com.br",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origem não permitida pelo CORS: " + origin));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Mercado Pago online 🚀");
});

app.get("/teste-cors", (req, res) => {
  res.json({
    ok: true,
    mensagem: "CORS funcionando"
  });
});

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.log("Usando FIREBASE_SERVICE_ACCOUNT_JSON da variável de ambiente");
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    console.log("Usando arquivo /etc/secrets/serviceAccountKey.json");
    const raw = fs.readFileSync("/etc/secrets/serviceAccountKey.json", "utf8");
    serviceAccount = JSON.parse(raw);
  }

  console.log("JSON do Firebase parseado com sucesso");
} catch (err) {
  console.error("ERRO AO LER/FAZER PARSE DO FIREBASE:", err);
  throw err;
}

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  console.log("Firebase inicializado com sucesso");
} catch (err) {
  console.error("ERRO AO INICIALIZAR FIREBASE:", err);
  throw err;
}

const db = admin.firestore();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

if (!MP_ACCESS_TOKEN) {
  throw new Error("MP_ACCESS_TOKEN NÃO CONFIGURADO NO RENDER");
}

if (!MP_ACCESS_TOKEN.startsWith("APP_USR-")) {
  console.warn("ATENÇÃO: MP_ACCESS_TOKEN não parece ser token de produção.");
}

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

/**
 * DADOS DOS PLANOS
 */
function obterDadosPlano(plano, periodo = "mensal") {
  const planos = {
    basico: {
      titulo: "Plano Básico Mark6",
      plan: "basico",
      maxDezenas: 6,
      maxCotas: 1,
      limiteJogosDia: 10,
      precos: {
        mensal: 19.90,
        semestral: 101.49,
        anual: 179.10
      }
    },
    intermediario: {
      titulo: "Plano Intermediário Mark6",
      plan: "intermediario",
      maxDezenas: 10,
      maxCotas: 10,
      limiteJogosDia: 30,
      precos: {
        mensal: 39.90,
        semestral: 203.49,
        anual: 359.10
      }
    },
    premium: {
      titulo: "Plano Premium Mark6",
      plan: "premium",
      maxDezenas: 15,
      maxCotas: 9999,
      limiteJogosDia: 9999,
      precos: {
        mensal: 79.90,
        semestral: 407.49,
        anual: 719.10
      }
    }
  };

  const dados = planos[plano];

  if (!dados) {
    return null;
  }

  const preco = dados.precos[periodo];

  if (!preco) {
    return null;
  }

  return {
    titulo: dados.titulo + " - " + periodo,
    preco: preco,
    periodo: periodo,
    plan: dados.plan,
    maxDezenas: dados.maxDezenas,
    maxCotas: dados.maxCotas,
    limiteJogosDia: dados.limiteJogosDia
  };
}

/**
 * DESCOBRIR PLANO PELO VALOR DO PAGAMENTO
 */
function obterPlanoPorValor(valor) {
  const valorArredondado = Number(valor.toFixed(2));

  const mapa = {
    "19.90": { plano: "basico", periodo: "mensal" },
    "101.49": { plano: "basico", periodo: "semestral" },
    "179.10": { plano: "basico", periodo: "anual" },

    "39.90": { plano: "intermediario", periodo: "mensal" },
    "203.49": { plano: "intermediario", periodo: "semestral" },
    "359.10": { plano: "intermediario", periodo: "anual" },

    "79.90": { plano: "premium", periodo: "mensal" },
    "407.49": { plano: "premium", periodo: "semestral" },
    "719.10": { plano: "premium", periodo: "anual" }
  };

  return mapa[valorArredondado.toFixed(2)] || null;
}

/**
 * CRIAR PAGAMENTO - CHECKOUT PRO
 */
app.post("/criar-pagamento", async function (req, res) {
  try {
    const { plano, periodo = "mensal", userId, email = "" } = req.body;

    console.log("=== ENTROU EM /criar-pagamento ===");
    console.log("Body recebido:", req.body);

    if (!plano || !userId) {
      return res.status(400).json({
        erro: "Campos obrigatórios ausentes: plano e userId."
      });
    }

    const dadosPlano = obterDadosPlano(plano, periodo);

    if (!dadosPlano) {
      return res.status(400).json({
        erro: "Plano ou período inválido."
      });
    }

    const preferenceBody = {
      items: [
        {
          title: dadosPlano.titulo,
          quantity: 1,
          unit_price: Number(dadosPlano.preco),
          currency_id: "BRL"
        }
      ],
      payer: email ? { email } : undefined,
      external_reference: String(userId),
      back_urls: {
        success: "https://mark6.com.br/sucesso.html",
        failure: "https://mark6.com.br/falha.html",
        pending: "https://mark6.com.br/pendente.html"
      },
      auto_return: "approved",
      notification_url: "https://mark6-backend.onrender.com/webhook-mercadopago",
      statement_descriptor: "MARK6",
      metadata: {
        userId: String(userId),
        plano: dadosPlano.plan,
        periodo: dadosPlano.periodo
      }
    };

    const response = await preferenceClient.create({
      body: preferenceBody
    });

    console.log("Preferência criada com sucesso:");
    console.log({
      id: response.id,
      init_point: response.init_point,
      plano: dadosPlano.plan,
      periodo: dadosPlano.periodo,
      preco: dadosPlano.preco
    });

    return res.json({
      ok: true,
      id: response.id,
      init_point: response.init_point
    });
  } catch (erro) {
    console.error("ERRO REAL AO CRIAR PAGAMENTO:");
    console.error(erro);
    console.error("Mensagem:", erro.message);
    console.error("Cause:", erro.cause);
    console.error("Status:", erro.status);
    console.error("Stack:", erro.stack);

    return res.status(500).json({
      erro: erro.message || "Erro ao criar pagamento.",
      detalhes: erro.cause || null
    });
  }
});

/**
 * WEBHOOK - GET
 */
app.get("/webhook-mercadopago", (req, res) => {
  console.log("Webhook GET recebido");
  res.status(200).send("OK GET webhook");
});

/**
 * WEBHOOK - POST
 */
app.post("/webhook-mercadopago", async function (req, res) {
  try {
    console.log("=== WEBHOOK RECEBIDO ===");
    console.log("Body:", JSON.stringify(req.body));
    console.log("Query:", req.query);

    const tipo = req.body?.type || req.query.type || req.body?.topic || req.query.topic;

    if (tipo !== "payment") {
      console.log("Ignorando evento:", tipo);
      return res.sendStatus(200);
    }

    const idPagamento =
      req.body?.data?.id ||
      req.query["data.id"] ||
      req.body?.id;

    if (!idPagamento) {
      console.log("Webhook sem id de pagamento");
      return res.sendStatus(200);
    }

    const pagamento = await paymentClient.get({ id: idPagamento });

    console.log("Pagamento consultado:", JSON.stringify(pagamento));

    const paymentData = pagamento?.body ? pagamento.body : pagamento;

    const statusPagamento = paymentData?.status;
    const externalReference = paymentData?.external_reference;
    const transactionAmount = Number(paymentData?.transaction_amount || 0);

    if (statusPagamento !== "approved") {
      console.log("Pagamento ainda não aprovado:", statusPagamento);
      return res.sendStatus(200);
    }

    if (!externalReference) {
      console.log("Pagamento sem external_reference");
      return res.sendStatus(200);
    }

    const userId = String(externalReference);

    const planoEncontrado = obterPlanoPorValor(transactionAmount);

    if (!planoEncontrado) {
      console.log("Plano não encontrado para o valor:", transactionAmount);
      return res.sendStatus(200);
    }

    const dadosPlano = obterDadosPlano(planoEncontrado.plano, planoEncontrado.periodo);

    if (!dadosPlano) {
      console.log("Dados do plano não encontrados");
      return res.sendStatus(200);
    }

    await db.collection("users").doc(userId).set({
      accessGranted: true,
      paymentStatus: "paid",
      plan: dadosPlano.plan,
      periodoPlano: dadosPlano.periodo,
      maxDezenas: dadosPlano.maxDezenas,
      maxCotas: dadosPlano.maxCotas,
      limiteJogosDia: dadosPlano.limiteJogosDia,
      valorPlano: dadosPlano.preco,
      mercadoPagoPaymentId: String(idPagamento),
      paidAt: Date.now(),
      updatedAt: Date.now()
    }, { merge: true });

    console.log("Usuário atualizado com sucesso:", userId, dadosPlano.plan, dadosPlano.periodo);

    return res.sendStatus(200);
  } catch (erro) {
    console.error("Erro webhook:", erro);
    console.error("Mensagem:", erro.message);
    console.error("Cause:", erro.cause);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});

server.on("close", () => {
  console.log("SERVIDOR FOI FECHADO");
});

server.on("error", (err) => {
  console.error("ERRO NO SERVIDOR:", err);
});

process.on("uncaughtException", (err) => {
  console.error("ERRO NÃO TRATADO:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("PROMISE REJEITADA:", err);
});