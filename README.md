# Sample Manager

Sample Manager è un'applicazione web full-stack per la gestione del campionario nel settore della calzetteria.

## Tecnologie utilizzate

* Frontend: React + CSS Modules + React Router
* Backend: Node.js + Express
* Database: MySQL
* Comunicazione in tempo reale: Socket.IO
* Autenticazione: Sessioni Express + bcrypt
* Gestione immagini: Upload su filesystem

## Funzionalità principali

* Autenticazione utenti (login/logout)
* Gestione utenti e ruoli (admin/user)
* Aggiunta, modifica e visualizzazione campioni
* Gestione taglie e ubicazioni (box, scaffale, sezione, ripiano)
* Creazione e tracciamento spedizioni
* Storico delle spedizioni
* Sincronizzazione in tempo reale tra utenti
* Interfaccia reattiva e interattiva
* Gestione disconnessioni e aggiornamenti di ruolo

## Avvio del progetto

### Requisiti

* Node.js
* MySQL installato e in esecuzione

### 1. Clonare la repository

```bash
git clone https://github.com/fededachille/sample-manager.git
cd sample-manager
```

### 2. Configurare il database

Per configurare il database è sufficiente eseguire lo script setupDB.js presente nella cartella server/setup, tramite il comando:
```bash
node setupDB.js
```
assicurandosi che il server MySQL sia stato avviato.
Verrà creato un primo utente con nome = "admin", password = "admin" e autorizzazioni = "admin".

### 3. Creare i file .env nella cartella server e nella cartella client

**Server:**
Assegnare i valori appropriati alle variabili, lasciando però inalterato il campo DB_NAME.

DB_HOST=ip_host<br>
DB_USER=mysql_username<br>
DB_PASSWORD=mysql_password<br>
DB_NAME=sample_manager_db<br>
SESSION_SECRET=stringa_segreta_per_sessioni<br>
CLIENT_ORIGIN=http://ip_host:3000<br>

**Client:**
Assegnare il valore appropriato alla variabile.

REACT_APP_BACKEND_URL=http://ip_host:5000

### 4. Installare le dipendenze

Eseguire il comando:
```bash
npm install
```
sia in /server che in /client.

### 5. Avviare il server e il client

**Terminale 1** (backend):

```bash
cd server
npm start
```

**Terminale 2** (frontend):

```bash
cd client
npm start
```

L'app sarà disponibile su http://localhost:3000, oppure su http://ip_host:3000 se usata da un diverso host sulla stessa rete.

## Autore

Federico Dachille<br>
Corso di Tecnologie Internet - Ingegneria delle Tecnologie Informatiche - Università di Parma