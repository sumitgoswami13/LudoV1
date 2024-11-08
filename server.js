const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const Database = require('./config/db.config');
require('dotenv').config();

class Server {
    constructor(){
        this.port = process.env.PORT
        this.db = new Database(process.env.DB_URI);  // create a object as object is not created when export 
        this.app = express()
        this.middlewares(); // Initialize middlewares
        this.routes(); // Initialize routes
        this.initializeDatabase(); // Initialize database connection
    }

    middlewares(){
        this.app.use(cors()); 
        this.app.use(morgan('dev'));
        this.app.use(bodyParser.json());
    }

    routes(){
        this.app.use('/',(req,res)=>{
            res.status(200).json("API for Ludo V1")
        })
    }

    async initializeDatabase(){
        try{
            await this.db.connect();
            console.log('Database connected');
        }
        catch(error){
            console.error('Database connection failed',error);
            process.exit(1);
        }
    }

    listen(){ //self calling recursion function(run simultanously) called with object
        this.app.listen(this.port,()=>{
            console.log(`Server running on port ${this.port}`);
        })
    }
}

const server = new Server();
server.listen()
