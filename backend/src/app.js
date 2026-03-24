const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || true,
  credentials: true,
};

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', routes);

module.exports = app;
