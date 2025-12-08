sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator) {
  "use strict";

  return Controller.extend("productsUI.controller.Products", {
    onInit: function () {
      const viewModel = new JSONModel({
        createName: "",
        createCategory: "drinks",
        readId: "",
        readResult: "",
        search: "",
        filterCategory: "all",
        updateName: "",
        updateCategory: "",
        status: "",
        categories: [
          { category: "drinks" },
          { category: "grocery" }
        ]
      });
      this.getView().setModel(viewModel, "view");
    },

    _getListBinding: function () {
      return this.byId("productsTable").getBinding("items");
    },

    _setStatus: function (text) {
      this.getView().getModel("view").setProperty("/status", text);
    },

    _handleError: function (error, fallback) {
      const message = (error && error.message) || fallback || "Unexpected error";
      this._setStatus(message);
      MessageBox.error(message);
    },

    _applyFilters: function () {
      const binding = this._getListBinding();
      if (!binding) {
        return;
      }

      const viewModel = this.getView().getModel("view");
      const search = (viewModel.getProperty("/search") || "").trim();
      const category = viewModel.getProperty("/filterCategory");

      const filters = [];
      if (search) {
        filters.push(new Filter("name", FilterOperator.Contains, search));
      }
      if (category && category !== "all") {
        filters.push(new Filter("category", FilterOperator.EQ, category));
      }

      binding.filter(filters);
    },

    onSearch: function (oEvent) {
      const value = oEvent.getParameter("query") ?? oEvent.getParameter("newValue") ?? "";
      this.getView().getModel("view").setProperty("/search", value);
      this._applyFilters();
    },

    onFilterChange: function () {
      this._applyFilters();
    },

    onRefresh: function () {
      const binding = this._getListBinding();
      if (binding) {
        binding.refresh();
        this._setStatus("Data refreshed");
      }
    },

    onCreateProduct: async function () {
      const viewModel = this.getView().getModel("view");
      const name = (viewModel.getProperty("/createName") || "").trim();
      const category = viewModel.getProperty("/createCategory");

      if (!name) {
        MessageToast.show("Enter a product name");
        return;
      }

      const listBinding = this._getListBinding();
      if (!listBinding) {
        return;
      }

      try {
        this._setStatus("Creating product...");
        const context = listBinding.create({ 
          name: name, 
          category: category 
        });
        await context.created();
        MessageToast.show("Product created");
        viewModel.setProperty("/createName", "");
        viewModel.setProperty("/createCategory", "drinks");
        this._setStatus("Created new product");
      } catch (error) {
        this._handleError(error, "Create failed");
      }
    },

    onReadProduct: async function () {
      const viewModel = this.getView().getModel("view");
      const id = (viewModel.getProperty("/readId") || "").trim();
      if (!id) {
        MessageToast.show("Enter a UUID to load");
        return;
      }

      const model = this.getView().getModel();
      const path = `/Products(${id})`;

      try {
        this._setStatus("Loading product...");
        const oData = await new Promise((resolve, reject) => {
          model.read(path, {
            success: resolve,
            error: reject
          });
        });
        
        if (oData) {
          viewModel.setProperty("/readResult", `${oData.name} (${oData.category})`);
          this._setStatus("Product loaded");
        } else {
          viewModel.setProperty("/readResult", "Not found");
          this._setStatus("Product not found");
        }
      } catch (error) {
        viewModel.setProperty("/readResult", "Not found");
        this._handleError(error, "Read failed");
      }
    },

    onEditProduct: function (oEvent) {
      const button = oEvent.getSource();
      const item = button.getParent().getParent();
      const context = item.getBindingContext();
      const viewModel = this.getView().getModel("view");

      if (context) {
        viewModel.setProperty("/updateName", context.getProperty("name"));
        viewModel.setProperty("/updateCategory", context.getProperty("category"));
        viewModel.setProperty("/selectedProduct", context.getProperty("ID"));
        this.byId("updatePanel").setExpanded(true);
      }
    },

    onSelectionChange: function (oEvent) {
      const item = oEvent.getParameter("listItem");
      const context = item ? item.getBindingContext() : null;
      const viewModel = this.getView().getModel("view");

      if (context) {
        viewModel.setProperty("/updateName", context.getProperty("name"));
        viewModel.setProperty("/updateCategory", context.getProperty("category"));
      }
    },

    onUpdateProduct: async function () {
      const table = this.byId("productsTable");
      const item = table.getSelectedItem();
      if (!item) {
        MessageToast.show("Select a product to update");
        return;
      }

      const context = item.getBindingContext();
      const viewModel = this.getView().getModel("view");
      const name = (viewModel.getProperty("/updateName") || "").trim();
      const category = viewModel.getProperty("/updateCategory");

      if (!name && !category) {
        MessageToast.show("Nothing to update");
        return;
      }

      try {
        if (name) {
          context.setProperty("name", name);
        }
        if (category) {
          context.setProperty("category", category);
        }

        await context.getModel().submitBatch("$auto");
        this._setStatus("Product updated");
        MessageToast.show("Product updated");
        this._getListBinding().refresh();
      } catch (error) {
        this._handleError(error, "Update failed");
      }
    },

    onDeleteProduct: async function () {
      const table = this.byId("productsTable");
      const item = table.getSelectedItem();
      if (!item) {
        MessageToast.show("Select a product to delete");
        return;
      }

      const context = item.getBindingContext();

      try {
        this._setStatus("Deleting product...");
        await context.delete("$auto");
        await context.getModel().submitBatch("$auto");
        this._setStatus("Product deleted");
        MessageToast.show("Product deleted");
        this._getListBinding().refresh();
      } catch (error) {
        this._handleError(error, "Delete failed");
      }
    }
  });
});
