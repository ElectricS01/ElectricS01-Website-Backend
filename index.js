const express = require('express')
const app = express()
const port = 24555
const {Messages}=require('./models')

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.get('/', async (req, res) => {
    const messages = await Messages.findAll()
    res.json(messages)
})

app.post('/', async (req, res) => {
    const message = await Messages.create({
        messageContents: req.body.messageContents,
        userName: req.body.userName
    })
    res.json(message)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})