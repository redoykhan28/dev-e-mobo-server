const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');


// middle ware 
app.use(cors())
app.use(express.json())

//root api check
app.get('/', (req, res) => {

    res.send('E-Mobo server is running')

})

//start using mongoDb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ytkvvxy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {

        //create collection for categories
        const categoriesCollection = client.db('E-mobo-Db').collection('categories')

        //create database for products
        const productsCollection = client.db('E-mobo-Db').collection('products')

        //create database for products booking
        const bookingsCollection = client.db('E-mobo-Db').collection('bookings')


        //post product by buyer
        app.post('/products', async (req, res) => {

            const product = req.body
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        //booked product by user
        app.post('/booking', async (req, res) => {

            const booking = req.body
            const result = await bookingsCollection.insertOne(booking)
            res.send(result)
        })

        //get all categories
        app.get('/categories/all', async (req, res) => {

            const query = {}
            const result = await categoriesCollection.find(query).toArray()
            res.send(result)
        })

        //get all categories
        app.get('/limitCategory/limit', async (req, res) => {

            const query = {}
            const result = await categoriesCollection.find(query).sort({ _id: -1 }).limit(3).toArray()
            res.send(result)
        })

        //get categories name
        app.get('/categories/cat-name', async (req, res) => {

            const query = {};
            const result = await categoriesCollection.find(query).project({ name: 1 }).toArray()
            res.send(result)
        })

        //get product by category name
        app.get('/category/:name', async (req, res) => {

            const name = req.params.name
            const query = { category: name }
            const result = await productsCollection.find(query).sort({ _id: -1 }).toArray()
            res.send(result)
        })

        //get my booking my email
        app.get('/myBookings', async (req, res) => {

            const email = req.query.email;
            const query = { purchase_userMail: email }
            const result = await bookingsCollection.find(query).toArray()
            res.send(result)
        })

    }
    finally {

    }
}

run().catch(console.dir)



app.listen(port, () => {

    console.log(`E-Mobo runs on port ${port}`)

})