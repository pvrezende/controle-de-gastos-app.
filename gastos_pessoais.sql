-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: gastos_pessoais
-- ------------------------------------------------------
-- Server version	8.0.43

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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Moradia','home-outline'),(2,'outros',NULL),(3,'desejos',NULL),(4,'Transporte','bicycle-outline'),(5,'Alimentação',NULL),(6,'Saúde',NULL),(7,'Educação',NULL),(8,'Lazer',NULL),(9,'Gamer','game-controller-outline');
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compras_parceladas`
--

LOCK TABLES `compras_parceladas` WRITE;
/*!40000 ALTER TABLE `compras_parceladas` DISABLE KEYS */;
INSERT INTO `compras_parceladas` VALUES (2,1,'Playstation 5 Slim Digital',3450.00,10,'2025-07-15'),(3,1,'Pneu R15 e Acessorios R15',825.00,3,'2025-10-01');
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
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `despesas`
--

LOCK TABLES `despesas` WRITE;
/*!40000 ALTER TABLE `despesas` DISABLE KEYS */;
INSERT INTO `despesas` VALUES (20,'INTERNET WARYLEX SETEMBRO',129.90,'2025-09-15',NULL,'transporte',1,NULL,0),(21,'TV+STREAMS CLARO SETEMBRO',207.24,'2025-09-08','2025-10-03','Moradia',1,NULL,0),(26,'Playstation 5 Slim Digital (1/10)',345.00,'2025-09-14','2025-10-03','Gamer',1,2,0),(27,'Playstation 5 Slim Digital (2/10)',345.00,'2025-10-15',NULL,'Gamer',1,2,0),(28,'Playstation 5 Slim Digital (3/10)',345.00,'2025-11-14',NULL,'Gamer',1,2,0),(29,'Playstation 5 Slim Digital (4/10)',345.00,'2025-12-14',NULL,'Gamer',1,2,0),(30,'Playstation 5 Slim Digital (5/10)',345.00,'2026-01-14',NULL,'Gamer',1,2,0),(31,'Playstation 5 Slim Digital (6/10)',345.00,'2026-02-14',NULL,'Gamer',1,2,0),(32,'Playstation 5 Slim Digital (7/10)',345.00,'2026-03-14',NULL,'Gamer',1,2,0),(33,'Playstation 5 Slim Digital (8/10)',345.00,'2026-04-14',NULL,'Gamer',1,2,0),(34,'Playstation 5 Slim Digital (9/10)',345.00,'2026-05-14',NULL,'Gamer',1,2,0),(35,'Playstation 5 Slim Digital (10/10)',345.00,'2026-06-14',NULL,'Gamer',1,2,0),(36,'Pneu R15 e Acessorios R15 (1/3)',275.00,'2025-09-30','2025-10-03','Transporte',1,3,0),(37,'Pneu R15 e Acessorios R15 (2/3)',275.00,'2025-11-01',NULL,'Transporte',1,3,0),(38,'Pneu R15 e Acessorios R15 (3/3)',275.00,'2025-11-30',NULL,'Transporte',1,3,0);
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dividas`
--

LOCK TABLES `dividas` WRITE;
/*!40000 ALTER TABLE `dividas` DISABLE KEYS */;
INSERT INTO `dividas` VALUES (1,1,'Luz Paulo Amazonas Energia',2378.03,1324.10,'2025-12-31','2025-10-01 17:43:34',1);
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
INSERT INTO `metas` VALUES (1,'Economia',1000.00,'2025-10-31','2025-10-01 14:31:23',0.00,1,1);
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rendas_extras`
--

LOCK TABLES `rendas_extras` WRITE;
/*!40000 ALTER TABLE `rendas_extras` DISABLE KEYS */;
INSERT INTO `rendas_extras` VALUES (1,1,'Venda fonte, cabo e bluetooh',290.00,'2025-10-03'),(2,2,'Vacina ',130.00,'2025-10-02');
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,3512.00,'Paulo Rezende','$2b$10$Ou2BM5ungrqU4sRgZ/PhgeGJHWykWOu495Y.wvJx7dB4AyYXhMSvW'),(2,2000.00,'Milena','$2b$10$dzsiNWAUfVXnpxpB2Jx20OOVVT4WlXxoWxTQ8i9q9VEnMuSB.2PVO');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-06  8:08:39
