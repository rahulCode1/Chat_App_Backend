require("dotenv").config()
const mongoose = require("mongoose")
const express = require("express")
const app = express()
const cors = require("cors")
const authRoutes = require("./routes/auth")
const http = require("http")
const { Server } = require("socket.io")
const Messages = require("./model/message_model")
const User = require("./model/user")
const uri = process.env.MONGODB




const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000"
    }
})



app.use(cors())
app.use(express.json())


mongoose.connect(uri).then(() => {
    console.log(`Successfully connected to db.`)
}).catch(err => console.log(err))



app.use("/auth", authRoutes)


// Socket io logic

io.on('connection', (socket) => {
    console.log(`User connected`, socket.id)

    socket.on('send_message', async (data) => {
        const { sender, receiver, message } = data



        const newMessage = new Messages({ sender, receiver, message })
        await newMessage.save()
        socket.broadcast.emit('receive_message', data)
    })

    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id)
    })
})


app.get('/messages', async (req, res) => {

    const { sender, receiver } = req.query
    try {

        const messages = await Messages.find({
            $or: [
                { sender, receiver },
                { sender: receiver, receiver: sender }
            ]
        }).sort({ createdAt: 1 })

        res.json(messages)
    } catch (err) {
        res.status(500).json({ message: 'Error fetching messages', err })
    }
})



app.get('/users', async (req, res) => {
    const { currentUser } = req.query

    try {
        const users = await User.find({ username: { $ne: currentUser } })
        res.json(users)
    } catch (err) {
        res.status(500).json({ message: "Error fetching users" })
    }
})



const PORT = process.env.PORT || 5001


server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`)
})