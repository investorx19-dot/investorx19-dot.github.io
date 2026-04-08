const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const admin = require("firebase-admin");
const fs = require("fs");

console.log("ARQUIVO CERTO CARREGADO");
console.log("CAMINHO:", __filename);

const app = express();

/**
 * CORS
 * Em produção, permita seu domínio.
 * Se quiser testar localmente, mantenha localhost também.
 */
const allowedOrigins = [
  "https://mark6.com.br",
  "https://www.mark6.com.br",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origin (ex.: alguns testes, curl, webhook health)
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

/**
 * FIREBASE
 * Prioridade:
 * 1) variável FIREBASE_SERVICE_ACCOUNT_JSON
 * 2) arquivo /etc/secrets/serviceAccountKey.json
 */
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

/**
 * MERCADO PAGO
 * Use variável de ambiente em produção:
 * MP_ACCESS_TOKEN=APP_USR-...
 */
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "COLOQUE_AQUI_SEU_APP_USR";

if (!MP_ACCESS_TOKEN || !MP_ACCESS_TOKEN.startsWith("APP_USR-")) {
  console.warn("ATENÇÃO: MP_ACCESS_TOKEN ausente ou não parece ser token de produção.");
}

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

/**
 * DADOS DOS PLANOS
 */
function obterDadosPlano(plano) {
  if (plano === "basico") {
    return {
      titulo: "Plano Básico Mark6",
      preco: 19.90,
      plan: "basico",
      maxDezenas: 6,
      maxCotas: 1,
      limiteJogosDia: 10
    };
  }

  if (plano === "intermediario") {
    return {
      titulo: "Plano Intermediário Mark6",
      preco: 39.90,
      plan: "intermediario",
      maxDezenas: 10,
      maxCotas: 10,
      limiteJogosDia: 30
    };
  }

  if (plano === "premium") {
    return {
      titulo: "Plano Premium Mark6",
      preco: 79.90,
      plan: "premium",
      maxDezenas: 15,
      maxCotas: 9999,
      limiteJogosDia: 9999
    };
  }

  return null;
}

/**
 * CRIAR PAGAMENTO - CHECKOUT PRO
 * Cria a preferência e devolve init_point
 */
app.post("/criar-pagamento", async function (req, res) {
  try {
    const plano = req.body.plano;
    const userId = req.body.userId;
    const email = req.body.email || "";

    console.log("=== ENTROU EM /criar-pagamento ===");
    console.log("Body recebido:", req.body);

    if (!plano || !userId) {
      return res.status(400).json({
        erro: "Campos obrigatórios ausentes: plano e userId."
      });
    }

    const dadosPlano = obterDadosPlano(plano);

    if (!dadosPlano) {
      return res.status(400).json({
        erro: "Plano inválido."
      });
    }

    /**
     * IMPORTANTE:
     * - back_urls: retorno depois do pagamento
     * - auto_return: retorno automático quando aprovado
     * - notification_url: webhook público do backend
     * - external_reference: vincula o pagamento ao userId
     */
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
        plano: dadosPlano.plan
      }
    };

    const response = await preferenceClient.create({
      body: preferenceBody
    });

    console.log("Preferência criada com sucesso:");
    console.log({
      id: response.id,
      init_point: response.init_point
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
 * Recebe notificação, consulta o pagamento e atualiza o usuário no Firestore
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

    /**
     * Dependendo da versão/resposta, o SDK pode devolver em estruturas ligeiramente diferentes.
     * Vamos cobrir os dois cenários mais comuns.
     */
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

    let plano = "basico";

    if (transactionAmount === 39.9) {
      plano = "intermediario";
    }

    if (transactionAmount === 79.9) {
      plano = "premium";
    }

    const dadosPlano = obterDadosPlano(plano);

    if (!dadosPlano) {
      console.log("Plano não encontrado");
      return res.sendStatus(200);
    }

    await db.collection("users").doc(userId).set({
      accessGranted: true,
      paymentStatus: "paid",
      plan: dadosPlano.plan,
      maxDezenas: dadosPlano.maxDezenas,
      maxCotas: dadosPlano.maxCotas,
      limiteJogosDia: dadosPlano.limiteJogosDia,
      valorPlano: dadosPlano.preco,
      mercadoPagoPaymentId: String(idPagamento),
      paidAt: Date.now(),
      updatedAt: Date.now()
    }, { merge: true });

    console.log("Usuário atualizado com sucesso:", userId, dadosPlano.plan);

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