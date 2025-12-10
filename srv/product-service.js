const cds = require('@sap/cds');

module.exports = cds.service.impl(function () {
  const { Products } = this.entities;
  const allowed = new Set(['drinks', 'grocery']);

  const ensureValidName = (req) => {
    const { name } = req.data;
    
    if (!name || typeof name !== 'string') {
      req.error(400, "Product name is required");
      return false;
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      req.error(400, "Product name cannot be empty");
      return false;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      req.error(400, "Product name can only contain letters, numbers, and spaces");
      return false;
    }

    if (/^\d+$/.test(trimmedName)) {
      req.error(400, "Product name cannot be only numbers");
      return false;
    }

    if (trimmedName.length > 50) {
      req.error(400, "Product name must not exceed 50 characters");
      return false;
    }

    return true;
  };

  const ensureValidCategory = (req) => {
    const { category } = req.data;
    if (!category || !allowed.has(category)) {
      req.error(400, "Category must be either 'drinks' or 'grocery'");
    }
  };

  const checkDuplicateName = async (name, excludeId = null) => {
    const trimmedName = name.trim();
    const existing = await SELECT.from(Products).where({ name: trimmedName });
    
    if (excludeId) {
      // Exclure le produit actuel de la vérification
      return existing.some(p => p.ID !== excludeId);
    }
    return existing.length > 0;
  };

  this.before('CREATE', Products, async (req) => {
    if (!ensureValidName(req)) return;
    ensureValidCategory(req);
    
    const isDuplicate = await checkDuplicateName(req.data.name);
    if (isDuplicate) {
      return req.error(400, "A product with this name already exists");
    }
    
    const now = new Date().toISOString();
    if (!req.data.creation_date) req.data.creation_date = now;
    req.data.updated_date = null;
  });

  this.before('UPDATE', Products, async (req) => {
    // Récupérer l'ID du produit à modifier
    const productId = req.params[0]?.ID || req.params[0];
    
    if (req.data.name !== undefined) {
      if (!ensureValidName(req)) return;
      
      const isDuplicate = await checkDuplicateName(req.data.name, productId);
      if (isDuplicate) {
        return req.error(400, "A product with this name already exists");
      }
    }
    if (req.data.category !== undefined) {
      ensureValidCategory(req);
    }
    req.data.updated_date = new Date().toISOString();
  });

  // CAP will handle CREATE, UPDATE, DELETE with proper transaction management
  // The before hooks above will still run for validation
});