const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");

class ProductClass {
    constructor(upc, name, overallScore, q1, q2, q3, q4, q5, totalSurveys) {
        this.upc = upc;
        this.name = name;
        this.overallScore = overallScore;
        this.q1 = q1;
        this.q2 = q2;
        this.q3 = q3;
        this.q4 = q4;
        this.q5 = q5;
        this.totalSurveys = totalSurveys;
    }
}

const app = express();
app.use(cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE'] // Specify allowed methods
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json());
const port = 3000;



const { Pool } = require('pg');


const pool = new Pool({
    user: 'client',
    host: 'dpg-d5lt2fur433s73dii6sg-a',
    database: 'ecologic',
    password: 'xHGvUalX4fysBFb3DYtFOARcELFaan0V',
    connectionString: "postgresql://client:xHGvUalX4fysBFb3DYtFOARcELFaan0V@dpg-d5lt2fur433s73dii6sg-a/egologic",
    ssl: {
        rejectUnauthorized: false // Required for Render's default SSL configuration
    },
    port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error executing query', err.stack);
    } else {
        console.log('PostgreSQL time:', res.rows[0]);
    }
});

app.get('/api/products/', async (req, res) => {
    const upc = req.query.upc;
    const count = await pool.query(`SELECT COUNT(*) AS count FROM products WHERE upc = '${upc}'`);
    const trueCount = count.rows[0].count;

    if(trueCount === "0") {
        let response;
        const req = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`)
        .then(res => res.json())
        .then((data) => {response = data})
        .catch(err => console.log(err));

        let name = response.items[0].title;
        let product = new ProductClass(upc, name, 0, 0, 0, 0, 0, 0, 0)

        pool.query(`INSERT INTO products (upc, jsondata) VALUES ($1, $2) RETURNING *`, [upc, product])


    }

    const q = await pool.query(`SELECT * FROM products WHERE upc = '${upc}'`);

    const json = JSON.parse(q.rows[0].jsondata);



    res.status(200).json({
        name: json.name,
        upc: json.upc,
        q1: json.q1,
        q2: json.q2,
        q3: json.q3,
        q4: json.q4,
        q5: json.q5,
        totalSurveys: json.totalSurveys,
        overallScore: json.overallScore,
    });
})

app.post('/api/products/', async (req, res) => {
    const upc = req.query.upc;
    const q1 = parseInt(req.body.q1);
    const q2 = parseInt(req.body.q2);
    const q3 = parseInt(req.body.q3);
    const q4 = parseInt(req.body.q4);
    const q5 = parseInt(req.body.q5);


    const q = await pool.query(`SELECT * FROM products WHERE upc = '${upc}'`)

    const json = JSON.parse(q.rows[0].jsondata);
    let product = Object.assign(new ProductClass(), json);

    product.totalSurveys++;

    product.q1 = (product.q1 + q1)/product.totalSurveys;
    product.q2 = (product.q2 + q2)/product.totalSurveys;
    product.q3 = (product.q3 + q3)/product.totalSurveys;
    product.q4 = (product.q4 + q4)/product.totalSurveys;
    product.q5 = (product.q5 + q5)/product.totalSurveys;

    product.overallScore = (product.q1 + product.q2 + product.q3 + product.q4 + product.q5);

    const query2 = await pool.query(`UPDATE products SET jsondata = '${JSON.stringify(product)}' WHERE upc = '${upc}'`);

    res.status(201).json({
        name: product.name,
        upc: product.upc,
        q1: product.q1,
        q2: product.q2,
        q3: product.q3,
        q4: product.q4,
        q5: product.q5,
        totalSurveys: product.totalSurveys,
        overallScore: product.overallScore,
    })

})

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})
