-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: gastos-pessoais-db.c01me6m2yqf1.us-east-1.rds.amazonaws.com    Database: gastos_pessoais
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--



--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `icone` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Moradia','home-outline'),(2,'outros',NULL),(3,'desejos',NULL),(4,'Transporte','bicycle-outline'),(5,'Alimentação',NULL),(6,'Saúde',NULL),(7,'Educação',NULL),(8,'Lazer',NULL),(9,'Gamer','game-controller-outline'),(10,'Pets','happy-outline'),(11,'Cartão de Crédito','card-outline'),(12,'Dívida ','wallet-outline'),(13,'Despesas ','wallet-outline');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compras_parceladas`
--

DROP TABLE IF EXISTS `compras_parceladas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compras_parceladas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `valor_total` decimal(10,2) NOT NULL,
  `numero_parcelas` int NOT NULL,
  `data_compra` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `compras_parceladas_ibfk_1` (`user_id`),
  CONSTRAINT `compras_parceladas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compras_parceladas`
--

LOCK TABLES `compras_parceladas` WRITE;
/*!40000 ALTER TABLE `compras_parceladas` DISABLE KEYS */;
INSERT INTO `compras_parceladas` VALUES (2,1,'Playstation 5 Slim Digital',3450.00,10,'2025-07-15'),(3,1,'Pneu R15 e Acessorios R15',825.00,3,'2025-10-01'),(4,1,'Notebook Acer Nitro V15 RTX 4050',5292.00,12,'2025-10-13'),(5,1,'Yamaha R15 Financiamento ',13741.00,20,'2025-10-13');
/*!40000 ALTER TABLE `compras_parceladas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `despesas`
--

DROP TABLE IF EXISTS `despesas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `despesas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_vencimento` date NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `categoria` varchar(50) DEFAULT 'outros',
  `user_id` int DEFAULT NULL,
  `compra_parcelada_id` int DEFAULT NULL,
  `fixo` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `compra_parcelada_id` (`compra_parcelada_id`),
  CONSTRAINT `despesas_ibfk_1` FOREIGN KEY (`compra_parcelada_id`) REFERENCES `compras_parceladas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `despesas`
--

LOCK TABLES `despesas` WRITE;
/*!40000 ALTER TABLE `despesas` DISABLE KEYS */;
INSERT INTO `despesas` VALUES (20,'INTERNET WARYLEX SETEMBRO',133.34,'2025-09-15','2025-10-13','Moradia',1,NULL,0),(21,'TV+STREAMS CLARO SETEMBRO',207.24,'2025-09-08','2025-10-03','Moradia',1,NULL,0),(26,'Playstation 5 Slim Digital (1/10)',345.00,'2025-09-14','2025-10-03','Gamer',1,2,0),(27,'Playstation 5 Slim Digital (2/10)',345.00,'2025-10-15','2025-10-22','Gamer',1,2,0),(28,'Playstation 5 Slim Digital (3/10)',345.00,'2025-11-14','2025-11-28','Gamer',1,2,0),(29,'Playstation 5 Slim Digital (4/10)',345.00,'2025-12-14',NULL,'Gamer',1,2,0),(30,'Playstation 5 Slim Digital (5/10)',345.00,'2026-01-14',NULL,'Gamer',1,2,0),(31,'Playstation 5 Slim Digital (6/10)',345.00,'2026-02-14',NULL,'Gamer',1,2,0),(32,'Playstation 5 Slim Digital (7/10)',345.00,'2026-03-14',NULL,'Gamer',1,2,0),(33,'Playstation 5 Slim Digital (8/10)',345.00,'2026-04-14',NULL,'Gamer',1,2,0),(34,'Playstation 5 Slim Digital (9/10)',345.00,'2026-05-14',NULL,'Gamer',1,2,0),(35,'Playstation 5 Slim Digital (10/10)',345.00,'2026-06-14',NULL,'Gamer',1,2,0),(36,'Pneu R15 e Acessorios R15 (1/3)',275.00,'2025-09-30','2025-10-03','Transporte',1,3,0),(37,'Pneu R15 e Acessorios R15 (2/3)',275.00,'2025-11-01',NULL,'Transporte',1,3,0),(38,'Pneu R15 e Acessorios R15 (3/3)',275.00,'2025-11-30',NULL,'Transporte',1,3,0),(39,'Aluguel Apartamento',600.00,'2025-10-10','2025-10-13','Moradia',1,NULL,0),(40,'Condomínio Apartamento',440.00,'2025-10-03','2025-10-13','Moradia',1,NULL,0),(41,'Notebook Acer Nitro V15 RTX 4050 (1/12)',441.00,'2025-10-17','2025-10-22','Gamer',1,4,0),(42,'Notebook Acer Nitro V15 RTX 4050 (2/12)',441.00,'2025-11-12','2025-11-28','Gamer',1,4,0),(43,'Notebook Acer Nitro V15 RTX 4050 (3/12)',441.00,'2025-12-12','2025-12-02','Gamer',1,4,0),(44,'Notebook Acer Nitro V15 RTX 4050 (4/12)',441.00,'2026-01-12',NULL,'Gamer',1,4,0),(45,'Notebook Acer Nitro V15 RTX 4050 (5/12)',441.00,'2026-02-12',NULL,'Gamer',1,4,0),(46,'Notebook Acer Nitro V15 RTX 4050 (6/12)',441.00,'2026-03-12',NULL,'Gamer',1,4,0),(47,'Notebook Acer Nitro V15 RTX 4050 (7/12)',441.00,'2026-04-12',NULL,'Gamer',1,4,0),(48,'Notebook Acer Nitro V15 RTX 4050 (8/12)',441.00,'2026-05-12',NULL,'Gamer',1,4,0),(49,'Notebook Acer Nitro V15 RTX 4050 (9/12)',441.00,'2026-06-12',NULL,'Gamer',1,4,0),(50,'Notebook Acer Nitro V15 RTX 4050 (10/12)',441.00,'2026-07-12',NULL,'Gamer',1,4,0),(51,'Notebook Acer Nitro V15 RTX 4050 (11/12)',441.00,'2026-08-12',NULL,'Gamer',1,4,0),(52,'Notebook Acer Nitro V15 RTX 4050 (12/12)',441.00,'2026-09-12',NULL,'Gamer',1,4,0),(53,'Yamaha R15 Financiamento  (1/20)',750.00,'2025-10-12','2025-10-31','Transporte',1,5,0),(54,'Yamaha R15 Financiamento  (2/20)',687.05,'2025-11-12',NULL,'Transporte',1,5,0),(55,'Yamaha R15 Financiamento  (3/20)',687.05,'2025-12-12',NULL,'Transporte',1,5,0),(56,'Yamaha R15 Financiamento  (4/20)',687.05,'2026-01-12',NULL,'Transporte',1,5,0),(57,'Yamaha R15 Financiamento  (5/20)',687.05,'2026-02-12',NULL,'Transporte',1,5,0),(58,'Yamaha R15 Financiamento  (6/20)',687.05,'2026-03-12',NULL,'Transporte',1,5,0),(59,'Yamaha R15 Financiamento  (7/20)',687.05,'2026-04-12',NULL,'Transporte',1,5,0),(60,'Yamaha R15 Financiamento  (8/20)',687.05,'2026-05-12',NULL,'Transporte',1,5,0),(61,'Yamaha R15 Financiamento  (9/20)',687.05,'2026-06-12',NULL,'Transporte',1,5,0),(62,'Yamaha R15 Financiamento  (10/20)',687.05,'2026-07-12',NULL,'Transporte',1,5,0),(63,'Yamaha R15 Financiamento  (11/20)',687.05,'2026-08-12',NULL,'Transporte',1,5,0),(64,'Yamaha R15 Financiamento  (12/20)',687.05,'2026-09-12',NULL,'Transporte',1,5,0),(65,'Yamaha R15 Financiamento  (13/20)',687.05,'2026-10-12',NULL,'Transporte',1,5,0),(66,'Yamaha R15 Financiamento  (14/20)',687.05,'2026-11-12',NULL,'Transporte',1,5,0),(67,'Yamaha R15 Financiamento  (15/20)',687.05,'2026-12-12',NULL,'Transporte',1,5,0),(68,'Yamaha R15 Financiamento  (16/20)',687.05,'2027-01-12',NULL,'Transporte',1,5,0),(69,'Yamaha R15 Financiamento  (17/20)',687.05,'2027-02-12',NULL,'Transporte',1,5,0),(70,'Yamaha R15 Financiamento  (18/20)',687.05,'2027-03-12',NULL,'Transporte',1,5,0),(71,'Yamaha R15 Financiamento  (19/20)',687.05,'2027-04-12',NULL,'Transporte',1,5,0),(72,'Yamaha R15 Financiamento  (20/20)',687.05,'2027-05-12',NULL,'Transporte',1,5,0),(73,'Remédio Nexgard',40.00,'2025-10-27','2025-11-04','Pets',1,NULL,0),(74,'Cartão Digio',732.00,'2025-10-13','2025-10-13','Cartão de Crédito',1,NULL,0),(75,'Luz Apartamento Setembro',510.00,'2025-09-22','2025-10-13','Moradia',1,NULL,0),(76,'Luz Apartamento Outubro ',620.00,'2025-10-20','2025-11-04','Moradia',1,NULL,0),(77,'Hilux',8530.00,'2025-10-27',NULL,'Transporte',8,NULL,0),(78,'Controle ps5',300.00,'2025-11-01','2025-11-04','Gamer',1,NULL,0),(79,'Conta da tv + streamer outubro ',185.00,'2025-10-09','2025-11-04','Moradia',1,NULL,0),(80,'Conta Claro Residencial ',236.63,'2025-11-08',NULL,'Moradia',1,NULL,0),(81,'Conta Claro Residencial ',236.63,'2025-11-08','2025-11-28','Moradia',1,NULL,0),(82,'1 parcela do condomínio que estava atrasada',1290.35,'2025-12-01','2025-12-02','Moradia',1,NULL,0),(83,'2 parcela do condomínio atrasado',1290.35,'2025-12-20',NULL,'Moradia',1,NULL,0);
/*!40000 ALTER TABLE `despesas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dividas`
--

DROP TABLE IF EXISTS `dividas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dividas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `valor_total` decimal(10,2) NOT NULL,
  `valor_desconto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `data_limite` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `incluir_home` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `dividas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dividas`
--

LOCK TABLES `dividas` WRITE;
/*!40000 ALTER TABLE `dividas` DISABLE KEYS */;
INSERT INTO `dividas` VALUES (1,1,'Luz Paulo Amazonas Energia',2378.03,1324.10,'2026-02-01','2025-10-01 17:43:34',1),(3,1,'Faculdade Estácio Engenharia de Software ',4571.00,0.00,'2026-02-02','2025-10-27 03:22:38',1),(4,1,'Faculdade Estácio Full Stack',2000.00,1939.47,'2025-11-27','2025-10-27 03:25:33',1),(5,1,'Conta da Vivo ',261.00,90.00,'2026-02-01','2025-10-27 03:27:32',1),(6,1,'Dívida OMNI Serasa',1044.00,950.00,'2026-02-02','2025-10-27 03:30:54',1),(8,1,'Bemol Contrato 1 Serasa',796.00,403.10,'2026-02-02','2025-10-27 03:32:38',1),(9,1,'Bemol Contrato 2 Serasa ',335.09,171.00,'2026-02-02','2025-10-27 03:33:32',1),(10,1,'Bemol Contrato 3 Serasa ',139.00,71.00,'2026-02-02','2025-10-27 03:35:56',1),(11,1,'Faculdade Fametro - Serasa',5805.00,0.00,'2026-02-02','2025-10-27 03:36:50',1),(12,1,'Faculdade Fametro - Serasa',5805.00,0.00,'2026-02-02','2025-10-27 03:36:51',1),(13,1,'Protesto Cartório 2',329.00,0.00,'2026-02-02','2025-10-27 03:39:26',1),(14,1,'Protesto Cartório 2 ',2137.00,0.00,'2026-02-02','2025-10-27 03:40:07',1),(16,1,'Protesto Cartório 3',514.00,0.00,'2026-02-02','2025-10-27 03:43:58',1),(18,1,'Protesto Cartório 3',1458.00,0.00,'2026-02-02','2025-10-27 03:45:48',1),(19,1,'Protesto Cartório 4',328.00,0.00,'2026-02-02','2025-10-27 03:46:27',1),(20,1,'Protesto Cartório 5',387.00,0.00,'2026-02-02','2025-10-27 03:47:20',1),(21,1,'Protesto Cartório 5',387.00,0.00,'2026-02-02','2025-10-27 03:47:21',1),(22,1,'Protesto Cartório 5',552.00,0.00,'2026-02-02','2025-10-27 03:47:47',1),(23,1,'Faculdade Fametro Cobrafix',4209.00,1466.19,'2026-02-02','2025-10-27 03:55:16',1),(24,11,'Energia ',990.00,0.00,'2025-11-14','2025-10-27 15:53:19',1),(25,11,'Agua',200.00,0.00,'2025-11-03','2025-10-27 15:54:17',1),(26,11,'Carro',2500.00,0.00,'2025-11-07','2025-10-27 15:55:10',1),(27,11,'Moto',1000.00,0.00,'2025-11-25','2025-10-27 15:55:38',1),(28,11,'Terreno',1200.00,0.00,'2025-11-10','2025-10-27 15:56:23',1),(29,11,'Rancho DB',2500.00,0.00,'2025-10-27','2025-10-27 15:59:01',1);
/*!40000 ALTER TABLE `dividas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `futuros_pagamentos`
--

DROP TABLE IF EXISTS `futuros_pagamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `futuros_pagamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_vencimento` date NOT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `categoria` varchar(50) DEFAULT 'outros',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `futuros_pagamentos`
--

LOCK TABLES `futuros_pagamentos` WRITE;
/*!40000 ALTER TABLE `futuros_pagamentos` DISABLE KEYS */;
INSERT INTO `futuros_pagamentos` VALUES (2,'PS5  (2/10)',345.00,'2025-10-14','2025-08-30 21:08:34','desejos'),(3,'PS5  (3/10)',345.00,'2025-11-14','2025-08-30 21:08:34','desejos'),(4,'PS5  (4/10)',345.00,'2025-12-14','2025-08-30 21:08:34','desejos'),(5,'PS5  (5/10)',345.00,'2026-01-14','2025-08-30 21:08:34','desejos'),(6,'PS5  (6/10)',345.00,'2026-02-14','2025-08-30 21:08:34','desejos'),(7,'PS5  (7/10)',345.00,'2026-03-14','2025-08-30 21:08:34','desejos'),(8,'PS5  (8/10)',345.00,'2026-04-14','2025-08-30 21:08:34','desejos'),(9,'PS5  (9/10)',345.00,'2026-05-14','2025-08-30 21:08:34','desejos'),(10,'PS5  (10/10)',345.00,'2026-06-14','2025-08-30 21:08:34','desejos');
/*!40000 ALTER TABLE `futuros_pagamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metas`
--

DROP TABLE IF EXISTS `metas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `valor_alvo` decimal(10,2) NOT NULL,
  `data_limite` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `valor_economizado` decimal(10,2) DEFAULT '0.00',
  `user_id` int DEFAULT NULL,
  `incluir_home` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metas`
--

LOCK TABLES `metas` WRITE;
/*!40000 ALTER TABLE `metas` DISABLE KEYS */;
/*!40000 ALTER TABLE `metas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rendas_extras`
--

DROP TABLE IF EXISTS `rendas_extras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rendas_extras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_recebimento` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id_idx` (`user_id`),
  CONSTRAINT `fk_rendas_extras_usuario` FOREIGN KEY (`user_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rendas_extras`
--

LOCK TABLES `rendas_extras` WRITE;
/*!40000 ALTER TABLE `rendas_extras` DISABLE KEYS */;
INSERT INTO `rendas_extras` VALUES (1,1,'Venda fonte, cabo e bluetooh',290.00,'2025-10-03'),(2,2,'Vacina ',130.00,'2025-10-02'),(3,1,'Troca do monitor husky por lg',300.00,'2025-10-10'),(4,13,'Freelance',2000.00,'2025-10-27');
/*!40000 ALTER TABLE `rendas_extras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `renda_mensal` decimal(10,2) DEFAULT '0.00',
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,3512.00,'Paulo Rezende','$2b$10$HFldZHONpwIYBQUGAwoB5uWKrV3.NqIXDesiNwEdPLUVKq2YeVlRG',NULL),(2,2000.00,'Milena','$2b$10$dzsiNWAUfVXnpxpB2Jx20OOVVT4WlXxoWxTQ8i9q9VEnMuSB.2PVO',NULL),(4,0.00,'RaphaelEstrella','$2b$10$M6jUdzffx3EshcKOXeR5ye27JAmQmir5apHzCU/zNNva6dvWsynbm',NULL),(5,0.00,'Lua','$2b$10$DBY07MdI/.vcicxRBK9OCe/P1GTMAxuEewDeWNqLEoZ.BP8MNJL4C',NULL),(6,0.00,'Flávia','$2b$10$GctozuAsOupxOdqOMmFni.mcgCJzInQ1MwfA0rZ8GPnntMXcPWc6S',NULL),(7,7000.00,'Paraíba','$2b$10$P/GbMR9CPMomB3wsaBuFUO2k2q5vI1IxKBxO1xoIxsbHqALk8sCPe',NULL),(8,0.00,'Manoel Marques ','$2b$10$btWBIp0R/VoRpr8Om6dJN.S5fyP.UYUxbgXHp8IUPXGN/Yi3ahSSW',NULL),(9,10000.00,'Edvaldo','$2b$10$liGTIWMJr5058vTfRw8IzefObsTwxjWD/NnqGhK0Ktftazsoo7qrK',NULL),(10,0.00,'QPintoEnorme','$2b$10$Yh1aoh5EkYnXlzgvBlLytOj3aZynrxTdglw3j3eUfFBJ9gxlxn5A2',NULL),(11,10000.00,'Edvaldo ','$2b$10$A2MeyzPRpUabKq0sruUvJuutnTCbIXIdqCZ5n5pZiqC6yevy4z6Oa',NULL),(12,0.00,'pedrohrz','$2b$10$rQmyd7D9mQOATLT6rmINpehLE3Db4iLpsnDeny/G8ZSpXVaRbbtj6',NULL),(13,0.00,'Manuel','$2b$10$fmH51Jou1XD2r/zFnv.C9.dpHt3Nk.s./BHfTH.v0ISRaLtMxpVs2',NULL),(14,0.00,'Jeremias Ferreira','$2b$10$Pr75B0gITaxGsmiF6jwjcudCA1ysQVYIuwwLDH9ayH58f3aC474.e',NULL);
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-02  9:54:19
