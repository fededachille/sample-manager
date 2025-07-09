-- Create database
CREATE DATABASE IF NOT EXISTS sample_manager_db;
USE sample_manager_db;

-- Samples table
CREATE TABLE IF NOT EXISTS campioni (
    codice VARCHAR(30) PRIMARY KEY,
    descrizione TEXT,
    immagine TEXT
);

-- Shelves table
CREATE TABLE IF NOT EXISTS scaffali (
    id_scaffale VARCHAR(10) PRIMARY KEY,
    numero_sezioni INT NOT NULL,
    numero_ripiani INT NOT NULL
);

-- SampleSizes table
CREATE TABLE IF NOT EXISTS taglie_campione (
    id_taglia INT AUTO_INCREMENT PRIMARY KEY,
    codice_campione VARCHAR(20),
    numero_box VARCHAR(20),
    taglia VARCHAR(10),
    quantità INT,
    id_scaffale VARCHAR(10),
    sezione VARCHAR(10),
    ripiano INT,
    FOREIGN KEY (codice_campione) REFERENCES campioni(codice) ON UPDATE CASCADE,
    FOREIGN KEY (id_scaffale) REFERENCES scaffali(id_scaffale)
);

-- Users table
CREATE TABLE IF NOT EXISTS utenti (
    id_utente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    autorizzazioni VARCHAR(10) NOT NULL
);

-- Shippings table
CREATE TABLE IF NOT EXISTS spedizioni (
    id_spedizione INT AUTO_INCREMENT PRIMARY KEY,
    nome_utente VARCHAR(50), 
    destinatario VARCHAR(50), 
    data DATETIME,
    nome_corriere VARCHAR(50)
);

-- ShippingsDetail table
CREATE TABLE IF NOT EXISTS dettaglio_spedizioni (
    id_dettaglio INT AUTO_INCREMENT PRIMARY KEY,
    id_spedizione INT,
    codice_campione VARCHAR(20),
    taglia VARCHAR(10),
    quantità INT,
    FOREIGN KEY (id_spedizione) REFERENCES spedizioni(id_spedizione)
);
