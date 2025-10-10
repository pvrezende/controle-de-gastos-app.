const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = 'seu_segredo_super_secreto';

app.use(cors());
app.use(express.json());

// CORREÇÃO: Usar um "Pool de Conexões" em vez de uma conexão única.
// É mais eficiente e robusto para um servidor web.
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10, // Limite de conexões no pool
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);


const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).send('Um token é necessário para autenticação.');
    }
    try {
        const cleanToken = token.split(' ')[1];
        const decoded = jwt.verify(cleanToken, JWT_SECRET);
        req.userId = decoded.id;
    } catch (err) {
        return res.status(401).send('Token inválido.');
    }
    return next();
};

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send("Usuário e senha são obrigatórios.");
    
    try {
        const [rows] = await pool.execute("SELECT * FROM usuario WHERE username = ?", [username]);
        if (rows.length === 0) return res.status(400).json({ message: "Usuário ou senha inválidos." });
        
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: "Usuário ou senha inválidos." });

        
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ token: token });
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ message: "Erro no servidor." });

    }
});

app.get("/", (req, res) => {
    res.send("API de Controle de Gastos está funcionando!");
});

// ROTA DE STATUS (NOVO)
app.get("/status", async (req, res) => {
  try {
    // 1. Tenta pegar uma conexão do pool para testar o DB
    const connection = await pool.getConnection();
    // 2. Libera a conexão imediatamente
    connection.release();
    // 3. Se chegou até aqui, tudo está OK
    res.status(200).json({ 
      status: "OK", 
      backend: "online", 
      database: "online" 
    });
  } catch (err) {
    // Se deu erro ao pegar a conexão, o problema é no banco
    console.error("Erro de conexão com o banco de dados:", err);
    res.status(503).json({ 
      status: "Error", 
      backend: "online", 
      database: "offline" 
    });
  }
});


// --- ROTAS DE PARCELAMENTO ---

app.get("/parcelamentos", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM compras_parceladas WHERE user_id = ? ORDER BY data_compra DESC",
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar compras parceladas:", err);
        res.status(500).json({ message: "Erro ao buscar compras parceladas" });
    }
});

app.post("/parcelamentos", verifyToken, async (req, res) => {
    const { nome, valor_total, numero_parcelas, data_compra, data_primeira_parcela } = req.body;
    const userId = req.userId;

    if (!nome || !valor_total || !numero_parcelas || !data_compra || !data_primeira_parcela) {
        return res.status(400).send("Todos os campos são obrigatórios.");
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.execute(
            "INSERT INTO compras_parceladas (user_id, nome, valor_total, numero_parcelas, data_compra) VALUES (?, ?, ?, ?, ?)",
            [userId, nome, valor_total, numero_parcelas, data_compra]
        );
        const compraParceladaId = result.insertId;
        
        const valorParcela = parseFloat(valor_total) / parseInt(numero_parcelas, 10);
        const baseDate = new Date(data_primeira_parcela);

        for (let i = 0; i < numero_parcelas; i++) {
            const dataVencimento = new Date(baseDate);
            dataVencimento.setUTCMonth(dataVencimento.getUTCMonth() + i);

            const nomeParcela = `${nome} (${i + 1}/${numero_parcelas})`;

            await connection.execute(
                "INSERT INTO despesas (nome, valor, data_vencimento, categoria, user_id, compra_parcelada_id) VALUES (?, ?, ?, ?, ?, ?)",
                [nomeParcela, valorParcela, dataVencimento, 'parcelamento', userId, compraParceladaId]
            );
        }

        await connection.commit();
        res.status(201).send({ message: "Compra parcelada registrada com sucesso!" });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Erro ao registrar compra parcelada:", err);
        res.status(500).json({ message: "Erro ao registrar compra parcelada" });
    } finally {
        if (connection) connection.release();
    }
});

app.put("/parcelamentos/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, categoria } = req.body;
    const userId = req.userId;

    if (!nome || !categoria) {
        return res.status(400).send("O nome e a categoria são obrigatórios.");
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            "UPDATE compras_parceladas SET nome = ? WHERE id = ? AND user_id = ?",
            [nome, id, userId]
        );

        await connection.execute(
            `UPDATE despesas SET nome = CONCAT(?, SUBSTRING(nome, LOCATE(' (', nome))) WHERE compra_parcelada_id = ? AND user_id = ?`,
            [nome, id, userId]
        );
        
        await connection.execute(
            "UPDATE despesas SET categoria = ? WHERE compra_parcelada_id = ? AND user_id = ?",
            [categoria, id, userId]
        );

        await connection.commit();
        res.status(200).json({ message: "Parcelamento atualizado com sucesso." });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar parcelamento:", err);
        res.status(500).json({ message: "Erro ao atualizar parcelamento" });
    } finally {
        if (connection) connection.release();
    }
});

app.delete("/parcelamentos/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            "DELETE FROM despesas WHERE compra_parcelada_id = ? AND user_id = ?",
            [id, userId]
        );
        
        const [result] = await connection.execute(
            "DELETE FROM compras_parceladas WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).send("Parcelamento não encontrado ou não pertence ao usuário.");
        }

        await connection.commit();
        res.status(200).send({ message: "Parcelamento e suas despesas foram excluídos." });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Erro ao excluir parcelamento:", err);
        res.status(500).json({ message: "Erro ao excluir parcelamento." });
    } finally {
        if (connection) connection.release();
    }
});


// --- ROTAS DE DESPESAS ---

app.get("/despesas", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM despesas WHERE user_id = ?", [req.userId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar despesas:", err);
        res.status(500).json({ message: "Erro ao buscar despesas" });
    }
});

app.post("/despesas", verifyToken, async (req, res) => {
    const { nome, valor, data_vencimento, categoria } = req.body;
    try {
        const [result] = await pool.execute(
            "INSERT INTO despesas (nome, valor, data_vencimento, categoria, user_id) VALUES (?, ?, ?, ?, ?)",
            [nome, valor, data_vencimento, categoria, req.userId]
        );
        res.status(201).json({ id: result.insertId, nome, valor, data_vencimento, categoria });
    } catch (err) {
        console.error("Erro ao adicionar despesa:", err);
        res.status(500).json({ message: "Erro ao adicionar despesa" });
    }
});

app.put("/despesas/:id/pagar", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { data_pagamento } = req.body;
    try {
        await pool.execute(
            "UPDATE despesas SET data_pagamento = ? WHERE id = ? AND user_id = ?",
            [data_pagamento, id, req.userId]
        );
        res.json({ message: "Despesa marcada como paga com sucesso!" });
    } catch (err) {
        console.error("Erro ao marcar como paga:", err);
        res.status(500).json({ message: "Erro ao marcar despesa como paga" });
    }
});

app.put("/despesas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor, data_vencimento, categoria } = req.body;

    if (!nome || !valor || !data_vencimento || !categoria) {
        return res.status(400).send("Todos os campos são obrigatórios.");
    }

    try {
        const [result] = await pool.execute(
            "UPDATE despesas SET nome = ?, valor = ?, data_vencimento = ?, categoria = ? WHERE id = ? AND user_id = ?",
            [nome, valor, data_vencimento, categoria, id, req.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send("Despesa não encontrada ou não pertence ao usuário.");
        }
        res.status(200).json({ message: "Despesa atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar despesa:", err);
        res.status(500).json({ message: "Erro ao atualizar despesa" });
    }
});

app.delete("/despesas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute(
            "DELETE FROM despesas WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Despesa não encontrada ou não pertence ao usuário.");
        }
        res.status(200).send({ message: "Despesa excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir despesa:", err);
        res.status(500).json({ message: "Erro ao excluir despesa" });
    }
});


// --- ROTAS DE METAS ---

app.get("/metas", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM metas WHERE user_id = ?", [req.userId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar metas:", err);
        res.status(500).json({ message: "Erro ao buscar metas" });
    }
});

app.post("/metas", verifyToken, async (req, res) => {
    const { nome, valor_alvo, data_limite } = req.body;
    try {
        const [result] = await pool.execute(
            "INSERT INTO metas (nome, valor_alvo, data_limite, user_id, incluir_home) VALUES (?, ?, ?, ?, 1)",
            [nome, valor_alvo, data_limite, req.userId]
        );
        res.status(201).json({ id: result.insertId, nome, valor_alvo, data_limite });
    } catch (err) {
        console.error("Erro ao adicionar meta:", err);
        res.status(500).json({ message: "Erro ao adicionar meta" });
    }
});

app.put("/metas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor_alvo, data_limite } = req.body;
    try {
        const [result] = await pool.execute(
            "UPDATE metas SET nome = ?, valor_alvo = ?, data_limite = ? WHERE id = ? AND user_id = ?",
            [nome, valor_alvo, data_limite, id, req.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Meta não encontrada ou não pertence ao usuário.");
        }
        res.status(200).json({ message: "Meta atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar meta:", err);
        res.status(500).json({ message: "Erro ao atualizar meta" });
    }
});

app.delete("/metas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute(
            "DELETE FROM metas WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Meta não encontrada ou não pertence ao usuário.");
        }
        res.status(200).send({ message: "Meta excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir meta:", err);
        res.status(500).json({ message: "Erro ao excluir meta" });
    }
});

app.put("/metas/:id/toggle-home", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute(
            "UPDATE metas SET incluir_home = NOT incluir_home WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        res.status(200).send({ message: "Visibilidade da meta atualizada." });
    } catch (err) {
        console.error("Erro ao alternar visibilidade da meta:", err);
        res.status(500).json({ message: "Erro no servidor." });
    }
});


// --- ROTAS DE DÍVIDAS ---

app.get("/dividas", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM dividas WHERE user_id = ?", [req.userId]);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar dívidas:", err);
        res.status(500).json({ message: "Erro ao buscar dívidas" });
    }
});

app.post("/dividas", verifyToken, async (req, res) => {
    const { nome, valor_total, valor_desconto, data_limite } = req.body;
    try {
        const [result] = await pool.execute(
            "INSERT INTO dividas (nome, valor_total, valor_desconto, data_limite, user_id, incluir_home) VALUES (?, ?, ?, ?, ?, 1)",
            [nome, valor_total, valor_desconto || 0, data_limite, req.userId]
        );
        res.status(201).json({ id: result.insertId, nome, valor_total, valor_desconto, data_limite });
    } catch (err) {
        console.error("Erro ao adicionar dívida:", err);
        res.status(500).json({ message: "Erro ao adicionar dívida" });
    }
});

app.put("/dividas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor_total, valor_desconto, data_limite } = req.body;
    try {
        const [result] = await pool.execute(
            "UPDATE dividas SET nome = ?, valor_total = ?, valor_desconto = ?, data_limite = ? WHERE id = ? AND user_id = ?",
            [nome, valor_total, valor_desconto || 0, data_limite, id, req.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Dívida não encontrada ou não pertence ao usuário.");
        }
        res.status(200).json({ message: "Dívida atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar dívida:", err);
        res.status(500).json({ message: "Erro ao atualizar dívida" });
    }
});

app.delete("/dividas/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute(
            "DELETE FROM dividas WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Dívida não encontrada ou não pertence ao usuário.");
        }
        res.status(200).send({ message: "Dívida excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir dívida:", err);
        res.status(500).json({ message: "Erro ao excluir dívida" });
    }
});

app.put("/dividas/:id/toggle-home", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute(
            "UPDATE dividas SET incluir_home = NOT incluir_home WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        res.status(200).send({ message: "Visibilidade da dívida atualizada." });
    } catch (err) {
        console.error("Erro ao alternar visibilidade da dívida:", err);
        res.status(500).json({ message: "Erro no servidor." });
    }
});


// --- OUTRAS ROTAS ---

app.get("/usuario", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT id, username, renda_mensal FROM usuario WHERE id = ?", [req.userId]);
        res.json(rows[0] || {});
    } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        res.status(500).json({ message: "Erro ao buscar dados do usuário" });
    }
});

app.put("/usuario", verifyToken, async (req, res) => {
    const { renda_mensal } = req.body;
    try {
        await pool.execute(
            "UPDATE usuario SET renda_mensal = ? WHERE id = ?",
            [renda_mensal, req.userId]
        );
        res.json({ message: "Renda mensal atualizada com sucesso" });
    } catch (err) {
        console.error("Erro ao atualizar renda mensal:", err);
        res.status(500).json({ message: "Erro ao atualizar renda mensal" });
    }
});

app.get("/despesas/categorias-mes", verifyToken, async (req, res) => {
    const { mes, ano } = req.query;
    if (!mes || !ano) {
        return res.status(400).send("Mês e ano são obrigatórios.");
    }
    try {
        const [rows] = await pool.execute(
            "SELECT categoria, SUM(valor) as total FROM despesas WHERE user_id = ? AND MONTH(data_pagamento) = ? AND YEAR(data_pagamento) = ? AND data_pagamento IS NOT NULL GROUP BY categoria",
            [req.userId, mes, ano]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar despesas por categoria para o mês:", err);
        res.status(500).json({ message: "Erro ao buscar despesas por categoria para o mês" });
    }
});

app.put("/usuario/senha", verifyToken, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) {
        return res.status(400).send("A nova senha é obrigatória.");
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    try {
        await pool.execute(
            "UPDATE usuario SET password = ? WHERE id = ?",
            [hashedPassword, req.userId]
        );
        res.status(200).send("Senha atualizada com sucesso!");
    } catch (err) {
        console.error("Erro ao atualizar a senha:", err);
        res.status(500).json({ message: "Erro ao atualizar a senha." });
    }
});

// Adicione este novo endpoint no seu server.js

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Usuário e senha são obrigatórios.");
    }

    try {
        // 1. Verifica se o usuário já existe
        const [userExists] = await pool.execute("SELECT * FROM usuario WHERE username = ?", [username]);
        if (userExists.length > 0) {
            return res.status(409).json({ message: "Este nome de usuário já está em uso." });
        }


        // 2. Criptografa a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insere o novo usuário no banco de dados
        const [result] = await pool.execute(
            "INSERT INTO usuario (username, password, renda_mensal) VALUES (?, ?, ?)",
            [username, hashedPassword, 0] // Começa com renda 0
        );
        const newUserId = result.insertId;

        // 4. Gera um token e faz o login automático
        const token = jwt.sign({ id: newUserId }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token: token }); // 201 Created

    } catch (err) {
        console.error("Erro no cadastro:", err);
        res.status(500).json({ message: "Erro no servidor ao tentar cadastrar." });

    }
});

// --- ROTAS DE RENDA EXTRA ---

app.get("/rendas-extras", verifyToken, async (req, res) => {
    const { mes, ano } = req.query;
    if (!mes || !ano) {
        return res.status(400).send("Mês e ano são obrigatórios.");
    }
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM rendas_extras WHERE user_id = ? AND MONTH(data_recebimento) = ? AND YEAR(data_recebimento) = ?",
            [req.userId, mes, ano]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar rendas extras:", err);
        res.status(500).json({ message: "Erro ao buscar rendas extras" });
    }
});

app.post("/rendas-extras", verifyToken, async (req, res) => {
    const { nome, valor, data_recebimento } = req.body;
    try {
        const [result] = await pool.execute(
            "INSERT INTO rendas_extras (nome, valor, data_recebimento, user_id) VALUES (?, ?, ?, ?)",
            [nome, valor, data_recebimento, req.userId]
        );
        res.status(201).json({ id: result.insertId, nome, valor, data_recebimento });
    } catch (err) {
        console.error("Erro ao adicionar renda extra:", err);
        res.status(500).json({ message: "Erro ao adicionar renda extra" });
    }
});

app.put("/rendas-extras/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, valor, data_recebimento } = req.body;
    try {
        const [result] = await pool.execute(
            "UPDATE rendas_extras SET nome = ?, valor = ?, data_recebimento = ? WHERE id = ? AND user_id = ?",
            [nome, valor, data_recebimento, id, req.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Renda extra não encontrada.");
        }
        res.status(200).json({ message: "Renda extra atualizada com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar renda extra:", err);
        res.status(500).json({ message: "Erro ao atualizar renda extra" });
    }
});

app.delete("/rendas-extras/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute(
            "DELETE FROM rendas_extras WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send("Renda extra não encontrada.");
        }
        res.status(200).send({ message: "Renda extra excluída com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir renda extra:", err);
        res.status(500).json({ message: "Erro ao excluir renda extra" });
    }
});

app.post("/categorias", verifyToken, async (req, res) => {
    const { nome, icone } = req.body;
    if (!nome || !icone) {
        return res.status(400).send("Nome e ícone são obrigatórios.");
    }
    try {
        const [result] = await pool.execute(
            "INSERT INTO categorias (nome, icone) VALUES (?, ?)",
            [nome, icone]
        );
        res.status(201).json({ id: result.insertId, nome, icone });
    } catch (err) {
        console.error("Erro ao adicionar categoria:", err);
        res.status(500).json({ message: "Erro ao adicionar categoria." });
    }
});

app.get("/categorias", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM categorias");
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        res.status(500).json({ message: "Erro ao buscar categorias." });
    }
});

app.put("/categorias/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome, icone } = req.body;

    if (!nome || !icone) {
        return res.status(400).send("Nome e ícone são obrigatórios.");
    }
    
    try {
        const [result] = await pool.execute(
            "UPDATE categorias SET nome = ?, icone = ? WHERE id = ?",
            [nome, icone, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send("Categoria não encontrada.");
        }
        
        res.status(200).json({ message: "Categoria atualizada com sucesso!" });

    } catch (err) {
        console.error("Erro ao atualizar categoria:", err);
        res.status(500).json({ message: "Erro ao atualizar categoria." });
    }
});

// --- ROTA DE EXCLUSÃO DE USUÁRIO ---
app.delete("/usuario", verifyToken, async (req, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(400).send("ID de usuário não fornecido.");
    }

    let connection; // Declara a variável aqui fora para o finally ter acesso
    try {
        // CORREÇÃO: Pega uma conexão do pool
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Excluir despesas (a tabela de parcelas já vai junto se a FK estiver correta)
        await connection.execute("DELETE FROM despesas WHERE user_id = ?", [userId]);
        await connection.execute("DELETE FROM compras_parceladas WHERE user_id = ?", [userId]);

        // 2. Excluir metas e dívidas
        await connection.execute("DELETE FROM metas WHERE user_id = ?", [userId]);
        await connection.execute("DELETE FROM dividas WHERE user_id = ?", [userId]);

        // 3. Excluir rendas extras
        await connection.execute("DELETE FROM rendas_extras WHERE user_id = ?", [userId]);
        
        // 4. Excluir o próprio usuário
        await connection.execute("DELETE FROM usuario WHERE id = ?", [userId]);

        await connection.commit();
        res.status(200).send("Conta excluída com sucesso.");
    } catch (err) {
        if (connection) await connection.rollback(); // Garante que o rollback aconteça se a conexão foi estabelecida
        console.error("Erro ao excluir usuário e dados:", err);
        res.status(500).json({ message: "Erro no servidor ao excluir a conta." });
    } finally {
        // CORREÇÃO: Libera a conexão de volta para o pool
        if (connection) connection.release();
    }
});


app.get("/despesas/gastos-mensais", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                MONTH(data_pagamento) as mes,
                YEAR(data_pagamento) as ano,
                SUM(valor) as total
            FROM despesas
            WHERE user_id = ? AND data_pagamento IS NOT NULL
            GROUP BY YEAR(data_pagamento), MONTH(data_pagamento)
            ORDER BY YEAR(data_pagamento) DESC, MONTH(data_pagamento) DESC
            LIMIT 12`,
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar gastos mensais:", err);
        res.status(500).json({ message: "Erro ao buscar gastos mensais" });
    }
});

app.get("/despesas/projecao", verifyToken, async (req, res) => {
    try {
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear();

        // 1. Consulta SQL CORRIGIDA: Buscar despesas pagas NO MÊS ATUAL ou a vencer NO MÊS ATUAL.
        const [despesasDoMes] = await pool.execute(
            `SELECT nome, valor, data_vencimento, data_pagamento, fixo, categoria 
             FROM despesas 
             WHERE user_id = ? AND (
                (MONTH(data_pagamento) = ? AND YEAR(data_pagamento) = ?) OR
                (data_pagamento IS NULL AND MONTH(data_vencimento) = ? AND YEAR(data_vencimento) = ?)
             )`,
            [req.userId, mes, ano, mes, ano]
        );

        const [rendasExtrasMes] = await pool.execute(
            `SELECT valor 
             FROM rendas_extras 
             WHERE user_id = ? AND MONTH(data_recebimento) = ? AND YEAR(data_recebimento) = ?`,
            [req.userId, mes, ano]
        );
        const [rendaMensal] = await pool.execute(
            "SELECT renda_mensal FROM usuario WHERE id = ?",
            [req.userId]
        );

        const rendaFixa = parseFloat(rendaMensal[0]?.renda_mensal) || 0;
        const totalRendaExtra = rendasExtrasMes.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        
        // Define as categorias a serem EXCLUÍDAS do cálculo de projeção (gastos não essenciais).
        const excludedCategories = ['Gamer', 'desejos', 'outros']; 
        
        // 2. Soma TODAS as despesas pagas no mês.
        const totalGastoMesAteAgora = despesasDoMes
            .filter(d => d.data_pagamento !== null)
            .reduce((sum, d) => sum + parseFloat(d.valor), 0);

        // 3. Separa as despesas que ainda não foram pagas.
        const despesasNaoPagasDoMes = despesasDoMes
            .filter(d => d.data_pagamento === null);
        
        // 4. Soma os gastos de despesas variáveis e essenciais que já foram pagas.
        const totalVariaveisPagasEssenciais = despesasDoMes
            .filter(d => d.data_pagamento !== null && !d.fixo && !excludedCategories.includes(d.categoria))
            .reduce((sum, d) => sum + parseFloat(d.valor), 0);
        
        // 5. Soma as despesas fixas a pagar e as variáveis essenciais a pagar
        const totalEssencialNaoPago = despesasNaoPagasDoMes
            .filter(d => d.fixo || !excludedCategories.includes(d.categoria))
            .reduce((sum, d) => sum + parseFloat(d.valor), 0);

        const hojeData = hoje.getDate();
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const diasRestantes = diasNoMes - hojeData;
        
        // 6. Calcula a média diária e projeta o restante.
        const mediaDiariaVariavelEssencial = hojeData > 0 ? totalVariaveisPagasEssenciais / hojeData : 0;
        const projecaoVariavelEssencialRestante = mediaDiariaVariavelEssencial * diasRestantes;
        
        // 7. A projeção final é a soma do total já gasto, mais as despesas fixas a vencer, mais a projeção de gastos variáveis essenciais.
        const totalProjetado = totalGastoMesAteAgora + totalEssencialNaoPago + projecaoVariavelEssencialRestante;
        
        res.json({
            rendaFixa: rendaFixa,
            rendaExtra: totalRendaExtra,
            totalPagoAteAgora: totalGastoMesAteAgora,
            totalFixasNaoPagas: totalEssencialNaoPago,
            projecaoVariavel: projecaoVariavelEssencialRestante,
            totalProjetado: totalProjetado
        });
    } catch (err) {
        console.error("Erro ao buscar dados de projeção:", err);
        res.status(500).json({ message: "Erro ao buscar dados de projeção" });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});