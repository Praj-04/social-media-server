const mongoose = require("mongoose");

module.exports = async () => {
  const mongoUri =
    "mongodb+srv://Prajna:o6C4bWVY4E2TIv3l@cluster0.e7kaolo.mongodb.net/?retryWrites=true&w=majority";
  try {
    const connect = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connected : ${connect.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
