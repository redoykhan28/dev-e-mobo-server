const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000

// middle ware 
app.use(cors())
app.use(express.json())

//root api check
app.get('/', (req, res) => {

    res.send('E-Mobo server is running')

})

app.listen(port, () => {

    console.log(`E-Mobo runs on port ${port}`)

})