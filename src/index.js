const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors'); 
const dbConnect = require('./config/dbConnect');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const taskRoutes = require('./routes/taskRoutes');

dbConnect();

const app = express();

// CORS setup
app.use(cors({
  origin: 'http://localhost:5173', // adjust to match your frontend origin
  credentials: true
}));

//Middleware
app.use(express.json());

//Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tasks', taskRoutes);

//Start the server
const PORT = process.env.PORT || 7002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
