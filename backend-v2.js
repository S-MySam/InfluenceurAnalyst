const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', groq:
