const mongoose = require("mongoose")

const uri = process.env.MONGODB


const initializeDb = async () => {

    await mongoose.connect(uri).then(() => {
        console.log(`Successfully connected to db.`)
    }).catch(err => console.log(err))


}

module.exports = { initializeDb }