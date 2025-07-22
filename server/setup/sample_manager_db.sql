CREATE DATABASE IF NOT EXISTS sample_manager_db;
USE sample_manager_db;

CREATE TABLE IF NOT EXISTS campioni (
    codice VARCHAR(30) PRIMARY KEY,
    descrizione TEXT,
    immagine VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS scaffali (
    id_scaffale VARCHAR(10) PRIMARY KEY,
    numero_sezioni INT NOT NULL,
    numero_ripiani INT NOT NULL
);

CREATE TABLE IF NOT EXISTS taglie_campione (
    id_taglia INT AUTO_INCREMENT PRIMARY KEY,
    codice_campione VARCHAR(20) NOT NULL,
    numero_box VARCHAR(20) NOT NULL,
    taglia VARCHAR(10) NOT NULL,
    quantità INT NOT NULL,
    id_scaffale VARCHAR(10) NOT NULL,
    sezione VARCHAR(10) NOT NULL,
    ripiano INT NOT NULL,
    FOREIGN KEY (codice_campione) REFERENCES campioni(codice) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_scaffale) REFERENCES scaffali(id_scaffale)
);

CREATE TABLE IF NOT EXISTS utenti (
    id_utente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    autorizzazioni VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS spedizioni (
    id_spedizione INT AUTO_INCREMENT PRIMARY KEY,
    id_utente INT DEFAULT NULL,
    nome_utente VARCHAR(50) NOT NULL, 
    destinatario VARCHAR(50) NOT NULL, 
    data DATETIME,
    nome_corriere VARCHAR(50),
    FOREIGN KEY (id_utente) REFERENCES utenti(id_utente) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS dettaglio_spedizioni (
    id_dettaglio INT AUTO_INCREMENT PRIMARY KEY,
    id_spedizione INT NOT NULL,
    codice_campione VARCHAR(20) NOT NULL,
    taglia VARCHAR(10) NOT NULL,
    quantità INT NOT NULL,
    FOREIGN KEY (id_spedizione) REFERENCES spedizioni(id_spedizione) ON DELETE CASCADE
);
