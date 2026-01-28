const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const User = require("../model/user")
const jwtSecret = process.env.JWT_SECRET



const register = async (req, res) => {
    const { username, password } = req.body



    try {
        const isExistingUser = await User.findOne({ username })

        if (isExistingUser) {
            return res.status(400).json({ message: "User already exists. Please Login" })
        }


        const salt = await bcrypt.genSalt(10)


        const hashedPassword = await bcrypt.hash(password, salt)




        const user = new User({ username: username, password: hashedPassword })


        await user.save()



        const token = jwt.sign({ id: user._id, jwtSecret }, jwtSecret, { expiresIn: '24h' })
        res.status(201).json({ message: "New user created successfully.", username: user.username, token })
    } catch (err) {

        console.log(err)
        res.status(500).json({ message: "Server Error", error: err })
    }

}


const login = async (req, res) => {

    const { username, password } = req.body

    try {
        const user = await User.findOne({ username: username })

        if (!user) {
            return res.status(404).json({ message: "User not found." })
        }

        const comparePassword = await user.comparePassword(password, user.password)

        if (!comparePassword) {
            return res.status(400).json({ message: "Invalid credentials." })
        }

      

        res.status(200).json({ message: "Login successfully.", username: user.username })
    } catch (err) {
        res.status(500).json({ message: "Server error while login", err })
    }

}

module.exports = { register, login }