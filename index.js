const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middle ware 
app.use(cors())
app.use(express.json())

//middle wear for varify jwt
function jwtVerify(req, res, next) {

    const authHeader = req.headers.authorization;
    // console.log(authHeader)
    if (!authHeader) {

        return res.status(401).send('Unothorized User')
    }

    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {

        if (error) {

            return res.status(403).send('Forbbiden access')
        }

        req.decoded = decoded

        next()

    })

}

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

        //create database for products booking
        const usersCollection = client.db('E-mobo-Db').collection('users')

        //verify admin
        const verifyAdmin = async (req, res, next) => {

            //verify
            const decodedEmail = req.decoded.email;
            const AdminQuery = { email: decodedEmail }
            const user = await usersCollection.findOne(AdminQuery)

            if (user?.role !== 'admin') {

                return res.status(403).send('Forbidden Access');
            }
            next()

        }

        //verfify seller
        const verifySeller = async (req, res, next) => {

            //verify
            const decodedEmail = req.decoded.email
            const sellerQuery = { email: decodedEmail }
            const user = await usersCollection.findOne(sellerQuery)

            if (user?.role !== 'Seller') {

                return res.status(403).send('Forbbiden access')
            }

            next()
        }

        const verifyBuyer = async (req, res, next) => {

            //verify
            const decodedEmail = req.decoded.email
            const sellerQuery = { email: decodedEmail }
            const user = await usersCollection.findOne(sellerQuery)

            if (user?.role !== 'Buyer') {

                return res.status(403).send('Forbbiden access')
            }

            next()
        }

        //post user
        app.post('/user', async (req, res) => {

            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.send(result)

        })

        //post product by seller
        app.post('/products', jwtVerify, verifySeller, async (req, res) => {

            const product = req.body
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        //booked product by buyer
        app.post('/booking', jwtVerify, async (req, res) => {

            const booking = req.body
            const result = await bookingsCollection.insertOne(booking)
            res.send(result)
        })


        //get jwt by user email
        app.get('/jwt', async (req, res) => {

            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)

            //send jwt to client
            if (user) {

                const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '30d' })
                return res.send({ accessToken: token })

            }

            res.status(403).send({ accessToken: '' })

        })


        //get seller user to authorized route
        app.get('/user/seller/:email', async (req, res) => {

            const email = req.params.email
            const query = { email: email }
            const seller = await usersCollection.findOne(query)
            res.send({ isSeller: seller?.role === 'Seller' })
        })

        //get  buyer to authorized route
        app.get('/user/buyer/:email', async (req, res) => {

            const email = req.params.email
            const query = { email: email }
            const buyer = await usersCollection.findOne(query)
            res.send({ isBuyer: buyer?.role === 'Buyer' })
        })

        //get admin user to authorized route
        app.get('/user/admin/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send({ isAdmin: result?.role === 'admin' })

        })

        //get all buyer user by role
        app.get('/allbuyer', jwtVerify, verifyAdmin, async (req, res) => {
            const role = req.query.role;
            const query = { role: role }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })


        //get all seller user by role
        app.get('/allseller', jwtVerify, verifyAdmin, async (req, res) => {
            const role = req.query.role;
            const query = { role: role }
            const result = await usersCollection.find(query).toArray()
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

        //get all products under a seller
        app.get('/myproducts', jwtVerify, verifySeller, async (req, res) => {

            const email = req.query.email;
            const query = { seller_email: email }
            const result = await productsCollection.find(query).toArray()
            res.send(result)

        })

        //get my booking my email
        app.get('/myBookings', jwtVerify, verifyBuyer, async (req, res) => {

            const decodedEmail = req.decoded.email
            const email = req.query.email;

            if (email !== decodedEmail) {

                return res.status(403).send('Forbidden Access')
            }

            const query = { purchase_userMail: email }
            const result = await bookingsCollection.find(query).toArray()
            res.send(result)
        })

        //create admin
        app.put('/admin/:id', jwtVerify, verifyAdmin, async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {

                $set: {
                    role: 'admin'
                }
            }

            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })


        //create verified seller tik
        app.put('/seller/verify/:id', jwtVerify, verifyAdmin, async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {

                $set: {
                    verify: '✔'
                }
            }

            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        app.delete('/deleteUser/:id', jwtVerify, verifyAdmin, async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query)
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