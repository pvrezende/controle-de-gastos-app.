const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega o .env

const app = express();
const port = 3001;

const JWT_SECRET = process.env.JWT_SECRET; // Agora vem do arquivo .env

app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO BANCO DE DADOS RDS ---
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
};
// ------------------------------------------

let connection;

// Função aprimorada para lidar com a conexão e reconexão
async function initializeConnection() {
    try {
        console.log("Tentando conectar ao banco de dados RDS...");
        if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
            console.error("ERRO: Variáveis de ambiente (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) não foram carregadas. Verifique seu arquivo .env");
            setTimeout(initializeConnection, 5000);
            return;
        }
        
        connection = await mysql.createConnection(dbConfig);
        console.log("Conexão com o banco de dados RDS estabelecida com sucesso.");

        connection.on("error", async (err) => {
            console.error("Erro na conexão com o banco de dados:", err);
            if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND") {
                console.log("Conexão perdida. Tentando reconectar ao banco de dados...");
                setTimeout(handleDisconnect, 2000);
            } else {
                 console.error("Erro não recuperável na conexão. Verifique as credenciais e configurações de rede/security group.");
            }
        });
    } catch (err) {
        console.error("Falha ao conectar ao banco de dados RDS na inicialização:", err);
        console.error("Verifique se o endpoint, usuário, senha, nome do banco estão corretos no arquivo .env e se o Security Group do RDS permite acesso da EC2.");
        setTimeout(initializeConnection, 5000);
    }
}

async function handleDisconnect() {
    try {
        if (connection && connection.end) {
            await connection.end().catch(err => console.error("Erro ao fechar conexão antiga:", err));
        }
    } catch (err) {
        console.error("Erro ao tentar fechar a conexão:", err);
    } finally {
        console.log("Tentando restabelecer a conexão...");
        initializeConnection();
    }
}

// Middleware para verificar o token JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).send('Um token é necessário para autenticação.');
    }
    try {
        if (!JWT_SECRET) {
            console.error("ERRO: JWT_SECRET não está definido. Verifique seu arquivo .env");
            return res.status(500).send("Erro interno do servidor (auth).");
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        console.error("Erro ao verificar token:", err.message);
        return res.status(401).send('Token inválido ou expirado.');
    }
};

// --- ROTAS DE AUTENTICAÇÃO ---

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Usuário e senha são obrigatórios.");
    }

    try {
        if (!connection) {
             return res.status(503).send("Serviço indisponível (banco). Tente novamente.");
        }

        const [rows] = await connection.execute("SELECT * FROM usuario WHERE username = ?", [username]);
        if (rows.length === 0) {
            return res.status(401).send("Usuário não encontrado.");
        }

        const user = rows[0];
        
        // CORREÇÃO: Verifica se o usuário tem uma senha cadastrada para evitar erro no bcrypt
        if (!user.password) {
            console.error(`Usuário ${username} encontrado, mas sem campo 'password'.`);
            return res.status(500).send("Erro interno do servidor: usuário sem senha.");
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send("Senha inválida.");
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ token: token });
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).send(`Erro no servidor durante o login: ${err.message}`);
    }
});

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Usuário e senha são obrigatórios.");
    }
     if (password.length < 6) {
        return res.status(400).send("A senha deve ter pelo menos 6 caracteres.");
    }

    try {
       if (!connection) {
             console.error("Tentativa de registro sem conexão válida com o banco.");
             return res.status(503).send("Serviço temporariamente indisponível (banco de dados). Tente novamente em breve.");
       }
        const [userExists] = await connection.execute("SELECT id FROM usuario WHERE username = ?", [username]);
        if (userExists.length > 0) {
            return res.status(409).send("Este nome de usuário já está em uso.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await connection.execute(
            "INSERT INTO usuario (username, password, renda_mensal) VALUES (?, ?, ?)",
            [username, hashedPassword, 0]
        );
        const newUserId = result.insertId;

        const token = jwt.sign({ id: newUserId }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token: token });

    } catch (err) {
        console.error("Erro no cadastro:", err);
         if (err.code === 'ER_DUP_ENTRY') {
             return res.status(409).send("Este nome de usuário já está em uso.");
        }
        res.status(500).send(`Erro no servidor ao tentar cadastrar: ${err.message}`);
    }
});

// --- ROTA DE TESTE ---
app.get("/", (req, res) => {
    res.send("API de Controle de Gastos está funcionando!");
});


// --- ROTAS DE PARCELAMENTO (Protegidas) ---

app.get("/parcelamentos", verifyToken, async (req, res) => {
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute(
            "SELECT * FROM compras_parceladas WHERE user_id = ? ORDER BY data_compra DESC",
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar compras parceladas:", err);
        res.status(500).send(`Erro ao buscar compras parceladas: ${err.message}`);
    }
});

app.post("/parcelamentos", verifyToken, async (req, res) => {
    const { nome, valor_total, numero_parcelas, data_compra, data_primeira_parcela } = req.body;
    const userId = req.userId;

    if (!nome || !valor_total || !numero_parcelas || !data_compra || !data_primeira_parcela) return res.status(400).send("Todos os campos são obrigatórios.");
    if (isNaN(parseFloat(valor_total)) || parseFloat(valor_total) <= 0) return res.status(400).send("Valor total inválido.");
    if (isNaN(parseInt(numero_parcelas)) || parseInt(numero_parcelas) <= 0) return res.status(400).send("Número de parcelas inválido.");
    if (isNaN(new Date(data_compra).getTime()) || isNaN(new Date(data_primeira_parcela).getTime())) return res.status(400).send("Datas inválidas.");

    let transactionConnection;
    try {
        transactionConnection = await mysql.createConnection(dbConfig);
        await transactionConnection.beginTransaction();

        const [result] = await transactionConnection.execute(
            "INSERT INTO compras_parceladas (user_id, nome, valor_total, numero_parcelas, data_compra) VALUES (?, ?, ?, ?, ?)",
            [userId, nome, parseFloat(valor_total), parseInt(numero_parcelas), data_compra]
        );
        const compraParceladaId = result.insertId;

        const valorParcela = parseFloat(valor_total) / parseInt(numero_parcelas, 10);
        const baseDate = new Date(data_primeira_parcela + 'T00:00:00');

        for (let i = 0; i < numero_parcelas; i++) {
            const dataVencimento = new Date(baseDate);
            dataVencimento.setMonth(dataVencimento.getMonth() + i);
            const dataVencimentoFormatada = dataVencimento.toISOString().split('T')[0];
            const nomeParcela = `${nome} (${i + 1}/${numero_parcelas})`;

            await transactionConnection.execute(
                "INSERT INTO despesas (nome, valor, data_vencimento, categoria, user_id, compra_parcelada_id, fixo) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [nomeParcela, valorParcela, dataVencimentoFormatada, 'Parcelamento', userId, compraParceladaId, 1]
            );
        }

        await transactionConnection.commit();
        res.status(201).send({ message: "Compra parcelada registrada com sucesso!" });

    } catch (err) {
        if (transactionConnection) await transactionConnection.rollback();
        console.error("Erro ao registrar compra parcelada:", err);
        res.status(500).send(`Erro ao registrar compra parcelada: ${err.message}`);
    } finally {
        if (transactionConnection) await transactionConnection.end();
    }
});

app.put("/parcelamentos/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, categoria } = req.body;
    const userId = req.userId;

    if (!nome || !categoria) return res.status(400).send("O nome e a categoria são obrigatórios.");

    let transactionConnection;
    try {
        transactionConnection = await mysql.createConnection(dbConfig);
        await transactionConnection.beginTransaction();

        const [updateCompraResult] = await transactionConnection.execute(
            "UPDATE compras_parceladas SET nome = ? WHERE id = ? AND user_id = ?",
            [nome, id, userId]
        );
         if (updateCompraResult.affectedRows === 0) {
            await transactionConnection.rollback();
            return res.status(404).send("Compra parcelada não encontrada ou não pertence ao usuário.");
        }

        await transactionConnection.execute(
            `UPDATE despesas SET nome = CONCAT(?, SUBSTRING(nome, LOCATE(' (', nome)))
             WHERE compra_parcelada_id = ? AND user_id = ? AND LOCATE(' (', nome) > 0`,
            [nome, id, userId]
        );
        await transactionConnection.execute(
            "UPDATE despesas SET categoria = ? WHERE compra_parcelada_id = ? AND user_id = ?",
            [categoria, id, userId]
        );

        await transactionConnection.commit();
        res.status(200).json({ message: "Parcelamento atualizado com sucesso." });
    } catch (err) {
        if (transactionConnection) await transactionConnection.rollback();
        console.error("Erro ao atualizar parcelamento:", err);
        res.status(500).send(`Erro ao atualizar parcelamento: ${err.message}`);
    } finally {
        if (transactionConnection) await transactionConnection.end();
    }
});

app.delete("/parcelamentos/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    let transactionConnection;
    try {
        transactionConnection = await mysql.createConnection(dbConfig);
        await transactionConnection.beginTransaction();

        await transactionConnection.execute(
            "DELETE FROM despesas WHERE compra_parcelada_id = ? AND user_id = ?",
            [id, userId]
        );
        const [result] = await transactionConnection.execute(
            "DELETE FROM compras_parceladas WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            await transactionConnection.rollback();
            return res.status(404).send("Parcelamento não encontrado ou não pertence ao usuário.");
        }

        await transactionConnection.commit();
        res.status(200).send({ message: "Parcelamento e suas despesas foram excluídos com sucesso." });

    } catch (err) {
        if (transactionConnection) await transactionConnection.rollback();
        console.error("Erro ao excluir parcelamento:", err);
        res.status(500).send(`Erro ao excluir parcelamento: ${err.message}`);
    } finally {
        if (transactionConnection) await transactionConnection.end();
    }
});

// --- ROTAS DE DESPESAS (Protegidas) ---

app.get("/despesas", verifyToken, async (req, res) => {
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute("SELECT * FROM despesas WHERE user_id = ? ORDER BY data_vencimento DESC", [req.userId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar despesas:", err);
        res.status(500).send(`Erro ao buscar despesas: ${err.message}`);
    }
});

app.post("/despesas", verifyToken, async (req, res) => {
    const { nome, valor, data_vencimento, categoria, fixo } = req.body;
    const userId = req.userId;

    if (!nome || !valor || !data_vencimento || !categoria) return res.status(400).send("Campos obrigatórios: nome, valor, data_vencimento, categoria.");
    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) return res.status(400).send("Valor inválido.");
    if (isNaN(new Date(data_vencimento).getTime())) return res.status(400).send("Data de vencimento inválida.");
    const isFixo = fixo === true || fixo === 1 || fixo === 'true' || fixo === '1';

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "INSERT INTO despesas (nome, valor, data_vencimento, categoria, user_id, fixo) VALUES (?, ?, ?, ?, ?, ?)",
            [nome, parseFloat(valor), data_vencimento, categoria, userId, isFixo ? 1 : 0]
        );
        res.status(201).json({
             id: result.insertId, nome, valor: parseFloat(valor), data_vencimento, categoria, fixo: isFixo
        });
    } catch (err) {
        console.error("Erro ao adicionar despesa:", err);
        res.status(500).send(`Erro ao adicionar despesa: ${err.message}`);
    }
});

app.put("/despesas/:id/pagar", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { data_pagamento } = req.body;
    const userId = req.userId;

    const paymentDate = data_pagamento ? new Date(data_pagamento).toISOString().split('T')[0] : null;
    if (data_pagamento && isNaN(new Date(data_pagamento).getTime())) return res.status(400).send("Data de pagamento inválida.");

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE despesas SET data_pagamento = ? WHERE id = ? AND user_id = ?",
            [paymentDate, id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Despesa não encontrada ou não pertence ao usuário.");
        res.json({ message: paymentDate ? "Despesa marcada como paga!" : "Despesa desmarcada como paga!" });
    } catch (err) {
        console.error("Erro ao atualizar status de pagamento:", err);
        res.status(500).send(`Erro ao atualizar status de pagamento: ${err.message}`);
    }
});

app.put("/despesas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor, data_vencimento, categoria, fixo } = req.body;
    const userId = req.userId;

    if (!nome || !valor || !data_vencimento || !categoria) return res.status(400).send("Campos obrigatórios: nome, valor, data_vencimento, categoria.");
    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) return res.status(400).send("Valor inválido.");
    if (isNaN(new Date(data_vencimento).getTime())) return res.status(400).send("Data de vencimento inválida.");
    const isFixo = fixo === true || fixo === 1 || fixo === 'true' || fixo === '1';

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE despesas SET nome = ?, valor = ?, data_vencimento = ?, categoria = ?, fixo = ? WHERE id = ? AND user_id = ?",
            [nome, parseFloat(valor), data_vencimento, categoria, isFixo ? 1 : 0, id, userId]
        );

        if (result.affectedRows === 0) return res.status(404).send("Despesa não encontrada ou não pertence ao usuário.");
        res.status(200).json({ message: "Despesa atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar despesa:", err);
        res.status(500).send(`Erro ao atualizar despesa: ${err.message}`);
    }
});

app.delete("/despesas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "DELETE FROM despesas WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Despesa não encontrada ou não pertence ao usuário.");
        res.status(200).send({ message: "Despesa excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir despesa:", err);
        res.status(500).send(`Erro ao excluir despesa: ${err.message}`);
    }
});

// --- ROTAS DE METAS (Protegidas) ---

app.get("/metas", verifyToken, async (req, res) => {
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute("SELECT * FROM metas WHERE user_id = ? ORDER BY data_limite ASC", [req.userId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar metas:", err);
        res.status(500).send(`Erro ao buscar metas: ${err.message}`);
    }
});

app.post("/metas", verifyToken, async (req, res) => {
    const { nome, valor_alvo, data_limite } = req.body;
    const userId = req.userId;
    if (!nome || !valor_alvo) return res.status(400).send("Campos obrigatórios: nome, valor_alvo.");
    if (isNaN(parseFloat(valor_alvo)) || parseFloat(valor_alvo) <= 0) return res.status(400).send("Valor alvo inválido.");
    if (data_limite && isNaN(new Date(data_limite).getTime())) return res.status(400).send("Data limite inválida.");
    const incluirHome = req.body.incluir_home === false ? 0 : 1;

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "INSERT INTO metas (nome, valor_alvo, data_limite, user_id, incluir_home) VALUES (?, ?, ?, ?, ?)",
            [nome, parseFloat(valor_alvo), data_limite || null, userId, incluirHome]
        );
        res.status(201).json({
            id: result.insertId, nome, valor_alvo: parseFloat(valor_alvo), data_limite: data_limite || null, incluir_home: incluirHome === 1
        });
    } catch (err) {
        console.error("Erro ao adicionar meta:", err);
        res.status(500).send(`Erro ao adicionar meta: ${err.message}`);
    }
});

app.put("/metas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor_alvo, data_limite } = req.body;
    const userId = req.userId;
    if (!nome || !valor_alvo) return res.status(400).send("Campos obrigatórios: nome, valor_alvo.");
    if (isNaN(parseFloat(valor_alvo)) || parseFloat(valor_alvo) <= 0) return res.status(400).send("Valor alvo inválido.");
    if (data_limite && isNaN(new Date(data_limite).getTime())) return res.status(400).send("Data limite inválida.");

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE metas SET nome = ?, valor_alvo = ?, data_limite = ? WHERE id = ? AND user_id = ?",
            [nome, parseFloat(valor_alvo), data_limite || null, id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Meta não encontrada ou não pertence ao usuário.");
        res.status(200).json({ message: "Meta atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar meta:", err);
        res.status(500).send(`Erro ao atualizar meta: ${err.message}`);
    }
});

app.delete("/metas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "DELETE FROM metas WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Meta não encontrada ou não pertence ao usuário.");
        res.status(200).send({ message: "Meta excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir meta:", err);
        res.status(500).send(`Erro ao excluir meta: ${err.message}`);
    }
});

app.put("/metas/:id/toggle-home", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE metas SET incluir_home = NOT incluir_home WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Meta não encontrada ou não pertence ao usuário.");
        const [updatedMeta] = await connection.execute("SELECT incluir_home FROM metas WHERE id = ?", [id]);
        res.status(200).send({ message: "Visibilidade da meta atualizada.", incluir_home: !!updatedMeta[0].incluir_home });
    } catch (err) {
        console.error("Erro ao alternar visibilidade da meta:", err);
        res.status(500).send(`Erro ao alternar visibilidade da meta: ${err.message}`);
    }
});

// --- ROTAS DE DÍVIDAS (Protegidas) ---

app.get("/dividas", verifyToken, async (req, res) => {
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute("SELECT * FROM dividas WHERE user_id = ? ORDER BY data_limite ASC", [req.userId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar dívidas:", err);
        res.status(500).send(`Erro ao buscar dívidas: ${err.message}`);
    }
});

app.post("/dividas", verifyToken, async (req, res) => {
    const { nome, valor_total, valor_desconto, data_limite } = req.body;
    const userId = req.userId;
    if (!nome || !valor_total) return res.status(400).send("Campos obrigatórios: nome, valor_total.");
    if (isNaN(parseFloat(valor_total)) || parseFloat(valor_total) <= 0) return res.status(400).send("Valor total inválido.");
    if (valor_desconto && (isNaN(parseFloat(valor_desconto)) || parseFloat(valor_desconto) < 0)) return res.status(400).send("Valor de desconto inválido.");
    if (data_limite && isNaN(new Date(data_limite).getTime())) return res.status(400).send("Data limite inválida.");
    const desconto = parseFloat(valor_desconto) || 0;
    const incluirHome = req.body.incluir_home === false ? 0 : 1;

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "INSERT INTO dividas (nome, valor_total, valor_desconto, data_limite, user_id, incluir_home) VALUES (?, ?, ?, ?, ?, ?)",
            [nome, parseFloat(valor_total), desconto, data_limite || null, userId, incluirHome]
        );
        res.status(201).json({
             id: result.insertId, nome, valor_total: parseFloat(valor_total), valor_desconto: desconto, data_limite: data_limite || null, incluir_home: incluirHome === 1
        });
    } catch (err) {
        console.error("Erro ao adicionar dívida:", err);
        res.status(500).send(`Erro ao adicionar dívida: ${err.message}`);
    }
});

app.put("/dividas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor_total, valor_desconto, data_limite } = req.body;
    const userId = req.userId;
    if (!nome || !valor_total) return res.status(400).send("Campos obrigatórios: nome, valor_total.");
    if (isNaN(parseFloat(valor_total)) || parseFloat(valor_total) <= 0) return res.status(400).send("Valor total inválido.");
    if (valor_desconto && (isNaN(parseFloat(valor_desconto)) || parseFloat(valor_desconto) < 0)) return res.status(400).send("Valor de desconto inválido.");
    if (data_limite && isNaN(new Date(data_limite).getTime())) return res.status(400).send("Data limite inválida.");
    const desconto = parseFloat(valor_desconto) || 0;

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE dividas SET nome = ?, valor_total = ?, valor_desconto = ?, data_limite = ? WHERE id = ? AND user_id = ?",
            [nome, parseFloat(valor_total), desconto, data_limite || null, id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Dívida não encontrada ou não pertence ao usuário.");
        res.status(200).json({ message: "Dívida atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar dívida:", err);
        res.status(500).send(`Erro ao atualizar dívida: ${err.message}`);
    }
});

app.delete("/dividas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "DELETE FROM dividas WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Dívida não encontrada ou não pertence ao usuário.");
        res.status(200).send({ message: "Dívida excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir dívida:", err);
        res.status(500).send(`Erro ao excluir dívida: ${err.message}`);
    }
});

app.put("/dividas/:id/toggle-home", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE dividas SET incluir_home = NOT incluir_home WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Dívida não encontrada ou não pertence ao usuário.");
        const [updatedDivida] = await connection.execute("SELECT incluir_home FROM dividas WHERE id = ?", [id]);
        res.status(200).send({ message: "Visibilidade da dívida atualizada.", incluir_home: !!updatedDivida[0].incluir_home });
    } catch (err) {
        console.error("Erro ao alternar visibilidade da dívida:", err);
        res.status(500).send(`Erro ao alternar visibilidade da dívida: ${err.message}`);
    }
});

// --- ROTAS DE USUÁRIO (Protegidas) ---

app.get("/usuario", verifyToken, async (req, res) => {
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute("SELECT id, username, renda_mensal FROM usuario WHERE id = ?", [req.userId]);
        if (rows.length === 0) return res.status(404).send("Usuário não encontrado.");
        res.json(rows[0]);
    } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        res.status(500).send(`Erro ao buscar dados do usuário: ${err.message}`);
    }
});

app.put("/usuario", verifyToken, async (req, res) => {
    const { renda_mensal } = req.body;
    const userId = req.userId;
    if (renda_mensal === undefined || renda_mensal === null || isNaN(parseFloat(renda_mensal)) || parseFloat(renda_mensal) < 0) {
         return res.status(400).send("Valor de renda mensal inválido.");
       }

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE usuario SET renda_mensal = ? WHERE id = ?",
            [parseFloat(renda_mensal), userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Usuário não encontrado para atualizar.");
        res.json({ message: "Renda mensal atualizada com sucesso" });
    } catch (err) {
        console.error("Erro ao atualizar renda mensal:", err);
        res.status(500).send(`Erro ao atualizar renda mensal: ${err.message}`);
    }
});

app.put("/usuario/senha", verifyToken, async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.userId;
    if (!newPassword) return res.status(400).send("A nova senha é obrigatória.");
    if (newPassword.length < 6) return res.status(400).send("A senha deve ter pelo menos 6 caracteres.");

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await connection.execute(
            "UPDATE usuario SET password = ? WHERE id = ?",
            [hashedPassword, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Usuário não encontrado para atualizar a senha.");
        res.status(200).send("Senha atualizada com sucesso!");
    } catch (err) {
        console.error("Erro ao atualizar a senha:", err);
        res.status(500).send(`Erro ao atualizar a senha: ${err.message}`);
    }
});

app.delete("/usuario", verifyToken, async (req, res) => {
    const userId = req.userId;
    let transactionConnection;
    try {
        transactionConnection = await mysql.createConnection(dbConfig);
        await transactionConnection.beginTransaction();
        console.log(`Iniciando exclusão de dados para o usuário ID: ${userId}`);

        console.log("Excluindo despesas...");
        await transactionConnection.execute("DELETE FROM despesas WHERE user_id = ?", [userId]);
        console.log("Excluindo compras parceladas...");
        await transactionConnection.execute("DELETE FROM compras_parceladas WHERE user_id = ?", [userId]);
        console.log("Excluindo metas...");
        await transactionConnection.execute("DELETE FROM metas WHERE user_id = ?", [userId]);
        console.log("Excluindo dividas...");
        await transactionConnection.execute("DELETE FROM dividas WHERE user_id = ?", [userId]);
        console.log("Excluindo rendas extras...");
        await transactionConnection.execute("DELETE FROM rendas_extras WHERE user_id = ?", [userId]);

        console.log("Excluindo usuário...");
        const [deleteUserResult] = await transactionConnection.execute("DELETE FROM usuario WHERE id = ?", [userId]);

        if (deleteUserResult.affectedRows === 0) {
            await transactionConnection.rollback();
            console.warn(`Tentativa de exclusão falhou: Usuário ${userId} não encontrado.`);
            return res.status(404).send("Usuário não encontrado para exclusão.");
        }

        await transactionConnection.commit();
        console.log(`Usuário ID: ${userId} e todos os seus dados foram excluídos com sucesso.`);
        res.status(200).send("Conta e todos os dados associados foram excluídos com sucesso.");
    } catch (err) {
        if (transactionConnection) await transactionConnection.rollback();
        console.error(`Erro ao excluir usuário e dados para ID: ${userId}`, err);
        res.status(500).send(`Erro no servidor ao excluir a conta: ${err.message}`);
    } finally {
        if (transactionConnection) await transactionConnection.end();
    }
});

// --- ROTAS DE RELATÓRIOS (Protegidas) ---

app.get("/despesas/categorias-mes", verifyToken, async (req, res) => {
    const { mes, ano } = req.query;
    const userId = req.userId;
    if (!mes || !ano || isNaN(parseInt(mes)) || isNaN(parseInt(ano))) return res.status(400).send("Parâmetros 'mes' e 'ano' são obrigatórios e devem ser números.");
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute(
            `SELECT categoria, SUM(valor) as total FROM despesas WHERE user_id = ? AND MONTH(data_pagamento) = ? AND YEAR(data_pagamento) = ? AND data_pagamento IS NOT NULL GROUP BY categoria ORDER BY total DESC`,
            [userId, parseInt(mes), parseInt(ano)]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar despesas por categoria para o mês:", err);
        res.status(500).send(`Erro ao buscar despesas por categoria: ${err.message}`);
    }
});

app.get("/despesas/gastos-mensais", verifyToken, async (req, res) => {
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute(
            `SELECT YEAR(data_pagamento) as ano, MONTH(data_pagamento) as mes, SUM(valor) as total FROM despesas WHERE user_id = ? AND data_pagamento IS NOT NULL GROUP BY YEAR(data_pagamento), MONTH(data_pagamento) ORDER BY ano DESC, mes DESC LIMIT 12`,
            [userId]
        );
        const formattedRows = rows.map(row => ({ mes: row.mes, ano: row.ano, total: parseFloat(row.total) }));
        res.json(formattedRows);
    } catch (err) {
        console.error("Erro ao buscar gastos mensais:", err);
        res.status(500).send(`Erro ao buscar gastos mensais: ${err.message}`);
    }
});

app.get("/despesas/projecao", verifyToken, async (req, res) => {
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear();

        const [todasDespesas] = await connection.execute( `SELECT valor, data_vencimento, data_pagamento, fixo, categoria FROM despesas WHERE user_id = ?`, [userId] );
        const [rendaMensalRow] = await connection.execute("SELECT renda_mensal FROM usuario WHERE id = ?", [userId]);
        const rendaFixa = parseFloat(rendaMensalRow[0]?.renda_mensal) || 0;
        const [rendasExtrasMesRows] = await connection.execute( `SELECT valor FROM rendas_extras WHERE user_id = ? AND MONTH(data_recebimento) = ? AND YEAR(data_recebimento) = ?`, [userId, mes, ano] );
        const totalRendaExtra = rendasExtrasMesRows.reduce((sum, item) => sum + parseFloat(item.valor), 0);

        const despesasDoMes = todasDespesas.filter(d => {
            const dataPag = d.data_pagamento ? new Date(d.data_pagamento) : null;
            const dataVenc = new Date(d.data_vencimento);
            return (dataPag && dataPag.getMonth() + 1 === mes && dataPag.getFullYear() === ano) || (!dataPag && dataVenc.getMonth() + 1 === mes && dataVenc.getFullYear() === ano);
        });

        const totalGastoMesAteAgora = despesasDoMes.filter(d => d.data_pagamento !== null).reduce((sum, d) => sum + parseFloat(d.valor), 0);
        const totalNaoPagoMes = despesasDoMes.filter(d => d.data_pagamento === null).reduce((sum, d) => sum + parseFloat(d.valor), 0);
        const totalProjetadoMes = totalGastoMesAteAgora + totalNaoPagoMes;

        res.json({
            rendaFixa: rendaFixa, rendaExtra: totalRendaExtra, totalPagoAteAgora: totalGastoMesAteAgora, totalNaoPagoNoMes: totalNaoPagoMes, totalProjetado: totalProjetadoMes
        });
    } catch (err) {
        console.error("Erro ao buscar dados de projeção:", err);
        res.status(500).send(`Erro ao buscar dados de projeção: ${err.message}`);
    }
});

// --- ROTAS DE CATEGORIAS (Protegidas) ---

app.get("/categorias", verifyToken, async (req, res) => {
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute("SELECT * FROM categorias ORDER BY nome ASC");
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        res.status(500).send(`Erro ao buscar categorias: ${err.message}`);
    }
});

app.post("/categorias", verifyToken, async (req, res) => {
    const { nome, icone } = req.body;
    if (!nome || !icone) return res.status(400).send("Nome e ícone são obrigatórios.");
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [existing] = await connection.execute("SELECT id FROM categorias WHERE nome = ?", [nome]);
        if (existing.length > 0) return res.status(409).send("Já existe uma categoria com este nome.");

        const [result] = await connection.execute( "INSERT INTO categorias (nome, icone) VALUES (?, ?)", [nome, icone] );
        res.status(201).json({ id: result.insertId, nome, icone });
    } catch (err) {
        console.error("Erro ao adicionar categoria:", err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).send("Já existe uma categoria com este nome.");
        res.status(500).send(`Erro ao adicionar categoria: ${err.message}`);
    }
});

app.put("/categorias/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, icone } = req.body;
    if (!nome || !icone) return res.status(400).send("Nome e ícone são obrigatórios.");

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [existing] = await connection.execute("SELECT id FROM categorias WHERE nome = ? AND id != ?", [nome, id]);
        if (existing.length > 0) return res.status(409).send("Já existe outra categoria com este nome.");

        const [result] = await connection.execute( "UPDATE categorias SET nome = ?, icone = ? WHERE id = ?", [nome, icone, id] );
        if (result.affectedRows === 0) return res.status(404).send("Categoria não encontrada.");
        res.status(200).json({ message: "Categoria atualizada com sucesso!" });

    } catch (err) {
        console.error("Erro ao atualizar categoria:", err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).send("Já existe outra categoria com este nome.");
        res.status(500).send(`Erro ao atualizar categoria: ${err.message}`);
    }
});

app.delete("/categorias/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute("DELETE FROM categorias WHERE id = ?", [id]);
        if (result.affectedRows === 0) return res.status(404).send("Categoria não encontrada.");
        res.status(200).send({ message: "Categoria excluída com sucesso." });
    } catch (err) {
        console.error("Erro ao excluir categoria:", err);
        res.status(500).send(`Erro ao excluir categoria: ${err.message}`);
    }
});

// --- ROTAS DE RENDA EXTRA (Protegidas) ---

app.get("/rendas-extras", verifyToken, async (req, res) => {
    const { mes, ano } = req.query;
    const userId = req.userId;
    if (!mes || !ano || isNaN(parseInt(mes)) || isNaN(parseInt(ano))) return res.status(400).send("Parâmetros 'mes' e 'ano' são obrigatórios e devem ser números.");
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [rows] = await connection.execute(
            "SELECT * FROM rendas_extras WHERE user_id = ? AND MONTH(data_recebimento) = ? AND YEAR(data_recebimento) = ? ORDER BY data_recebimento DESC",
            [userId, parseInt(mes), parseInt(ano)]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar rendas extras:", err);
        res.status(500).send(`Erro ao buscar rendas extras: ${err.message}`);
    }
});

app.post("/rendas-extras", verifyToken, async (req, res) => {
    const { nome, valor, data_recebimento } = req.body;
    const userId = req.userId;
    if (!nome || !valor || !data_recebimento) return res.status(400).send("Campos obrigatórios: nome, valor, data_recebimento.");
    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) return res.status(400).send("Valor inválido.");
    if (isNaN(new Date(data_recebimento).getTime())) return res.status(400).send("Data de recebimento inválida.");

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "INSERT INTO rendas_extras (nome, valor, data_recebimento, user_id) VALUES (?, ?, ?, ?)",
            [nome, parseFloat(valor), data_recebimento, userId]
        );
        res.status(201).json({ id: result.insertId, nome, valor: parseFloat(valor), data_recebimento });
    } catch (err) {
        console.error("Erro ao adicionar renda extra:", err);
        res.status(500).send(`Erro ao adicionar renda extra: ${err.message}`);
    }
});

app.put("/rendas-extras/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor, data_recebimento } = req.body;
    const userId = req.userId;
    if (!nome || !valor || !data_recebimento) return res.status(400).send("Campos obrigatórios: nome, valor, data_recebimento.");
    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) return res.status(400).send("Valor inválido.");
    if (isNaN(new Date(data_recebimento).getTime())) return res.status(400).send("Data de recebimento inválida.");

    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "UPDATE rendas_extras SET nome = ?, valor = ?, data_recebimento = ? WHERE id = ? AND user_id = ?",
            [nome, parseFloat(valor), data_recebimento, id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Renda extra não encontrada ou não pertence ao usuário.");
        res.status(200).json({ message: "Renda extra atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar renda extra:", err);
        res.status(500).send(`Erro ao atualizar renda extra: ${err.message}`);
    }
});

app.delete("/rendas-extras/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        if (!connection) throw new Error("Conexão com o banco não está disponível.");
        const [result] = await connection.execute(
            "DELETE FROM rendas_extras WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        if (result.affectedRows === 0) return res.status(404).send("Renda extra não encontrada ou não pertence ao usuário.");
        res.status(200).send({ message: "Renda extra excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir renda extra:", err);
        res.status(500).send(`Erro ao excluir renda extra: ${err.message}`);
    }
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
let server; 

async function startServer() {
    await initializeConnection(); 
    
    server = app.listen(port, () => {
        console.log(`Servidor rodando na porta ${port}`);
    });

    server.on('error', (err) => {
        console.error("Erro ao iniciar servidor:", err);
        process.exit(1); 
    });
}

// --- Tratamento de Erros Não Capturados e Encerramento Gracioso ---
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const gracefulShutdown = async (signal) => {
  console.log(`\nRecebido ${signal}. Encerrando servidor...`);
  
  if (server) {
      server.close(async () => {
          console.log('Servidor HTTP fechado.');
          try {
              if (connection && connection.end) {
                  await connection.end();
                  console.log('Conexão com o banco de dados fechada.');
              }
          } catch (err) {
              console.error("Erro ao fechar conexão com o banco:", err);
          } finally {
             console.log('Processo encerrado.');
             process.exit(0);
          }
      });
  } else {
       try {
              if (connection && connection.end) {
                  await connection.end();
                  console.log('Conexão com o banco de dados fechada (servidor não iniciado).');
              }
          } catch (err) {
              console.error("Erro ao fechar conexão com o banco:", err);
          } finally {
             console.log('Processo encerrado (servidor não estava rodando).');
             process.exit(0);
          }
  }

  setTimeout(() => {
    console.error('Fechamento gracioso demorou muito, forçando encerramento.');
    process.exit(1);
  }, 10000); 
};


process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Comando 'kill'

// Inicia o servidor
startServer();
