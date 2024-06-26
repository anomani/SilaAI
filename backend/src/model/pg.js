const {Client} = require('pg');

const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "postgres",
    database: "postgres"
});

client.connect()

client.query('Select * FROM users')

module.exports = client;