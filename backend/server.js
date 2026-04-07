const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const admin = require("firebase-admin");

console.log("ARQUIVO CERTO CARREGADO");
console.log("CAMINHO:", __filename);

const app = express();

const allowedOrigins = [
  "https://mark6.com.br",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://unbating-hearteningly-wilfredo.ngrok-free.dev"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origem não permitida pelo CORS: " + origin));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning"]
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
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

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não definida");
}
console.log("Variável FIREBASE carregada");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// Corrige quebra de linha
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

console.log("JSON parseado com sucesso");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase inicializado com sucesso");
} catch (err) {
  console.error("ERRO AO INICIALIZAR FIREBASE:", err);
  throw err;
}

const MP_ACCESS_TOKEN = "TEST-6570062735094902-022720-fa4004c535a816fa0b0513f20f335946-2955004469";

const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

function obterDadosPlano(plano) {
  if (plano === "basico") {
    return {
      titulo: "Plano Basico Mark6",
      preco: 19.90,
      plan: "basico",
      maxDezenas: 6,
      maxCotas: 1,
      limiteJogosDia: 10
    };
  }

  if (plano === "intermediario") {
    return {
      titulo: "Plano Intermediario Mark6",
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

app.post("/criar-pagamento", async function (req, res) {
  try {
    const plano = req.body.plano;
    const userId = req.body.userId;
    const email = req.body.email || "";

    console.log("Recebido em /criar-pagamento:", {
      plano: plano,
      userId: userId,
      email: email
    });

    const dadosPlano = obterDadosPlano(plano);

    if (!dadosPlano) {
      return res.status(400).json({
        erro: "Plano invalido."
      });
    }

    const response = await preferenceClient.create({
      body: {
        items: [
          {
            title: dadosPlano.titulo,
            quantity: 1,
            unit_price: Number(dadosPlano.preco)
          }
        ],
        payer: {
          email: email
        },
        external_reference: String(userId),
        notification_url: "https://unbating-hearteningly-wilfredo.ngrok-free.dev/webhook-mercadopago"
      }
    });

    console.log("Resposta Mercado Pago:", response);

    return res.json({
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point
    });
  } catch (erro) {
    console.error("ERRO REAL AO CRIAR PAGAMENTO:");
    console.error(erro);
    console.error("Mensagem:", erro.message);
    console.error("Stack:", erro.stack);

    return res.status(500).json({
      erro: erro.message || "Erro ao criar pagamento."
    });
  }
});

app.get("/webhook-mercadopago", (req, res) => {
  console.log("Webhook GET recebido");
  res.send("OK GET webhook");
});

app.post("/webhook-mercadopago", async function (req, res) {
  try {
    console.log("Webhook recebido:", req.body);
    console.log("Webhook query:", req.query);

    const tipo = req.body?.type || req.query.type;

    if (tipo !== "payment") {
      console.log("Ignorando evento:", tipo);
      return res.sendStatus(200);
    }

    const idPagamento =
      req.body?.data?.id ||
      req.query["data.id"];

    if (!idPagamento) {
      console.log("Webhook sem id de pagamento");
      return res.sendStatus(200);
    }

    const pagamento = await paymentClient.get({ id: idPagamento });

    console.log("Pagamento consultado:", pagamento);

    if (pagamento.status !== "approved") {
      console.log("Pagamento ainda nao aprovado:", pagamento.status);
      return res.sendStatus(200);
    }

    const userId = pagamento.external_reference;

    if (!userId) {
      console.log("Pagamento sem external_reference");
      return res.sendStatus(200);
    }

    let plano = "basico";

    if (Number(pagamento.transaction_amount) === 39.9) {
      plano = "intermediario";
    }

    if (Number(pagamento.transaction_amount) === 79.9) {
      plano = "premium";
    }

    const dadosPlano = obterDadosPlano(plano);

    if (!dadosPlano) {
      console.log("Plano nao encontrado");
      return res.sendStatus(200);
    }

    await db.collection("users").doc(userId).update({
      accessGranted: true,
      paymentStatus: "paid",
      plan: dadosPlano.plan,
      maxDezenas: dadosPlano.maxDezenas,
      maxCotas: dadosPlano.maxCotas,
      limiteJogosDia: dadosPlano.limiteJogosDia,
      valorPlano: dadosPlano.preco,
      paidAt: Date.now(),
      updatedAt: Date.now()
    });

    console.log("Usuario atualizado com sucesso:", userId, dadosPlano.plan);

    return res.sendStatus(200);
  } catch (erro) {
    console.error("Erro webhook:", erro);
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
  console.error("ERRO NAO TRATADO:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("PROMISE REJEITADA:", err);
});