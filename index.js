const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SK);

const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');


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

        //create database for products booking
        const paymentCollection = client.db('E-mobo-Db').collection('payments')

        //create database for products booking
        const advertiseCollection = client.db('E-mobo-Db').collection('adverties')


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
        app.post('/booking', jwtVerify, verifyBuyer, async (req, res) => {

            const booking = req.body
            const result = await bookingsCollection.insertOne(booking)
            res.send(result)
        })

        //create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const purchase = req.body;
            const price = purchase.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [

                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        //post payment data
        app.post('/payemnts', async (req, res) => {

            const payment = req.body
            const result = await paymentCollection.insertOne(payment)

            //update payment status in booking
            const id = payment.purchasedId
            const bookingFilter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transectionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(bookingFilter, updatedDoc)

            //update payment status to product
            const productId = payment.product_id
            const productFilter = { _id: ObjectId(productId) }
            const upDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transectionId,
                    advertise: "false"
                }
            }

            const updateProduct = await productsCollection.updateOne(productFilter, upDoc)


            res.send(result)

        })

        //post ad data
        app.post('/adproduct', jwtVerify, verifySeller, async (req, res) => {

            const ad = req.body
            const result = await advertiseCollection.insertOne(ad)
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

        //get seller verified
        app.get('/seller/verify/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send({ isVerify: result?.verify === true })

        })

        //get all buyer user by role
        app.get('/allbuyer', jwtVerify, verifyAdmin, async (req, res) => {
            const role = req.query.role;
            const query = { role: role }
            const result = await usersCollection.find(query).sort({ _id: -1 }).toArray()
            res.send(result)
        })


        //get all seller user by role
        app.get('/allseller', jwtVerify, verifyAdmin, async (req, res) => {
            const role = req.query.role;
            const query = { role: role }
            const result = await usersCollection.find(query).sort({ _id: -1 }).toArray()
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


        //get a single product by id
        app.get('/product/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsCollection.findOne(query)
            res.send(result)
        })

        //get all products under a seller
        app.get('/myproducts', jwtVerify, verifySeller, async (req, res) => {

            const email = req.query.email;
            const query = { seller_email: email }
            const result = await productsCollection.find(query).sort({ _id: -1 }).toArray()
            res.send(result)

        })

        //get my booking my email
        app.get('/myBookings', jwtVerify, verifyBuyer, async (req, res) => {

            const email = req.query.email;
            const query = { purchase_userMail: email }
            const result = await bookingsCollection.find(query).sort({ _id: -1 }).toArray()
            res.send(result)
        })

        //get advertise item
        app.get('/vertise/items', async (req, res) => {

            const ad = req.query.advertise
            const query = { advertise: ad }
            const result = await productsCollection.find(query).toArray();
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
                    verify: true
                }
            }

            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        //delete user
        app.delete('/deleteUser/:id', jwtVerify, verifyAdmin, async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })

        //delete product
        app.delete('/deleteProduct/:id', jwtVerify, verifySeller, async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })

        //put products for advertise
        app.put('/productsUpdate/:id', jwtVerify, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {

                    advertise: "true"
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        app.put('/reportProduct/:id', jwtVerify, verifyBuyer, async (req, res) => {

            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {

                    report: "reported"
                }
            }

            const result = await productsCollection.updateOne(filter, updatedDoc)
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