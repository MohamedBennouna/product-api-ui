const cds = require('@sap/cds');
const path = require('path');
const express = require('express');

cds.on('bootstrap', (app) => {
  // Serve static files from the app directory
  app.use('/app', express.static(path.join(__dirname, '../app')));
  
  // Serve productsUI directly from webapp
  app.use('/productsUI', express.static(path.join(__dirname, '../app/productsUI/webapp')));
  app.use('/productsUI/webapp', express.static(path.join(__dirname, '../app/productsUI/webapp')));
   
  app.get('/', (req, res) => {
    res.redirect('/app/productsUI/webapp/');
  });
});
